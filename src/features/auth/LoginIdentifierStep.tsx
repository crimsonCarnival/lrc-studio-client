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
} from './auth-shared';
import { Button } from '@ui/button';

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
        <Button
          type="button"
          variant="ghost"
          size={null}
          onClick={onBackToSavedAccounts}
          className="-mb-2 -ml-2.5 h-10 gap-2 self-start px-2.5 text-sm text-primary-ink"
        >
          <Icon name="arrow_back" size={16} />
          {backLabel}
        </Button>
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
          />
        </AuthField>

        <Button
          type="submit"
          loading={loading}
          disabled={!normaliseIdentifier(identifier)}
          className="h-[52px] w-full text-[17px] lg:h-[52px] lg:text-[17px]"
        >
          {t('auth.continue')}
        </Button>
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
        <Button type="button" variant="link" size={null} onClick={onSwitchToRegister} className="text-sm">
          {t('auth.register')}
        </Button>
      </p>
    </div>
  );
}
