import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
// domMax (not domAnimation) because the sign-in ↔ sign-up side swap uses the
// `layout` prop, which domAnimation does not include. This route is lazy-loaded,
// so the extra feature bundle never reaches the editor.
import { LazyMotion, domMax, m as M } from 'framer-motion';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { toast } from 'react-hot-toast';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useThemeSync } from '@/shared/hooks/useThemeSync';
import { LazyImage } from '@ui/LazyImage';
import LoginIdentifierStep from './LoginIdentifierStep';
import LoginPasswordStep from './LoginPasswordStep';
import SavedAccountStep from './SavedAccountStep';
import LoginPromptStep from './LoginPromptStep';
import SignUpForm from './SignUpForm';
import ForgotPasswordTab from './ForgotPasswordTab.jsx';
import { LangSwitcher } from './auth-shared';
import { rememberedAccounts } from '@/features/auth/services/remembered-accounts.service';
import { STORAGE_KEYS, storage } from '@/features/projects/services/storage.service';
import { auth } from '@/app/api';
import SmoothWavyCanvas from '@features/landing/SmoothWavyCanvas';
import AuthShowcase from './components/AuthShowcase';
import SavePasswordModal from './SavePasswordModal';
import {
  shouldOfferCredentialSave,
  storePasswordCredential,
  dismissCredentialPrompt,
  requestStoredCredential,
} from '@/features/auth/services/credential-manager.service';
import type { ComponentProps } from 'react';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import type { RememberedAccount } from '@/features/auth/services/remembered-accounts.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type View =
  | 'forgot-password'
  | 'register'
  | 'login-saved-account'
  | 'login-identifier'
  | 'login-password'
  | 'login-prompt';

type SavedAccount = ReturnType<typeof rememberedAccounts.getAll>[number];

/** Shared by both panels so they cross at the same rate and never desync. */
const SIDE_SWAP = { duration: 0.45, ease: [0.16, 1, 0.3, 1] } as const;

interface IdentifierData {
  identifier?: string;
  accountName?: string;
  displayName?: string;
  avatarUrl?: string;
  hasPasskey?: boolean;
  hasPassword?: boolean;
}

type HeldResult = { user?: AuthUser } | null | undefined;

