import type { AuthUser } from '@/features/auth/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import toast from 'react-hot-toast';
import { Section, SettingRow, SegmentedControl, Toggle } from '../shared';
import BlockedUsersSettings from './BlockedUsersSettings';

type Audience = 'everyone' | 'friends' | 'nobody';

export default function PrivacySettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();

  const tk = t as (key: string) => string;

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
      setUser(prev => prev ? ({ ...prev, preferences: prevPrefs } as AuthUser) : prev);
      toast.error(tk('profile.saveError'));
    }
  };

  const defaultProjectPrivacy = user?.preferences?.defaultProjectPrivacy || 'public';
  const showFollowers = user?.preferences?.showFollowers ?? (user?.showFollowers ?? true);
  // Privacy-by-default: off unless explicitly enabled (server default is false too).
  const showActivityHeatmap = user?.preferences?.showActivityHeatmap ?? false;
  const showXpProgress = user?.preferences?.showXpProgress ?? false;
  const onlineVisibility = (user?.preferences?.onlineVisibility ?? user?.onlineVisibility ?? 'friends') as Audience;
  const lastOnlineVisibility = (user?.preferences?.lastOnlineVisibility ?? 'friends') as Audience;
  const countryVisibility = (user?.preferences?.countryVisibility ?? 'nobody') as Audience;

  const audienceOptions = [
    { value: 'everyone' as const, label: tk('profile.settings.visibilityEveryone') },
    { value: 'friends' as const, label: tk('profile.settings.visibilityFriends') },
    { value: 'nobody' as const, label: tk('profile.settings.visibilityNobody') },
  ];

  return (
    <>
      <Section title={tk('profile.settings.projectsSection')} searchTerm={searchTerm}>
        <SettingRow
          label={tk('profile.settings.newProjectsVisibility')}
          description={tk('profile.settings.newProjectsVisibilityDesc')}
        >
          <SegmentedControl
            label={tk('profile.settings.newProjectsVisibility')}
            value={defaultProjectPrivacy === 'private' ? 'private' : 'public'}
            options={[
              { value: 'public', label: tk('profile.settings.public') },
              { value: 'private', label: tk('profile.settings.private') },
            ]}
            onChange={(v) => { if (v !== defaultProjectPrivacy) handlePreferenceChange('defaultProjectPrivacy', v); }}
          />
        </SettingRow>
      </Section>

      <Section title={tk('profile.settings.profileSection')} searchTerm={searchTerm}>
        <SettingRow label={tk('profile.settings.showFollowers')} description={tk('profile.settings.showFollowersSub')}>
          <Toggle label={tk('profile.settings.showFollowers')} checked={showFollowers} onChange={(v) => handlePreferenceChange('showFollowers', v)} />
        </SettingRow>
        <SettingRow label={tk('profile.settings.showActivityHeatmap')} description={tk('profile.settings.showActivityHeatmapSub')}>
          <Toggle label={tk('profile.settings.showActivityHeatmap')} checked={showActivityHeatmap} onChange={(v) => handlePreferenceChange('showActivityHeatmap', v)} />
        </SettingRow>
        <SettingRow label={tk('profile.settings.showXpProgress')} description={tk('profile.settings.showXpProgressSub')}>
          <Toggle label={tk('profile.settings.showXpProgress')} checked={showXpProgress} onChange={(v) => handlePreferenceChange('showXpProgress', v)} />
        </SettingRow>
      </Section>

      <Section title={tk('profile.settings.whoCanSee')} searchTerm={searchTerm}>
        <SettingRow label={tk('profile.settings.onlineVisibility')} description={tk('profile.settings.onlineVisibilityDesc')}>
          <SegmentedControl
            label={tk('profile.settings.onlineVisibility')}
            value={onlineVisibility}
            options={audienceOptions}
            onChange={(v) => handlePreferenceChange('onlineVisibility', v)}
          />
        </SettingRow>
        <SettingRow disabled={onlineVisibility === 'nobody'} label={tk('profile.settings.lastOnlineVisibility')} description={tk('profile.settings.lastOnlineVisibilityDesc')}>
          <SegmentedControl
            label={tk('profile.settings.lastOnlineVisibility')}
            disabled={onlineVisibility === 'nobody'}
            value={onlineVisibility === 'nobody' ? 'nobody' : lastOnlineVisibility}
            options={audienceOptions}
            onChange={(v) => handlePreferenceChange('lastOnlineVisibility', v)}
          />
        </SettingRow>
        <SettingRow label={tk('profile.settings.countryVisibility')} description={tk('profile.settings.countryVisibilityDesc')}>
          <SegmentedControl
            label={tk('profile.settings.countryVisibility')}
            value={countryVisibility}
            options={audienceOptions}
            onChange={(v) => handlePreferenceChange('countryVisibility', v)}
          />
        </SettingRow>
      </Section>

      <BlockedUsersSettings searchTerm={searchTerm} />
    </>
  );
}
