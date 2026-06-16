import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { useAuthContext } from '@/features/auth/useAuthContext';

const EVENT_TYPE_LABELS = {
  badge_grant: 'Badge Granted',
  badge_revoke: 'Badge Revoked',
  admin_adjustment: 'Admin Adjustment',
  backfill: 'Data Migration',
};

export default function XpHistory() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();

  if (!user?.xpHistory?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
        <TrendingUp className="size-10 mb-3 opacity-20" strokeWidth={1} />
        <p className="text-xs">{t('profile.noHistory')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {user.xpHistory.map((entry, idx) => {
        const isGain = entry.delta > 0;
        const sign = isGain ? '+' : '';
        const typeLabel = EVENT_TYPE_LABELS[entry.type] || entry.type;

        return (
          <li key={`${entry.createdAt}-${idx}`} className="text-xs flex flex-col gap-1 p-3 bg-zinc-900/30 rounded border border-zinc-800/30">
            <div className="flex items-center justify-between">
              <span className="text-zinc-200 font-medium">{typeLabel}</span>
              <span className={`font-mono font-semibold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                {sign}{entry.delta} XP
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{entry.source}</span>
              <span className="text-zinc-600">→ {entry.totalXpAfter} total</span>
            </div>
            {entry.reason && (
              <span className="text-zinc-500 italic text-[10px]">{entry.reason}</span>
            )}
            <span className="text-zinc-600 text-[10px]">
              {new Date(entry.createdAt).toLocaleDateString(i18n.language, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
