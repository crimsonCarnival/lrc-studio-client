import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ShowcaseEditor } from '@/features/badges/ShowcaseEditor';
import { useAuthContext } from '@/features/auth/useAuthContext';
import toast from 'react-hot-toast';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import { SettingRow, SettingsPanelCard, Toggle } from '../shared';

function getShowcaseSlots(level: number) {
  if (level >= 100) return 8;
  if (level >= 75)  return 6;
  if (level >= 50)  return 5;
  if (level >= 25)  return 4;
  return 3;
}

function blockMatches(searchTerm: string | undefined, labels: string[]) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function BadgesSettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();

  const tk = t as (key: string) => string;

  const matches = blockMatches(searchTerm, [
    tk('badges.showcase.editorTitle'),
    'badges', 'showcase', 'achievements'
  ]);

  // Rarity is a fixed property of each badge definition, so nothing needs fetching here.
  const earnedBadges = (user?.badges ?? []) as unknown as ComponentProps<typeof ShowcaseEditor>['userBadges'];

  if (!matches) return null;

  const prefs = user?.preferences;
  const quickEnabled = prefs?.miniProfileBadgesEnabled ?? ((user?.miniProfileBadgesEnabled as boolean | undefined) ?? true);

  const handleQuickToggle = async (value: boolean) => {
    const prevPrefs = user?.preferences;
    setUser(prev => prev ? ({ ...prev, preferences: { ...prev.preferences, miniProfileBadgesEnabled: value } } as typeof prev) : prev);
    try {
      const updated = await updatePreferences({ miniProfileBadgesEnabled: value });
      setUser(prev => prev ? ({ ...prev, preferences: { ...prev.preferences, ...updated } } as typeof prev) : prev);
    } catch {
      setUser(prev => prev ? ({ ...prev, preferences: prevPrefs } as typeof prev) : prev);
      toast.error(t('profile.saveError'));
    }
  };

  return (
    <>
      <ShowcaseEditor
        userBadges={earnedBadges}
        initialShowcase={user?.showcasedBadges ?? []}
        initialPublic={user?.showcasePublic !== false}
        showcaseSlots={getShowcaseSlots(user?.progression?.level ?? 0)}
        onSaved={(ids: string[], pub: boolean) => setUser(prev => prev ? ({ ...prev, showcasedBadges: ids, showcasePublic: pub }) : prev)}
      />
      <SettingsPanelCard>
        <SettingRow label={t('badges.showcase.quickProfile')} description={t('badges.showcase.quickProfileDesc')}>
          <Toggle label={t('badges.showcase.quickProfile')} checked={quickEnabled} onChange={handleQuickToggle} />
        </SettingRow>
      </SettingsPanelCard>
    </>
  );
}
