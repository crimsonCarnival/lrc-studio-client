interface LogoMarkProps {
  className?: string;
  /** True for a logo next to visible brand text, where the text itself is the accessible name. */
  decorative?: boolean;
}

/**
 * The brand mark (redesign 01 — Playhead pictorial mark): synced lyric lines (solid) trailing
 * off into upcoming ones (faded), with the playhead riding over them. Colors are theme tokens
 * so it adapts to both themes instead of shipping as a fixed-color raster image.
 */
export function LogoMark({ className, decorative = false }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'LRC Studio' })}
    >
      <g fill="var(--color-iris)">
        <rect x="6" y="12" width="24" height="8" rx="4" />
        <rect x="6" y="26" width="24" height="8" rx="4" />
        <rect x="6" y="40" width="24" height="8" rx="4" />
      </g>
      <g fill="var(--color-iris)" opacity="0.3">
        <rect x="36" y="12" width="14" height="8" rx="4" />
        <rect x="36" y="26" width="22" height="8" rx="4" />
        <rect x="36" y="40" width="8" height="8" rx="4" />
      </g>
      <rect x="31" y="9" width="3.5" height="48" rx="1.75" fill="var(--color-gold)" />
      <circle cx="32.75" cy="5" r="4" fill="var(--color-gold)" />
    </svg>
  );
}
