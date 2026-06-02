import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';
import { BADGE_REGISTRY } from './badge-registry';

// Inject shimmer keyframes once on module load
if (typeof document !== 'undefined' && !document.getElementById('lrc-badge-styles')) {
  const style = document.createElement('style');
  style.id = 'lrc-badge-styles';
  style.textContent = `
    @keyframes badge-shimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    .badge-shimmer-txt {
      background: linear-gradient(90deg,#f6c177,#c4a7e7,#9ccfd8,#f6c177);
      background-size: 300% auto;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: badge-shimmer 3s linear infinite;
    }
  `;
  document.head.appendChild(style);
}

const COLOR_CLASSES = {
  amber:   'text-warning    bg-warning/10    border-warning/25',
  teal:    'text-accent-blue bg-accent-blue/10 border-accent-blue/25',
  green:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  primary: 'text-primary    bg-primary/10    border-primary/25',
  rose:    'text-rose-400   bg-rose-400/10   border-rose-400/25',
  shimmer: 'border-amber-400/30 bg-gradient-to-r from-warning/10 via-primary/10 to-accent-blue/10',
};

export function BadgeChip({ id, className = '' }) {
  const { t } = useTranslation();
  const def = BADGE_REGISTRY[id];
  if (!def) return null;

  const isShimmer = def.color === 'shimmer';
  const colorCls = COLOR_CLASSES[def.color] ?? COLOR_CLASSES.primary;
  const tip = t(`badges.${id}.tip`, { defaultValue: '' });

  return (
    <Tip content={tip || undefined} side="bottom">
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10.5px] font-medium tracking-wide border whitespace-nowrap select-none transition-transform hover:scale-105 cursor-default ${colorCls} ${className}`}
      >
        {isShimmer ? (
          <span className="badge-shimmer-txt">{t(`badges.${id}.label`, { defaultValue: def.label })}</span>
        ) : (
          <span>{t(`badges.${id}.label`, { defaultValue: def.label })}</span>
        )}
      </span>
    </Tip>
  );
}
