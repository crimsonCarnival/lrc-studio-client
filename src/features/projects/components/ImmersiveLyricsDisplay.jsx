import { useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';

// Opacity/size lookup by distance from active line
const DIST_STYLE = [
  // dist 0 — active
  { opacity: 1,    scale: 1,    weight: 700, sizeFactor: 1.15 },
  // dist 1
  { opacity: 0.72, scale: 0.97, weight: 500, sizeFactor: 1.0  },
  // dist 2
  { opacity: 0.45, scale: 0.94, weight: 400, sizeFactor: 0.92 },
  // dist 3
  { opacity: 0.28, scale: 0.91, weight: 400, sizeFactor: 0.86 },
  // dist 4+
  { opacity: 0.18, scale: 0.88, weight: 400, sizeFactor: 0.82 },
];

function getDistStyle(dist) {
  if (dist === null) return DIST_STYLE[2];
  return DIST_STYLE[Math.min(dist, DIST_STYLE.length - 1)];
}

// ── Single lyric line ────────────────────────────────────────
const ImmersiveLine = forwardRef(/** @param {{ line: any, dist: number|null, palette: any, onClick: () => void, hasSyncedLines: boolean, showTranslations: boolean, isPlaying: boolean, playbackSpeed: number }} props */ function ImmersiveLine(
  { line, dist, palette, onClick, hasSyncedLines, showTranslations, isPlaying, playbackSpeed = 1 },
  ref,
) {
  const { opacity, weight, sizeFactor } = getDistStyle(dist);

  const fg = palette?.fg ?? 'rgba(255,255,255,1)';
  const faded = palette?.faded ?? 'rgba(255,255,255,0.35)';
  const nearer = palette?.nearer ?? 'rgba(255,255,255,0.65)';

  const color = dist === 0 ? fg : dist === 1 ? nearer : faded;
  const clickable = hasSyncedLines && line.timestamp != null;

  const translations = Array.isArray(line.translations) ? line.translations : [];

  return (
    <div
      ref={ref}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        opacity,
        color,
        fontWeight: weight,
        fontSize: `calc(${sizeFactor} * clamp(1.1rem, 2.5vw, 1.55rem))`,
        transition: 'opacity 0.35s ease, color 0.35s ease, font-size 0.3s ease, font-weight 0.3s ease',
        cursor: clickable ? 'pointer' : 'default',
        lineHeight: 1.35,
        paddingTop: '0.55em',
        paddingBottom: '0.55em',
        userSelect: 'none',
      }}
      className="w-full flex items-start gap-2"
    >
      {/* Pulsing dot while this line is actively playing */}
      {isPlaying && (
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            width: '6px',
            height: '6px',
            marginTop: '0.45em',
            borderRadius: '50%',
            background: color,
            animation: `pulse ${(1.4 / Math.max(0.5, playbackSpeed)).toFixed(2)}s ease-in-out infinite`,
          }}
        />
      )}
      <span>{line.text}</span>

      {line.secondary && (
        <div
          style={{
            fontSize: '0.72em',
            opacity: 0.75,
            marginTop: '0.2em',
            fontWeight: 400,
          }}
        >
          {line.secondary}
        </div>
      )}

      {showTranslations && translations.length > 0 && (
        <div
          style={{
            fontSize: '0.68em',
            opacity: 0.65,
            marginTop: '0.15em',
            fontWeight: 400,
            fontStyle: 'italic',
          }}
        >
          {translations[0]}
        </div>
      )}
    </div>
  );
});

