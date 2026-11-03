import { useMemo, useState } from 'react';
import type { AuthUser } from '@/features/auth/auth.types';
import type { UpdatePreferencesInput } from '@/types';
import { useTranslation } from 'react-i18next';
import { FloatingCombobox } from '@ui/floating-combobox';
import { countryList } from '@/shared/utils/countries';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { userHasPermission } from '@/features/auth/permissions';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import toast from 'react-hot-toast';
import { Section, SettingRow, SegmentedControl, Toggle } from '../shared';
import BlockedUsersSettings from './BlockedUsersSettings';
import UnsavedChangesBar from '../UnsavedChangesBar';
import { useReportDraft } from '../SettingsDraftContext';

type Audience = 'everyone' | 'friends' | 'nobody';

// Every notification type with a per-user switch on the server (NotificationPreferences),
// in the order the settings list them. Each label is `profile.notif_<type>`.
const NOTIFICATION_TYPES = [
  'follow', 'reaction', 'star', 'fork', 'followed_project', 'wall_comment', 'mention', 'project_mention', 'comment_like', 'report_reviewed', 'report_message',
  'playlist_saved', 'star_milestone', 'badge_awarded', 'xp_changed', 'level_up',
  'streak_warning', 'new_device', 'appeal_result',
] as const;
// Only moderators (users.ban) hear about new reports, so only they get its switch.
const MODERATOR_NOTIFICATION_TYPES = ['report'] as const;

type PrefsValues = {
  defaultProjectPrivacy: 'public' | 'private';
  showFollowers: boolean;
  showActivityHeatmap: boolean;
  showXpProgress: boolean;
  wallEnabled: boolean;
  allowTags: boolean;
  onlineVisibility: Audience;
  lastOnlineVisibility: Audience;
  countryVisibility: Audience;
  country: string | null;
};
type PrefsDraft = Partial<PrefsValues>;

