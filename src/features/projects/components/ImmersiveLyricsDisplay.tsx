import { ContourLines } from '@ui/ContourLines';
import { useRef, useEffect, useCallback, useMemo, forwardRef, useState, Fragment } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';
import InstrumentalDots from '@/features/editor/components/line/InstrumentalDots';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { singerColorIndex, singerGradient } from '@features/editor/utils/singer-colors';
import { useSettings } from '@/features/settings/useSettings';
import { usePlayer } from '@features/player/PlayerContext';
import { hasCJK, hasKanji, toHiragana, toKatakana } from '@/shared/utils/furigana';

// Theme-token colors: the stage sits on the app background, so text derives
// from --foreground and stays legible in both the dark and light themes.
const FG = 'var(--foreground)';
const PAST = 'var(--color-past)';
const fgAlpha = (pct: number) => `color-mix(in srgb, var(--foreground) ${pct}%, transparent)`;

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
  words?: DisplayWord[];
  [key: string]: unknown;
}

interface DisplayWord {
  word: string;
  time?: number | null;
  reading?: string | null;
  singerIndex?: number;
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

// Focus stage (the default public view): only the lines around the playhead,
// stepping down in size and contrast. Keyed by offset from the active line;
// the dimming is opacity on the foreground token, so it holds in both themes.
const FOCUS_STYLE: Record<number, { size: string; opacity: number }> = {
  // The line just sung stays readable: its colour, not its opacity, says it is past.
  [-1]: { size: 'clamp(1.125rem, 1.8vw, 1.625rem)', opacity: 0.75 },
  0: { size: 'clamp(2.5rem, 4.7vw, 4.25rem)', opacity: 1 },
  1: { size: 'clamp(1.375rem, 2.4vw, 2.125rem)', opacity: 0.72 },
  2: { size: 'clamp(1.25rem, 2.1vw, 1.875rem)', opacity: 0.42 },
  3: { size: 'clamp(1.1875rem, 1.95vw, 1.75rem)', opacity: 0.24 },
};

const isBlank = (line: DisplayLine) => !line.text || line.text.trim() === '';

// The previous line, the active one and the next three. Ad-libs ride along
// with the line they overlap instead of taking a slot of their own.
function buildFocusWindow(lines: DisplayLine[], currentIndex: number): { index: number; step: number }[] {
  const out: { index: number; step: number }[] = [];
  for (let i = currentIndex - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.type === 'section' || line.adLibOf != null || isBlank(line)) continue;
    out.push({ index: i, step: -1 });
    break;
  }
  if (currentIndex >= 0) out.push({ index: currentIndex, step: 0 });
  let step = 0;
  for (let i = currentIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.type === 'section' || isBlank(line)) continue;
    if (line.adLibOf == null) {
      if (step === 3) break;
      step++;
    }
    out.push({ index: i, step: Math.max(step, 1) });
  }
  return out;
}

const ALIGN_LABEL_KEYS = {
  left: 'settings.interface.alignLeft',
  center: 'settings.interface.alignCenter',
  right: 'settings.interface.alignRight',
} as const;

// Base (dist-0) rem size per settings.interface.fontSize — the same setting
// PreviewLine's ACTIVE_FONT_SIZES reads, so the public view tracks the
// viewer's own preference instead of a fixed value. Bumped up from the
// previous flat 1.25rem across the board, per request.
const BASE_FONT_REM: Record<string, number> = {
  small: 1.15,
  normal: 1.4,
  large: 1.65,
  xlarge: 1.95,
};

interface ImmersiveLineProps {
  line: DisplayLine;
  dist: number | null;
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
  /** Settings.editor.display.activeHighlight — the same preference PreviewLine reads. */
  activeHighlight?: string;
  /** Settings.editor.display.readingFormat — script used for furigana. */
  readingFormat?: string;
  /** Settings.interface.fontSize — same setting PreviewLine reads. */
  baseFontRem?: number;
  /** Offset from the active line on the focus stage; unset in the full-lyrics list. */
  focusStep?: number;
  /** Already sung. Past lines keep a quieter iris instead of fading to grey (redesign sheet 12). */
  isPast?: boolean;
}

