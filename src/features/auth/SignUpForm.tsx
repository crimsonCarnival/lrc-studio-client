import { useState, useCallback, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import { AnimatePresence, m as M } from 'framer-motion';
import { z } from 'zod';
import { FloatingInput } from '@ui/floating-input';
import { Tip } from '@ui/tip';
import { translateAuthError } from '@/shared/utils/auth-errors';
import useHapticFeedback from '@/shared/hooks/useHapticFeedback';
import { auth } from '@/app/api';
import PasswordStrength from './components/PasswordStrength.jsx';
import RegistrationBlockedModal from './RegistrationBlockedModal';
import { FieldError, ContextBanner, GoogleButton } from './auth-shared';

const step1Schema = z.object({
  displayName: z.string().min(1, 'auth.validation.fieldRequired'),
  accountName: z.string()
    .regex(/^[a-z0-9_-]{3,30}$/, 'auth.validation.accountNamePattern')
    .optional()
    .or(z.literal('')),
});

const step2Schema = z.object({
  email: z.string().email('auth.validation.emailInvalid').optional().or(z.literal('')),
  accountName: z.string().optional().or(z.literal('')),
  password: z.string()
    .min(1, 'auth.validation.fieldRequired')
    .min(8, 'auth.validation.passwordMinLength'),
  confirmPassword: z.string().min(1, 'auth.validation.fieldRequired'),
}).refine(
  (d) => !d.email || d.accountName || d.email,
  { message: 'auth.validation.emailOrHandleRequired', path: ['email'] }
).refine(
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

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2].map(n => (
        <div
          key={n}
          className={`h-1 rounded-full transition-all duration-300 ${
            n === step ? 'w-6 bg-primary' : 'w-3 bg-zinc-700'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Register Form ─────────────────────────────────────────────────────────

interface RegisterData {
  displayName?: string;
  accountName?: string;
  email?: string;
  password: string;
}

interface SignUpFormProps {
  t: TFunction;
  onSwitchToLogin: () => void;
  onRegister: (data: RegisterData) => Promise<unknown>;
  onGoogleLogin: () => void;
  onSuccess?: (result: unknown) => void;
  redirect?: string;
}

export default function SignUpForm({ t, onSwitchToLogin, onRegister, onGoogleLogin, onSuccess, redirect }: SignUpFormProps) {
  const navigate = useNavigate();
  const { trigger: haptic } = useHapticFeedback();

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

  const focusRingCls = 'focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:outline-none';

  return (
    <div className="animate-fade-in font-sans">
      <ContextBanner redirect={redirect} t={t} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight font-sans">
          <Trans i18nKey="auth.registerWelcome" components={[<span key="0" className="font-heading" />]} />
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {step === 1
            ? t('auth.registerSubtitle')
            : t('auth.registerSubtitleStep2')}
        </p>
      </div>

      <StepDots step={step} />

      <AnimatePresence>
        {error && (
          <M.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
          >
            {error}
          </M.div>
        )}
      </AnimatePresence>

      {/* ── Step 1: Identity ── */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <M.form
            key="step1"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }}
            onSubmit={handleNext}
            noValidate
            className="flex flex-col gap-4"
          >
            {/* Display name */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <Tip content={t('auth.tips.displayName')}>
                    <Lightbulb className="size-4 text-zinc-500 cursor-help hover:text-amber-400 transition-colors" />
                  </Tip>
                </div>
                <FloatingInput
                  id="reg-displayName"
                  type="text"
                  label={t('auth.displayName')}
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  autoComplete="name"
                  maxLength={50}
                  error={!!fieldErrors.displayName}
                  className={`pr-10 ${focusRingCls}`}
                />
              </div>
              <FieldError message={fieldErrors.displayName} />
            </div>

            {/* Handle — prefix input, no FloatingInput to avoid label/@ overlap */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-stretch rounded-xl border border-zinc-700/50 overflow-hidden focus-within:border-primary/60 transition-colors">
                <span className="flex items-center px-3 text-zinc-500 text-sm bg-zinc-800/40 select-none border-r border-zinc-700/50">
                  @
                </span>
                <div className="relative flex-1">
                  <input
                    id="reg-accountName"
                    type="text"
                    value={accountName}
                    onChange={handleAccountNameChange}
                    autoComplete="username"
                    maxLength={30}
                    placeholder={t('auth.accountNamePlaceholder')}
                    className="w-full h-12 bg-transparent px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                    <Tip content={t('auth.tips.accountName')}>
                      <Lightbulb className="size-4 text-zinc-500 cursor-help hover:text-amber-400 transition-colors" />
                    </Tip>
                  </div>
                </div>
              </div>
              {fieldErrors.accountName
                ? <FieldError message={fieldErrors.accountName} />
                : accountName && (
                  <p className="text-[11px] text-zinc-600 ml-1">{t('auth.accountNameHint')}</p>
                )}
            </div>

            <M.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              className={`h-12 lg:h-10 bg-primary hover:bg-primary-dim text-zinc-950 font-normal text-base lg:text-sm rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2 ${focusRingCls}`}
            >
              {t('auth.continue')}
              <ArrowRight className="size-4" />
            </M.button>

            <div className="flex flex-col gap-4 mt-2">
              <p className="text-xs text-zinc-500 text-center">
                {t('auth.hasAccount')}{' '}
                <button type="button" onClick={onSwitchToLogin} className="text-primary hover:text-primary-dim hover:underline font-semibold transition-colors">
                  {t('auth.login')}
                </button>
              </p>
              <div className="flex items-center gap-3 px-8">
                <div className="flex-1 h-px bg-zinc-800/40" />
                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em] leading-none">{t('common.or')}</span>
                <div className="flex-1 h-px bg-zinc-800/40" />
              </div>
              <GoogleButton onClick={onGoogleLogin} t={t} />
              <button
                type="button"
                onClick={() => navigate('/project/new')}
                className="group flex items-center justify-center gap-2 py-1 text-xs font-semibold text-zinc-500 hover:text-primary transition-all duration-300"
              >
                <Zap className="size-3.5 text-zinc-600 group-hover:text-primary group-hover:fill-primary/20 transition-all" />
                {t('auth.guestMode')}
              </button>
            </div>
          </M.form>
        )}

        {/* ── Step 2: Credentials ── */}
        {step === 2 && (
          <M.form
            key="step2"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <Tip content={t('auth.tips.email')}>
                    <Lightbulb className="size-4 text-zinc-500 cursor-help hover:text-amber-400 transition-colors" />
                  </Tip>
                </div>
                <FloatingInput
                  id="reg-email"
                  type="email"
                  label={t('auth.email')}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  autoComplete="email"
                  error={!!fieldErrors.email}
                  className={`pr-10 ${focusRingCls}`}
                />
              </div>
              <FieldError message={fieldErrors.email} />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
                  <Tip content={t('auth.tips.password')}>
                    <Lightbulb className="size-4 text-zinc-500 cursor-help hover:text-amber-400 transition-colors" />
                  </Tip>
                  {password && (
                    <M.button
                      type="button"
                      onClick={() => { haptic('light'); setShowPassword(!showPassword); }}
                      whileTap={{ scale: 0.95 }}
                      className={`h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors rounded-lg ${focusRingCls}`}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </M.button>
                  )}
                </div>
                <FloatingInput
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  label={t('auth.password')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  autoComplete="new-password"
                  error={!!fieldErrors.password}
                  className={`pr-20 ${focusRingCls}`}
                />
              </div>
              <PasswordStrength password={password} />
              <FieldError message={fieldErrors.password} />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
                  <Tip content={t('auth.tips.confirmPassword')}>
                    <Lightbulb className="size-4 text-zinc-500 cursor-help hover:text-amber-400 transition-colors" />
                  </Tip>
                  {confirmPassword && (
                    <M.button
                      type="button"
                      onClick={() => { haptic('light'); setShowConfirm(!showConfirm); }}
                      whileTap={{ scale: 0.95 }}
                      className={`h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors rounded-lg ${focusRingCls}`}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </M.button>
                  )}
                </div>
                <FloatingInput
                  id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  label={t('auth.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: undefined })); }}
                  autoComplete="new-password"
                  error={!!fieldErrors.confirmPassword}
                  className={`pr-20 ${focusRingCls}`}
                />
              </div>
              <FieldError message={fieldErrors.confirmPassword} />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={handleBack}
                className={`h-12 lg:h-10 flex items-center justify-center gap-2 px-4 rounded-xl border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 font-semibold text-sm transition-all ${focusRingCls}`}
              >
                <ArrowLeft className="size-4" />
              </button>
              <M.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 h-12 lg:h-10 bg-primary hover:bg-primary-dim text-zinc-950 font-normal text-base lg:text-sm rounded-xl disabled:opacity-40 transition-all duration-200 disabled:cursor-not-allowed ${focusRingCls}`}
              >
                {loading
                  ? (
                    <div className="flex items-center gap-2 justify-center">
                      <M.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}
                        className="size-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>{t('auth.registerActionLoading')}</span>
                    </div>
                  )
                  : t('auth.registerAction')
                }
              </M.button>
            </div>

            <p className="text-xs text-zinc-500 text-center mt-2">
              {t('auth.hasAccount')}{' '}
              <button type="button" onClick={onSwitchToLogin} className="text-primary hover:text-primary-dim hover:underline font-semibold transition-colors">
                {t('auth.login')}
              </button>
            </p>
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
