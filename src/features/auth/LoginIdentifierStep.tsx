import { useState } from 'react';
import type { FormEvent } from 'react';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { z } from 'zod';
import { FloatingInput } from '@ui/floating-input';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { auth } from '@/app/api';
import {
  AuthField, AuthHeading, OrDivider, RedirectMessage, ContextBanner, GoogleButton,
  authInputCls, authPrimaryBtnCls,
} from './auth-shared';
import { LogoLoader } from '@ui/LogoLoader';

const identifierSchema = z.string().refine(
  (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[a-z0-9_-]{3,30}$/.test(v.toLowerCase()),
  { message: 'invalid' }
);

function normaliseIdentifier(raw: string) {
  const trimmed = raw.trim();
  return trimmed;
}

function validateIdentifier(value: string) {
  if (!value) return 'required';
  return identifierSchema.safeParse(value).success ? null : 'invalid';
}

interface LoginIdentifierStepProps {
  t: TFunction;
  onNext: (data: { identifier: string; [key: string]: unknown }) => void;
  onSwitchToRegister: () => void;
  onGoogleLogin: () => void;
  from?: string;
  redirect?: string;
  onDismissRedirect?: () => void;
  /** Present only when remembered accounts exist — returns to the account picker. */
  onBackToSavedAccounts?: () => void;
  /** Label for that back control; names the account when there is exactly one. */
  backLabel?: string;
}

// ─── Login Step 1 — Identifier ─────────────────────────────────────────────

export default function LoginIdentifierStep({ t, onNext, onSwitchToRegister, onGoogleLogin, from, redirect, onDismissRedirect, onBackToSavedAccounts, backLabel }: LoginIdentifierStepProps) {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalised = normaliseIdentifier(identifier);
    const validationResult = validateIdentifier(normalised);
    if (validationResult === 'required') {
      setError(t('auth.validation.fieldRequired'));
      return;
    }
    if (validationResult === 'invalid') {
      setError(t('auth.validation.identifierInvalid'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await auth.checkIdentifier(normalised) as Record<string, unknown>;
      onNext({ identifier: normalised, ...result });
    } catch (err) {
      setError(translateAuthError(t, err, 'login', normalised));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {onBackToSavedAccounts && (
        <button
          type="button"
          onClick={onBackToSavedAccounts}
          className="self-start -ml-2.5 -mb-2 h-10 px-2.5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold text-primary hover:bg-zinc-900 transition-colors"
        >
          <Icon name="arrow_back" size={16} />
          {backLabel}
        </button>
      )}

      {(from || redirect) && (
        <div className="-mb-6">
          <RedirectMessage from={from} t={t} />
          <ContextBanner redirect={redirect} t={t} onDismiss={onDismissRedirect} />
        </div>
      )}

      <AuthHeading title={t('auth.signIn')} subtitle={t('auth.loginSubtitle')} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <AuthField error={error}>
          <FloatingInput
            id="auth-identifier"
            type="text"
            label={t('auth.handleOrEmail')}
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            error={!!error}
            className={authInputCls}
          />
        </AuthField>

        <button
          type="submit"
          disabled={loading || !normaliseIdentifier(identifier)}
          className={authPrimaryBtnCls}
        >
          {loading ? <LogoLoader size={16} /> : t('auth.continue')}
        </button>
      </form>

      <OrDivider t={t} />

      <div className="flex flex-col gap-2.5">
        <GoogleButton onClick={onGoogleLogin} t={t} />
        <Link
          to="/project/new"
          className="h-11 inline-flex items-center justify-center text-[15px] font-semibold text-foreground/80 hover:text-primary transition-colors"
        >
          {t('auth.guestMode')}
        </Link>
      </div>

      <p className="text-sm text-foreground/65">
        {t('auth.noAccount')}{' '}
        <button type="button" onClick={onSwitchToRegister} className="font-semibold text-primary hover:underline">
          {t('auth.register')}
        </button>
      </p>
    </div>
  );
}