// ── Single lyric line ────────────────────────────────────────
const ImmersiveLine = forwardRef<HTMLDivElement, ImmersiveLineProps>(function ImmersiveLine(
  {
    line,
    dist,
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
    activeHighlight,
    readingFormat,
    baseFontRem = BASE_FONT_REM.normal,
    focusStep,
    isPast = false,
  },
  ref,
) {
  const { opacity, weight, sizeFactor } = getDistStyle(dist);
  const focus = focusStep != null ? FOCUS_STYLE[focusStep] : null;

  const faded = fgAlpha(35);
  const nearer = fgAlpha(65);

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

  // The viewer's own activeHighlight preference (same setting PreviewLine
  // reads) — this component used to ignore it entirely, so a public project
  // view never matched what the viewer picked for their own editor/preview.
  // 'glow' and 'zoom' decorate the active line; 'dim' pushes inactive lines
  // further back than the default distance fade; 'color' is today's baseline.
  const isDimMode = activeHighlight === 'dim';
  const effectiveOpacity = focus
    ? (isActive ? 1 : focus.opacity)
    : !isActive && isDimMode ? opacity * 0.6 : opacity;

  // Singer color attribution
  const isDuet = line.mode === 'duet' && (line.singers?.length ?? 0) >= 2;
  const lineSingerIdx = !isDuet && (line.singers?.length ?? 0) >= 1 ? singerColorIndex(line.singers![0], songSingers) : null;
  const lineSingerHex = lineSingerIdx !== null ? singerColors[lineSingerIdx] : null;

  // Active is always the plain foreground — singer colors only apply to
  // inactive lines, where they're the point: telling lines apart at a glance.
  // On the active line they fought the karaoke fill, which is already the
  // color doing the work there.
  let color = isActive ? FG : isPast ? PAST : focus ? FG : dist === 1 ? nearer : faded;
  if (lineSingerHex && !isActive) {
    color = `${lineSingerHex}99`;
  }
  // Rose is the second voice (redesign sheet 20): it never takes the iris of the main line.
  if (isAdLib && !lineSingerHex) color = 'var(--color-adlib-ink)';

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
  let words: DisplayWord[] = Array.isArray(line.words) ? line.words : [];
  if (isWordsMode && words.length === 0 && line.text) {
    words = line.text.trim().split(/\s+/).map((w: string) => ({ word: w }));
  }

  // Furigana lives on word.reading and only annotates kanji, as in PreviewLine.
  const hasReadings = words.some(w => w.reading && hasKanji(w.word));
  const renderWord = (w: DisplayWord) => w.reading && hasKanji(w.word)
    ? <ruby>{w.word}<rp>(</rp><rt style={{ paddingBottom: '2px', marginInline: '0.25em' }}>{readingFormat === 'katakana' ? toKatakana(w.reading) : toHiragana(w.reading)}</rt><rp>)</rp></ruby>
    : w.word;
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

  // A captured ad-lib that has no text yet is a to-do for the editor, not a lyric.
  if (isAdLib && isEmptyLine) return null;

  return (
    <div
      ref={ref}
      onClick={clickable ? onClick : undefined}
      className="font-heading animate-preview-line-in"
      style={{
        opacity: isAdLib && !isActive ? effectiveOpacity * 0.5 : effectiveOpacity,
        transform: `scale(${(isAdLib ? 0.9 : 1) * (isActive && activeHighlight === 'zoom' ? 1.05 : 1)})`,
        transition: `opacity 0.4s ease, transform 0.4s ease, color 0.4s ease, text-shadow 0.4s ease${focus ? ', font-size 0.3s ease' : ''}`,
        animationDelay: staggerDelay,
        cursor: clickable ? 'pointer' : 'default',
        textAlign: alignment,
        fontStyle: isAdLib ? 'italic' : undefined,
        color,
        textShadow: isActive && activeHighlight === 'glow'
          ? '0 0 20px color-mix(in srgb, var(--color-primary) 50%, transparent)'
          : undefined,
        fontWeight: focus ? (focusStep === 0 ? 700 : 600) : weight,
        fontSize: focus
          ? `calc(${focus.size} * ${baseFontRem / BASE_FONT_REM.normal})`
          : `calc(${baseFontRem}rem * ${sizeFactor})`,
        letterSpacing: focusStep === 0 ? '-0.01em' : undefined,
        paddingTop: focus ? 0 : '0.65em',
        paddingBottom: focus ? 0 : '0.65em',
        marginLeft: isAdLib ? (alignment === 'right' ? '0' : '15%') : '0',
        marginRight: isAdLib ? (alignment === 'right' ? '15%' : '0') : '0',
        // Ruby text needs headroom or it collides with the line above on wrap.
        lineHeight: hasReadings ? 1.9 : focus ? (focusStep === 0 ? 1.02 : 1.2) : 1.25,
        position: 'relative',
      }}
    >
      {isEmptyLine ? (
        segmentProgress != null ? (
          <div className={`flex ${alignment === 'right' ? 'justify-end' : alignment === 'center' ? 'justify-center' : 'justify-start'} py-2 pointer-events-none`}>
            <InstrumentalDots
              progress={segmentProgress}
              color={FG}
              dimColor={fgAlpha(12)}
              dotCount={3}
              size={10}
              gap={9}
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

            const fillHighlightColor = wColor || 'var(--color-primary-ink)';
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
                    // The focus stage keeps unsung words at full foreground; the
                    // accent fill alone marks progress.
                    opacity: isActive && !focus ? 0.35 : undefined,
                    transition: 'opacity 0.3s ease, color 0.3s ease',
                  }}
                >
                  {renderWord(w)}
                </span>
                {isWordFilled && progress > 0 && (
                  <span
                    className="absolute left-0 top-0 h-full w-full whitespace-nowrap pointer-events-none karaoke-fill-glow"
                    style={{
                      color: fillHighlightColor,
                      textShadow: `0 0 22px color-mix(in srgb, ${fillHighlightColor} 45%, transparent)`,
                      clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
                      WebkitClipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
                      direction: 'ltr',
                      textAlign: 'left',
                      unicodeBidi: 'plaintext',
                    }}
                  >
                    {renderWord(w)}
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
          {hasReadings
            ? words.map((w, wi) => {
                const next = words[wi + 1]?.word;
                const addSpace = !!next && !hasCJK(w.word.slice(-1)) && !hasCJK(next.slice(0, 1));
                return <Fragment key={wi}>{renderWord(w)}{addSpace ? ' ' : null}</Fragment>;
              })
            : line.text}
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
  singers?: string[];
  songSingers?: string[];
  singerColors?: string[];
  alignment?: 'left' | 'center' | 'right';
}

function SectionDivider({
  label,
  dist,
  singers = [],
  songSingers = [],
  singerColors = [],
  alignment = 'left',
}: SectionDividerProps) {
  const { opacity } = getDistStyle(dist);
  const ruleStrong = fgAlpha(25);
  const ruleSoft = fgAlpha(10);

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
      className="font-heading"
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
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ruleStrong}, ${ruleSoft})` }} />
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
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ruleSoft}, ${ruleStrong}, transparent)` }} />
      )}
    </div>
  );
}

