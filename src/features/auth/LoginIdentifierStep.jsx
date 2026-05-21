import { useState, useRef } from 'react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Zap, Lightbulb } from 'lucide-react';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Label } from '@ui/label';
import { FloatingInput } from '@ui/floating-input';
import { Tip } from '@ui/tip';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { auth } from '@/app/api';
import { FieldError, RedirectMessage, ContextBanner, GoogleButton } from './auth-shared';
import { REMEMBER_ME_KEY } from './auth-constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RE = /^[a-z0-9_-]{3,30}$/;

function normaliseIdentifier(raw) {
  const trimmed = raw.trim();
  // Strip leading @ so users can type @handle
  return trimmed.startsWith('@') ? trimmed.slice(1).toLowerCase() : trimmed;
}

function validateIdentifier(value) {
  if (!value) return 'required';
  if (EMAIL_RE.test(value)) return null;
  if (HANDLE_RE.test(value.toLowerCase())) return null;
  return 'invalid';
}

// ─── Login Step 1 — Identifier ─────────────────────────────────────────────

export default function LoginIdentifierStep({ t, onNext, onSwitchToRegister, onGoogleLogin, from, redirect }) {
  const navigate = useNavigate();
  const [rememberedIdentifier] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) || '';
    } catch {
      return '';
    }
  });

  const [identifier, setIdentifier] = useState(rememberedIdentifier);
  const [rememberMe, setRememberMe] = useState(!!rememberedIdentifier);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalised = normaliseIdentifier(identifier);
    const validationResult = validateIdentifier(normalised);
    if (validationResult === 'required') {
      setError(t('auth.validation.fieldRequired'));
      return;
    }
    if (validationResult === 'invalid') {
      setError(t('auth.validation.identifierInvalid', 'Enter a valid email or handle (e.g. @yourhandle)'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await auth.checkIdentifier(normalised);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, normalised);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
      onNext({ identifier: normalised, ...result });
    } catch (err) {
      setError(translateAuthError(t, err, 'login', normalised));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <RedirectMessage from={from} t={t} />
      <ContextBanner redirect={redirect} t={t} />
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight font-sans">
          {rememberedIdentifier ? (
            <Trans
              i18nKey="auth.loginWelcomeBack"
              values={{ name: rememberedIdentifier }}
              components={[<span key="0" className="font-heading" />]}
            />
          ) : (
            <Trans
              i18nKey="auth.loginWelcome"
              components={[<span key="0" className="font-heading" />]}
            />
          )}
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5 font-sans">
          {t('auth.loginSubtitle', 'Enter your handle or email to continue.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <Tip content={t('auth.tips.identifier', 'Enter your handle (e.g. @yourhandle) or your email address. You can type @ before the handle — it will be stripped automatically.')}>
                <Lightbulb className="size-4 text-zinc-500 cursor-help hover:text-amber-400 transition-colors" />
              </Tip>
            </div>
            <FloatingInput
              ref={inputRef}
              id="auth-identifier"
              type="text"
              label={t('auth.handleOrEmail', 'Handle or email')}
              value={identifier}
              onChange={handleIdentifierChange}
              autoComplete="username"
              error={!!error}
              className="pr-10"
            />
          </div>
          <FieldError message={error} />
        </div>

        <div className="flex items-center gap-2 mb-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(!!checked)}
            className="border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label
            htmlFor="remember-me"
            className="text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors"
          >
            {t('auth.rememberMe')}
          </Label>
        </div>

        <Button
          type="submit"
          disabled={loading || !normaliseIdentifier(identifier)}
          className="h-11 bg-primary hover:bg-primary-dim text-zinc-950 font-bold text-sm rounded-xl gap-2 disabled:opacity-40 transition-all duration-200 mt-1"
        >
          {loading
            ? <Loader2 className="size-4 animate-spin" />
            : <>{t('auth.continue', 'Continue')} <ArrowRight className="size-4" /></>
          }
        </Button>

        <div className="flex flex-col gap-4 mt-2">
          <p className="text-xs text-zinc-500 text-center">
            {t('auth.noAccount')}{' '}
            <button type="button" onClick={onSwitchToRegister} className="text-primary hover:text-primary-dim hover:underline font-semibold transition-colors">
              {t('auth.register')}
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
    </div>
  );
}
