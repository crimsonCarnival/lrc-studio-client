import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, Lightbulb, Fingerprint } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { Tip } from '@ui/tip';
import { translateAuthError } from '@/shared/utils/auth-errors';
import useHapticFeedback from '@/shared/hooks/useHapticFeedback';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { FieldError, AvatarBadge, GoogleButton } from './auth-shared';

// ─── Login Step 2 — Password ───────────────────────────────────────────────

export default function LoginPasswordStep({ t, identifierData, onBack, onLogin, onGoogleLogin, onSuccess, onSwitchToForgotPassword }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const inputRef = useRef(null);
  const { trigger: haptic } = useHapticFeedback();
  const { loginWithPasskey } = useAuthContext();

  useEffect(() => {
    // autoFocus removed as requested
  }, []);

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

  const handleSubmit = async (e) => {
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
    <div className="animate-fade-in">
      {/* User persona card */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-3 mb-8 group w-full text-left"
      >
        <AvatarBadge username={identifierData.accountName} avatarUrl={identifierData.avatarUrl} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-200 truncate">
            {identifierData.accountName || identifierData.identifier}
          </p>
          <p className="text-xs text-zinc-500 flex items-center gap-1 group-hover:text-primary transition-colors">
            <ArrowLeft className="size-3" />
            {t('auth.notYou', 'Not you? Change account')}
          </p>
        </div>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight font-heading">
          {identifierData.hasPassword === false
            ? t('auth.signInWithGoogle', 'Sign in with Google to continue.')
            : t('auth.enterPassword', 'Enter your password.')
          }
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {identifierData.hasPassword !== false && (
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10">
                <Tip content={t('auth.tips.loginPassword', 'Your account password. Use "Forgot password?" if you can\'t remember it.')}>
                  <Lightbulb className="size-4 text-zinc-500 cursor-help hover:text-amber-400 transition-colors" />
                </Tip>
              </div>
              <FloatingInput
                ref={inputRef}
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                label={t('auth.password')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                error={!!error}
                className="pr-20 focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:outline-none"
              />
              {password && (
                <m.button
                  type="button"
                  onClick={() => {
                    haptic('light');
                    setShowPassword(!showPassword);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors rounded-lg z-10 focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:outline-none"
                  aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </m.button>
              )}
            </div>
            <AnimatePresence>
              {error && (
                <m.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
                >
                  {error}
                </m.div>
              )}
            </AnimatePresence>
            {!error && <FieldError message={error} />}
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-xs lg:text-xs text-primary hover:text-primary-dim hover:underline font-semibold transition-colors text-right mt-1"
            >
              {t('auth.forgotPassword', 'Forgot password?')}
            </button>
          </div>
        )}

        {identifierData.hasPassword !== false ? (
          <m.button
            type="submit"
            disabled={loading || passkeyLoading || !password}
            whileTap={{ scale: 0.98 }}
            className="h-12 lg:h-10 bg-primary hover:bg-primary-dim text-zinc-950 font-normal text-base lg:text-sm rounded-xl disabled:opacity-40 transition-all duration-200 mt-1 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:outline-none"
          >
            {loading
              ? <Loader2 className="size-4 animate-spin" />
              : t('auth.loginAction')
            }
          </m.button>
        ) : null}

        {identifierData.hasPasskey && (
          <m.button
            type="button"
            onClick={handlePasskey}
            disabled={loading || passkeyLoading}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 h-12 lg:h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-normal text-base lg:text-sm rounded-xl disabled:opacity-40 transition-all duration-200 disabled:cursor-not-allowed focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:outline-none border border-zinc-700"
          >
            {passkeyLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Fingerprint className="size-4 text-primary" />
                {t('auth.passkeyManagement.tryPasskey', 'Sign in with Passkey or QR Code')}
              </>
            )}
          </m.button>
        )}

        {(identifierData.hasGoogle || identifierData.hasPassword === false) && (
          <div className="flex flex-col gap-4 mt-2">
            {identifierData.hasPassword !== false && (
              <div className="flex items-center gap-3 px-8">
                <div className="flex-1 h-px bg-zinc-800/40" />
                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em] leading-none">{t('common.or', 'OR')}</span>
                <div className="flex-1 h-px bg-zinc-800/40" />
              </div>
            )}

            <GoogleButton onClick={onGoogleLogin} t={t} />
          </div>
        )}
      </form>
    </div>
  );
}
