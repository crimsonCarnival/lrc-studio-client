import { useTranslation } from 'react-i18next';
import { BadgeChip } from './BadgeChip';
import { Tip } from '@ui/tip';
import { BADGE_REGISTRY } from './badge-registry';
import { useBadgeDefs } from './BadgeDefsContext';

const EMPTY_BADGES: string[] = [];

interface BadgeListProps {
  ids?: string[];
  max?: number;
  className?: string;
}

/**
 * Renders up to `max` badge chips inline, with a "+N more" pill that shows
 * the overflow badges in a tooltip on hover.
 */
export function BadgeList({ ids = EMPTY_BADGES, max = 3, className = '' }: BadgeListProps) {
  const { t, i18n } = useTranslation();
  const defs = useBadgeDefs();

  if (!ids.length) return null;

  const visible = ids.slice(0, max);
  const overflow = ids.slice(max);

  const overflowContent = overflow.length > 0 ? (
    <div className="flex flex-col gap-1.5 p-0.5">
      {overflow.map(id => {
        const def = defs[id] || BADGE_REGISTRY[id];
        if (!def) return null;
        
        const rawLabel = def.label;
        const labelText = typeof rawLabel === 'object' && rawLabel !== null 
          ? (rawLabel[i18n.language === 'es' ? 'es' : 'en'] || rawLabel.en) 
          : rawLabel;

        return (
          <div key={id} className="flex items-center gap-1.5">
            <BadgeChip id={id} />
            <span className="text-xs text-zinc-400">
              {t(`badges.${id}.tip`, { defaultValue: labelText })}
            </span>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {visible.map(id => (
        <BadgeChip key={id} id={id} />
      ))}
      {overflow.length > 0 && (
        <Tip content={overflowContent} side="bottom">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10.5px] font-medium border border-zinc-600/40 bg-zinc-800/50 text-zinc-400 cursor-default hover:border-zinc-500/60 hover:text-zinc-300 transition-colors select-none">
            +{overflow.length}
          </span>
        </Tip>
      )}
    </div>
  );
}
