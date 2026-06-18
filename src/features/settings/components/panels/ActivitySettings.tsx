import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import ActionHistory from './profile/ActionHistory';
import ActivityHeatmap from './profile/ActivityHeatmap';

function Divider() {
  return <hr className="border-border/50" />;
}

function blockMatches(searchTerm: string | undefined, labels: string[]) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function ActivitySettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();

  const matches = blockMatches(searchTerm, [
    t('profile.tabs.activity'), t('profile.heatmap.title'),
    'activity', 'history', 'heatmap',
  ]);

  if (!matches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Activity className="size-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.tabs.activity')}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        <section className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {t('profile.heatmap.title')}
          </h4>
          <ActivityHeatmap />
        </section>

        <Divider />

        <section className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {t('profile.activity.history')}
          </h4>
          <ActionHistory />
        </section>
      </div>
    </div>
  );
}
