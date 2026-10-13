import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { gqlRequest } from '@/app/graphql.client';
import { BADGE_REGISTRY, RARITY_CONFIG, BADGE_COLORS } from './badge-registry';
import { useBadgeDefs } from './BadgeDefsContext';
import { Button } from '@ui/button';
import { Toggle } from '@/features/settings/components/shared';

const UPDATE_SHOWCASE = /* GraphQL */ `
  mutation UpdateShowcase($badgeIds: [String!]!, $showcasePublic: Boolean) {
    updateShowcase(badgeIds: $badgeIds, showcasePublic: $showcasePublic) {
      success
      error
      showcaseSlots
      level
      showcasePublic
    }
  }
`;

const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

interface Badge {
  id: string;
  rarity?: string;
  rarityPct?: number;
}

const EMPTY_BADGES: Badge[] = [];
const EMPTY_SHOWCASE: string[] = [];

const TOTAL_BADGES = 18;

function EarnedBadgeItem({ badge, isInShowcase, onToggle }: { badge: Badge; isInShowcase: boolean; onToggle: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const tk = t as (key: string, defaultValue?: string) => string;
  const dbDefs = useBadgeDefs();
  const def = BADGE_REGISTRY[badge.id] ?? { label: badge.id, icon: '?', color: 'primary' };
  const colorConf = BADGE_COLORS[def.color] ?? BADGE_COLORS.primary;
  const rarity = dbDefs[badge.id]?.rarity ?? badge.rarity ?? 'common';
  const rarityConf = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const rawLabel = def.label as unknown;
  const fallbackLabel = typeof rawLabel === 'object' && rawLabel !== null
    ? ((rawLabel as Record<string, string>)[i18n.language === 'es' ? 'es' : 'en'] ?? '')
    : String(rawLabel);
  const label = tk(`badges.${badge.id}.label`, fallbackLabel);

  return (
    <li className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-zinc-950 border border-zinc-800">
      <span className={`shrink-0 min-w-[84px] text-center px-2 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 ${colorConf.text}`}>
        {label}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-zinc-400">{tk(`badges.${badge.id}.tip`, def.condition ?? '')}</span>
        <span className="block text-xs text-zinc-500 mt-0.5">{tk(rarityConf.labelKey)}</span>
      </span>
      <button
        type="button"
        aria-pressed={isInShowcase}
        aria-label={t(isInShowcase ? 'badges.showcase.removeFrom' : 'badges.showcase.addTo', { name: label })}
        onClick={() => onToggle(badge.id)}
        className={`shrink-0 size-9 rounded-lg border font-bold text-[15px] transition-colors ${isInShowcase
          ? 'bg-primary border-primary text-zinc-900'
          : 'border-zinc-700 text-zinc-100 hover:bg-zinc-800'}`}
      >
        {isInShowcase ? '✓' : '+'}
      </button>
    </li>
  );
}

function ShowcaseSlot({ badge, index, onRemove, onDragStart, onDragOver, onDrop }: {
  badge: Badge | null;
  index: number;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
}) {
  const { t } = useTranslation();
  const tk = t as (key: string, defaultValue?: string) => string;
  const number = (
    <span className="absolute left-2 top-1.5 text-[11px] font-mono text-zinc-500">{index + 1}</span>
  );
  if (!badge) {
    return (
      <div
        className="relative aspect-square rounded-[14px] border border-dashed border-zinc-700"
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDrop={() => onDrop(index)}
      >
        {number}
      </div>
    );
  }

  const def = BADGE_REGISTRY[badge.id] ?? { label: badge.id, icon: '?', color: 'primary' };
  const colorConf = BADGE_COLORS[def.color] ?? BADGE_COLORS.primary;
  const label = tk(`badges.${badge.id}.label`, typeof def.label === 'string' ? def.label : badge.id);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop(index)}
      className={`group relative aspect-square rounded-[14px] flex items-center justify-center border bg-zinc-800/60 cursor-grab active:cursor-grabbing ${colorConf.border}`}
    >
      {number}
      <span className={`text-xs font-bold text-center px-1 ${colorConf.text}`}>{label}</span>
      <button
        type="button"
        aria-label={t('badges.showcase.removeFrom', { name: label })}
        onClick={() => onRemove(badge.id)}
        className="absolute right-1 top-1 size-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 coarse:opacity-100 transition-opacity"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

interface ShowcaseEditorProps {
  userBadges?: Badge[];
  initialShowcase?: string[];
  initialPublic?: boolean;
  showcaseSlots?: number;
  onSaved?: (showcase: string[], showcasePublic: boolean) => void;
}

export function ShowcaseEditor({ userBadges = EMPTY_BADGES, initialShowcase = EMPTY_SHOWCASE, initialPublic = true, showcaseSlots = 3, onSaved }: ShowcaseEditorProps) {
  const { t } = useTranslation();
  // Rarity filter keys are dynamic.
  const tk = t as (key: string) => string;
  const [showcase, setShowcase] = useState<string[]>(() => initialShowcase.slice(0, showcaseSlots));
  const [showcasePublic, setShowcasePublic] = useState(initialPublic);
  const [saving, setSaving] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [, setDragOver] = useState<number | null>(null);
  const [rarityFilter, setRarityFilter] = useState('all');

  const showcaseSet = new Set(showcase);

  const dbDefs = useBadgeDefs();
  const rarityFor = (b: Badge) => dbDefs[b.id]?.rarity ?? b.rarity ?? 'common';

  const sortedBadges = userBadges.toSorted((a, b) => {
    return (RARITY_ORDER[rarityFor(a)] ?? 4) - (RARITY_ORDER[rarityFor(b)] ?? 4);
  });

  const filteredBadges = rarityFilter === 'all'
    ? sortedBadges
    : sortedBadges.filter(b => rarityFor(b) === rarityFilter);

  const toggleBadge = useCallback((badgeId: string) => {
    setShowcase(prev => {
      if (prev.includes(badgeId)) return prev.filter(id => id !== badgeId);
      if (prev.length >= showcaseSlots) {
        toast.error(t('badges.showcase.slotsFull', { slots: showcaseSlots }));
        return prev;
      }
      return [...prev, badgeId];
    });
  }, [showcaseSlots, t]);

  const removeFromShowcase = useCallback((badgeId: string) => {
    setShowcase(prev => prev.filter(id => id !== badgeId));
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    if (dragFrom === null || dragFrom === targetIndex) return;
    setShowcase(prev => {
      const next = [...prev];
      const item = next[dragFrom];
      next.splice(dragFrom, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
    setDragFrom(null);
    setDragOver(null);
  }, [dragFrom]);

  const save = async () => {
    setSaving(true);
    try {
      const { updateShowcase: result } = await gqlRequest(UPDATE_SHOWCASE, { badgeIds: showcase, showcasePublic }) as { updateShowcase: { success: boolean; error?: string } };
      if (!result.success) throw new Error(result.error ?? 'Failed');
      toast.success(t('badges.showcase.saved'));
      onSaved?.(showcase, showcasePublic);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || t('badges.showcase.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Build slot array with badge objects
  const slots: (Badge | null)[] = Array.from({ length: showcaseSlots }, (_, i) => {
    const id = showcase[i];
    return id ? (userBadges.find(b => b.id === id) ?? { id }) : null;
  });

  const NEXT_LEVEL_SLOTS: Record<number, { level: number; slots: number }> = { 3: { level: 25, slots: 4 }, 4: { level: 50, slots: 5 }, 5: { level: 75, slots: 6 }, 6: { level: 100, slots: 8 } };
  const nextUnlock = NEXT_LEVEL_SLOTS[showcaseSlots];

  return (
    <>
      <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-bold text-zinc-100">{t('badges.showcase.yourShowcase')}</h2>
          <span className="text-[13px] text-zinc-400">
            {t('badges.showcase.slots', { count: showcase.length, max: showcaseSlots })} · {t('badges.showcase.orderHint')}
            {nextUnlock && <> · {t('badges.showcase.nextSlot', { level: nextUnlock.level })}</>}
          </span>
        </div>
        <div className="grid gap-2.5 mt-[18px]" style={{ gridTemplateColumns: `repeat(${Math.min(showcaseSlots, 8)}, minmax(0, 1fr))` }}>
          {slots.map((badge, i) => (
            <ShowcaseSlot
              key={i}
              badge={badge}
              index={i}
              onRemove={removeFromShowcase}
              onDragStart={setDragFrom}
              onDragOver={setDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <Toggle checked={showcasePublic} onChange={setShowcasePublic} label={t('badges.showcase.publicToggle')} />
            <span className="text-sm text-zinc-400">{t('badges.showcase.publicToggle')}</span>
          </div>
          <Button type="button" onClick={save} loading={saving} className="h-11 gap-2 px-5 text-sm lg:h-11 lg:px-5 lg:text-sm">
            {t('badges.showcase.save')}
          </Button>
        </div>
      </section>

      <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-zinc-100">
            {t('badges.showcase.earned')}{' '}
            <span className="text-zinc-400 font-medium">{t('badges.showcase.earnedCount', { count: userBadges.length, total: TOTAL_BADGES })}</span>
          </h2>
          <label className="flex items-center gap-2 text-[13px] text-zinc-400">
            {t('badges.showcase.rarity')}
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="h-9 rounded-[10px] bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none focus:border-primary/60 cursor-pointer"
            >
              {['all', 'legendary', 'epic', 'rare', 'uncommon', 'common'].map(r => (
                <option key={r} value={r}>
                  {r === 'all' ? t('badges.showcase.filterAll') : tk(RARITY_CONFIG[r as keyof typeof RARITY_CONFIG]?.labelKey ?? `badges.rarity.${r}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {userBadges.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">{t('badges.showcase.noBadgesYet')}</p>
        ) : filteredBadges.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">{t('badges.showcase.noBadgesFilter')}</p>
        ) : (
          <ul className="grid gap-2.5 mt-4 list-none p-0 m-0 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            {filteredBadges.map(badge => (
              <EarnedBadgeItem
                key={badge.id}
                badge={badge}
                isInShowcase={showcaseSet.has(badge.id)}
                onToggle={toggleBadge}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
