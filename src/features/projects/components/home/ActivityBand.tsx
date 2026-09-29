import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useStreakResetHint } from '@/shared/hooks/useStreakResetHint';
import ActivityHeatmap from '@/features/settings/components/panels/profile/ActivityHeatmap';

/**
 * Streak, level and the contribution heatmap.
 *
 * All of this already existed but only on the profile page, which is why a
 * lapsed streak could go unnoticed. Streak and level come from the auth user —
 * both are in the auth selection set — and ActivityHeatmap fetches its own data,
 * so this band costs no new query.
 */
export function ActivityBand() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const resetHint = useStreakResetHint();

  // The server already applies the alive/dead rule (last active UTC day must be
  // today or yesterday), so a lapsed streak arrives here as 0 — no client-side
  // date maths, and no second place for that rule to drift.
  const current = user?.streak?.current ?? 0;
  const longest = user?.streak?.longest ?? 0;
  const level = user?.progression?.level ?? 0;
  const xp = user?.progression?.xp ?? 0;

  return (
    <section className="flex-1 min-w-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="local_fire_department" size={16} className="text-primary" />
        <h2 className="text-sm font-bold text-zinc-300">{t('home.yourActivity')}</h2>
      </div>

      <div className="glass rounded-2xl p-4 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-6 shrink-0">
          <Tip content={resetHint}>
            <span className="flex flex-col cursor-default">
              <span className="text-2xl font-heading font-bold text-primary tabular-nums leading-none">
                {current}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                {t('home.streakCurrent')}
              </span>
            </span>
          </Tip>

          <span className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-zinc-200 tabular-nums leading-none">
              {longest}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
              {t('home.streakLongest')}
            </span>
          </span>

          <Tip content={t('home.xpTip', { xp })}>
            <span className="flex flex-col cursor-default">
              <span className="text-2xl font-heading font-bold text-accent-blue tabular-nums leading-none">
                {level}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                {t('home.level')}
              </span>
            </span>
          </Tip>
        </div>

        <div className="min-w-0">
          <ActivityHeatmap cellSize={9} cellGap={3} />
        </div>
      </div>
    </section>
  );
}
