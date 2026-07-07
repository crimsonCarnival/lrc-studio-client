import type { ReactNode } from 'react';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import toast from 'react-hot-toast';

type NotifKey = 'follow' | 'reaction' | 'star' | 'fork' | 'badge_awarded' | 'xp_changed';

const NOTIF_KEYS: NotifKey[] = ['follow', 'reaction', 'star', 'fork', 'badge_awarded', 'xp_changed'];

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}
    >
      <span className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function SectionHeading({ children }: { children?: ReactNode }) {
  return (
    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
      {children}
    </h4>
  );
}

function blockMatches(searchTerm: string | undefined, labels: string[]) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function NotificationsSettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();

  const tk = t as (key: string) => string;

  const matches = blockMatches(searchTerm, [
    tk('profile.notifications'),
    'notifications', 'alerts', 'emails', 'events'
  ]);

  if (!matches) return null;

  const notifs = user?.preferences?.notifications;

  const getChecked = (key: NotifKey): boolean => {
    if (!notifs) return true;
    return notifs[key] ?? true;
  };

  const handleToggle = async (key: NotifKey) => {
    const current = getChecked(key);
    const next = !current;
    
    // Optimistically update UI.
    setUser(prev => prev ? ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: {
          ...(prev.preferences?.notifications || {}),
          [key]: next,
        },
      },
    } as AuthUser) : prev);
    
    try {
      const updated = await updatePreferences({ notifications: { [key]: next } });
      setUser(prev => prev ? ({ ...prev, preferences: { ...prev.preferences, ...updated } } as AuthUser) : prev);
    } catch {
      // Revert on failure.
      setUser(prev => prev ? ({
        ...prev,
        preferences: {
          ...prev.preferences,
          notifications: {
            ...(prev.preferences?.notifications || {}),
            [key]: current,
          },
        },
      } as AuthUser) : prev);
      toast.error(tk('profile.saveError'));
    }
  };

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon name="notifications" size={16} className="text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.notifications') || 'Notifications'}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="notifications" size={14} className="text-zinc-500" />
            <SectionHeading>{t('profile.notifications')}</SectionHeading>
          </div>
          <div className="space-y-3">
            {NOTIF_KEYS.map(key => (
              <div key={key} className="flex items-center justify-between gap-4">
                <p className="text-sm text-foreground font-medium">{t(`profile.notif_${key}`)}</p>
                <Toggle checked={getChecked(key)} onToggle={() => handleToggle(key)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
