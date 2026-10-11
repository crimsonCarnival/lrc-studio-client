import { useState, useRef } from 'react';
import type { FormEvent } from 'react';
import type { TFunction } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { AnimatePresence, m } from 'framer-motion';
import { FloatingInput } from '@ui/floating-input';
import { translateAuthError } from '@/shared/utils/auth-errors';
import useHapticFeedback from '@/shared/hooks/useHapticFeedback';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  AuthField, AuthHeading, OrDivider, AvatarBadge, GoogleButton,
  authInputCls, authPrimaryBtnCls, authSecondaryBtnCls,
} from './auth-shared';
import { LogoLoader } from '@ui/LogoLoader';

interface IdentifierData {
  identifier?: string;
  accountName?: string;
  avatarUrl?: string;
  hasPassword?: boolean;
  hasPasskey?: boolean;
  hasGoogle?: boolean;
}

interface LoginPasswordStepProps {
  t: TFunction;
  identifierData: IdentifierData;
  onBack: () => void;
  onLogin: (creds: { identifier?: string; password: string }) => Promise<unknown>;
  onGoogleLogin: () => void;
  onSuccess?: (result: unknown) => void;
  onSwitchToForgotPassword: () => void;
  /** Password handed back by the browser's credential manager, if it had one saved. */
  prefillPassword?: string;
}

// ─── Login Step 2 — Password ───────────────────────────────────────────────

export default function LoginPasswordStep({ t, identifierData, onBack, onLogin, onGoogleLogin, onSuccess, onSwitchToForgotPassword, prefillPassword }: LoginPasswordStepProps) {
  const [password, setPassword] = useState(prefillPassword ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { trigger: haptic } = useHapticFeedback();
  const { loginWithPasskey } = useAuthContext();

  const handlePasskey = async () => {
    setPasskeyLoading(true);
    setError('');
    try {
      const user = await loginWithPasskey(identifierData.identifier || identifierData.accountName);
      if (user) {
        onSuccess?.({ user });
      }
    } catch (err) {
      setError(translateAuthError(t, err, 'login', identifierData.identifier));
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(t('auth.validation.fieldRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.validation.passwordMinLength'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await onLogin({ identifier: identifierData.identifier, password });
      onSuccess?.(result);
    } catch (err) {
      setError(translateAuthError(t, err, 'login', identifierData.identifier));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="self-start -ml-2.5 -mb-2 h-10 px-2.5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold text-primary hover:bg-zinc-900 transition-colors"
      >
        <Icon name="arrow_back" size={16} />
        {t('auth.notYou')}
      </button>

      <div className="flex flex-col items-start gap-5">
        <AvatarBadge username={identifierData.accountName || identifierData.identifier} avatarUrl={identifierData.avatarUrl} size="lg" />
        <AuthHeading
          title={identifierData.accountName || identifierData.identifier}
          subtitle={identifierData.hasPassword === false ? t('auth.signInWithGoogle') : t('auth.enterPassword')}
        />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Present but not shown: password managers need a username field beside
            the password one to associate the credential with an account. Without
            it browsers either skip the save prompt or store an unlabelled entry. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={identifierData.identifier ?? identifierData.accountName ?? ''}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        {identifierData.hasPassword !== false && (
          <AuthField>
            <div className="relative">
              <FloatingInput
                ref={inputRef}
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                label={t('auth.password')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                error={!!error}
                className={`${authInputCls} pr-12`}
              />
              {password && (
                <button
                  type="button"
                  onClick={() => {
                    haptic('light');
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center text-foreground/65 hover:text-zinc-100 transition-colors rounded-lg"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <Icon name="visibility_off" size={16} /> : <Icon name="visibility" size={16} />}
                </button>
              )}
            </div>
            <AnimatePresence>
              {error && (
                <m.div
                  role="alert"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-[10px] bg-destructive/10 border border-destructive/30 text-sm text-destructive"
                >
                  {error}
                </m.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="self-end text-sm font-semibold text-primary hover:underline"
            >
              {t('auth.forgotPassword')}
            </button>
          </AuthField>
        )}

        {identifierData.hasPassword !== false ? (
          <button
            type="submit"
            disabled={loading || passkeyLoading || !password}
            className={authPrimaryBtnCls}
          >
            {loading
              ? <LogoLoader size={16} />
              : t('auth.loginAction')
            }
          </button>
        ) : (
          // OAuth-only account: the passkey error has no password field to sit under.
          error && <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        {identifierData.hasPasskey && (
          <button
            type="button"
            onClick={handlePasskey}
            disabled={loading || passkeyLoading}
            className={authSecondaryBtnCls}
          >
            {passkeyLoading ? (
              <LogoLoader size={16} />
            ) : (
              <>
                <Icon name="fingerprint" size={18} className="text-primary" />
                {t('auth.passkeyManagement.tryPasskey')}
              </>
            )}
          </button>
        )}

        {(identifierData.hasGoogle || identifierData.hasPassword === false) && (
          <div className="flex flex-col gap-4 mt-2">
            {identifierData.hasPassword !== false && <OrDivider t={t} />}

            <GoogleButton onClick={onGoogleLogin} t={t} />
          </div>
        )}
      </form>
    </div>
  );
}