// ─── Main AuthPage ──────────────────────────────────────────────────────────

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const { loginAndHold, commitLogin, heldLoginResult, registerAndHold, loginWithGoogle } = useAuthContext();
  const [searchParams] = useSearchParams();
  const { mode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  useThemeSync();

  const action = mode || searchParams.get('action') || 'signin';
  const redirect = searchParams.get('redirect') || '';
  usePageTitle();

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => rememberedAccounts.getAll());
  // Skip validation entirely when there are no saved accounts (avoids a redundant setState in the effect)
  const [accountsChecked, setAccountsChecked] = useState(() => rememberedAccounts.getAll().length === 0);

  const [view, setView] = useState<View>(() => {
    if (action === 'forgot-password') return 'forgot-password';
    if (action === 'signup' || action === 'register') return 'register';
    if (rememberedAccounts.getAll().length > 0) return 'login-saved-account';
    return 'login-identifier';
  });

  const isRegister = view === 'register';
  const [identifierData, setIdentifierData] = useState<IdentifierData | null>(null);
  const [fromSavedAccount, setFromSavedAccount] = useState(false);

  // Credential offered to the browser's password manager after a successful
  // password auth. Held in a ref, never in state or storage — it exists only
  // between "login succeeded" and "user answered the save prompt", and is
  // wiped the moment either resolves.
  const pendingCredentialRef = useRef<{ id: string; password: string } | null>(null);
  const [credentialPrompt, setCredentialPrompt] = useState<{ id: string } | null>(null);
  // Password the browser handed back for a saved account, used to pre-fill the
  // password step. Cleared whenever the user leaves that step.
  const [prefillPassword, setPrefillPassword] = useState<string | undefined>(undefined);

  const clearPendingCredential = useCallback(() => {
    pendingCredentialRef.current = null;
    setCredentialPrompt(null);
  }, []);

  // Wrap the auth calls so the password is captured without changing any child
  // component's signature — the forms already hand it to us here.
  const loginCapturing = useCallback(async (creds: { identifier?: string; password: string }) => {
    const result = await loginAndHold(creds as Parameters<typeof loginAndHold>[0]);
    if (creds.identifier && creds.password) {
      pendingCredentialRef.current = { id: creds.identifier, password: creds.password };
    }
    return result;
  }, [loginAndHold]);

  const registerCapturing = useCallback(async (data: { email?: string; accountName?: string; password: string }) => {
    const result = await registerAndHold(data as Parameters<typeof registerAndHold>[0]);
    const id = data.email || data.accountName;
    if (id && data.password) {
      pendingCredentialRef.current = { id, password: data.password };
    }
    return result;
  }, [registerAndHold]);

  // Validate saved accounts against the server on mount. Accounts that no longer
  // exist (deleted/renamed) are removed from storage and state immediately so the
  // user never sees a ghost entry that would error out on click.
  // NOTE: accountsChecked is initialised to `true` when there are no accounts,
  //       so this effect only runs (and calls setState) when there's real work to do.
  useEffect(() => {
    const accounts = rememberedAccounts.getAll();
    if (accounts.length === 0) return; // already checked via lazy initializer
    let cancelled = false;
    Promise.all(
      accounts.map(async (account): Promise<SavedAccount | null> => {
        const identifier = account.identifier || account.accountName;
        if (!identifier) return null; // malformed entry — drop it
        try {
          const result = await auth.checkIdentifier(identifier) as { hasPasskey?: boolean; hasPassword?: boolean };
          const patch = { hasPasskey: result.hasPasskey, hasPassword: result.hasPassword };
          rememberedAccounts.patch(account.userId, patch);
          return { ...account, ...patch }; // still exists, fresh auth-method flags
        } catch (err) {
          // 404 = account no longer exists; any other error = keep the account
          // (network blip / server error should not nuke the list)
          if ((err as { status?: number })?.status === 404) {
            rememberedAccounts.remove(account.userId);
            return null;
          }
          return account;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const valid = results.filter(Boolean) as SavedAccount[];
      setSavedAccounts(valid);
      setAccountsChecked(true);
      // If every saved account was pruned, fall back to the identifier step
      if (valid.length === 0) {
        setView((prev) => (prev === 'login-saved-account' ? 'login-identifier' : prev));
      }
    });
    return () => { cancelled = true; };
  }, []); // run once on mount

  // 1. Force pretty URLs if legacy query params are used

  useEffect(() => {
    if (!mode && searchParams.has('action')) {
      const legacyAction = searchParams.get('action');
      let targetAction = 'signin';
      if (legacyAction === 'signup' || legacyAction === 'register') {
        targetAction = 'signup';
      } else if (legacyAction === 'forgot-password') {
        targetAction = 'forgot-password';
      }
      const redirectParam = searchParams.get('redirect');
      const fromParam = searchParams.get('from');

      const newParams = new URLSearchParams();
      if (redirectParam) newParams.set('redirect', redirectParam);
      if (fromParam) newParams.set('from', fromParam);

      const suffix = newParams.toString() ? `?${newParams.toString()}` : '';
      navigate(`/auth/${targetAction}${suffix}`, { replace: true });
    }
  }, [mode, searchParams, navigate]);

  // Handle redirect-based Google OAuth callback (popup-blocked fallback).
  // The server redirects to /auth/signin?gcb=success&ott=<token>|error after the OAuth dance.
  useEffect(() => {
    const gcb = searchParams.get('gcb');
    if (!gcb) return;

    // Clean the URL immediately so back-navigation doesn't re-trigger
    const cleanParams = new URLSearchParams(searchParams);
    cleanParams.delete('gcb');
    cleanParams.delete('gcb_msg');
    cleanParams.delete('ott');
    navigate(`/auth/signin${cleanParams.toString() ? `?${cleanParams}` : ''}`, { replace: true });

    if (gcb === 'success') {
      // Exchange the OTT for auth cookies (through the Vercel proxy so the browser
      // scopes them to lrc-studio.vercel.app), then navigate home so useAuth.restore()
      // picks up the freshly-set cookies.
      const ott = searchParams.get('ott');
      const redirectTo = searchParams.get('redirect');
      const doNavigate = () => navigate(redirectTo || '/home', { replace: true });

      if (ott) {
        auth.exchangeOtt(ott).then(doNavigate).catch(doNavigate);
      } else {
        doNavigate();
      }
    } else {
      toast.error(searchParams.get('gcb_msg') || t('auth.errors.googleLoginFailed'));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prevLocationSearchRef = useRef(location.search);
  useLayoutEffect(() => {
    if (prevLocationSearchRef.current !== location.search) {
      prevLocationSearchRef.current = location.search;
      const params = new URLSearchParams(location.search);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (params.get('action') === 'forgot-password') setView('forgot-password');
    }
  }, [location.search]);

  // 2. Sync view state when action changes (e.g. browser back button or direct link)
  const prevActionRef = useRef(action);
  useLayoutEffect(() => {
    if (prevActionRef.current !== action) {
      prevActionRef.current = action;
      /* eslint-disable react-hooks/set-state-in-effect */
      if (action === 'signup' || action === 'register') {
        setView('register');
      } else if (action === 'forgot-password') {
        setView('forgot-password');
      } else {
        setView(prev => {
          if (prev !== 'register' && prev !== 'forgot-password') return prev;
          if (rememberedAccounts.getAll().length > 0) return 'login-saved-account';
          return 'login-identifier';
        });
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [action]);

  // 2. Sync URL when view state changes manually (e.g. switchView calls)
  useEffect(() => {
    let targetAction = 'signin';
    if (view === 'register') {
      targetAction = 'signup';
    } else if (view === 'forgot-password') {
      targetAction = 'forgot-password';
    }
    const isMatched = action === targetAction || (action === 'sign-in' && targetAction === 'signin');

    if (!isMatched) {
      const currentRedirect = searchParams.get('redirect');
      const redirectSuffix = currentRedirect ? `?redirect=${encodeURIComponent(currentRedirect)}` : '';
      navigate(`/auth/${targetAction}${redirectSuffix}`, { replace: true });
    }
  }, [view, action, navigate, searchParams]);

  const handleIdentifierNext = useCallback((data: IdentifierData) => {
    setIdentifierData(data);
    setView('login-password');
  }, []);

  const handleBack = useCallback(() => {
    setIdentifierData(null);
    setPrefillPassword(undefined);
    if (fromSavedAccount) {
      setFromSavedAccount(false);
      setView('login-saved-account');
    } else {
      setView('login-identifier');
    }
  }, [fromSavedAccount]);

  const finishAuth = useCallback(() => {
    const redirectTo = searchParams.get('redirect');
    // Commit first: user + heldLoginResult update atomically before navigation so
    // ProtectedRoute never sees a null user at the destination.
    // AuthRedirect (shown when showAuthPage=false) reads the same redirect param and
    // navigates to the same target, so there is no competing navigation.
    commitLogin();
    if (redirectTo) {
      if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        navigate(redirectTo, { replace: true });
      } else {
        window.location.href = redirectTo;
      }
    } else {
      navigate('/home', { replace: true });
    }
  }, [commitLogin, searchParams, navigate]);

  /**
   * Last gate before leaving the auth page. If we captured a password and the
   * browser can store it, offer that first; otherwise go straight through.
   * Google and passkey flows never set a pending credential, so they skip it.
   */
  const handleAuthSuccess = useCallback(() => {
    const cred = pendingCredentialRef.current;
    if (cred && shouldOfferCredentialSave()) {
      setCredentialPrompt({ id: cred.id });
      return; // finishAuth runs once the user answers
    }
    clearPendingCredential();
    finishAuth();
  }, [finishAuth, clearPendingCredential]);

  const handleSaveCredential = useCallback(async () => {
    const cred = pendingCredentialRef.current;
    if (cred) {
      const u = (heldLoginResult as HeldResult)?.user;
      // Never block the sign-in on this — storePasswordCredential swallows its
      // own failures and reports false.
      await storePasswordCredential({
        id: cred.id,
        password: cred.password,
        name: u?.displayName ?? u?.accountName ?? undefined,
        iconURL: u?.avatarUrl ?? undefined,
      });
    }
    clearPendingCredential();
    finishAuth();
  }, [heldLoginResult, clearPendingCredential, finishAuth]);

  const handleSkipCredential = useCallback(() => {
    clearPendingCredential();
    finishAuth();
  }, [clearPendingCredential, finishAuth]);

  const handleNeverAskCredential = useCallback(() => {
    dismissCredentialPrompt();
    clearPendingCredential();
    finishAuth();
  }, [clearPendingCredential, finishAuth]);

  /**
   * Drops the "continuing to X" intent. The URL is the source of truth for the
   * post-auth destination, so removing the param is what actually cancels it —
   * hiding the banner alone would still redirect on success.
   */
  const handleDismissRedirect = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('redirect');
    const query = next.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  }, [searchParams, navigate, location.pathname]);

  // Wraps loginWithGoogle with a hard-redirect fallback: if auth.me() fails after
  // the OAuth popup completes, the server cookies are already set, so we can still
  // get the user to /home via a full page reload (useAuth.restore() picks it up).
  const handleGoogleLogin = useCallback(async (loginHint?: string) => {
    try {
      await loginWithGoogle(loginHint);
      handleAuthSuccess();
    } catch (err) {
      if ((err as { message?: string })?.message === 'wrong_account') {
        toast.error(t('auth.errors.googleWrongAccount'));
        return;
      }
      const hasSession = storage.get(STORAGE_KEYS.HAS_SESSION);
      if (hasSession) {
        const redirectTo = searchParams.get('redirect');
        window.location.href = (redirectTo?.startsWith('/') && !redirectTo.startsWith('//'))
          ? redirectTo
          : '/home';
      } else {
        toast.error(t('auth.errors.googleLoginFailed'));
      }
    }
  }, [loginWithGoogle, handleAuthSuccess, searchParams, t]);

  const handleSavedAccountProceed = useCallback(async (data: IdentifierData) => {
    setIdentifierData(data);
    setFromSavedAccount(true);
    setView('login-password');
    // Ask the browser whether it has a password saved for this account and, if
    // so, pre-fill it. Deliberately stops short of auto-submitting — the user
    // should see what is about to be sent. Silent failure is fine: they just
    // type it as before.
    const cred = await requestStoredCredential();
    const wanted = data.identifier ?? data.accountName;
    if (cred && (!wanted || cred.id === wanted)) {
      setPrefillPassword(cred.password);
    }
  }, []);

  const handleAddAccount = useCallback(() => {
    setFromSavedAccount(false);
    setView('login-identifier');
  }, []);

  const handleRemoveAccount = useCallback((userId: string) => {
    rememberedAccounts.remove(userId);
    const updated = rememberedAccounts.getAll();
    setSavedAccounts(updated);
    if (updated.length === 0) {
      setView('login-identifier');
    }
  }, []);

  const handlePasswordSuccess = useCallback(() => {
    const u = (heldLoginResult as HeldResult)?.user;
    const toUpsert = identifierData && u?.id ? {
      userId: u.id,
      identifier: identifierData.identifier,
      accountName: u?.accountName ?? identifierData.accountName,
      displayName: u?.displayName ?? identifierData.displayName,
      avatarUrl: u?.avatarUrl ?? identifierData.avatarUrl,
      hasPasskey: u?.hasPasskey ?? identifierData.hasPasskey,
      hasPassword: identifierData.hasPassword,
    } : null;

    if (fromSavedAccount) {
      // User logged in via account picker — silently refresh their stored data
      if (toUpsert) {
        rememberedAccounts.upsert(toUpsert as RememberedAccount);
        setSavedAccounts(rememberedAccounts.getAll());
      }
      handleAuthSuccess();
    } else {
      const alreadySaved = u?.id && rememberedAccounts.getAll().some((a) => a.userId === u.id);
      if (alreadySaved && toUpsert) {
        // Silently update existing entry, no re-prompt
        rememberedAccounts.upsert(toUpsert as RememberedAccount);
        setSavedAccounts(rememberedAccounts.getAll());
        handleAuthSuccess();
      } else {
        // First time — show the save prompt
        setView('login-prompt');
      }
    }
  }, [fromSavedAccount, identifierData, heldLoginResult, handleAuthSuccess]);

  const handleSaveAndContinue = useCallback(() => {
    if (identifierData) {
      const u = (heldLoginResult as HeldResult)?.user;
      if (u?.id) {
        rememberedAccounts.upsert({
          userId: u.id,
          identifier: identifierData.identifier,
          accountName: u?.accountName ?? identifierData.accountName,
          displayName: u?.displayName ?? identifierData.displayName,
          avatarUrl: u?.avatarUrl ?? identifierData.avatarUrl,
          hasPasskey: u?.hasPasskey ?? identifierData.hasPasskey,
          hasPassword: identifierData.hasPassword,
        } as RememberedAccount);
        setSavedAccounts(rememberedAccounts.getAll());
      }
    }
    handleAuthSuccess();
  }, [identifierData, heldLoginResult, handleAuthSuccess]);

  const handleRegisterSuccess = useCallback((result: unknown) => {
    const u = (result as { user?: AuthUser })?.user;
    if (!u) { handleAuthSuccess(); return; }
    // New accounts never have a saved profile — always show the prompt.
    const data: IdentifierData = {
      identifier: u.email || u.accountName || undefined,
      accountName: u.accountName ?? undefined,
      displayName: u.displayName ?? undefined,
      avatarUrl: u.avatarUrl || undefined,
    };
    setIdentifierData(data);
    setView('login-prompt');
  }, [handleAuthSuccess]);

  const switchView = useCallback((newView: View) => {
    setView(newView);
    setIdentifierData(null);
    // Force immediate URL update to be snappy
    let targetAction = 'signin';
    if (newView === 'register') {
      targetAction = 'signup';
    } else if (newView === 'forgot-password') {
      targetAction = 'forgot-password';
    }
    const currentRedirect = searchParams.get('redirect');
    const redirectSuffix = currentRedirect ? `?redirect=${encodeURIComponent(currentRedirect)}` : '';
    navigate(`/auth/${targetAction}${redirectSuffix}`, { replace: true });
  }, [navigate, searchParams]);

  return (
    <LazyMotion features={domMax}>
      <div className="size-screen flex relative overflow-hidden font-sans">
      <div className="wavy-canvas-container absolute inset-0">
        <SmoothWavyCanvas />
      </div>

      {/* Language switcher — top right */}
      <div className="fixed top-4 right-4 z-raised">
        <LangSwitcher i18n={i18n} />
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      {/* `m-auto` on the inner column rather than `justify-center` on the
          scroller: with justify-center, content taller than the viewport gets
          its top clipped and cannot be scrolled back to. Auto margins centre
          when there is room and collapse when there isn't. */}
      <div className="flex-1 flex flex-col px-4 sm:px-8 py-6 h-screen overflow-y-auto scrollbar-thin relative">
        <div className="m-auto w-full flex flex-col items-center">

        {/* Logo above form */}
        <M.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-4 shrink-0"
        >
          <div className="size-8 mb-1.5">
            <LazyImage
              src="https://res.cloudinary.com/dzjid2tos/image/upload/w_256,f_auto,q_auto/v1778106770/lrc-logo_dkumwz.png"
              alt="LRC Studio"
              className="size-full object-contain drop-shadow-[0_0_12px_rgba(29,185,84,0.3)]"
            />
          </div>
          <p className="text-xs font-bold text-zinc-100 font-heading tracking-tight">{t('app.name')}</p>
        </M.div>

        <M.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-[420px] lg:max-w-[980px] flex-shrink"
        >
          {/* Card — one column on mobile, showcase + form side by side from lg up */}
          <div className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/50 contrast-more:border-zinc-600 rounded-2xl shadow-card relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-stretch">

              {/* Showcase. `order` flips on register; `layout="position"` FLIPs it
                  across rather than cutting, and position-only avoids the scale
                  distortion that plain `layout` would apply to the form's inputs. */}
              <M.div
                layout="position"
                transition={SIDE_SWAP}
                className={`hidden lg:block lg:w-[46%] shrink-0 p-8 border-zinc-800/50 ${
                  isRegister ? 'lg:order-2 lg:border-l' : 'lg:order-1 lg:border-r'
                }`}
              >
                <AuthShowcase t={t} variant={isRegister ? 'editor' : 'preview'} />
              </M.div>

              <M.div
                layout="position"
                transition={SIDE_SWAP}
                className={`flex-1 min-w-0 p-7 sm:p-8 ${isRegister ? 'lg:order-1' : 'lg:order-2'}`}
              >

            {view === 'login-saved-account' && (savedAccounts.length > 0 || !accountsChecked) && (
              <SavedAccountStep
                t={t}
                savedAccounts={savedAccounts as ComponentProps<typeof SavedAccountStep>['savedAccounts']}
                accountsChecked={accountsChecked}
                onProceedToPassword={handleSavedAccountProceed}
                onGoogleLogin={handleGoogleLogin}
                onAddAccount={handleAddAccount}
                onRemoveAccount={handleRemoveAccount}
                onPasskeySuccess={handleAuthSuccess}
              />
            )}

            {view === 'login-identifier' && (
              <LoginIdentifierStep
                t={t}
                onNext={handleIdentifierNext}
                onSwitchToRegister={() => switchView('register')}
                onGoogleLogin={() => handleGoogleLogin()}
                from={searchParams.get('from') || undefined}
                redirect={redirect}
                onDismissRedirect={handleDismissRedirect}
              />
            )}

            {view === 'login-password' && identifierData && (
              <LoginPasswordStep
                t={t}
                identifierData={identifierData}
                onBack={handleBack}
                onLogin={loginCapturing}
                onGoogleLogin={() => handleGoogleLogin(identifierData?.identifier)}
                onSuccess={handlePasswordSuccess}
                onSwitchToForgotPassword={() => switchView('forgot-password')}
                prefillPassword={prefillPassword}
              />
            )}

            {view === 'login-prompt' && identifierData && (
              <LoginPromptStep
                t={t}
                identifierData={identifierData}
                onSave={handleSaveAndContinue}
                onSkip={handleAuthSuccess}
                onPasskeySuccess={handleSaveAndContinue}
              />
            )}

            {view === 'register' && (
              <SignUpForm
                t={t}
                onSwitchToLogin={() => switchView('login-identifier')}
                onRegister={registerCapturing}
                onGoogleLogin={() => handleGoogleLogin()}
                onSuccess={handleRegisterSuccess}
                redirect={redirect}
                onDismissRedirect={handleDismissRedirect}
              />
            )}

            {view === 'forgot-password' && (
              <ForgotPasswordTab onBackToLogin={() => switchView('login-identifier')} />
            )}
              </M.div>
            </div>
          </div>

          {/* reCAPTCHA Notice */}
          <div className="mt-3 px-4 text-center animate-fade-in text-center shrink-0" style={{ animationDelay: '500ms' }}>
            <p className="text-[9px] leading-relaxed text-zinc-600">
              <Trans
                i18nKey="auth.recaptchaNotice"
                components={[
                  <a key="0" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors" />,
                  <a key="1" href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors" />
                ]}
              />
            </p>
          </div>

          {/* Footer — moved here from the removed side panel */}
          <p className="mt-2 text-center text-[9px] text-zinc-700 shrink-0" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} {t('app.name')}
          </p>
        </M.div>
        </div>
      </div>

      {credentialPrompt && (
        <SavePasswordModal
          open
          identifier={credentialPrompt.id}
          displayName={(heldLoginResult as HeldResult)?.user?.displayName ?? identifierData?.displayName}
          avatarUrl={(heldLoginResult as HeldResult)?.user?.avatarUrl ?? identifierData?.avatarUrl}
          onSave={handleSaveCredential}
          onSkip={handleSkipCredential}
          onNeverAsk={handleNeverAskCredential}
        />
      )}
    </div>
    </LazyMotion>
  );
}
