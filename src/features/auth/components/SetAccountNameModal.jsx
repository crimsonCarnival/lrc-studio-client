import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { m as M, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { z } from 'zod';
import { AlertCircle, ArrowRight, Loader2, User } from 'lucide-react';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { auth } from '@/app/api';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { useAuthContext } from '@/features/auth/AuthContext';

const identifierSchema = z.string()
  .min(3, 'auth.validation.accountNamePattern')
  .max(30, 'auth.validation.accountNamePattern')
  .regex(/^[a-z0-9_-]{3,30}$/, 'auth.validation.accountNamePattern');

function normaliseIdentifier(raw) {
  const trimmed = raw.trim();
  return trimmed.startsWith('@') ? trimmed.slice(1).toLowerCase() : trimmed;
}

export default function SetAccountNameModal() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  // Pre-fill with the auto-generated name so the user can see what they have
  // and edit it in-place. Lazy initializer runs once at mount — no effect needed.
  const [accountName, setAccountName] = useState(() => user?.accountName ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const isOpen = user && !user.lastAccountNameChangedAt && !user.hasPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalised = normaliseIdentifier(accountName);

    if (normalised === user.accountName) {
      // If they just kept the auto-generated one and clicked continue, we should just update it anyway
      // to set `lastAccountNameChangedAt` so it doesn't prompt them again.
    } else {
      const validation = identifierSchema.safeParse(normalised);
      if (!validation.success) {
        setError(t(validation.error.issues[0].message, 'Invalid account name format.'));
        return;
      }
    }

    setError('');
    setLoading(true);
    try {
      await auth.updateProfile({ accountName: normalised });
      setUser((prev) => ({ 
        ...prev, 
        accountName: normalised, 
        lastAccountNameChangedAt: new Date().toISOString() 
      }));
    } catch (err) {
      setError(translateAuthError(t, err, 'updateProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // If they skip, we still want to dismiss the modal, but how? We must set lastAccountNameChangedAt locally
    // but the backend needs to know too. We can just send their existing accountName to the backend to set the timestamp.
    handleSubmit({ preventDefault: () => {} });
  };

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isOpen && (
          <M.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
          {/* Backdrop */}
          <M.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
          />

          {/* Modal */}
          <M.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <User className="size-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-zinc-100 font-sans tracking-tight mb-2">
                {t('auth.setAccountName.title', 'Choose your username')}
              </h2>
              <p className="text-sm text-zinc-400 font-sans">
                {t('auth.setAccountName.subtitle', 'We generated a username for you, but you can change it now.')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <FloatingInput
                  ref={inputRef}
                  id="account-name"
                  type="text"
                  label={t('auth.accountName', 'Account Name')}
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setError('');
                  }}
                  error={!!error}
                  autoComplete="off"
                />
                
                {error ? (
                  <div className="flex items-start gap-1.5 text-red-400 mt-1">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">{error}</p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 ml-1 mt-1">
                    {t('auth.setAccountName.hint', 'Only letters, numbers, dashes, and underscores. 3-30 characters.')}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={loading}
                  className="sm:w-1/3 h-11 text-zinc-400 hover:text-zinc-200"
                >
                  {t('common.keepGenerated', 'Keep This')}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !accountName.trim()}
                  className="sm:w-2/3 h-11 bg-primary hover:bg-primary-dim text-zinc-950 font-medium"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      {t('common.save', 'Save Username')}
                      <ArrowRight className="size-4 ml-1.5" />
                    </>
                  )}
                </Button>
                </div>
              </form>
            </M.div>
          </M.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
