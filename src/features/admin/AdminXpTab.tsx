import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

interface AdminXpTabProps {
  onAdjustXP: (action: string, amount: number, target: string, userId?: string, userIds?: string[]) => Promise<void>;
}

export default function AdminXpTab({ onAdjustXP }: AdminXpTabProps) {
  const { t } = useTranslation();
  const [xpBulkAmount, setXpBulkAmount] = useState('500');
  const [xpBulkTarget, setXpBulkTarget] = useState('all'); // 'all' | 'ids'
  const [xpBulkIds, setXpBulkIds] = useState(''); // comma-separated usernames/ids
  const [xpBulkSaving, setXpBulkSaving] = useState(false);

  const handleBulkXP = async (action: string) => {
    const amount = Number(xpBulkAmount);
    if (!amount || amount <= 0) { toast.error(t('admin.xp.enterValidAmount')); return; }
    setXpBulkSaving(true);
    try {
      if (xpBulkTarget === 'all') {
        await onAdjustXP(action, amount, 'all');
      } else {
        const ids = xpBulkIds.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        if (!ids.length) { toast.error(t('admin.xp.enterUserIds')); setXpBulkSaving(false); return; }
        await onAdjustXP(action, amount, 'users', undefined, ids);
      }
    } finally {
      setXpBulkSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">{t('admin.xp.sectionTitle')}</h2>
        </div>
        <p className="text-xs text-zinc-500">{t('admin.xp.sectionDescription')}</p>
      </div>

      {/* Controls card */}
      <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-4">
        {/* Amount + Target row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.amount')}</span>
            <input
              type="number"
              min={1}
              value={xpBulkAmount}
              onChange={e => setXpBulkAmount(e.target.value)}
              className="w-28 h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.target')}</span>
            <select
              value={xpBulkTarget}
              onChange={e => setXpBulkTarget(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">{t('admin.xp.allUsers')}</option>
              <option value="ids">{t('admin.xp.specificUsers')}</option>
            </select>
          </label>
        </div>

        {/* User IDs input — shown only for specific-users target */}
        {xpBulkTarget === 'ids' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.userIds')}</span>
            <input
              type="text"
              value={xpBulkIds}
              onChange={e => setXpBulkIds(e.target.value)}
              placeholder={t('admin.xp.usernamePlaceholder')}
              className="h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
            />
          </label>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => handleBulkXP('grant')}
            disabled={xpBulkSaving}
            className="flex items-center gap-2 h-9 px-5 text-sm font-semibold rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors disabled:opacity-50"
          >
            <Sparkles className="size-3.5" />
            {t('admin.xp.grantXp')}
          </button>
          <button
            onClick={() => handleBulkXP('revoke')}
            disabled={xpBulkSaving}
            className="flex items-center gap-2 h-9 px-5 text-sm font-semibold rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
          >
            {t('admin.xp.revokeXp')}
          </button>
          {xpBulkSaving && (
            <span className="self-center size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          )}
        </div>
      </div>
    </div>
  );
}
