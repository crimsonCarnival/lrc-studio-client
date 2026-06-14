import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es, ja } from 'date-fns/locale';
import { BADGE_REGISTRY, RARITY_CONFIG, BADGE_COLORS } from './badge-registry';

const DATE_LOCALES = { en: enUS, es, ja };
const EMPTY_BADGES = [];

const RARITY_BORDER_STYLE = {
  common:    'border border-zinc-700/60',
  uncommon:  'border border-emerald-500/30',
  rare:      'border border-blue-500/40',
  epic:      'border border-purple-500/50',
  legendary: 'border-0 showcase-legendary-border',
};

const RARITY_GLOW = {
  common:    '',
  uncommon:  'shadow-[0_0_18px_-4px_rgba(52,211,153,.35)]',
  rare:      'shadow-[0_0_22px_-4px_rgba(96,165,250,.45)]',
  epic:      'shadow-[0_0_28px_-4px_rgba(192,132,252,.5)]',
  legendary: 'shadow-[0_0_36px_-6px_rgba(251,191,36,.55)]',
};

// Inject legendary animation once
if (typeof document !== 'undefined' && !document.getElementById('showcase-styles')) {
  const style = document.createElement('style');
  style.id = 'showcase-styles';
  style.textContent = `
    .showcase-legendary-border {
      position: relative;
      padding: 1px;
    }
    .showcase-legendary-border::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1.5px;
      background: conic-gradient(from var(--angle, 0deg), #f59e0b, #ef4444, #a855f7, #3b82f6, #10b981, #f59e0b);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: spin-hue 3s linear infinite;
    }
    @keyframes spin-hue {
      to { --angle: 360deg; }
    }
  `;
  document.head.appendChild(style);
}

function TiltCard({ children, className = '' }) {
  const ref = useRef(null);

  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    el.style.willChange = 'transform';
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) scale(1.03)`;
  };

  const onMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = '';
      ref.current.style.willChange = '';
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-transform duration-100 ${className}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function ShowcaseCard({ badge, locale = 'en' }) {
  const { t } = useTranslation();
  const def = BADGE_REGISTRY[badge.id] ?? { label: badge.label, icon: badge.icon, color: badge.color };
  const rarity = badge.rarity ?? 'common';
  const rarityConf = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const colorConf = BADGE_COLORS[def.color] ?? BADGE_COLORS.primary;
  const grantedStr = badge.grantedAt
    ? formatDistanceToNow(new Date(badge.grantedAt), { addSuffix: true, locale: DATE_LOCALES[locale] ?? enUS })
    : '';

  const isShimmer = def.color === 'shimmer';

  const badgeLabel = t(`badges.${badge.id}.label`, def.label);

  return (
    <TiltCard className={`rounded-xl overflow-hidden ${RARITY_BORDER_STYLE[rarity]} ${RARITY_GLOW[rarity]}`}>
      <div className="relative flex flex-col items-center gap-2 px-4 pt-4 pb-3 bg-zinc-900 rounded-xl group cursor-default select-none min-w-[96px] min-h-[96px] justify-center">
        {/* Color accent bar at top */}
        <div className={`absolute top-0 inset-x-0 h-0.5 rounded-t-xl ${colorConf.border.replace('border-', 'bg-').replace('/40', '/70')}`} />

        {/* Badge name */}
        {isShimmer ? (
          <span className="badge-shimmer-txt text-xs font-bold text-center leading-snug">
            {badgeLabel}
          </span>
        ) : (
          <span className={`text-xs font-bold text-center leading-snug ${colorConf.text}`}>
            {badgeLabel}
          </span>
        )}

        {/* Rarity pill */}
        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${rarityConf.className}`}>
          {t(rarityConf.labelKey)}
        </span>

        {/* Unlock date */}
        {grantedStr && (
          <span className="text-[9px] text-zinc-500 text-center leading-tight">{grantedStr}</span>
        )}

        {/* Holder % on hover */}
        {badge.rarityPct !== undefined && (
          <div className="absolute inset-x-0 -bottom-9 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="mx-auto w-max bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-zinc-400 whitespace-nowrap shadow-xl">
              {badge.holderCount?.toLocaleString()} holders · {badge.rarityPct.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </TiltCard>
  );
}

function EmptySlot({ slotIndex: _slotIndex }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2 p-4 min-w-[88px] min-h-[120px] opacity-40">
      <div className="size-8 rounded-full border border-zinc-700 flex items-center justify-center">
        <span className="text-zinc-600 text-lg">·</span>
      </div>
      <span className="text-[9px] text-zinc-700 uppercase tracking-widest">Empty</span>
    </div>
  );
}

export function ShowcasedBadges({ badges = EMPTY_BADGES, maxSlots = 3, locale = 'en', className = '' }) {
  const { t } = useTranslation();

  if (badges.length === 0 && maxSlots === 0) return null;

  const slots = Array.from({ length: maxSlots }, (_, i) => badges[i] ?? null);

  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600">
        {t('badges.showcase.title')}
      </p>
      <div className="flex gap-2 flex-wrap pb-2">
        {slots.map((badge, i) =>
          badge
            ? <ShowcaseCard key={badge.id} badge={badge} locale={locale} />
            : <EmptySlot key={`empty-${i}`} slotIndex={i} />
        )}
      </div>
    </section>
  );
}
