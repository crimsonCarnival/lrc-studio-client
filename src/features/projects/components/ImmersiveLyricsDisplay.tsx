import { useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';

interface Palette {
  fg?: string;
  faded?: string;
  nearer?: string;
  accent?: string;
  bgDeep?: string;
  bgGradient?: string;
  topFade?: string;
  bottomFade?: string;
}

interface DisplayLine {
  id?: string | number;
  type?: string;
  label?: string;
  text?: string;
  secondary?: string;
  timestamp?: number | null;
  translations?: unknown[];
  [key: string]: unknown;
}

interface PlayerHandle {
  seek?: (time?: number | null) => void;
  play?: () => void;
}

// Opacity/size lookup by distance from active line
const DIST_STYLE = [
  // dist 0 — active
  { opacity: 1,    scale: 1,    weight: 800, sizeFactor: 1.15 },
  // dist 1
  { opacity: 0.75, scale: 0.97, weight: 700, sizeFactor: 1.0  },
  // dist 2
  { opacity: 0.50, scale: 0.94, weight: 600, sizeFactor: 0.92 },
  // dist 3
  { opacity: 0.30, scale: 0.91, weight: 500, sizeFactor: 0.86 },
  // dist 4+
  { opacity: 0.20, scale: 0.88, weight: 500, sizeFactor: 0.82 },
];

function getDistStyle(dist: number | null) {
  if (dist === null) return DIST_STYLE[2];
  return DIST_STYLE[Math.min(dist, DIST_STYLE.length - 1)];
}

interface ImmersiveLineProps {
  line: DisplayLine;
  dist: number | null;
  palette?: Palette | null;
  onClick: () => void;
  hasSyncedLines: boolean;
  showTranslations: boolean;
  isPlaying: boolean;
  playbackSpeed?: number;
}

// ── Single lyric line ────────────────────────────────────────
const ImmersiveLine = forwardRef<HTMLDivElement, ImmersiveLineProps>(function ImmersiveLine(
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
      onKeyDown={clickable ? (e: KeyboardEvent) => e.key === 'Enter' && onClick() : undefined}
      style={{
        opacity,
        color,
        fontWeight: weight,
        fontSize: `calc(${sizeFactor} * clamp(1.4rem, 3vw, 2.25rem))`,
        transition: 'opacity 0.35s ease, color 0.35s ease, font-size 0.3s ease, font-weight 0.3s ease',
        cursor: clickable ? 'pointer' : 'default',
        lineHeight: 1.2,
        paddingTop: '0.25em',
        paddingBottom: '0.25em',
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
          {translations[0] as string}
        </div>
      )}
    </div>
  );
});

// ── Section divider ──────────────────────────────────────────
function SectionDivider({ label, dist, palette }: { label?: string; dist: number | null; palette?: Palette | null }) {
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

interface ImmersiveLyricsDisplayProps {
  lines: DisplayLine[];
  playbackPosition: number;
  editorMode: string;
  playerRef?: RefObject<PlayerHandle | null>;
  hasMedia?: boolean;
  isPlaying?: boolean;
  playbackSpeed?: number;
  palette?: Palette | null;
  showTranslations?: boolean;
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
}: ImmersiveLyricsDisplayProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef(-2);

  const currentIndex = useMemo(
    () => computeCurrentIndex(lines, playbackPosition, editorMode),
    [lines, playbackPosition, editorMode],
  );

  const hasSyncedLines = useMemo(() => lines.some((l) => l.timestamp != null), [lines]);

  // Auto-scroll: keep active line at ~20% from top of container
  useEffect(() => {
    if (currentIndex === lastScrolledIndex.current) return;
    if (currentIndex < 0 || !containerRef.current || !activeRef.current) return;

    lastScrolledIndex.current = currentIndex;

    const container = containerRef.current;
    const active = activeRef.current;

    const raf = requestAnimationFrame(() => {
      const target = active.offsetTop - container.clientHeight * 0.20 + active.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(raf);
  }, [currentIndex]);

  const handleLineClick = useCallback(
    (line: DisplayLine) => {
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

        {/* Top/bottom padding so first & last lines can reach 20% position */}
        <div className="px-6 sm:px-10 lg:px-14" style={{ paddingTop: '20vh', paddingBottom: '35vh' }}>
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
