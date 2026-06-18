import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useTranslation } from 'react-i18next';
import { auth } from '@/app/api';
import { Button } from '@ui/button';
import { Ban, LogOut, Send, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Clock } from 'lucide-react';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';

function Countdown({ targetDate }: { targetDate: string }) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - Date.now();
      if (difference <= 0) return t('admin.banned.expired') || 'Expired';

      const d = Math.floor(difference / (1000 * 60 * 60 * 24));
      const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const m = Math.floor((difference / 1000 / 60) % 60);
      const s = Math.floor((difference / 1000) % 60);

      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0 || d > 0) parts.push(`${h}h`);
      parts.push(`${m}m`);
      parts.push(`${s}s`);

      return parts.join(' ');
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, t]);

  return (
    <div className="flex items-center gap-1.5 text-red-400 font-mono text-xs mt-1">
      <Clock className="size-3" />
      <span>{t('admin.banned.remainingTime') || 'Remaining'}: {timeLeft}</span>
    </div>
  );
}

export default function BannedScreen() {
  const { user, logout } = useAuthContext();
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const [appealText, setAppealText] = useState('');
  const [loading, setLoading] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const formattedDate = user?.ban?.until ? formatInTimezone(user.ban.until, settings.advanced?.timezone, {}, i18n.resolvedLanguage || i18n.language) : '';

  if (!user || !user.ban?.active) return null;

  const currentStatus = localSubmitted ? 'pending' : (user.appeal?.status || 'none');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appealText.trim()) return;

    setLoading(true);
    try {
      await auth.submitAppeal(appealText);
      setLocalSubmitted(true);
      toast.success(t('admin.toast.appealSuccess'));
    } catch { /* ignore */
      toast.error(t('admin.toast.appealError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />

        <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <Ban className="size-8 text-red-500" />
        </div>

        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">{t('admin.banned.title')}</h2>

        {user.ban?.reason && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-4 text-left">
            <span className="text-[10px] font-bold text-red-500/70 uppercase tracking-widest mb-1 block">
              {t('admin.banned.reasonLabel') || 'Reason'}
            </span>
            <p className="text-sm text-zinc-300 italic">"{user.ban.reason}"</p>
          </div>
        )}

        {user.ban?.until && (
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 mb-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
              {t('admin.banned.untilLabel')}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-200 font-semibold text-sm">
                {formattedDate || '...'}
              </span>
              <Countdown targetDate={user.ban.until} />
            </div>
          </div>
        )}

        <p className="text-zinc-400 text-sm mb-6 px-2 leading-relaxed">
          {user.ban?.until ? t('admin.banned.descriptionTemp') : t('admin.banned.descriptionPerm')}
        </p>

        {currentStatus === 'pending' ? (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 mb-6">
            <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="size-6 text-emerald-500" />
            </div>
            <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-1">{t('admin.banned.underReview')}</p>
            <p className="text-zinc-500 text-xs">{t('admin.banned.reviewSoon')}</p>

            {user.appeal?.text && (
              <div className="mt-4 pt-4 border-t border-emerald-500/10 text-left">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                  {t('admin.banned.yourAppealLabel')}:
                </span>
                <p className="text-xs text-zinc-400 italic">"{user.appeal?.text}"</p>
              </div>
            )}
          </div>
        ) : currentStatus === 'rejected' ? (
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 mb-6">
            <div className="size-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="size-6 text-red-500" />
            </div>
            <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-1">{t('admin.banned.appealRejected')}</p>
            <p className="text-zinc-500 text-xs leading-relaxed">{t('admin.banned.appealRejectedSub')}</p>

            {user.appeal?.text && (
              <div className="mt-4 pt-4 border-t border-red-500/10 text-left">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                  {t('admin.banned.yourAppealLabel')}:
                </span>
                <p className="text-xs text-zinc-400 italic">"{user.appeal?.text}"</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mb-6 text-left space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {t('admin.banned.submitLabel')}
                </label>
                <span className={`text-[10px] font-medium ${appealText.length > 900 ? 'text-red-400' : 'text-zinc-600'}`}>
                  {appealText.length}/1000
                </span>
              </div>
              <textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder={t('admin.banned.placeholder')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none h-32 transition-all"
                maxLength={1000}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
              disabled={loading || !appealText.trim()}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="size-4 animate-spin" /> {t('admin.banned.submitting')}
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="size-4" /> {t('admin.banned.submitBtn')}
                </span>
              )}
            </Button>
          </form>
        )}

        <Button
          variant="ghost"
          onClick={logout}
          className="text-zinc-500 hover:text-zinc-300 w-full flex items-center justify-center gap-2"
        >
          <LogOut className="size-4" /> {t('admin.banned.signOut')}
        </Button>
      </div>
    </div>
  );
}
