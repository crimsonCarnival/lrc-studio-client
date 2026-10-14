import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { xpProgress } from './xp-progress';

/**
 * Level and XP (redesign sheet 10): the level, the XP towards the next one, and how much
 * is left. Lives at the top of the profile's side column, next to the showcase and badges.
 */
export function LevelXpCard({ level, xp }: { level: number; xp: number }) {
  const { t } = useTranslation();
  const { next, needed, pct } = xpProgress(level, xp);
  const toNext = t('profile.xpToNext', { xp: needed.toLocaleString(), level: level + 1 });

  return (
    <section
      aria-label={t('profile.levelAndXp')}
      className="flex flex-col gap-3 rounded-2xl bg-background px-[18px] py-4 inset-ring inset-ring-hl"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-7 items-center rounded-full bg-primary-soft px-3 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-ink">
          {t('common.levelShort', { level })}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[13px] font-medium text-gold-ink">
          <Icon name="bolt" size={14} />
          {t('profile.xpProgress', { xp: xp.toLocaleString(), next: next.toLocaleString() })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={toNext}
        className="h-2 overflow-hidden rounded-[4px] bg-hl"
      >
        <div className="h-full rounded-[4px] bg-linear-to-r from-iris to-gold" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-subtle">{toNext}</span>
    </section>
  );
}
