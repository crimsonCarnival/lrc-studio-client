import type { ReactNode } from 'react';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import toast from 'react-hot-toast';

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

function Select({ value, options, onChange }: { value: string; options: { label: string; value: string }[]; onChange: (val: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export default function PrivacySettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();

  const tk = t as (key: string) => string;

  const matches = blockMatches(searchTerm, [
    tk('profile.privacy'),
    'privacy', 'security', 'projects', 'ip', 'device', 'login'
  ]);

  if (!matches) return null;

  const handleDefaultProjectPrivacy = async (value: string) => {
    const current = user?.preferences?.defaultProjectPrivacy || 'public';
    if (current === value) return;
    
    setUser(prev => prev ? ({
      ...prev,
      preferences: {
        ...prev.preferences,
        defaultProjectPrivacy: value,
      },
    } as AuthUser) : prev);
    
    try {
      const updated = await updatePreferences({ defaultProjectPrivacy: value });
      setUser(prev => prev ? ({ ...prev, preferences: { ...prev.preferences, ...updated } } as AuthUser) : prev);
    } catch {
      setUser(prev => prev ? ({
        ...prev,
        preferences: {
          ...prev.preferences,
          defaultProjectPrivacy: current,
        },
      } as AuthUser) : prev);
      toast.error(tk('profile.saveError'));
    }
  };

  const defaultProjectPrivacy = user?.preferences?.defaultProjectPrivacy || 'public';

  const formatHour = (dateInput?: Date | string | null) => {
    if (!dateInput) return 'Unknown';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentHour = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon name="visibility_off" size={16} className="text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {tk('profile.privacy') || 'Privacy'}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="folder" size={14} className="text-zinc-500" />
            <SectionHeading>Default Project Privacy</SectionHeading>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">New Projects Visibility</p>
              <p className="text-xs text-muted-foreground">Sets the default privacy state when creating new projects.</p>
            </div>
            <Select
              value={defaultProjectPrivacy}
              options={[
                { label: 'Public', value: 'public' },
                { label: 'Private', value: 'private' },
              ]}
              onChange={handleDefaultProjectPrivacy}
            />
          </div>
        </section>

        <hr className="border-border/50" />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="security" size={14} className="text-zinc-500" />
            <SectionHeading>Security Information</SectionHeading>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Current IP Address</p>
              <p className="font-mono text-zinc-300">{user?.lastIp || 'Unknown'}</p>
            </div>
            
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Active Device</p>
              <p className="font-mono text-zinc-300">{user?.lastDevice || 'Unknown'}</p>
            </div>
            
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Current Hour</p>
              <p className="font-mono text-zinc-300">{currentHour}</p>
            </div>
            
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Last Login Hour</p>
              <p className="font-mono text-zinc-300">{formatHour(user?.lastLoginAt)}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
