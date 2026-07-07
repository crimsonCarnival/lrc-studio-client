import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { ShowcaseEditor } from '@/features/badges/ShowcaseEditor';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { gqlRequest } from '@/app/graphql.client';

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
  query ProfileBadgeDefinitions { badgeDefinitions { id holderCount } }
`;

function getShowcaseSlots(level: number) {
  if (level >= 100) return 8;
  if (level >= 75)  return 6;
  if (level >= 50)  return 5;
  if (level >= 25)  return 4;
  return 3;
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
    gqlRequest(GET_BADGE_DEFS)
      .then(({ badgeDefinitions }: { badgeDefinitions: BadgeDef[] }) => {
        const defMap = new Map(badgeDefinitions.map(d => [d.id, d]));
        const maxHolders = Math.max(...badgeDefinitions.map(d => d.holderCount), 1);
        setEnrichedBadges(
          (user.badges as Array<{ id: string; [key: string]: unknown }>).map(b => ({
            ...b,
            rarityPct: defMap.has(b.id)
              ? (defMap.get(b.id)!.holderCount / Math.max(maxHolders, 1)) * 100
              : 100,
          }))
        );
      })
      .catch(() => setEnrichedBadges(user.badges as unknown as EnrichedBadge[]));
  }, [user?.badges]);

  if (!matches || !enrichedBadges) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon name="military_tech" size={16} className="text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('badges.showcase.editorTitle') || 'Badges'}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="military_tech" size={14} className="text-zinc-500" />
            <SectionHeading>{t('badges.showcase.editorTitle')}</SectionHeading>
          </div>
          <ShowcaseEditor
            userBadges={enrichedBadges}
            initialShowcase={user?.showcasedBadges ?? []}
            initialPublic={user?.showcasePublic !== false}
            showcaseSlots={getShowcaseSlots(user?.progression?.level ?? 0)}
            level={user?.progression?.level ?? 0}
            onSaved={(ids: string[], pub: boolean) => setUser(prev => prev ? ({ ...prev, showcasedBadges: ids, showcasePublic: pub }) : prev)}
          />
        </section>
      </div>
    </div>
  );
}
