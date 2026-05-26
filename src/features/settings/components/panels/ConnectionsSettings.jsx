import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react';
import ConnectedAccounts from './profile/ConnectedAccounts';

function blockMatches(searchTerm, labels) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function ConnectionsSettings({ searchTerm }) {
  const { t } = useTranslation();

  const matches = blockMatches(searchTerm, [
    t('profile.tabs.connections'), t('profile.sections.connections'),
    t('profile.connections.desc'),
    t('settings.spotify.label'), t('settings.spotify.connectDesc'),
    t('settings.google.label'), t('settings.google.connectDesc'),
    'connect', 'google', 'spotify', 'link', 'account', 'sign in', 'oauth',
  ]);

  if (!matches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Link2 className="size-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.tabs.connections') || 'Connections'}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 hover:border-border transition-all">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-zinc-200">
            {t('profile.sections.connections', 'Connected accounts')}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t('profile.connections.desc', 'Link external accounts to sign in faster and unlock additional features.')}
          </p>
        </div>
        <ConnectedAccounts />
      </div>
    </div>
  );
}
