import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import AccountNameHistory from './profile/AccountNameHistory.jsx';
import EmailHistory from './profile/EmailHistory.jsx';

function blockMatches(searchTerm, labels) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function ChangesHistorySettings({ searchTerm }) {
  const { t } = useTranslation();

  const usernameMatches = blockMatches(searchTerm, [
    t('profile.tabs.history'), t('profile.sections.handleHistory'),
    t('profile.accountName'),
    'history', 'username', 'handle', 'changes',
  ]);
  const emailMatches = blockMatches(searchTerm, [
    t('profile.tabs.history'), t('profile.sections.emailHistory'),
    t('profile.email'),
    'history', 'email', 'changes',
  ]);

  if (!usernameMatches && !emailMatches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 px-1">
        <History className="size-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.tabs.history') || 'Changes History'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {usernameMatches && (
          <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 hover:border-border transition-all">
            <h4 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
              {t('profile.sections.handleHistory') || 'Username history'}
            </h4>
            <AccountNameHistory />
          </div>
        )}
        {emailMatches && (
          <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 hover:border-border transition-all">
            <h4 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
              {t('profile.sections.emailHistory') || 'Email history'}
            </h4>
            <EmailHistory />
          </div>
        )}
      </div>
    </div>
  );
}