// ── Section divider ──────────────────────────────────────────
function SectionDivider({ label, dist, palette }) {
  const { opacity } = getDistStyle(dist);
  const accent = palette?.accent ?? 'rgba(255,255,255,0.5)';

  return (
    <div
      style={{
        opacity: Math.max(0.25, opacity * 0.65),
        transition: 'opacity 0.35s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6em',
        paddingTop: '1.1em',
        paddingBottom: '0.4em',
      }}
    >
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accent,
        }}
      >
        {label || '◆'}
      </span>
      <span style={{ flex: 1, height: 1, background: accent, opacity: 0.3 }} />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function ImmersiveLyricsDisplay({
  lines,
  playbackPosition,
  editorMode,
  playerRef,
  hasMedia,
  isPlaying = false,
  playbackSpeed = 1,
  palette,
  showTranslations = true,
}) {
  const { t } = useTranslation();
  const containerRef = /** @type {React.RefObject<HTMLDivElement>} */ (/** @type {unknown} */ (useRef(null)));
  const activeRef = /** @type {React.RefObject<HTMLDivElement>} */ (/** @type {unknown} */ (useRef(null)));
  const lastScrolledIndex = useRef(-2);

  const currentIndex = useMemo(
    () => computeCurrentIndex(lines, playbackPosition, editorMode),
    [lines, playbackPosition, editorMode],
  );

  const hasSyncedLines = useMemo(() => lines.some((l) => l.timestamp != null), [lines]);

  // Auto-scroll: keep active line at ~32% from top of container
  useEffect(() => {
    if (currentIndex === lastScrolledIndex.current) return;
    if (currentIndex < 0 || !containerRef.current || !activeRef.current) return;

    lastScrolledIndex.current = currentIndex;

    const container = containerRef.current;
    const active = activeRef.current;

    const raf = requestAnimationFrame(() => {
      const target = active.offsetTop - container.clientHeight * 0.32 + active.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(raf);
  }, [currentIndex]);

  const handleLineClick = useCallback(
    (line) => {
      if (line.timestamp != null && playerRef?.current?.seek) {
        playerRef.current.seek(line.timestamp);
        playerRef.current.play?.();
      }
    },
    [playerRef],
  );

  const bg = palette?.bgDeep ?? 'hsl(var(--background))';

  // Placeholder states
  if (!lines.length) {
    return (
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center"
        style={{ background: palette?.bgGradient ?? bg }}
      >
        <p style={{ color: palette?.faded ?? 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontStyle: 'italic' }}>
          {t('editor.pastePlaceholder')}
        </p>
      </div>
    );
  }

  if (!hasSyncedLines && !hasMedia) {
    return (
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center"
        style={{ background: palette?.bgGradient ?? bg }}
      >
        <p style={{ color: palette?.faded ?? 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontStyle: 'italic' }}>
          {t('preview.placeholder')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative flex-1 min-h-0 overflow-hidden"
      style={{ background: palette?.bgGradient ?? bg }}
    >
      {/* Pulse keyframe for the playing indicator dot */}
      <style>{`@keyframes pulse{0%,100%{opacity:.6;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}`}</style>

      {/* Top fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: '18%', background: palette?.topFade ?? `linear-gradient(to bottom, ${bg}, transparent)` }}
      />
      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: '18%', background: palette?.bottomFade ?? `linear-gradient(to top, ${bg}, transparent)` }}
      />

      {/* Scroll container — hides scrollbar visually */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.immersive-scroll::-webkit-scrollbar { display: none; }`}</style>

        {/* Top/bottom padding so first & last lines can reach 32% position */}
        <div className="px-6 sm:px-10 lg:px-14" style={{ paddingTop: '35vh', paddingBottom: '45vh' }}>
          {lines.map((line, i) => {
            const isActive = i === currentIndex;
            const dist = currentIndex >= 0 ? Math.abs(i - currentIndex) : null;

            if (line.type === 'section') {
              return (
                <SectionDivider
                  key={line.id ?? `s-${i}`}
                  label={line.label}
                  dist={dist}
                  palette={palette}
                />
              );
            }

            return (
              <ImmersiveLine
                key={line.id ?? `l-${i}`}
                ref={isActive ? activeRef : null}
                line={line}
                dist={dist}
                palette={palette}
                onClick={() => handleLineClick(line)}
                hasSyncedLines={hasSyncedLines}
                showTranslations={showTranslations}
                isPlaying={isActive && isPlaying}
                playbackSpeed={playbackSpeed}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
