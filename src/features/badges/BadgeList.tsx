import { useTranslation } from 'react-i18next';
import { BadgeEmblem } from './BadgeEmblem';
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
 * A row of up to `max` small emblems (redesign sheet 09), each named in a tooltip, with a
 * "+N" pill that lists the rest on hover.
 */
export function BadgeList({ ids = EMPTY_BADGES, max = 3, className = '' }: BadgeListProps) {
  const { t, i18n } = useTranslation();
  const defs = useBadgeDefs();
  // Badge keys are composed from the id.
  const tk = t as (key: string, options: { defaultValue: string }) => string;

  const known = ids.filter(id => defs[id] || BADGE_REGISTRY[id]);
  if (!known.length) return null;

  const nameOf = (id: string) => {
    const rawLabel: unknown = (defs[id] || BADGE_REGISTRY[id]).label;
    const fallback = typeof rawLabel === 'object' && rawLabel !== null
      ? ((rawLabel as Record<string, string>)[i18n.language === 'es' ? 'es' : 'en'] || (rawLabel as Record<string, string>).en)
      : String(rawLabel);
    return tk(`badges.${id}.label`, { defaultValue: fallback });
  };

  const visible = known.slice(0, max);
  const overflow = known.slice(max);

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {visible.map(id => {
        const name = nameOf(id);
        const tip = tk(`badges.${id}.tip`, { defaultValue: '' });
        return (
          <Tip key={id} content={tip ? `${name} · ${tip}` : name} side="bottom">
            <span className="inline-flex cursor-default">
              <BadgeEmblem id={id} color={defs[id]?.color} size={22} mini label={name} />
            </span>
          </Tip>
        );
      })}
      {overflow.length > 0 && (
        <Tip
          side="bottom"
          content={
            <div className="flex flex-col gap-1.5 p-0.5">
              {overflow.map(id => (
                <div key={id} className="flex items-center gap-1.5">
                  <BadgeEmblem id={id} color={defs[id]?.color} size={18} mini />
                  <span className="text-xs">{nameOf(id)}</span>
                </div>
              ))}
            </div>
          }
        >
          <span className="inline-flex h-[22px] items-center rounded-full bg-raised px-1.5 font-mono text-[11px] font-medium text-subtle inset-ring inset-ring-hl cursor-default select-none">
            +{overflow.length}
          </span>
        </Tip>
      )}
    </div>
  );
}
