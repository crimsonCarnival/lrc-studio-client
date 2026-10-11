import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShowcaseEditor } from '@/features/badges/ShowcaseEditor';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { gqlRequest } from '@/app/graphql.client';
import toast from 'react-hot-toast';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import { SettingRow, SettingsPanelCard, Toggle } from '../shared';

interface BadgeDef {
  id: string;
  holderCount: number;
}

interface EnrichedBadge {
  id: string;
  rarityPct: number;
  [key: string]: unknown;
}

const GET_BADGE_DEFS = /* GraphQL */ `
  query ProfileBadgeDefinitions { publicBadgeDefinitions { id holderCount } }
`;

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
  const [enrichedBadges, setEnrichedBadges] = useState<EnrichedBadge[] | null>(null);

  const tk = t as (key: string) => string;

  const matches = blockMatches(searchTerm, [
    tk('badges.showcase.editorTitle'),
    'badges', 'showcase', 'achievements'
  ]);

  useEffect(() => {
    if (!user?.badges?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnrichedBadges([]);
      return;
    }
    gqlRequest<{ publicBadgeDefinitions: BadgeDef[] }>(GET_BADGE_DEFS)
      .then(({ publicBadgeDefinitions }) => {
        const defMap = new Map(publicBadgeDefinitions.map(d => [d.id, d]));
        const maxHolders = Math.max(...publicBadgeDefinitions.map(d => d.holderCount), 1);
        setEnrichedBadges(
          (user.badges as Array<{ id: string; [key: string]: unknown }>).map(b => ({
            ...b,
            rarityPct: defMap.has(b.id)
              ? (defMap.get(b.id)!.holderCount / Math.max(maxHolders, 1)) * 100
              : 100,
          }))
        );
      })
      .catch((err: unknown) => {
        console.error('[badges] failed to load badge definitions', err);
        toast.error(t('badges.defsLoadError'), { id: 'badge-defs-load-error' });
        // Still let the user manage their showcase, just without rarity data.
        setEnrichedBadges(user.badges as unknown as EnrichedBadge[]);
      });
  }, [user?.badges, t]);

  if (!matches || !enrichedBadges) return null;

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
        userBadges={enrichedBadges}
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
