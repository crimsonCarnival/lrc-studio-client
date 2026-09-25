import type { ReactNode } from 'react';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import toast from 'react-hot-toast';
import { Select as RadixSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { CountryFlag } from '@ui/CountryFlag';

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
    'privacy', 'security', 'projects', 'ip', 'device', 'login', 'heatmap', 'activity'
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

  const handlePreferenceChange = async (key: string, value: unknown) => {
    const prevPrefs = user?.preferences;
    setUser(prev => prev ? ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value },
    } as AuthUser) : prev);

    try {
      const updated = await updatePreferences({ [key]: value });
      setUser(prev => prev ? ({ ...prev, preferences: { ...prev.preferences, ...updated } } as AuthUser) : prev);
    } catch {
      setUser(prev => prev ? ({
        ...prev,
        preferences: prevPrefs,
      } as AuthUser) : prev);
      toast.error(tk('profile.saveError'));
    }
  };

  const showFollowers = user?.preferences?.showFollowers ?? (user?.showFollowers ?? true);
  // Privacy-by-default: off unless explicitly enabled (server default is false too).
  const showActivityHeatmap = user?.preferences?.showActivityHeatmap ?? false;
  const onlineVisibility = (user?.preferences?.onlineVisibility ?? user?.onlineVisibility ?? 'friends') as 'everyone' | 'friends' | 'nobody';
  const lastOnlineVisibility = (user?.preferences?.lastOnlineVisibility ?? 'friends') as 'everyone' | 'friends' | 'nobody';
  const countryVisibility = (user?.preferences?.countryVisibility ?? 'nobody') as 'everyone' | 'friends' | 'nobody';

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
          {tk('profile.sections.privacy')}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="folder" size={14} className="text-zinc-500" />
            <SectionHeading>{tk('profile.settings.defaultProjectPrivacy')}</SectionHeading>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">{tk('profile.settings.newProjectsVisibility')}</p>
              <p className="text-xs text-muted-foreground">{tk('profile.settings.newProjectsVisibilityDesc')}</p>
            </div>
            <Select
              value={defaultProjectPrivacy}
              options={[
                { label: tk('profile.settings.public'), value: 'public' },
                { label: tk('profile.settings.private'), value: 'private' },
              ]}
              onChange={handleDefaultProjectPrivacy}
            />
          </div>
        </section>

        <hr className="border-border/50" />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="security" size={14} className="text-zinc-500" />
            <SectionHeading>{tk('profile.settings.securityInformation')}</SectionHeading>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.activeDevice')}</p>
              <p className="font-mono text-zinc-300 mb-2">{user?.lastDevice || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.currentIpAddress')}</p>
              <div className="flex items-center gap-2">
                {user?.lastIp === '127.0.0.1' || user?.lastIp === '::1' || user?.lastIp === 'localhost' ? (
                  <Icon name="dns" size={16} className="text-zinc-500" />
                ) : (
                  <CountryFlag countryCode={user?.country} />
                )}
                <p className="font-mono text-zinc-300">{user?.lastIp || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.currentHour')}</p>
              <p className="font-mono text-zinc-300">{currentHour}</p>
            </div>
            
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.lastLoginHour')}</p>
              <p className="font-mono text-zinc-300">{formatHour(user?.lastLoginAt)}</p>
            </div>
          </div>
        </section>

        <hr className="border-border/50" />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="visibility" size={14} className="text-zinc-500" />
            <SectionHeading>{t('profile.sections.privacy')}</SectionHeading>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-foreground font-medium">{tk('profile.settings.showFollowers')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tk('profile.settings.showFollowersSub')}</p>
            </div>
            <Toggle checked={showFollowers} onToggle={() => handlePreferenceChange('showFollowers', !showFollowers)} />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-foreground font-medium">{tk('profile.settings.showActivityHeatmap')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tk('profile.settings.showActivityHeatmapSub')}</p>
            </div>
            <Toggle checked={showActivityHeatmap} onToggle={() => handlePreferenceChange('showActivityHeatmap', !showActivityHeatmap)} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground font-medium">{tk('profile.settings.onlineVisibility')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tk('profile.settings.onlineVisibilityDesc')}
              </p>
            </div>
            <RadixSelect
              value={onlineVisibility}
              onValueChange={(val: 'everyone' | 'friends' | 'nobody') => handlePreferenceChange('onlineVisibility', val)}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone" className="text-xs">{tk('profile.settings.visibilityEveryone')}</SelectItem>
                <SelectItem value="friends" className="text-xs">{tk('profile.settings.visibilityFriends')}</SelectItem>
                <SelectItem value="nobody" className="text-xs">{tk('profile.settings.visibilityNobody')}</SelectItem>
              </SelectContent>
            </RadixSelect>
          </div>

          <div className={`flex items-center justify-between gap-4 ${onlineVisibility === 'nobody' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <p className="text-sm text-foreground font-medium">{tk('profile.settings.lastOnlineVisibility')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tk('profile.settings.lastOnlineVisibilityDesc')}
              </p>
            </div>
            <RadixSelect
              value={onlineVisibility === 'nobody' ? 'nobody' : lastOnlineVisibility}
              onValueChange={(val: 'everyone' | 'friends' | 'nobody') => handlePreferenceChange('lastOnlineVisibility', val)}
              disabled={onlineVisibility === 'nobody'}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone" className="text-xs">{tk('profile.settings.visibilityEveryone')}</SelectItem>
                <SelectItem value="friends" className="text-xs">{tk('profile.settings.visibilityFriends')}</SelectItem>
                <SelectItem value="nobody" className="text-xs">{tk('profile.settings.visibilityNobody')}</SelectItem>
              </SelectContent>
            </RadixSelect>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground font-medium">{tk('profile.settings.countryVisibility')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tk('profile.settings.countryVisibilityDesc')}
              </p>
            </div>
            <RadixSelect
              value={countryVisibility}
              onValueChange={(val: 'everyone' | 'friends' | 'nobody') => handlePreferenceChange('countryVisibility', val)}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone" className="text-xs">{tk('profile.settings.visibilityEveryone')}</SelectItem>
                <SelectItem value="friends" className="text-xs">{tk('profile.settings.visibilityFriends')}</SelectItem>
                <SelectItem value="nobody" className="text-xs">{tk('profile.settings.visibilityNobody')}</SelectItem>
              </SelectContent>
            </RadixSelect>
          </div>
        </section>
      </div>
    </div>
  );
}
