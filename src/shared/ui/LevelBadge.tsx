interface LevelBadgeProps {
  level: number;
  /** Tailwind positioning classes — defaults to top-right corner */
  className?: string;
}

/**
 * Downward bookmark ribbon showing the user's level.
 * Place inside a `relative` container; it positions itself absolutely.
 */
export function LevelBadge({ level, className = 'right-6' }: LevelBadgeProps) {
  if (!level || level <= 0) return null;

  const digits = String(level).length;
  const width  = digits >= 3 ? 46 : 38;

  return (
    <div
      aria-label={`Level ${level}`}
      className={`absolute top-0 flex flex-col items-center justify-start pt-1.5 gap-px select-none pointer-events-none z-10 ${className}`}
      style={{
        width,
        height: 54,
        background: 'var(--color-primary)',
        clipPath: 'polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%)',
      }}
    >
      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-950/60 leading-none">
        LV
      </span>
      <span
        className="font-black text-zinc-950 leading-none"
        style={{ fontSize: digits >= 3 ? 13 : digits === 2 ? 15 : 18 }}
      >
        {level}
      </span>
    </div>
  );
}
