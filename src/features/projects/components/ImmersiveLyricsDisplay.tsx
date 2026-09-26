import { useRef, useEffect, useCallback, useMemo, forwardRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';
import InstrumentalDots from '@/features/editor/components/line/InstrumentalDots';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { singerColorIndex, singerGradient } from '@features/editor/utils/singer-colors';

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

export interface DisplayLine {
  id?: string | number;
  type?: string;
  label?: string;
  text?: string;
  secondary?: string;
  timestamp?: number | null;
  endTime?: number | null;
  adLibOf?: number | null;
  translations?: unknown[];
  singers?: string[];
  mode?: string;
  words?: Array<{ word: string; time?: number | null; singerIndex?: number }>;
  [key: string]: unknown;
}

interface PlayerHandle {
  seek?: (time?: number | null) => void;
  play?: () => void;
}

// Opacity/size lookup by distance from active line
const DIST_STYLE = [
  // dist 0 — active
  { opacity: 1, scale: 1, weight: 800, sizeFactor: 1.15 },
  // dist 1
  { opacity: 0.75, scale: 0.97, weight: 700, sizeFactor: 1.0 },
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
  playbackPosition: number;
  nextTimestamp?: number | null;
  playbackSpeed?: number;
  editorMode?: string;
  songSingers?: string[];
  singerColors?: string[];
  alignment?: 'left' | 'center' | 'right';
}

// ── Single lyric line ────────────────────────────────────────
const ImmersiveLine = forwardRef<HTMLDivElement, ImmersiveLineProps>(function ImmersiveLine(
  {
    line,
    dist,
    palette,
    onClick,
    hasSyncedLines,
    showTranslations,
    isPlaying: _isPlaying,
    playbackPosition,
    nextTimestamp,
    playbackSpeed: _playbackSpeed = 1,
    editorMode = 'lrc',
    songSingers = [],
    singerColors = [],
    alignment = 'left',
  },
  ref,
) {
  const { opacity, weight, sizeFactor } = getDistStyle(dist);

  const fg = palette?.fg ?? 'rgba(255,255,255,1)';
  const faded = palette?.faded ?? 'rgba(255,255,255,0.35)';
  const nearer = palette?.nearer ?? 'rgba(255,255,255,0.65)';

  const isEmptyLine = line.type !== 'section' && (!line.text || line.text.trim() === '');
  const effectiveNextTs = nextTimestamp ?? (line as DisplayLine & { nextTimestamp?: number | null }).nextTimestamp ?? null;
  const gap = (effectiveNextTs != null && line.timestamp != null)
    ? Math.max(0, effectiveNextTs - line.timestamp)
    : (line.endTime != null && line.timestamp != null ? Math.max(0, line.endTime - line.timestamp) : 5);

  const leadTime = effectiveNextTs != null && line.timestamp != null
    ? Math.min(0.5, Math.max(0.1, gap * 0.15))
    : 0;

  const baseEnd = line.endTime ?? (effectiveNextTs != null ? effectiveNextTs - leadTime : (line.timestamp != null ? line.timestamp + 5 : null));
  const segmentEnd = baseEnd != null && effectiveNextTs != null ? Math.min(baseEnd, effectiveNextTs - leadTime) : baseEnd;

  const isAdLib = line.adLibOf != null;
  const effectiveTimestamp = line.timestamp ?? line.adLibOf;
  const isAdLibActive = isAdLib && effectiveTimestamp != null && playbackPosition >= effectiveTimestamp && (segmentEnd == null || playbackPosition < segmentEnd);
  const isActive = dist === 0 || isAdLibActive;

  // Singer color attribution
  const isDuet = line.mode === 'duet' && (line.singers?.length ?? 0) >= 2;
  const lineSingerIdx = !isDuet && (line.singers?.length ?? 0) >= 1 ? singerColorIndex(line.singers![0], songSingers) : null;
  const lineSingerHex = lineSingerIdx !== null ? singerColors[lineSingerIdx] : null;

  let color = isActive ? fg : dist === 1 ? nearer : faded;
  if (lineSingerHex) {
    color = isActive ? lineSingerHex : `${lineSingerHex}99`;
  }

  const isWithinWindow = isActive
    && isEmptyLine
    && line.timestamp != null
    && segmentEnd != null
    && segmentEnd > line.timestamp
    && playbackPosition != null
    && playbackPosition >= line.timestamp
    && playbackPosition < segmentEnd;

  const segmentProgress = isWithinWindow
    ? Math.min(1, Math.max(0, (playbackPosition - line.timestamp!) / (segmentEnd - line.timestamp!)))
    : null;

  const clickable = hasSyncedLines && line.timestamp != null;
  const translations = Array.isArray(line.translations) ? line.translations : [];

  // Words mode and word karaoke fill
  const isWordsMode = editorMode === 'words';
  let words: Array<{ word: string; time?: number | null; singerIndex?: number }> = Array.isArray(line.words) ? line.words : [];
  if (isWordsMode && words.length === 0 && line.text) {
    words = line.text.trim().split(/\s+/).map((w: string) => ({ word: w }));
  }
  const hasWordTimestamps = words.some(w => w.time != null);
  const effectiveHasWordTimestamps = (hasWordTimestamps || (isWordsMode && line.timestamp != null && words.length > 0));

  let lastWordFillEnd: number | null = null;
  if (effectiveHasWordTimestamps) {
    const timedWordsList = words.filter(w2 => w2.time != null);
    if (timedWordsList.length > 0) {
      const lastTW = timedWordsList[timedWordsList.length - 1];
      if (segmentEnd != null && segmentEnd > lastTW.time!) {
        lastWordFillEnd = segmentEnd;
      } else if (timedWordsList.length >= 2) {
        const avgDur = (lastTW.time! - timedWordsList[0].time!) / (timedWordsList.length - 1);
        lastWordFillEnd = lastTW.time! + avgDur;
      } else {
        lastWordFillEnd = lastTW.time! + 0.8;
      }
    } else if (line.timestamp != null) {
      lastWordFillEnd = segmentEnd ?? (line.timestamp + 4);
    }
  }

  const duetGradient = isDuet ? singerGradient(line.singers!, songSingers) : undefined;

  const staggerDelay = dist != null ? `${Math.min(dist * 40, 200)}ms` : '0ms';

  return (
    <div
      ref={ref}
      onClick={clickable ? onClick : undefined}
      className="font-lyrics animate-preview-line-in"
      style={{
        opacity: isAdLib && !isActive ? opacity * 0.5 : opacity,
        transform: `scale(${isAdLib ? 0.9 : 1})`,
        transition: 'opacity 0.4s ease, transform 0.4s ease, color 0.4s ease',
        animationDelay: staggerDelay,
        cursor: clickable ? 'pointer' : 'default',
        textAlign: alignment,
        color,
        fontWeight: weight,
        fontSize: `calc(1.25rem * ${sizeFactor})`,
        paddingTop: '0.65em',
        paddingBottom: '0.65em',
        marginLeft: isAdLib ? (alignment === 'right' ? '0' : '15%') : '0',
        marginRight: isAdLib ? (alignment === 'right' ? '15%' : '0') : '0',
        lineHeight: 1.25,
        position: 'relative',
      }}
    >
      {isEmptyLine ? (
        segmentProgress != null ? (
          <div className={`flex ${alignment === 'right' ? 'justify-end' : alignment === 'center' ? 'justify-center' : 'justify-start'} py-2 pointer-events-none`}>
            <InstrumentalDots
              progress={segmentProgress}
              color={fg}
              dimColor="rgba(255,255,255,0.12)"
              dotCount={Math.max(2, Math.min(5, Math.round((segmentEnd! - line.timestamp!) / 1.0)))}
              size={7}
              gap={6}
            />
          </div>
        ) : (
          <div className="h-4" />
        )
      ) : effectiveHasWordTimestamps ? (
        <span
          className={`inline-block ${isDuet ? 'bg-clip-text text-transparent' : ''}`}
          style={isDuet ? { backgroundImage: duetGradient } : undefined}
        >
          {words.map((w, wi) => {
            let startTime = w.time;
            let endTime: number | null = null;

            if (startTime == null) {
              // Untimed word: find surrounding timed anchors
              let prevT = line.timestamp ?? line.adLibOf ?? 0;
              let isPrevFromWord = false;
              let untimedCountBefore = 0;
              for (let j = wi - 1; j >= 0; j--) {
                if (words[j].time != null) { prevT = words[j].time!; isPrevFromWord = true; break; }
                untimedCountBefore++;
              }
              let nextT = lastWordFillEnd;
              let untimedCountAfter = 0;
              for (let j = wi + 1; j < words.length; j++) {
                if (words[j].time != null) { nextT = words[j].time!; break; }
                untimedCountAfter++;
              }
              const totalGapWords = untimedCountBefore + untimedCountAfter + 1;
              const gapDur = Math.max(0.1, (nextT ?? (prevT + 1)) - prevT);
              
              if (isPrevFromWord) {
                const slice = gapDur / (totalGapWords + 1);
                startTime = prevT + (slice * (untimedCountBefore + 1));
                endTime = prevT + (slice * (untimedCountBefore + 2));
              } else {
                const slice = gapDur / totalGapWords;
                startTime = prevT + (slice * untimedCountBefore);
                endTime = prevT + (slice * (untimedCountBefore + 1));
              }
            } else {
              endTime = words.slice(wi + 1).find(w2 => w2.time != null)?.time ?? lastWordFillEnd;
            }

            const effSingerIdx = w.singerIndex ?? (line.singers?.length === 1 ? 0 : null);
            const wSingerName = effSingerIdx !== null && effSingerIdx !== undefined ? line.singers?.[effSingerIdx] : undefined;
            const wGlobalIdx = wSingerName ? singerColorIndex(wSingerName, songSingers) : null;
            const wColor = wGlobalIdx !== null && singerColors[wGlobalIdx] ? singerColors[wGlobalIdx] : null;

            const fillHighlightColor = wColor || palette?.accent || fg;
            const isWordFilled = isActive && startTime != null && endTime != null;
            let progress = 0;
            if (isWordFilled && playbackPosition != null) {
              const dur = Math.max(0.01, endTime! - startTime!);
              progress = Math.max(0, Math.min(1, (playbackPosition - startTime!) / dur));
            }

            return (
              <span key={wi} className="relative inline-block mr-[0.28em] last:mr-0">
                <span
                  style={{
                    color: wColor ? `${wColor}bb` : undefined,
                    opacity: isActive ? 0.35 : undefined,
                    transition: 'opacity 0.3s ease, color 0.3s ease',
                  }}
                >
                  {w.word}
                </span>
                {isWordFilled && progress > 0 && (
                  <span
                    className="absolute left-0 top-0 h-full w-full whitespace-nowrap pointer-events-none karaoke-fill-glow"
                    style={{
                      color: fillHighlightColor,
                      textShadow: `0 0 12px ${fillHighlightColor}80`,
                      clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
                      WebkitClipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
                      direction: 'ltr',
                      textAlign: 'left',
                      unicodeBidi: 'plaintext',
                    }}
                  >
                    {w.word}
                  </span>
                )}
              </span>
            );
          })}
        </span>
      ) : (
        <span
          className={isDuet ? 'bg-clip-text text-transparent' : ''}
          style={isDuet ? { backgroundImage: duetGradient } : undefined}
        >
          {line.text}
        </span>
      )}

      {!isEmptyLine && line.secondary && (
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

      {!isEmptyLine && showTranslations && translations.length > 0 && (
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
interface SectionDividerProps {
  label?: string;
  dist: number | null;
  palette?: Palette | null;
  singers?: string[];
  songSingers?: string[];
  singerColors?: string[];
  alignment?: 'left' | 'center' | 'right';
}

function SectionDivider({
  label,
  dist,
  palette,
  singers = [],
  songSingers = [],
  singerColors = [],
  alignment = 'left',
}: SectionDividerProps) {
  const { opacity } = getDistStyle(dist);
  const accent = palette?.accent ?? 'rgba(255,255,255,0.5)';

  // The title is colored exclusively by the section's custom singer colors — solid for
  // one, a clipped gradient for several — and left uncolored when none are set.
  const singerHexes = singers
    .map((name) => singerColors[singerColorIndex(name, songSingers)])
    .filter((hex): hex is string => !!hex);
  const titleStyle: CSSProperties = singerHexes.length > 1
    ? {
        backgroundImage: `linear-gradient(90deg, ${singerHexes.join(', ')})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }
    : singerHexes.length === 1
      ? { color: singerHexes[0] }
      : {};

  // Divider lines flanking a large uppercase title, singer names as plain colored inline text.
  return (
    <div
      className="font-lyrics"
      style={{
        opacity: Math.max(0.3, opacity * 0.7),
        transition: 'opacity 0.35s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '1em',
        paddingTop: '1.4em',
        paddingBottom: '0.8em',
      }}
    >
      {alignment !== 'left' && (
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${accent}80, ${accent}30)` }} />
      )}
      <span
        className="whitespace-nowrap uppercase"
        style={{
          fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
          fontWeight: 900,
          letterSpacing: '0.14em',
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.5rem',
        }}
      >
        <span style={titleStyle}>
          {label || '◆'}
        </span>
        {singers.length > 0 && (
          <span className="flex items-baseline gap-1.5 text-xs font-semibold tracking-wide normal-case">
            <span style={{ opacity: 0.4 }}>&middot;</span>
            {singers.map((name, idx) => {
              const globalIdx = singerColorIndex(name, songSingers);
              const customHex = singerColors[globalIdx];
              return (
                <span key={`${name}-${idx}`} style={customHex ? { color: customHex } : undefined}>
                  {name}{idx < singers.length - 1 ? ',' : ''}
                </span>
              );
            })}
          </span>
        )}
      </span>
      {alignment !== 'right' && (
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}30, ${accent}80, transparent)` }} />
      )}
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
  songSingers?: string[];
  singerColors?: string[];
  initialAlignment?: 'left' | 'center' | 'right';
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
  songSingers = [],
  singerColors = [],
  initialAlignment,
}: ImmersiveLyricsDisplayProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef(-2);

  // Text orientation selection — defaults to 'left'
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>(() => {
    if (initialAlignment) return initialAlignment;
    const saved = localStorage.getItem('lrc_preview_alignment');
    if (saved === 'left' || saved === 'center' || saved === 'right') return saved;
    return 'left';
  });

  const handleAlignmentChange = (newAlign: 'left' | 'center' | 'right') => {
    setAlignment(newAlign);
    try {
      localStorage.setItem('lrc_preview_alignment', newAlign);
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — alignment still applies for this session
    }
  };

  const currentIndex = useMemo(
    () => computeCurrentIndex(lines, playbackPosition, editorMode),
    [lines, playbackPosition, editorMode],
  );

  const nextTimestamps = useMemo(() => {
    const arr: (number | null)[] = new Array(lines.length).fill(null);
    let nextTs: number | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      arr[i] = nextTs;
      if (lines[i].timestamp != null && lines[i].adLibOf == null) {
        nextTs = lines[i].timestamp!;
      }
    }
    return arr;
  }, [lines]);

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
      {/* Floating alignment control */}
      <div className="absolute top-3 right-4 z-20 flex items-center bg-zinc-950/70 backdrop-blur-md rounded-lg p-0.5 border border-zinc-700/50 shadow-lg">
        <button
          type="button"
          onClick={() => handleAlignmentChange('left')}
          className={`p-1.5 rounded transition-all ${alignment === 'left' ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:text-zinc-200'}`}
          title={t('settings.interface.alignLeft')}
          aria-label={t('settings.interface.alignLeft')}
        >
          <Icon name="format_align_left" size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleAlignmentChange('center')}
          className={`p-1.5 rounded transition-all ${alignment === 'center' ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:text-zinc-200'}`}
          title={t('settings.interface.alignCenter')}
          aria-label={t('settings.interface.alignCenter')}
        >
          <Icon name="format_align_center" size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleAlignmentChange('right')}
          className={`p-1.5 rounded transition-all ${alignment === 'right' ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:text-zinc-200'}`}
          title={t('settings.interface.alignRight')}
          aria-label={t('settings.interface.alignRight')}
        >
          <Icon name="format_align_right" size={15} />
        </button>
      </div>

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
                  singers={line.singers}
                  songSingers={songSingers}
                  singerColors={singerColors}
                  alignment={alignment}
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
                playbackPosition={playbackPosition}
                nextTimestamp={nextTimestamps[i]}
                playbackSpeed={playbackSpeed}
                editorMode={editorMode}
                songSingers={songSingers}
                singerColors={singerColors}
                alignment={alignment}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
