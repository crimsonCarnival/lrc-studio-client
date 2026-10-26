import { useState, useRef } from 'react';
import type { FormEvent } from 'react';
import type { TFunction } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { AnimatePresence, m } from 'framer-motion';
import { FloatingInput } from '@ui/floating-input';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  AuthField, OrDivider, AvatarBadge, GoogleButton,
} from './auth-shared';
import { Button } from '@ui/button';
import type { IdentifierData } from '@/features/auth/auth.types';

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
      {/* Account card: who is signing in, with the way back to pick another account. */}
      <div className="flex items-center gap-3.5 rounded-[14px] bg-background px-3.5 py-3 inset-ring inset-ring-hl">
        <AvatarBadge accountName={identifierData.accountName || identifierData.identifier} avatarUrl={identifierData.avatarUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="truncate font-heading text-xl font-bold tracking-tight text-foreground">
            {identifierData.accountName || identifierData.identifier}
          </h1>
          <p className="text-sm text-subtle">
            {identifierData.hasPassword === false ? t('auth.signInWithGoogle') : t('auth.enterPassword')}
          </p>
        </div>
        <Button type="button" variant="ghost" size={null} onClick={onBack} className="h-10 shrink-0 px-2.5 text-[15px] text-primary-ink">
          {t('auth.notYou')}
        </Button>
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
                className="pr-12"
              />
              {password && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 size-9 -translate-y-1/2 lg:size-9"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <Icon name="visibility_off" size={16} /> : <Icon name="visibility" size={16} />}
                </Button>
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
            <Button
              type="button"
              variant="link"
              size={null}
              onClick={onSwitchToForgotPassword}
              className="self-end text-sm"
            >
              {t('auth.forgotPassword')}
            </Button>
          </AuthField>
        )}

        {identifierData.hasPassword !== false ? (
          <Button
            type="submit"
            loading={loading}
            disabled={passkeyLoading || !password}
            className="h-[52px] w-full text-[17px] lg:h-[52px] lg:text-[17px]"
          >
            {t('auth.loginAction')}
          </Button>
        ) : (
          // OAuth-only account: the passkey error has no password field to sit under.
          error && <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        {identifierData.hasPasskey && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePasskey}
            loading={passkeyLoading}
            disabled={loading}
            className="h-[52px] w-full gap-2.5 text-[17px] lg:h-[52px] lg:text-[17px]"
          >
            {!passkeyLoading && <Icon name="fingerprint" size={18} className="text-primary" />}
            {t('auth.passkeyManagement.tryPasskey')}
          </Button>
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
