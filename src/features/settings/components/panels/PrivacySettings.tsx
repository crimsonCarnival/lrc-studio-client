import { useMemo } from 'react';
import type { AuthUser } from '@/features/auth/auth.types';
import { useTranslation } from 'react-i18next';
import { FloatingCombobox } from '@ui/floating-combobox';
import { countryList } from '@/shared/utils/countries';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import toast from 'react-hot-toast';
import { Section, SettingRow, SegmentedControl, Toggle } from '../shared';
import BlockedUsersSettings from './BlockedUsersSettings';

type Audience = 'everyone' | 'friends' | 'nobody';

// Every notification type with a per-user switch on the server (NotificationPreferences),
// in the order the settings list them. Each label is `profile.notif_<type>`.
const NOTIFICATION_TYPES = [
  'follow', 'reaction', 'star', 'fork', 'followed_project', 'wall_comment', 'mention', 'comment_like',
  'playlist_saved', 'star_milestone', 'badge_awarded', 'xp_changed', 'level_up',
  'streak_warning', 'new_device', 'appeal_result',
] as const;

export default function PrivacySettings({ searchTerm }: { searchTerm?: string }) {
  const { t, i18n } = useTranslation();
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

  const notificationPrefs = (user?.preferences?.notifications ?? {}) as Partial<Record<string, boolean>>;
  // Sends only the switched type; the server merges it into the stored set.
  const handleNotificationChange = async (type: string, value: boolean) => {
    const prevPrefs = user?.preferences;
    setUser(prev => prev ? ({
      ...prev,
      preferences: { ...prev.preferences, notifications: { ...prev.preferences?.notifications, [type]: value } },
    } as AuthUser) : prev);
    try {
      const updated = await updatePreferences({ notifications: { [type]: value } });
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
  const wallEnabled = user?.preferences?.wallEnabled ?? true;
  const allowTags = user?.preferences?.allowTags ?? true;
  const onlineVisibility = (user?.preferences?.onlineVisibility ?? user?.onlineVisibility ?? 'friends') as Audience;
  const lastOnlineVisibility = (user?.preferences?.lastOnlineVisibility ?? 'friends') as Audience;
  const countryVisibility = (user?.preferences?.countryVisibility ?? 'nobody') as Audience;
  const country = (user?.preferences?.country as string | null | undefined) ?? null;
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const countryOptions = useMemo(
    () => [{ value: '', label: tk('profile.settings.countryNone') }, ...countryList(language).map((c) => ({ value: c.code, label: c.name }))],
    [language, tk],
  );

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
        <SettingRow label={tk('profile.settings.wallEnabled')} description={tk('profile.settings.wallEnabledSub')}>
          <Toggle label={tk('profile.settings.wallEnabled')} checked={wallEnabled} onChange={(v) => handlePreferenceChange('wallEnabled', v)} />
        </SettingRow>
        <SettingRow label={tk('profile.settings.allowTags')} description={tk('profile.settings.allowTagsSub')}>
          <Toggle label={tk('profile.settings.allowTags')} checked={allowTags} onChange={(v) => handlePreferenceChange('allowTags', v)} />
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
        <SettingRow label={tk('profile.settings.country')} description={tk('profile.settings.countryDesc')}>
          <FloatingCombobox
            label={tk('profile.settings.country')}
            value={country ?? ''}
            options={countryOptions}
            strict
            size="sm"
            onChange={(code) => { if (code !== (country ?? '')) handlePreferenceChange('country', code || null); }}
            className="w-56"
          />
        </SettingRow>
        <SettingRow disabled={!country} label={tk('profile.settings.countryVisibility')} description={tk('profile.settings.countryVisibilityDesc')}>
          <SegmentedControl
            label={tk('profile.settings.countryVisibility')}
            disabled={!country}
            value={countryVisibility}
            options={audienceOptions}
            onChange={(v) => handlePreferenceChange('countryVisibility', v)}
          />
        </SettingRow>
      </Section>

      <Section title={tk('profile.settings.notificationsSection')} searchTerm={searchTerm}>
        {NOTIFICATION_TYPES.map((type) => (
          <SettingRow key={type} label={tk(`profile.notif_${type}`)}>
            <Toggle
              label={tk(`profile.notif_${type}`)}
              // Unset means on: every type defaults to enabled on the server.
              checked={notificationPrefs[type] !== false}
              onChange={(v) => handleNotificationChange(type, v)}
            />
          </SettingRow>
        ))}
      </Section>

      <BlockedUsersSettings searchTerm={searchTerm} />
    </>
  );
}
