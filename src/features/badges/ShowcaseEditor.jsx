import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Lock, Sparkles, GripVertical } from 'lucide-react';
import { gqlRequest } from '@/app/graphql.client';
import { BADGE_REGISTRY, RARITY_CONFIG, BADGE_COLORS } from './badge-registry';

const UPDATE_SHOWCASE = `
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

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

function rarityOf(pct) {
  if (pct > 50) return 'common';
  if (pct > 10) return 'uncommon';
  if (pct > 2)  return 'rare';
  if (pct > 0.5)return 'epic';
  return 'legendary';
}

function EarnedBadgeItem({ badge, isInShowcase, onToggle }) {
  const { t } = useTranslation();
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
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isInShowcase ? 'text-primary' : colorConf.text}`}>
          {def.label}
        </p>
        <p className="text-[10px] text-zinc-600 truncate">{t(`badges.${badge.id}.tip`, def.condition ?? '')}</p>
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0 ${rarityConf.className}`}>
        {t(rarityConf.labelKey)}
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
  const { t } = useTranslation();
  if (!badge) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 opacity-50"
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDrop={() => onDrop(index)}
      >
        <div className="size-7 rounded-lg bg-zinc-800/60 flex items-center justify-center">
          <span className="text-zinc-500 text-xs font-bold">{index + 1}</span>
        </div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('badges.showcase.emptySlot', 'Empty')}</span>
      </div>
    );
  }

  const def = BADGE_REGISTRY[badge.id] ?? { label: badge.id, icon: '?', color: 'primary' };
  const colorConf = BADGE_COLORS[def.color] ?? BADGE_COLORS.primary;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop(index)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800 group"
    >
      <GripVertical className="size-3.5 text-zinc-600 cursor-grab active:cursor-grabbing shrink-0" />
      <div className="size-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-zinc-400">{index + 1}</span>
      </div>
      <span className={`text-sm font-semibold flex-1 truncate ${colorConf.text}`}>{t(`badges.${badge.id}.label`, def.label)}</span>
      <button
        type="button"
        onClick={() => onRemove(badge.id)}
        className="size-6 rounded-full hover:bg-red-500/20 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function ShowcaseEditor({ userBadges = [], initialShowcase = [], initialPublic = true, showcaseSlots = 3, level = 0, onSaved }) {
  const { t } = useTranslation();
  const [showcase, setShowcase] = useState(initialShowcase.slice(0, showcaseSlots));
  const [showcasePublic, setShowcasePublic] = useState(initialPublic);
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
      const { updateShowcase: result } = await gqlRequest(UPDATE_SHOWCASE, { badgeIds: showcase, showcasePublic });
      if (!result.success) throw new Error(result.error ?? 'Failed');
      toast.success(t('badges.showcase.saved'));
      onSaved?.(showcase, showcasePublic);
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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mr-1">
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
                {r === 'all' ? t('badges.showcase.filterAll') : t(RARITY_CONFIG[r]?.labelKey ?? `badges.rarity.${r}`)}
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {t('badges.showcase.displayedOn', 'Displayed on profile')}
          </p>
          <div className="flex flex-col gap-1.5">
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

          {/* Locked slots */}
          {nextUnlock && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-zinc-800/50 opacity-40">
              <Lock className="size-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-500">
                {t('badges.showcase.lockedSlot', { level: nextUnlock.level, slots: nextUnlock.slots })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            className={`relative w-9 h-5 rounded-full transition-colors ${showcasePublic ? 'bg-primary' : 'bg-zinc-700'}`}
            onClick={() => setShowcasePublic(v => !v)}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showcasePublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs text-zinc-400">{t('badges.showcase.publicToggle', 'Show on profile')}</span>
        </label>

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