export default function PrivacySettings({ searchTerm }: { searchTerm?: string }) {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuthContext();
  // Edits are staged here and committed together from the save bar; only touched keys live in the drafts.
  const [draft, setDraft] = useState<PrefsDraft>({});
  const [notifDraft, setNotifDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const tk = t as (key: string) => string;

  const notificationPrefs = (user?.preferences?.notifications ?? {}) as Partial<Record<string, boolean>>;
  const prefs = user?.preferences;
  const saved: PrefsValues = {
    defaultProjectPrivacy: prefs?.defaultProjectPrivacy === 'private' ? 'private' : 'public',
    showFollowers: prefs?.showFollowers ?? (user?.showFollowers ?? true),
    // Privacy-by-default: off unless explicitly enabled (server default is false too).
    showActivityHeatmap: prefs?.showActivityHeatmap ?? false,
    showXpProgress: prefs?.showXpProgress ?? false,
    wallEnabled: prefs?.wallEnabled ?? true,
    allowTags: prefs?.allowTags ?? true,
    onlineVisibility: (prefs?.onlineVisibility ?? user?.onlineVisibility ?? 'friends') as Audience,
    lastOnlineVisibility: (prefs?.lastOnlineVisibility ?? 'friends') as Audience,
    countryVisibility: (prefs?.countryVisibility ?? 'nobody') as Audience,
    country: (prefs?.country as string | null | undefined) ?? null,
  };
  const values: PrefsValues = { ...saved, ...draft };
  // Unset means on: every notification type defaults to enabled on the server.
  const notifValue = (type: string) => notifDraft[type] ?? notificationPrefs[type] !== false;

  const delta: PrefsDraft = {};
  for (const key of Object.keys(draft) as (keyof PrefsValues)[]) {
    if (draft[key] !== saved[key]) Object.assign(delta, { [key]: draft[key] });
  }
  const notifDelta: Record<string, boolean> = {};
  for (const [type, value] of Object.entries(notifDraft)) {
    if (value !== (notificationPrefs[type] !== false)) notifDelta[type] = value;
  }
  const isDirty = Object.keys(delta).length > 0 || Object.keys(notifDelta).length > 0;

  const setPref = <K extends keyof PrefsValues>(key: K, value: PrefsValues[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  const setNotif = (type: string, value: boolean) => setNotifDraft(prev => ({ ...prev, [type]: value }));
  const discard = () => { setDraft({}); setNotifDraft({}); };

  // One request with only what changed; the server merges the notification set.
  const save = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const input: UpdatePreferencesInput = { ...delta };
      if (Object.keys(notifDelta).length > 0) input.notifications = notifDelta;
      const updated = await updatePreferences(input);
      setUser(prev => prev ? ({ ...prev, preferences: { ...prev.preferences, ...updated } } as AuthUser) : prev);
      discard();
      toast.success(tk('profile.saveSuccess'));
      return true;
    } catch {
      toast.error(tk('profile.saveError'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  useReportDraft({ isDirty, save, discard });

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
            value={values.defaultProjectPrivacy}
            options={[
              { value: 'public', label: tk('profile.settings.public') },
              { value: 'private', label: tk('profile.settings.private') },
            ]}
            onChange={(v) => setPref('defaultProjectPrivacy', v)}
          />
        </SettingRow>
      </Section>

      <Section title={tk('profile.settings.profileSection')} searchTerm={searchTerm}>
        <SettingRow label={tk('profile.settings.showFollowers')} description={tk('profile.settings.showFollowersSub')}>
          <Toggle label={tk('profile.settings.showFollowers')} checked={values.showFollowers} onChange={(v) => setPref('showFollowers', v)} />
        </SettingRow>
        <SettingRow label={tk('profile.settings.showActivityHeatmap')} description={tk('profile.settings.showActivityHeatmapSub')}>
          <Toggle label={tk('profile.settings.showActivityHeatmap')} checked={values.showActivityHeatmap} onChange={(v) => setPref('showActivityHeatmap', v)} />
        </SettingRow>
        <SettingRow label={tk('profile.settings.showXpProgress')} description={tk('profile.settings.showXpProgressSub')}>
          <Toggle label={tk('profile.settings.showXpProgress')} checked={values.showXpProgress} onChange={(v) => setPref('showXpProgress', v)} />
        </SettingRow>
        <SettingRow label={tk('profile.settings.wallEnabled')} description={tk('profile.settings.wallEnabledSub')}>
          <Toggle label={tk('profile.settings.wallEnabled')} checked={values.wallEnabled} onChange={(v) => setPref('wallEnabled', v)} />
        </SettingRow>
        <SettingRow label={tk('profile.settings.allowTags')} description={tk('profile.settings.allowTagsSub')}>
          <Toggle label={tk('profile.settings.allowTags')} checked={values.allowTags} onChange={(v) => setPref('allowTags', v)} />
        </SettingRow>
      </Section>

      <Section title={tk('profile.settings.whoCanSee')} searchTerm={searchTerm}>
        <SettingRow label={tk('profile.settings.onlineVisibility')} description={tk('profile.settings.onlineVisibilityDesc')}>
          <SegmentedControl
            label={tk('profile.settings.onlineVisibility')}
            value={values.onlineVisibility}
            options={audienceOptions}
            onChange={(v) => setPref('onlineVisibility', v)}
          />
        </SettingRow>
        <SettingRow disabled={values.onlineVisibility === 'nobody'} label={tk('profile.settings.lastOnlineVisibility')} description={tk('profile.settings.lastOnlineVisibilityDesc')}>
          <SegmentedControl
            label={tk('profile.settings.lastOnlineVisibility')}
            disabled={values.onlineVisibility === 'nobody'}
            value={values.onlineVisibility === 'nobody' ? 'nobody' : values.lastOnlineVisibility}
            options={audienceOptions}
            onChange={(v) => setPref('lastOnlineVisibility', v)}
          />
        </SettingRow>
        <SettingRow label={tk('profile.settings.country')} description={tk('profile.settings.countryDesc')}>
          <FloatingCombobox
            label={tk('profile.settings.country')}
            value={values.country ?? ''}
            options={countryOptions}
            strict
            size="sm"
            onChange={(code) => setPref('country', code || null)}
            className="w-56"
          />
        </SettingRow>
        <SettingRow disabled={!values.country} label={tk('profile.settings.countryVisibility')} description={tk('profile.settings.countryVisibilityDesc')}>
          <SegmentedControl
            label={tk('profile.settings.countryVisibility')}
            disabled={!values.country}
            value={values.countryVisibility}
            options={audienceOptions}
            onChange={(v) => setPref('countryVisibility', v)}
          />
        </SettingRow>
      </Section>

      <Section title={tk('profile.settings.notificationsSection')} searchTerm={searchTerm}>
        {[...NOTIFICATION_TYPES, ...(userHasPermission(user?.permissions, 'users.ban') ? MODERATOR_NOTIFICATION_TYPES : [])].map((type) => (
          <SettingRow key={type} label={tk(`profile.notif_${type}`)}>
            <Toggle
              label={tk(`profile.notif_${type}`)}
              checked={notifValue(type)}
              onChange={(v) => setNotif(type, v)}
            />
          </SettingRow>
        ))}
      </Section>

      <BlockedUsersSettings searchTerm={searchTerm} />

      {isDirty && <UnsavedChangesBar saving={saving} onSave={save} onDiscard={discard} />}
    </>
  );
}
