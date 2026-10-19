import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { AnimatePresence, m as M } from 'framer-motion';
import { z } from 'zod';
import { FloatingInput } from '@ui/floating-input';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { auth } from '@/app/api';
import PasswordStrength from './components/PasswordStrength.jsx';
import RegistrationBlockedModal from './RegistrationBlockedModal';
import {
  AuthField, AuthHeading, OrDivider, ContextBanner, GoogleButton,
} from './auth-shared';
import { Button } from '@ui/button';

// The account name is required, not one identifier of two: `/:accountName` is the
// profile URL and every project URL is scoped under it, so an account without one
// could not be addressed at all. The server enforces the same rule on /auth/register,
// and this keeps a blank handle from becoming a raw 400 from the schema validator.
const step1Schema = z.object({
  displayName: z.string().min(1, 'auth.validation.fieldRequired'),
  accountName: z.string()
    .min(1, 'auth.validation.fieldRequired')
    .regex(/^[a-z0-9_-]{3,30}$/, 'auth.validation.accountNamePattern'),
});

const step2Schema = z.object({
  email: z.string().email('auth.validation.emailInvalid').optional().or(z.literal('')),
  accountName: z.string().min(1, 'auth.validation.fieldRequired'),
  password: z.string()
    .min(1, 'auth.validation.fieldRequired')
    .min(8, 'auth.validation.passwordMinLength'),
  confirmPassword: z.string().min(1, 'auth.validation.fieldRequired'),
}).refine(
  (d) => d.password === d.confirmPassword,
  { message: 'auth.validation.passwordMismatch', path: ['confirmPassword'] }
);

type FieldErrors = Record<string, string | undefined>;
type TranslateFn = (key: string, def?: string) => string;

function zodErrors(result: { error?: z.ZodError }, t: TranslateFn): FieldErrors {
  const errs: FieldErrors = {};
  for (const issue of result.error?.issues ?? []) {
    const key = String(issue.path[0] ?? '');
    if (key && !errs[key]) errs[key] = t(issue.message, issue.message);
  }
  return errs;
}

