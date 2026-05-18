import { useState } from 'react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { translateAuthError } from '@/shared/utils/auth-errors';
import PasswordStrength from './components/PasswordStrength.jsx';
import RegistrationBlockedModal from './RegistrationBlockedModal';
import { FieldError, ErrorBanner, ContextBanner, GoogleButton } from './auth-shared';

// ─── Register Form ─────────────────────────────────────────────────────────

export default function SignUpForm({ t, onSwitchToLogin, onRegister, onGoogleLogin, onSuccess, redirect }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');

  const validate = () => {
    const errs = {};
    if (username && username.length < 3) errs.username = t('auth.validation.usernameMinLength');
    if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) errs.username = t('auth.validation.usernamePattern');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('auth.validation.emailInvalid');
    if (!username && !email) errs.username = t('auth.validation.fieldRequired');
    if (!password) errs.password = t('auth.validation.fieldRequired');
    else if (password.length < 8) errs.password = t('auth.validation.passwordMinLength');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setError('');
    setLoading(true);
    try {
      await onRegister({ username: username || undefined, email: email || undefined, password });
      onSuccess?.();
    } catch (err) {
      if (err.status === 403) {
        setBlockedMessage(translateAuthError(t, err, 'register', username || email));
        setShowBlockedModal(true);
      } else {
        setError(translateAuthError(t, err, 'register', username || email));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in font-sans">
      <ContextBanner redirect={redirect} t={t} />
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight font-sans">
          <Trans
            i18nKey="auth.registerWelcome"
            components={[<span key="0" className="font-heading" />]}
          />
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          {t('auth.registerSubtitle', 'Username or email — at least one is required.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <ErrorBanner message={error} />

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <FloatingInput
            id="reg-username"
            type="text"
            label={t('auth.username')}
            value={username}
            onChange={(e) => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: undefined })); }}
            autoComplete="username"
            maxLength={30}
            error={!!fieldErrors.username}
          />
          <FieldError message={fieldErrors.username} />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <FloatingInput
            id="reg-email"
            type="email"
            label={t('auth.email')}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
            autoComplete="email"
            error={!!fieldErrors.email}
          />
          <FieldError message={fieldErrors.email} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-zinc-800/50" />
          <div className="flex-1 h-px bg-zinc-800/50" />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <FloatingInput
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              label={t('auth.password')}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
              autoComplete="new-password"
              error={!!fieldErrors.password}
              className="pr-11"
            />
            {password && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg z-10"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            )}
          </div>
          <PasswordStrength password={password} />
          <FieldError message={fieldErrors.password} />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 bg-primary hover:bg-primary-dim text-zinc-950 font-bold text-sm rounded-xl disabled:opacity-40 transition-all duration-200 mt-2"
        >
          {loading
            ? <Loader2 className="size-4 animate-spin" />
            : t('auth.registerAction')
          }
        </Button>

        <div className="flex flex-col gap-4 mt-4">
          <p className="text-xs text-zinc-500 text-center">
            {t('auth.hasAccount')}{' '}
            <button type="button" onClick={onSwitchToLogin} className="text-primary hover:text-primary-dim hover:underline font-semibold transition-colors">
              {t('auth.login')}
            </button>
          </p>

          <div className="flex items-center gap-3 px-8">
            <div className="flex-1 h-px bg-zinc-800/40" />
            <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em] leading-none">{t('common.or', 'OR')}</span>
            <div className="flex-1 h-px bg-zinc-800/40" />
          </div>

          {/* Google Login Button */}
          <GoogleButton onClick={onGoogleLogin} t={t} />

          <button
            type="button"
            onClick={() => navigate('/project/new')}
            className="group flex items-center justify-center gap-2 py-1 text-xs font-semibold text-zinc-500 hover:text-primary transition-all duration-300"
          >
            <Zap className="size-3.5 text-zinc-600 group-hover:text-primary group-hover:fill-primary/20 transition-all" />
            {t('auth.guestMode', 'Continue as Guest')}
          </button>
        </div>
      </form>

      <RegistrationBlockedModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        errorDetails={blockedMessage}
      />
    </div>
  );
}