interface ImmersiveLyricsDisplayProps {
  lines: DisplayLine[];
  editorMode: string;
  /** Scrollable list of every line instead of the focus stage. */
  fullLyrics?: boolean;
  /** Desktop: the top-right corner holds another control (the collapsed info panel's toggle). */
  reserveCorner?: boolean;
  showTranslations?: boolean;
  songSingers?: string[];
  singerColors?: string[];
  initialAlignment?: 'left' | 'center' | 'right';
}

// ── Main component ───────────────────────────────────────────
export default function ImmersiveLyricsDisplay({
  lines,
  editorMode,
  fullLyrics = false,
  reserveCorner = false,
  showTranslations = true,
  songSingers = [],
  singerColors = [],
  initialAlignment,
}: ImmersiveLyricsDisplayProps) {
  const { t } = useTranslation();
  // The playback clock is read here, not passed down from the page, so a tick
  // re-renders this stage and the playback bar but never the info aside.
  const { currentTime: playbackPosition, hasMedia, isPlaying, playbackSpeed, seek, togglePlay } = usePlayer();
  // The viewer's own preference — reads from SettingsContext (localStorage for a
  // guest, synced for a signed-in viewer), never the project owner's. This is
  // the public view, so "whoever is looking at it" is the only sensible owner
  // of a display preference.
  const { settings } = useSettings();
  const activeHighlight = settings.editor?.display?.activeHighlight;
  const baseFontRem = BASE_FONT_REM[settings.interface?.fontSize || 'normal'] ?? BASE_FONT_REM.normal;
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
  // Without timestamps there is no playhead to focus on, so show every line.
  const showFull = fullLyrics || !hasSyncedLines;
  const focusWindow = useMemo(
    () => (showFull ? [] : buildFocusWindow(lines, currentIndex)),
    [showFull, lines, currentIndex],
  );

  // Auto-scroll: hold the active line in the middle of the container, matching
  // the editor and preview panes (both centre via the virtualizer). This used
  // to anchor at 20% from the top, which put the active line high on screen and
  // left the last lines unreachable as the container ran out of scroll.
  useEffect(() => {
    // Forget the last position while the list is unmounted, so switching back
    // to it re-centres on the active line.
    if (!showFull) { lastScrolledIndex.current = -2; return; }
    if (currentIndex === lastScrolledIndex.current) return;
    if (currentIndex < 0 || !containerRef.current || !activeRef.current) return;

    lastScrolledIndex.current = currentIndex;

    const container = containerRef.current;
    const active = activeRef.current;

    const raf = requestAnimationFrame(() => {
      const target = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(raf);
  }, [currentIndex, showFull]);

  const handleLineClick = useCallback(
    (line: DisplayLine) => {
      if (line.timestamp != null) {
        seek(line.timestamp);
        if (!isPlaying) togglePlay();
      }
    },
    [seek, isPlaying, togglePlay],
  );

  // Placeholder states
  if (!lines.length) {
    return (
      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        <p className="text-sm italic text-muted-foreground">
          {t('editor.pastePlaceholder')}
        </p>
      </div>
    );
  }

  if (!hasSyncedLines && !hasMedia) {
    return (
      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        <p className="text-sm italic text-muted-foreground">
          {t('preview.placeholder')}
        </p>
      </div>
    );
  }

  const alignmentControl = (
    <div
      role="group"
      aria-label={t('projectView.alignment')}
      // Phones: a row of its own above the lyrics, so it never covers them. Desktop: floating,
      // in the same row as the info panel's toggle (top-23 = 64px header + 28px), and to its left
      // while that toggle is showing.
      className={`z-20 flex w-fit items-center rounded-lg border border-zinc-700/50 bg-zinc-950/70 p-0.5 shadow-lg backdrop-blur-md max-lg:mx-4 max-lg:mt-2 max-lg:self-end lg:absolute lg:top-23 ${reserveCorner ? 'lg:right-18' : 'lg:right-7'}`}
    >
      {(['left', 'center', 'right'] as const).map((align) => {
        const label = t(ALIGN_LABEL_KEYS[align]);
        return (
          <Tip key={align} content={label}>
            <button
              type="button"
              onClick={() => handleAlignmentChange(align)}
              aria-pressed={alignment === align}
              aria-label={label}
              className={`grid place-items-center size-7 coarse:size-11 rounded transition-all ${alignment === align ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Icon name={`format_align_${align}`} size={15} />
            </button>
          </Tip>
        );
      })}
    </div>
  );

  if (!showFull) {
    const anchor = currentIndex >= 0 ? currentIndex : focusWindow[0]?.index ?? -1;
    let section: DisplayLine | undefined;
    for (let i = anchor; i >= 0 && !section; i--) {
      if (lines[i].type === 'section') section = lines[i];
    }
    const singers = lines[anchor]?.singers ?? section?.singers ?? [];

    return (
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <ContourLines />
        {alignmentControl}
        {/* Outside the lyrics' centered column on purpose: that column re-centers
            whenever the visible lines' combined height changes (singer tag added/
            removed, line count shifts at a section boundary), which dragged this
            label up and down with it. Pinning it here keeps it fixed regardless. */}
        {(section?.label || singers.length > 0) && (
          <p
            className="relative z-10 shrink-0 px-6 pt-8 lg:px-14 lg:pt-10 text-[11px] lg:text-xs font-bold uppercase tracking-[0.1em] text-success"
            style={{ textAlign: alignment }}
          >
            {section?.label}
            {section?.label && singers.length > 0 && ' · '}
            {singers.map((name, idx) => {
              const hex = singerColors[singerColorIndex(name, songSingers)];
              return (
                <span key={`${name}-${idx}`} style={hex ? { color: hex } : undefined}>
                  {name}{idx < singers.length - 1 ? ', ' : ''}
                </span>
              );
            })}
          </p>
        )}
        <div className={`lrc-scroll relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col px-6 pb-8 lg:px-14 lg:pb-10 ${section?.label || singers.length > 0 ? 'pt-3 lg:pt-4' : 'pt-8 lg:pt-10'}`}>
          <div className="my-auto flex flex-col gap-[18px] lg:gap-[22px]">
            {focusWindow.map(({ index, step }) => {
              const line = lines[index];
              return (
                <ImmersiveLine
                  key={line.id ?? `l-${index}`}
                  line={line}
                  dist={Math.abs(step)}
                  focusStep={step}
                  isPast={step < 0}
                  onClick={() => handleLineClick(line)}
                  hasSyncedLines={hasSyncedLines}
                  showTranslations={showTranslations}
                  isPlaying={step === 0 && isPlaying}
                  playbackPosition={playbackPosition}
                  nextTimestamp={nextTimestamps[index]}
                  playbackSpeed={playbackSpeed}
                  editorMode={editorMode}
                  songSingers={songSingers}
                  singerColors={singerColors}
                  alignment={alignment}
                  activeHighlight={activeHighlight}
                  readingFormat={settings.editor?.display?.readingFormat}
                  baseFontRem={baseFontRem}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    // container-type: size lets the half-height spacers below be measured against this box (cqh)
    // instead of the viewport: on a phone the stage is a fraction of the screen, and 50dvh of
    // padding pushed every line out of it before playback had moved the scroll.
    <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden [container-type:size]">
      <ContourLines />
      {alignmentControl}

      {/* Top fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: '18%', background: 'linear-gradient(to bottom, var(--background), transparent)' }}
      />
      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: '18%', background: 'linear-gradient(to top, var(--background), transparent)' }}
      />

      {/* Scroll container — hides scrollbar visually */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.immersive-scroll::-webkit-scrollbar { display: none; }`}</style>

        {/* Half a screen at each end so the first and last lines can both reach
            the centre. The old 20vh/35vh pair was sized for the 20% anchor and
            left the closing lines short of it — the scroll simply ran out. */}
        <div className="px-6 sm:px-10 lg:px-14" style={{ paddingTop: '50cqh', paddingBottom: '50cqh' }}>
          {lines.map((line, i) => {
            const isActive = i === currentIndex;
            const dist = currentIndex >= 0 ? Math.abs(i - currentIndex) : null;

            if (line.type === 'section') {
              return (
                <SectionDivider
                  key={line.id ?? `s-${i}`}
                  label={line.label}
                  dist={dist}
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
                isPast={currentIndex >= 0 && i < currentIndex}
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
                activeHighlight={activeHighlight}
                readingFormat={settings.editor?.display?.readingFormat}
                baseFontRem={baseFontRem}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