function generateHandle(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22);
  if (!base) return '';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${suffix}`;
}

// ─── Step indicator ────────────────────────────────────────────────────────

function StepIndicator({ step, t }: { step: number; t: TFunction }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[13px] text-subtle">
      <span className="inline-flex gap-1.5" aria-hidden="true">
        {[1, 2].map(n => (
          <span
            key={n}
            className={`w-10 h-1 rounded-sm transition-colors duration-[var(--duration-state)] ${n <= step ? 'bg-iris' : 'bg-hl'}`}
          />
        ))}
      </span>
      {t('auth.stepOf', { step, total: 2 })}
    </p>
  );
}

// ─── Register Form ─────────────────────────────────────────────────────────

interface RegisterData {
  displayName?: string;
  accountName?: string;
  email?: string;
  password: string;
}

export type SignUpIdentity = { displayName: string; accountName: string };

interface SignUpFormProps {
  t: TFunction;
  onSwitchToLogin: () => void;
  onRegister: (data: RegisterData) => Promise<unknown>;
  onGoogleLogin: () => void;
  onSuccess?: (result: unknown) => void;
  redirect?: string;
  onDismissRedirect?: () => void;
  /** Mirrors the step-1 fields out so the page can render the live "how you'll appear" card. */
  onIdentityChange?: (identity: SignUpIdentity) => void;
}

export default function SignUpForm({ t, onSwitchToLogin, onRegister, onGoogleLogin, onSuccess, redirect, onDismissRedirect, onIdentityChange }: SignUpFormProps) {
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [displayName, setDisplayName] = useState('');
  const [accountName, setAccountName] = useState('');
  const accountNameTouchedRef = useRef(false);

  // Step 2 fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');

  const tk = t as TranslateFn;

  useEffect(() => {
    onIdentityChange?.({ displayName, accountName });
  }, [displayName, accountName, onIdentityChange]);

  const handleDisplayNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    setFieldErrors(p => ({ ...p, displayName: undefined }));
    if (!accountNameTouchedRef.current) {
      setAccountName(val ? generateHandle(val) : '');
    }
  }, []);

  const handleAccountNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setAccountName(val);
    accountNameTouchedRef.current = true;
    setFieldErrors(p => ({ ...p, accountName: undefined }));
  }, []);

  const validateStep1 = (): FieldErrors => {
    const result = step1Schema.safeParse({ displayName: displayName.trim(), accountName });
    return result.success ? {} : zodErrors(result, tk);
  };

  const validateStep2 = (): FieldErrors => {
    const result = step2Schema.safeParse({ email, accountName, password, confirmPassword });
    return result.success ? {} : zodErrors(result, tk);
  };

  const handleNext = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateStep1();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Verify the accountName isn't already taken before advancing
    if (accountName) {
      setLoading(true);
      try {
        await auth.checkIdentifier(accountName);
        // If checkIdentifier resolves, the account already exists — block advance
        setFieldErrors(p => ({ ...p, accountName: t('auth.errors.accountName_taken') }));
        setLoading(false);
        return;
      } catch (err) {
        // 404 means no account found — safe to proceed
        if ((err as { status?: number })?.status !== 404) {
          // Some other error (e.g. banned IP) — surface it
          setError(translateAuthError(t, err, 'register', accountName));
          setLoading(false);
          return;
        }
      } finally {
        setLoading(false);
      }
    }

    setError('');
    setStep(2);
  };

  const handleBack = () => {
    setError('');
    setFieldErrors({});
    setStep(1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateStep2();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setError('');
    setLoading(true);
    try {
      const result = await onRegister({
        displayName: displayName.trim() || undefined,
        accountName: accountName || undefined,
        email: email || undefined,
        password,
      });
      onSuccess?.(result);
    } catch (err) {
      if ((err as { status?: number }).status === 403) {
        setBlockedMessage(translateAuthError(t, err, 'register', accountName || email));
        setShowBlockedModal(true);
      } else {
        setError(translateAuthError(t, err, 'register', accountName || email));
      }
    } finally {
      setLoading(false);
    }
  };

  const loginLink = (
    <p className="text-sm text-foreground/65">
      {t('auth.hasAccount')}{' '}
      <Button type="button" variant="link" size={null} onClick={onSwitchToLogin} className="text-sm">
        {t('auth.login')}
      </Button>
    </p>
  );

  return (
    <div className="animate-fade-in flex flex-col gap-[22px]">
      {redirect && (
        <div className="-mb-[22px]">
          <ContextBanner redirect={redirect} t={t} onDismiss={onDismissRedirect} />
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        <StepIndicator step={step} t={t} />
        <AuthHeading
          title={<Trans i18nKey="auth.registerWelcome" components={[<span key="0" />]} />}
          subtitle={step === 1 ? t('auth.registerSubtitle') : t('auth.registerSubtitleStep2')}
        />
      </div>

      <AnimatePresence>
        {error && (
          <M.div
            role="alert"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="p-3 rounded-[10px] bg-destructive/10 border border-destructive/30 text-sm text-destructive"
          >
            {error}
          </M.div>
        )}
      </AnimatePresence>

      {/* ── Step 1: Identity ── */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <M.div
            key="step1"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }}
            className="flex flex-col gap-[22px]"
          >
            <form onSubmit={handleNext} noValidate className="flex flex-col gap-[22px]">
              <AuthField error={fieldErrors.displayName}>
                <FloatingInput
                  id="reg-displayName"
                  type="text"
                  label={t('auth.displayName')}
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  autoComplete="nickname"
                  maxLength={50}
                  error={!!fieldErrors.displayName}
                />
              </AuthField>

              <AuthField error={fieldErrors.accountName} hint={t('auth.accountNameHint')}>
                <FloatingInput
                  id="reg-accountName"
                  type="text"
                  label={t('auth.accountName')}
                  value={accountName}
                  onChange={handleAccountNameChange}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={30}
                  error={!!fieldErrors.accountName}
                  className="font-mono"
                />
              </AuthField>

              <Button
                type="submit"
                loading={loading}
                disabled={!displayName.trim()}
                className="h-[52px] w-full text-[17px] lg:h-[52px] lg:text-[17px]"
              >
                {t('auth.continue')}
              </Button>
            </form>

            <OrDivider t={t} />

            <div className="grid grid-cols-2 gap-2.5">
              <GoogleButton onClick={onGoogleLogin} t={t} short />
              <Button asChild variant="outline" className="h-[52px] gap-2.5 bg-transparent text-[17px] lg:h-[52px] lg:text-[17px]">
                <Link to="/project/new">
                  <Icon name="bolt" size={16} />
                  {t('auth.guestShort')}
                </Link>
              </Button>
            </div>

            {loginLink}
          </M.div>
        )}

        {/* ── Step 2: Credentials ── */}
        {step === 2 && (
          <M.form
            key="step2"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-[22px]"
          >
            <AuthField error={fieldErrors.email}>
              <FloatingInput
                id="reg-email"
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                autoComplete="email"
                error={!!fieldErrors.email}
              />
            </AuthField>

            <AuthField error={fieldErrors.password}>
              <div className="relative">
                <FloatingInput
                  id="reg-password"
                  label={t('auth.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  autoComplete="new-password"
                  error={!!fieldErrors.password}
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
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />
                  </Button>
                )}
              </div>
              <PasswordStrength password={password} />
            </AuthField>

            <AuthField error={fieldErrors.confirmPassword}>
              <div className="relative">
                <FloatingInput
                  id="reg-confirm-password"
                  label={t('auth.confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: undefined })); }}
                  autoComplete="new-password"
                  error={!!fieldErrors.confirmPassword}
                  className="pr-12"
                />
                {confirmPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-1.5 top-1/2 size-9 -translate-y-1/2 lg:size-9"
                    aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    <Icon name={showConfirm ? 'visibility_off' : 'visibility'} size={16} />
                  </Button>
                )}
              </div>
            </AuthField>

            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBack}
                aria-label={t('common.back')}
                className="size-11 bg-transparent lg:size-11"
              >
                <Icon name="arrow_back" size={16} />
              </Button>
              <Button type="submit" loading={loading} className="h-[52px] flex-1 text-[17px] lg:h-[52px] lg:text-[17px]">
                {loading ? t('auth.registerActionLoading') : t('auth.registerAction')}
              </Button>
            </div>

            {loginLink}
          </M.form>
        )}
      </AnimatePresence>

      <RegistrationBlockedModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        errorDetails={blockedMessage}
      />
    </div>
  );
}
