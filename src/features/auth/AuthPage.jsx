import { useState, useEffect, useCallback, useRef } from 'react';
import { LazyMotion, domAnimation, m as M } from 'framer-motion';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { toast } from 'react-hot-toast';
import { Music2, FileText, Zap } from 'lucide-react';
import { ThemedShineBorder } from '@ui/themed-shine-border';
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
import SmoothWavyCanvas from '@features/landing/SmoothWavyCanvas';

// ─── Main AuthPage ──────────────────────────────────────────────────────────

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const { login, loginAndHold, commitLogin, heldLoginResult, register, registerAndHold, loginWithGoogle } = useAuthContext();
  const [searchParams] = useSearchParams();
  const { mode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  useThemeSync();

  const action = mode || searchParams.get('action') || 'signin';
  const redirect = searchParams.get('redirect') || '';
  usePageTitle();

  const [savedAccounts, setSavedAccounts] = useState(() => rememberedAccounts.getAll());

  const [view, setView] = useState(() => {
    if (action === 'forgot-password') return 'forgot-password';
    if (action === 'signup' || action === 'register') return 'register';
    if (rememberedAccounts.getAll().length > 0) return 'login-saved-account';
    return 'login-identifier';
  });

  const [identifierData, setIdentifierData] = useState(null);
  const [fromSavedAccount, setFromSavedAccount] = useState(false);
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

  const prevLocationSearchRef = useRef(location.search);
  if (prevLocationSearchRef.current !== location.search) {
    prevLocationSearchRef.current = location.search;
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'forgot-password') setView('forgot-password');
  }

  // 2. Sync view state when action changes (e.g. browser back button or direct link)
  const prevActionRef = useRef(action);
  if (prevActionRef.current !== action) {
    prevActionRef.current = action;
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
  }

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

  const handleIdentifierNext = useCallback((data) => {
    setIdentifierData(data);
    setView('login-password');
  }, []);

  const handleBack = useCallback(() => {
    setIdentifierData(null);
    if (fromSavedAccount) {
      setFromSavedAccount(false);
      setView('login-saved-account');
    } else {
      setView('login-identifier');
    }
  }, [fromSavedAccount]);

  const handleAuthSuccess = useCallback(() => {
    const redirectTo = searchParams.get('redirect');
    // Navigate FIRST before committing login state.
    // If we commitLogin() first, it clears heldLoginResult and sets user — causing
    // showAuthPage to flip to false, which replaces <AuthPage> with <AuthRedirect>
    // mid-render, causing a second navigation that competes with this one.
    if (redirectTo) {
      if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        navigate(redirectTo, { replace: true });
      } else {
        window.location.href = redirectTo;
      }
    } else {
      navigate('/home', { replace: true });
    }
    // Commit login state after navigation is queued.
    commitLogin();
  }, [commitLogin, searchParams, navigate]);

  const handleSavedAccountProceed = useCallback((data) => {
    setIdentifierData(data);
    setFromSavedAccount(true);
    setView('login-password');
  }, []);

  const handleSwitchAccount = useCallback(() => {
    setFromSavedAccount(false);
    setView('login-identifier');
  }, []);

  const handleAddAccount = useCallback(() => {
    setFromSavedAccount(false);
    setView('login-identifier');
  }, []);

  const handleRemoveAccount = useCallback((userId) => {
    rememberedAccounts.remove(userId);
    const updated = rememberedAccounts.getAll();
    setSavedAccounts(updated);
    if (updated.length === 0) {
      setView('login-identifier');
    }
  }, []);

  const handlePasswordSuccess = useCallback(() => {
    const u = heldLoginResult?.user;
    const toUpsert = identifierData && u?.id ? {
      userId: u.id,
      identifier: identifierData.identifier,
      accountName: u?.accountName ?? identifierData.accountName,
      displayName: u?.displayName ?? identifierData.displayName,
      avatarUrl: u?.avatarUrl ?? identifierData.avatarUrl,
    } : null;

    if (fromSavedAccount) {
      // User logged in via account picker — silently refresh their stored data
      if (toUpsert) {
        rememberedAccounts.upsert(toUpsert);
        setSavedAccounts(rememberedAccounts.getAll());
      }
      handleAuthSuccess();
    } else {
      const alreadySaved = u?.id && rememberedAccounts.getAll().some((a) => a.userId === u.id);
      if (alreadySaved && toUpsert) {
        // Silently update existing entry, no re-prompt
        rememberedAccounts.upsert(toUpsert);
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
      const u = heldLoginResult?.user;
      if (u?.id) {
        rememberedAccounts.upsert({
          userId: u.id,
          identifier: identifierData.identifier,
          accountName: u?.accountName ?? identifierData.accountName,
          displayName: u?.displayName ?? identifierData.displayName,
          avatarUrl: u?.avatarUrl ?? identifierData.avatarUrl,
        });
        setSavedAccounts(rememberedAccounts.getAll());
      }
    }
    handleAuthSuccess();
  }, [identifierData, heldLoginResult, handleAuthSuccess]);

  const handleRegisterSuccess = useCallback((result) => {
    const u = result?.user;
    if (!u) { handleAuthSuccess(); return; }
    // New accounts never have a saved profile — always show the prompt.
    const data = {
      identifier: u.email || u.accountName,
      accountName: u.accountName,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl || null,
    };
    setIdentifierData(data);
    setView('login-prompt');
  }, [handleAuthSuccess]);

  const switchView = useCallback((newView) => {
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

  const features = [
    { icon: Music2, key: 'featureSync', descKey: 'featureSyncDesc' },
    { icon: FileText, key: 'featureExport', descKey: 'featureExportDesc' },
    { icon: Zap, key: 'featureConnect', descKey: 'featureConnectDesc' },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <div className="size-screen flex relative overflow-hidden font-sans">
      <SmoothWavyCanvas />

      {/* Language switcher — top right */}
      <div className="fixed top-4 right-4 z-raised">
        <LangSwitcher i18n={i18n} />
      </div>

      {/* ── Left branding panel (hidden on mobile) ─────────────────────── */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[460px] shrink-0 relative p-8 h-screen overflow-hidden">
        {/* Subtle left-side glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-accent-purple/3 pointer-events-none" />

        {/* Hero content */}
        <div className="relative flex-1 flex flex-col justify-center">
          <M.h2
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl xl:text-4xl font-semibold text-zinc-100 leading-tight tracking-tight font-heading mb-8"
          >
            {t('auth.tagline', 'Sync lyrics to music, your way')}
          </M.h2>

          <M.ul
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
            }}
            className="flex flex-col gap-4"
          >
            {features.map(({ icon: Icon, key, descKey }) => (
              <M.li
                key={key}
                variants={{
                  hidden: { opacity: 0, x: -30 },
                  visible: { opacity: 1, x: 0 }
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-primary/5">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100 tracking-tight">{t(`auth.${key}`)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed max-w-[260px]">{t(`auth.${descKey}`)}</p>
                </div>
              </M.li>
            ))}
          </M.ul>
        </div>

        {/* Footer */}
        <p className="relative text-[9px] text-zinc-700 mt-8 shrink-0" suppressHydrationWarning>
          &copy; {new Date().getFullYear()} LRC Studio
        </p>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-4 h-screen overflow-hidden relative">

        {/* Logo above form */}
        <M.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-4 shrink-0"
        >
          <div className="size-8 mb-1.5">
            <LazyImage
              src="https://res.cloudinary.com/dzjid2tos/image/upload/v1778106770/lrc-logo_dkumwz.png"
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
          className="w-full max-w-[400px] flex-shrink"
        >
          {/* Card */}
          <div className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/50 rounded-[2.5rem] shadow-card p-7 sm:p-8 relative overflow-hidden">
            <ThemedShineBorder />
            {view === 'login-saved-account' && savedAccounts.length > 0 && (
              <SavedAccountStep
                t={t}
                savedAccounts={savedAccounts}
                onProceedToPassword={handleSavedAccountProceed}
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
                onGoogleLogin={async () => {
                  try {
                    await loginWithGoogle();
                    handleAuthSuccess();
                  } catch {
                    toast.error(t('auth.errors.googleLoginFailed'));
                  }
                }}
                from={searchParams.get('from')}
                redirect={redirect}
              />
            )}

            {view === 'login-password' && identifierData && (
              <LoginPasswordStep
                t={t}
                identifierData={identifierData}
                onBack={handleBack}
                onLogin={loginAndHold}
                onGoogleLogin={async () => {
                  try {
                    await loginWithGoogle();
                    handleAuthSuccess();
                  } catch {
                    toast.error(t('auth.errors.googleLoginFailed'));
                  }
                }}
                onSuccess={handlePasswordSuccess}
                onSwitchToForgotPassword={() => switchView('forgot-password')}
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
                onRegister={registerAndHold}
                onGoogleLogin={async () => {
                  try {
                    await loginWithGoogle();
                    handleAuthSuccess();
                  } catch {
                    toast.error(t('auth.errors.googleLoginFailed'));
                  }
                }}
                onSuccess={handleRegisterSuccess}
                redirect={redirect}
              />
            )}

            {view === 'forgot-password' && (
              <ForgotPasswordTab onBackToLogin={() => switchView('login-identifier')} />
            )}
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
        </M.div>
      </div>
    </div>
    </LazyMotion>
  );
}
