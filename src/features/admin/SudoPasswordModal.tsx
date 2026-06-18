import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Loader2, Fingerprint } from 'lucide-react';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog';
import { onSudoPrompt, submitSudoPassword, submitSudoPasskey, cancelSudo, getSudoFactors } from './services/sudo';

interface SudoFactors {
  hasPassword: boolean;
  hasPasskey: boolean;
}

interface SudoError {
  code?: string;
  name?: string;
}

/**
 * Admin re-authentication ("sudo") prompt. Opens when a destructive admin action
 * needs a fresh grant, and offers whichever factors the admin has — password,
 * passkey, or both. (F24)
 */
export default function SudoPasswordModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [factors, setFactors] = useState<SudoFactors>({ hasPassword: true, hasPasskey: false });

  useScrollLock(open);

  useEffect(() => {
    const unsubscribe = onSudoPrompt((shouldOpen: boolean) => {
      setOpen(shouldOpen);
      if (shouldOpen) {
        setPassword('');
        setError('');
        setSubmitting(false);
      }
    });
    return () => { unsubscribe(); };
  }, []);

  // Discover available factors each time the prompt opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getSudoFactors()
      .then((f: SudoFactors) => { if (!cancelled) setFactors(f); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  const handlePasswordSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await submitSudoPassword(password);
    } catch (e) {
      const err = e as SudoError;
      const code = err?.code;
      setError(
        code === 'invalid_password' ? t('admin.sudo.invalidPassword')
          : code === 'no_password' ? t('admin.sudo.noPassword')
            : t('admin.sudo.error'),
      );
      setSubmitting(false);
    }
  };

  const handlePasskey = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await submitSudoPasskey();
    } catch (e) {
      const err = e as SudoError;
      // Browser-cancelled ceremony — let the admin try again without a scary error.
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
        setError(t('admin.sudo.passkeyError'));
      }
      setSubmitting(false);
    }
  };

  const handleCancel = () => cancelSudo();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <AlertDialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/20">
              <ShieldAlert className="size-5 text-white" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-zinc-100">
              {t('admin.sudo.title')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-zinc-400 leading-relaxed mt-2">
            {t('admin.sudo.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-2 flex flex-col gap-3">
          {factors.hasPassword && (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {t('admin.sudo.passwordLabel')}
                </span>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('admin.sudo.passwordPlaceholder')}
                  className="h-10 px-3 text-sm rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </label>
              <button
                type="submit"
                disabled={!password || submitting}
                className="w-full py-2.5 font-semibold text-sm rounded-xl transition-all bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {t('admin.sudo.confirm')}
              </button>
            </form>
          )}

          {factors.hasPassword && factors.hasPasskey && (
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              <span className="h-px flex-1 bg-zinc-800" />
              {t('admin.sudo.or')}
              <span className="h-px flex-1 bg-zinc-800" />
            </div>
          )}

          {factors.hasPasskey && (
            <button
              type="button"
              onClick={handlePasskey}
              disabled={submitting}
              className="w-full py-2.5 font-semibold text-sm rounded-xl transition-all bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Fingerprint className="size-4" />
              {t('admin.sudo.usePasskey')}
            </button>
          )}

          {!factors.hasPassword && !factors.hasPasskey && (
            <p className="text-xs text-amber-400">{t('admin.sudo.noPassword')}</p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-2.5 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-sm rounded-xl transition-all"
          >
            {t('admin.sudo.cancel')}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
