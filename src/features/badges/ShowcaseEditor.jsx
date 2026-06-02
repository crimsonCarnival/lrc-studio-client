import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { m as M, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Lock, Sparkles, GripVertical } from 'lucide-react';
import { gqlRequest } from '@/app/graphql.client';
import { BADGE_REGISTRY, RARITY_CONFIG, BADGE_COLORS } from './badge-registry';

const UPDATE_SHOWCASE = `
  mutation UpdateShowcase($badgeIds: [String!]!) {
    updateShowcase(badgeIds: $badgeIds) {
      success
      error
      showcaseSlots
      level
    }
  }
`;

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

function rarityOf(pct) {
  if (pct > 50) return 'common';
  if (pct > 10) return 'uncommon';
  if (pct > 2)  return 'rare';
  if (pct > 0.5)return 'epic';
  return 'legendary';
}

function EarnedBadgeItem({ badge, isInShowcase, onToggle }) {
  const def = BADGE_REGISTRY[badge.id] ?? { label: badge.id, icon: '?', color: 'primary' };
  const colorConf = BADGE_COLORS[def.color] ?? BADGE_COLORS.primary;
  const rarity = badge.rarity ?? rarityOf(badge.rarityPct ?? 100);
  const rarityConf = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;

  return (
    <button
      type="button"
      onClick={() => onToggle(badge.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group
        ${isInShowcase
          ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
          : 'bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/70 hover:bg-zinc-800/60'
        }`}
    >
      <span className="text-xl shrink-0 leading-none">{def.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isInShowcase ? 'text-primary' : colorConf.text}`}>
          {def.label}
        </p>
        <p className="text-[10px] text-zinc-600 truncate">{def.condition}</p>
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0 ${rarityConf.className}`}>
        {rarityConf.label}
      </span>
      {isInShowcase && (
        <div className="size-4 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Sparkles className="size-2.5 text-zinc-950" />
        </div>
      )}
    </button>
  );
}

function ShowcaseSlot({ badge, index, onRemove, onDragStart, onDragOver, onDrop }) {
  if (!badge) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 opacity-50"
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDrop={() => onDrop(index)}
      >
        <div className="size-7 rounded-lg bg-zinc-800/60 flex items-center justify-center">
          <span className="text-zinc-700 text-xs font-bold">{index + 1}</span>
        </div>
        <span className="text-[10px] text-zinc-700 uppercase tracking-widest">Empty slot</span>
      </div>
    );
  }

  const def = BADGE_REGISTRY[badge.id] ?? { label: badge.id, icon: '?', color: 'primary' };
  const colorConf = BADGE_COLORS[def.color] ?? BADGE_COLORS.primary;

  return (
    <M.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88, x: 20 }}
      transition={{ duration: 0.18 }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop(index)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-700/50 bg-zinc-900/70 group"
    >
      <GripVertical className="size-3.5 text-zinc-700 cursor-grab active:cursor-grabbing shrink-0" />
      <div className="size-7 rounded-lg bg-zinc-800/60 flex items-center justify-center">
        <span className="text-xs font-bold text-zinc-500">{index + 1}</span>
      </div>
      <span className="text-xl leading-none">{def.icon}</span>
      <span className={`text-xs font-semibold flex-1 truncate ${colorConf.text}`}>{def.label}</span>
      <button
        type="button"
        onClick={() => onRemove(badge.id)}
        className="size-5 rounded-full bg-zinc-800 hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-zinc-500 hover:text-red-400"
      >
        <X className="size-3" />
      </button>
    </M.div>
  );
}

export function ShowcaseEditor({ userBadges = [], initialShowcase = [], showcaseSlots = 3, level = 0, onSaved }) {
  const { t } = useTranslation();
  const [showcase, setShowcase] = useState(initialShowcase.slice(0, showcaseSlots));
  const [saving, setSaving] = useState(false);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [rarityFilter, setRarityFilter] = useState('all');

  const showcaseSet = new Set(showcase);

  const sortedBadges = [...userBadges].sort((a, b) => {
    const ra = rarityOf(a.rarityPct ?? 100);
    const rb = rarityOf(b.rarityPct ?? 100);
    return (RARITY_ORDER[ra] ?? 4) - (RARITY_ORDER[rb] ?? 4);
  });

  const filteredBadges = rarityFilter === 'all'
    ? sortedBadges
    : sortedBadges.filter(b => rarityOf(b.rarityPct ?? 100) === rarityFilter);

  const toggleBadge = useCallback((badgeId) => {
    setShowcase(prev => {
      if (prev.includes(badgeId)) return prev.filter(id => id !== badgeId);
      if (prev.length >= showcaseSlots) {
        toast.error(t('badges.showcase.slotsFull', { slots: showcaseSlots }));
        return prev;
      }
      return [...prev, badgeId];
    });
  }, [showcaseSlots, t]);

  const removeFromShowcase = useCallback((badgeId) => {
    setShowcase(prev => prev.filter(id => id !== badgeId));
  }, []);

  const handleDrop = useCallback((targetIndex) => {
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
      const { updateShowcase: result } = await gqlRequest(UPDATE_SHOWCASE, { badgeIds: showcase });
      if (!result.success) throw new Error(result.error ?? 'Failed');
      toast.success(t('badges.showcase.saved'));
      onSaved?.(showcase);
    } catch (e) {
      toast.error(e.message || t('badges.showcase.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Build slot array with badge objects
  const slots = Array.from({ length: showcaseSlots }, (_, i) => {
    const id = showcase[i];
    return id ? (userBadges.find(b => b.id === id) ?? { id }) : null;
  });

  const NEXT_LEVEL_SLOTS = { 3: { level: 25, slots: 4 }, 4: { level: 50, slots: 5 }, 5: { level: 75, slots: 6 }, 6: { level: 100, slots: 8 } };
  const nextUnlock = NEXT_LEVEL_SLOTS[showcaseSlots];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-200">{t('badges.showcase.editorTitle', 'Showcase')}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {t('badges.showcase.slots', { count: showcase.length, max: showcaseSlots })}
            {nextUnlock && (
              <span className="ml-1.5 text-zinc-600">
                · {t('badges.showcase.nextSlot', { level: nextUnlock.level })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Lv.</span>
            <span className="text-sm font-bold text-zinc-200">{level}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Earned badges */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mr-1">
              {t('badges.showcase.earned', 'Earned')} ({userBadges.length})
            </p>
            {['all', 'legendary', 'epic', 'rare', 'uncommon', 'common'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRarityFilter(r)}
                className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border transition-all
                  ${rarityFilter === r
                    ? r === 'all'
                      ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                      : `${RARITY_CONFIG[r]?.className ?? ''} opacity-100`
                    : 'border-zinc-800 text-zinc-700 hover:text-zinc-500 hover:border-zinc-700'
                  }`}
              >
                {r === 'all' ? 'All' : RARITY_CONFIG[r]?.label ?? r}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {filteredBadges.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center">
                {t('badges.showcase.noBadgesFilter', 'No badges match this filter')}
              </p>
            ) : (
              filteredBadges.map(badge => (
                <EarnedBadgeItem
                  key={badge.id}
                  badge={badge}
                  isInShowcase={showcaseSet.has(badge.id)}
                  onToggle={toggleBadge}
                />
              ))
            )}
          </div>

          {userBadges.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="text-3xl opacity-30">🏆</span>
              <p className="text-xs text-zinc-600">{t('badges.showcase.noBadgesYet', 'Earn badges to showcase them')}</p>
            </div>
          )}
        </div>

        {/* Right: Showcase slots */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            {t('badges.showcase.displayedOn', 'Displayed on profile')}
          </p>
          <div className="flex flex-col gap-1.5">
            <AnimatePresence mode="popLayout">
              {slots.map((badge, i) => (
                <ShowcaseSlot
                  key={badge?.id ?? `empty-${i}`}
                  badge={badge}
                  index={i}
                  onRemove={removeFromShowcase}
                  onDragStart={setDragFrom}
                  onDragOver={setDragOver}
                  onDrop={handleDrop}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Locked slots */}
          {nextUnlock && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-zinc-800/50 opacity-40">
              <Lock className="size-3 text-zinc-700" />
              <span className="text-[10px] text-zinc-700">
                {t('badges.showcase.lockedSlot', { level: nextUnlock.level, slots: nextUnlock.slots })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-1 border-t border-zinc-800/50">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-zinc-950 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <span className="size-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {t('badges.showcase.save', 'Save Showcase')}
        </button>
      </div>
    </div>
  );
}
