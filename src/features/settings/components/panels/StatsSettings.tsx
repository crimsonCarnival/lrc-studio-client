import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/useAuthContext';
import StatsTab from './profile/StatsTab';
import ActivityHeatmap from './profile/ActivityHeatmap';
import ActionHistory from './profile/ActionHistory';

function blockMatches(searchTerm: string | undefined, labels: string[]): boolean {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

/** "Stats & activity": content stats, the activity heatmap and the action log in one page. */
export default function StatsSettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const { user } = useAuthContext();
  const heatmapPublic = user?.preferences?.showActivityHeatmap ?? false;

  const matches = blockMatches(searchTerm, [
    tk('profile.tabs.stats'), tk('profile.heatmap.title'), tk('profile.activity.history'),
    'stats', 'synced', 'lines', 'projects', 'completion', 'activity', 'history', 'heatmap',
  ]);

  if (!matches) return null;

  return (
    <>
      <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <StatsTab />
      </section>

      <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-[17px] font-bold text-zinc-100 mb-4">{t('profile.heatmap.title')}</h2>
        <ActivityHeatmap streak={user?.streak ?? { current: 0, longest: 0 }} />
        <p className="text-sm text-zinc-400 mt-3.5">
          {heatmapPublic ? t('profile.heatmap.visibleOnProfile') : t('profile.heatmap.hiddenOnProfile')}{' — '}
          <Link to="/settings/privacy" className="text-primary underline">{t('profile.heatmap.changeInPrivacy')}</Link>.
        </p>
      </section>

      <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-[17px] font-bold text-zinc-100 mb-4">{t('profile.activity.history')}</h2>
        <ActionHistory />
      </section>
    </>
  );
}
