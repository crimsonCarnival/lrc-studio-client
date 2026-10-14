const WIDTH = 1280;
const HEIGHT = 400;
const STEP = 160;

// Ten waves, 40px apart. Amplitude cycles through three sizes and each row starts on the
// opposite phase from the one above, so the lines read as terrain and not as stripes.
const WAVES = Array.from({ length: 10 }, (_, i) => {
  const y = 20 + i * 40;
  const amplitude = 18 + (i % 3) * 10;
  let d = `M-40 ${y}`;
  for (let x = -40; x < WIDTH; x += STEP) {
    const up = (Math.round(x / STEP) + i) % 2 === 0;
    d += ` Q ${x + STEP / 2} ${y + (up ? -amplitude : amplitude)} ${x + STEP} ${y}`;
  }
  return d;
});

/**
 * The brand's background motif (redesign sheet 12): faint contour lines that drift
 * sideways. Decorative; it fills its parent, which must be positioned and clip overflow.
 */
export function ContourLines({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH - 80} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 size-full text-foreground/[.07] ${className}`}
    >
      <g className="contour-drift" fill="none" stroke="currentColor" strokeWidth="1.5">
        {WAVES.map((d) => <path key={d} d={d} />)}
      </g>
    </svg>
  );
}
