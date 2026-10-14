import { EMBLEM_SHAPES, emblemFor } from './badge-emblems';

interface BadgeEmblemProps {
  id: string;
  size?: number;
  /** Legacy colour name of a staff-defined badge, used when the id has no emblem of its own. */
  color?: string;
  /** Rarity adds a frame around the emblem; common and uncommon have none. */
  rarity?: string;
  /** Not earned yet: drawn grey and faint. */
  locked?: boolean;
  /** Shape and colour only, for rows of small emblems. */
  mini?: boolean;
  /** Just earned: pops in with a ring burst, once. */
  unlock?: boolean;
  /** Accessible name. Omit when the name is written next to the emblem. */
  label?: string;
  className?: string;
}

const FILL_OPACITY: Record<string, number> = { epic: 0.24, legendary: 0.28 };

/** A badge drawn as its emblem (redesign sheet 09). */
export function BadgeEmblem({ id, size = 68, color, rarity, locked = false, mini = false, unlock = false, label, className }: BadgeEmblemProps) {
  const emblem = emblemFor(id, color);
  const shape = EMBLEM_SHAPES[emblem.shape];
  const framed = !mini && (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`shrink-0${unlock ? ' emblem-unlock' : ''}${locked ? ' opacity-[.42] grayscale' : ''}${className ? ` ${className}` : ''}`}
      style={{
        color: emblem.color,
        filter: framed && rarity === 'epic' && !locked
          ? 'drop-shadow(0 0 8px color-mix(in srgb, currentColor 45%, transparent))'
          : undefined,
      }}
    >
      {mini ? (
        <path d={shape.outer} fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      ) : (
        <>
          {unlock && <circle className="emblem-burst" cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="2" />}
          {rarity === 'rare' && (
            <circle cx="36" cy="36" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
          )}
          {rarity === 'epic' && (
            <>
              <circle cx="36" cy="36" r="34" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M36 0v6 M36 66v6 M0 36h6 M66 36h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
          {rarity === 'legendary' && (
            <>
              <circle className="emblem-sheen" cx="36" cy="36" r="34" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeDasharray="40 174" strokeLinecap="round" />
              <circle cx="36" cy="36" r="34" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity=".5" />
            </>
          )}
          {/* A frame takes the outer 4px, so the emblem shrinks to sit inside it. */}
          <g transform={framed ? 'translate(36 36) scale(.9) translate(-36 -36)' : undefined}>
            <path d={shape.outer} fill="currentColor" fillOpacity={FILL_OPACITY[framed ? rarity ?? '' : ''] ?? 0.16} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={shape.inner} fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity=".35" strokeLinejoin="round" />
            <g transform="translate(24 24)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={emblem.glyph} />
            </g>
            {emblem.pips && (
              <g fill="currentColor">
                <circle cx="30" cy="58" r="2" />
                <circle cx="36" cy="58" r="2" />
                <circle cx="42" cy="58" r="2" />
              </g>
            )}
          </g>
        </>
      )}
    </svg>
  );
}
