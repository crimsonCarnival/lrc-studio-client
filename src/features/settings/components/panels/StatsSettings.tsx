import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import StatsTab from './profile/StatsTab';

function blockMatches(searchTerm: string | undefined, labels: string[]): boolean {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function StatsSettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();

  const matches = blockMatches(searchTerm, [
    t('profile.tabs.stats'),
    'stats', 'synced', 'lines', 'projects', 'completion',
  ]);

  if (!matches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <BarChart3 className="size-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.tabs.stats')}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6">
        <StatsTab />
      </div>
    </div>
  );
}
