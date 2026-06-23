import React from 'react';
import type { Ref } from 'react';
import { useSettings } from '@/features/settings/useSettings';
import { toHiragana, toKatakana, parseRubyMarkup } from '@/shared/utils/furigana';
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';
import { useTranslation } from 'react-i18next';
import type { EditorLine, EditorWord } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';
import { singerColorIndex, singerGradient } from '@features/editor/utils/singer-colors';

/** Inline text color classes for words attributed to a specific singer */
const WORD_SINGER_PREVIEW_COLORS = [
  'text-primary',       // singer 0
  'text-sky-400',       // singer 1
  'text-violet-400',    // singer 2
  'text-amber-400',     // singer 3
  'text-emerald-400',   // singer 4
  'text-rose-400',      // singer 5
  'text-cyan-400',      // singer 6
  'text-fuchsia-400',   // singer 7
];

type SizeMap = Record<string, string>;
type ReadingFmt = (r?: string) => string | undefined;

interface DisplayLine {
  originalIndex: number;
  [key: string]: unknown;
}

function getLineSingers(line: EditorLine): string[] {
  return line.singers || [];
}

interface PreviewLineProps {
  line: EditorLine;
  originalIndex: number;
  prevLine?: EditorLine | null;
  hasMultipleSingers?: boolean;
  sectionNumbers?: Map<string | number | undefined, number> | null;
  displayedActiveIndex: number;
  lockedLineIndex: number;
  isDualLine: boolean;
  displayLines: DisplayLine[];
  playbackPosition: number;
  activeRef?: Ref<HTMLButtonElement>;
  handleLineClick: (line: EditorLine, i: number) => void;
  handleLineHover: (i: number) => void;
  handleLineHoverEnd: () => void;
  showTranslationsInPreview?: boolean;
  showFuriganaInPreview?: boolean;
  activeTranslationIndex?: number;
  sizeOption: string;
  spacingOption: string;
  activeSecondarySizes: SizeMap;
  inactiveSecondarySizes: SizeMap;
  activeFontSizes: SizeMap;
  inactiveFontSizes: SizeMap;
  activeMargin: SizeMap;
  distanceFromActive?: number | null;
  hasMedia?: boolean;
  isPlaying?: boolean;
  playbackSpeed?: number;
  songSingers?: string[];
}

export default function PreviewLine({
  line,
  originalIndex: i,
  sectionNumbers = null,
  displayedActiveIndex,
  lockedLineIndex,
  isDualLine,
  displayLines,
  playbackPosition,
  activeRef,
  handleLineClick,
  handleLineHover,
  handleLineHoverEnd,
  showTranslationsInPreview,
  showFuriganaInPreview,
  activeTranslationIndex = 0,
  sizeOption,
  spacingOption,
  activeSecondarySizes,
  inactiveSecondarySizes,
  activeFontSizes,
  inactiveFontSizes,
  activeMargin,
  distanceFromActive,
  hasMedia,
  isPlaying,
  playbackSpeed = 1,
  songSingers,
}: PreviewLineProps) {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const roster = songSingers ?? [];

  // Section marker — render as a divider chip
  if (line.type === 'section') {
    const isRoot = line.depth === 0;
    const singers = getLineSingers(line);
    const sectionNum = sectionNumbers?.get(line.id);
    const baseLabel = line.label?.trim().toLowerCase().replace(/\s+\d+$/, '') ?? '';
    const labelStr = sectionNum != null
      ? `${formatSectionLabel(baseLabel || line.label, t)} ${sectionNum}`
      : formatSectionLabel(line.label, t);

    return (
      <div className={`flex items-center gap-4 px-2 sm:px-4 ${isRoot ? 'py-4 my-5' : 'py-2 my-2'}`}>
        <div className={`flex-1 h-px ${isRoot ? 'bg-gradient-to-r from-transparent via-primary/50 to-primary/20' : 'bg-zinc-800/60'}`} />
        {/* No pill: main sections render as a large title, secondary as a normal title (#1).
            Singer names carry their own colors so the lines below don't need labels (#2). */}
        <div className={`flex items-baseline gap-2 whitespace-nowrap uppercase ${
          isRoot
            ? 'text-lg sm:text-2xl font-black tracking-[0.15em]'
            : 'text-xs sm:text-sm font-semibold tracking-widest'
        }`}>
          <span className={isRoot
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-primary via-fuchsia-400 to-primary'
            : 'text-zinc-500'}>
            {labelStr}
          </span>
          {singers.length > 0 && (
            <span className="flex items-baseline gap-1.5">
              <span className="text-zinc-600 font-normal">·</span>
              {singers.map((name, idx) => (
                <span key={idx} className={WORD_SINGER_PREVIEW_COLORS[singerColorIndex(name, roster)] || 'text-primary'}>
                  {name}{idx < singers.length - 1 ? ',' : ''}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className={`flex-1 h-px ${isRoot ? 'bg-gradient-to-l from-transparent via-primary/50 to-primary/20' : 'bg-zinc-800/60'}`} />
      </div>
    );
  }

  const isActive = i === displayedActiveIndex || (isDualLine && i === displayLines[0].originalIndex);
  const isPast = line.timestamp != null && line.timestamp < playbackPosition && !isActive;
  const isLocked = lockedLineIndex === i;

  const focusContrast = settings.interface?.focusContrast ?? 'medium';
  let parallaxOpacity = 1.0;

  if (!isActive) {
    if (focusContrast === 'off') {
      parallaxOpacity = 1.0;
    } else if (focusContrast === 'low') {
      parallaxOpacity = distanceFromActive != null ? Math.max(0.6, 1.0 - distanceFromActive * 0.08) : (isPast ? 0.8 : 0.9);
    } else if (focusContrast === 'high') {
      parallaxOpacity = distanceFromActive != null ? Math.max(0.15, 1.0 - distanceFromActive * 0.3) : (isPast ? 0.3 : 0.4);
    } else {
      // medium (default)
      parallaxOpacity = distanceFromActive != null ? Math.max(0.3, 1.0 - distanceFromActive * 0.15) : (isPast ? 0.5 : 0.7);
    }
  }

  // Stagger delay for entrance animation (lines close to active appear first)
  const staggerDelay = distanceFromActive != null
    ? `${Math.min(distanceFromActive * 40, 200)}ms`
    : '0ms';

  const hasWordTimestamps = line.words?.some((w) => w.time != null);

  const translationLayout = settings.editor?.display?.translationLayout || 'side-by-side';

  const hasReadings = showFuriganaInPreview && line.words?.some((w) => w.reading);

  // Active translation text for this line
  const activeTranslationText = line.translations?.[activeTranslationIndex]?.text ?? null;

  const inner = (
    <button
      type="button"
      ref={isActive && !isDualLine ? activeRef : null}
      onClick={hasMedia ? () => handleLineClick(line, i) : undefined}
      onMouseEnter={hasMedia ? () => handleLineHover(i) : undefined}
      onMouseLeave={hasMedia ? handleLineHoverEnd : undefined}
      style={{
        opacity: parallaxOpacity,
        animationDelay: staggerDelay,
      }}
      className={`w-full group px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-opacity duration-100 ease-out flex select-none relative overflow-hidden animate-preview-line-in text-left ${hasMedia ? 'cursor-pointer' : 'cursor-default'
        } ${translationLayout === 'side-by-side' && activeTranslationText && showTranslationsInPreview
          ? 'flex-row items-baseline gap-3 sm:gap-6'
          : 'flex-col'
        } ${settings.interface?.previewAlignment === 'right' ? 'items-end text-right' :
          settings.interface?.previewAlignment === 'center' ? 'items-center text-center' :
            'items-start text-left'
        } ${isActive
          ? `${settings.editor?.display?.activeHighlight === 'zoom' ? 'scale-y-105' : ''} origin-center bg-zinc-800/10 ${activeMargin[spacingOption] || 'my-1 sm:my-2'}`
          : hasMedia ? 'hover:bg-zinc-800/30' : ''
        }`}
    >
      {line.timestamp != null && (
        <div className={`absolute top-1/2 -translate-y-1/2 ${isLocked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex items-center justify-center pointer-events-none ${isLocked ? 'text-amber-400' : 'text-primary'
          } ${settings.interface?.previewAlignment === 'right' ? 'right-0 translate-x-full pl-2' : 'left-0 -translate-x-full pr-2'
          } ${isActive ? 'animate-timestamp-pulse' : ''}`}>
          {isLocked ? (
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.76-2.24-5-5-5zm3 10H9v-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2z" />
            </svg>
          ) : (
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      )}

      {/* Singer chips — inline in content flow, not absolute */}
      {/* Left column for side-by-side: main + secondary */}
      {translationLayout === 'side-by-side' && activeTranslationText && showTranslationsInPreview ? (
        <>
          <div className="flex-1 min-w-0 flex flex-col">
            <MainTrack
              line={line} isActive={isActive} isPast={isPast} hasWordTimestamps={!!hasWordTimestamps}
              playbackPosition={playbackPosition} activeFontSizes={activeFontSizes}
              inactiveFontSizes={inactiveFontSizes} sizeOption={sizeOption} spacingOption={spacingOption}
              settings={settings} showFuriganaInPreview={showFuriganaInPreview}
              isPlaying={isPlaying} playbackSpeed={playbackSpeed} hasReadings={!!hasReadings}
              roster={roster}
            />
            {line.secondary && renderSecondaryTrack({
              line, isActive, playbackPosition, activeSecondarySizes, inactiveSecondarySizes, sizeOption, settings,
              isPlaying, playbackSpeed
            })}
          </div>

          <div className="w-px self-stretch bg-zinc-700/40 mx-3 sm:mx-6" />

          <div className="flex-1 min-w-0">
            <p
              className={`transition-colors duration-100 w-full font-lyrics break-words overflow-wrap-anywhere hyphens-auto ${isActive
                ? `${activeFontSizes[sizeOption]} text-zinc-500 font-medium ${spacingOption === 'compact' ? 'my-0' : 'my-0.5 sm:my-1'}`
                : `${inactiveFontSizes[sizeOption]} text-zinc-600`
                }`}
              style={{ lineHeight: hasReadings ? '2' : undefined }}
            >
              {activeTranslationText}
            </p>
          </div>
        </>
      ) : (
        <>
          <MainTrack
            line={line} isActive={isActive} isPast={isPast} hasWordTimestamps={!!hasWordTimestamps}
            playbackPosition={playbackPosition} activeFontSizes={activeFontSizes}
            inactiveFontSizes={inactiveFontSizes} sizeOption={sizeOption} spacingOption={spacingOption}
            settings={settings} showFuriganaInPreview={showFuriganaInPreview}
            isPlaying={isPlaying} playbackSpeed={playbackSpeed} hasReadings={!!hasReadings}
            roster={roster}
          />

          {line.secondary && renderSecondaryTrack({
            line, isActive, playbackPosition, activeSecondarySizes, inactiveSecondarySizes, sizeOption, settings,
            isPlaying, playbackSpeed
          })}

          {(activeTranslationText && showTranslationsInPreview) && (
            <p
              className={`transition-colors duration-100 w-full font-lyrics break-words overflow-wrap-anywhere hyphens-auto ${isActive
                ? `${activeFontSizes[sizeOption]} text-zinc-500 font-medium ${spacingOption === 'compact' ? 'my-0' : 'my-0.5 sm:my-1'}`
                : `${inactiveFontSizes[sizeOption]} text-zinc-600`
                }`}
              style={{ lineHeight: hasReadings ? '2' : undefined }}
            >
              {activeTranslationText}
            </p>
          )}
        </>
      )}
    </button>
  );

  if (!hasMedia) return inner;
  // Return without Tip wrapper — TooltipTrigger asChild can override onClick.
  // The hover hint is decorative; click-to-seek correctness takes priority.
  return inner;
}

// ——— CJK detection for spaceless scripts ———
function isCJKChar(ch?: string): boolean {
  if (!ch) return false;
  const code = ch.codePointAt(0);
  if (code == null) return false;
  return (
    (code >= 0x3000 && code <= 0x9FFF) ||  // CJK Unified, Hiragana, Katakana, CJK Symbols
    (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (code >= 0xFF00 && code <= 0xFFEF) ||   // Fullwidth Forms
    (code >= 0x20000 && code <= 0x2FA1F)    // CJK Extensions
  );
}

function needsSpaceAfter(currentWord?: string, nextWord?: string): boolean {
  if (!nextWord) return false;
  const lastChar = (currentWord || '').slice(-1);
  const firstChar = nextWord.slice(0, 1);
  return !isCJKChar(lastChar) && !isCJKChar(firstChar);
}

interface MainTrackProps {
  line: EditorLine;
  isActive: boolean;
  isPast: boolean;
  hasWordTimestamps: boolean;
  playbackPosition: number;
  activeFontSizes: SizeMap;
  inactiveFontSizes: SizeMap;
  sizeOption: string;
  spacingOption: string;
  settings: AppSettings;
  showFuriganaInPreview?: boolean;
  isPlaying?: boolean;
  playbackSpeed: number;
  hasReadings: boolean;
  roster: string[];
}

// ——— Render main text track with karaoke fill ———
// Fill effect is ONLY applied when word-level timestamps exist.
function MainTrack({ line, isActive, isPast, hasWordTimestamps, playbackPosition, activeFontSizes, inactiveFontSizes, sizeOption, spacingOption, settings, showFuriganaInPreview = true, isPlaying, playbackSpeed, hasReadings, roster }: MainTrackProps) {
  const fillTrack = settings.editor?.display?.karaokeFillTrack ?? 'main';
  const fillEasing = settings.editor?.display?.karaokeFillEasing ?? 'linear';
  const skipMainFill = isActive && fillTrack === 'secondary';
  const effectiveHasWordTimestamps = hasWordTimestamps && !skipMainFill;
  const highlightMode = settings.editor?.display?.activeHighlight;
  // Active = white (fill effect provides green); past/completed = green; future = dim
  const activeClass = `${activeFontSizes[sizeOption]} font-bold font-lyrics text-zinc-100 ${highlightMode === 'glow' ? 'glow-line' : ''} ${spacingOption === 'compact' ? 'my-0' : 'my-0.5 sm:my-1'}`;
  const pastClass = `${inactiveFontSizes[sizeOption]} font-lyrics ${highlightMode === 'dim' ? 'text-zinc-700' : 'text-primary'}`;
  const futureClass = `${inactiveFontSizes[sizeOption]} font-lyrics ${highlightMode === 'dim' ? 'text-zinc-800' : 'text-zinc-600'}`;

  // Furigana readings come from word.reading; gated by showFuriganaInPreview
  const mainText = line.text || '♪';
  const readingFmt = settings.editor?.display?.readingFormat || 'hiragana';
  const fmtReading: ReadingFmt = (r) => r ? (readingFmt === 'katakana' ? toKatakana(r) : toHiragana(r)) : r;

  // Estimate fill end time for the last timed word to avoid an abrupt 0→100% snap
  let lastWordFillEnd: number | null = null;
  if (effectiveHasWordTimestamps) {
    const timedWordsList = (line.words || []).filter((w2) => w2.time != null);
    if (timedWordsList.length > 0) {
      const lastTW = timedWordsList[timedWordsList.length - 1];
      if (line.endTime != null && line.endTime > lastTW.time!) {
        lastWordFillEnd = line.endTime;
      } else if (timedWordsList.length >= 2) {
        const avgDur = (lastTW.time! - timedWordsList[0].time!) / (timedWordsList.length - 1);
        lastWordFillEnd = lastTW.time! + avgDur;
      } else {
        lastWordFillEnd = lastTW.time! + 0.8;
      }
    }
  }

  const words = line.words || [];
  const isDuet = line.mode === 'duet' && (line.singers?.length ?? 0) >= 2;
  const duetGradientStyle = isDuet ? { backgroundImage: singerGradient(line.singers!, roster) } : undefined;

  return (
    <p
      className={`transition-colors duration-100 ease-out w-full break-words overflow-wrap-anywhere hyphens-auto ${isActive ? activeClass : isPast ? pastClass : futureClass} ${isDuet ? 'bg-clip-text !text-transparent' : ''}`}
      style={{ lineHeight: hasReadings ? '2' : undefined, ...duetGradientStyle }}
    >
      {effectiveHasWordTimestamps
        ? words.map((w, wi) => {
          // Calculate effective start and end times for this word (interpolate if untimed)
          let startTime = w.time;
          let endTime: number | null = null;

          if (startTime == null) {
            // Untimed word: find surrounding timed anchors
            let prevT = line.timestamp ?? 0;
            let untimedCountBefore = 0;
            for (let j = wi - 1; j >= 0; j--) {
              if (words[j].time != null) { prevT = words[j].time!; break; }
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
            const slice = gapDur / (totalGapWords + 1);
            startTime = prevT + (slice * (untimedCountBefore + 1));
            endTime = prevT + (slice * (untimedCountBefore + 2));
          } else {
            // Timed word: ends when next timed word starts
            endTime = words.slice(wi + 1).find((w2) => w2.time != null)?.time ?? lastWordFillEnd;
          }
          const nextWord = words[wi + 1];
          const addSpace = needsSpaceAfter(w.word, nextWord?.word);
          const effectiveSingerIdx = w.singerIndex ?? (line.singers?.length === 1 ? 0 : null);
          const singerName = effectiveSingerIdx !== null && effectiveSingerIdx !== undefined
            ? line.singers?.[effectiveSingerIdx]
            : undefined;
          const wordSingerColor = singerName
            ? (WORD_SINGER_PREVIEW_COLORS[singerColorIndex(singerName, roster)] || '')
            : '';

          const wordContent = w.reading && isKanjiWord(w.word) && showFuriganaInPreview
            ? <ruby>{w.word}<rp>(</rp><rt style={{ paddingBottom: '2px', marginInline: '0.25em' }}>{fmtReading(w.reading)}</rt><rp>)</rp></ruby>
            : w.word;

          return (
            <React.Fragment key={wi}>
              <span className={`relative inline-block ${wordSingerColor}`}>
                <span className={isActive ? (wordSingerColor ? 'opacity-50 transition-colors duration-100' : 'text-zinc-500 transition-colors duration-100') : ''}>{wordContent}</span>
                {isActive && (
                  <span
                    className={`absolute left-0 top-0 h-full overflow-hidden whitespace-nowrap karaoke-fill-glow karaoke-fill-mask ${wordSingerColor || 'text-primary'}`}
                    style={{
                      animationName: 'karaoke-fill-anim',
                      animationDuration: `${(endTime! - startTime!) / playbackSpeed}s`,
                      animationTimingFunction: fillEasing,
                      animationFillMode: 'both',
                      animationDelay: `${(startTime! - playbackPosition) / playbackSpeed}s`,
                      animationPlayState: isPlaying ? 'running' : 'paused',
                    }}
                    onAnimationStart={(e) => { e.currentTarget.style.willChange = 'width'; }}
                    onAnimationEnd={(e) => { e.currentTarget.style.willChange = ''; }}
                  >
                    {wordContent}
                  </span>
                )}
              </span>
              {addSpace ? ' ' : null}
            </React.Fragment>
          );
        })
        // No word timestamps: render with singer coloring if line has singers
        : (() => {
          // Duet renders the multi-singer gradient on the parent <p>, so skip per-word
          // and fallback solid colors that would otherwise hide it (#3).
          const hasSingerSplit = !isDuet && (line.singers?.length ?? 0) >= 1 && (line.words?.length ?? 0) > 0;
          if (hasSingerSplit) {
            return (line.words || []).map((w, wi) => {
              const effIdx = w.singerIndex ?? (line.singers!.length === 1 ? 0 : null);
              const wsName = effIdx !== null ? line.singers![effIdx] : undefined;
              const singerColor = wsName ? (WORD_SINGER_PREVIEW_COLORS[singerColorIndex(wsName, roster)] || '') : '';
              const nextWord = (line.words || [])[wi + 1];
              const addSpace = needsSpaceAfter(w.word, nextWord?.word);
              return (
                <React.Fragment key={wi}>
                  <span className={singerColor}>{w.word}</span>
                  {addSpace ? ' ' : null}
                </React.Fragment>
              );
            });
          }
          const singerFallbackColor = !isDuet && (line.singers?.length ?? 0) >= 1
            ? (WORD_SINGER_PREVIEW_COLORS[singerColorIndex(line.singers![0], roster)] || '')
            : '';
          const plainContent = hasReadings ? renderLineWithReadings(line, fmtReading, showFuriganaInPreview) : mainText;
          return singerFallbackColor
            ? <span className={singerFallbackColor}>{plainContent}</span>
            : plainContent;
        })()
      }
    </p>
  );
}

interface SecondaryTrackParams {
  line: EditorLine;
  isActive: boolean;
  playbackPosition: number;
  activeSecondarySizes: SizeMap;
  inactiveSecondarySizes: SizeMap;
  sizeOption: string;
  settings: AppSettings;
  isPlaying?: boolean;
  playbackSpeed: number;
}

function renderSecondaryTrack({ line, isActive, playbackPosition, activeSecondarySizes, inactiveSecondarySizes, sizeOption, settings, isPlaying, playbackSpeed }: SecondaryTrackParams) {
  const fillTrack = settings?.editor?.display?.karaokeFillTrack ?? 'main';
  const fillEasing = settings?.editor?.display?.karaokeFillEasing ?? 'linear';
  const hasSecondaryStamps = line.secondaryWords?.some((w) => w.time != null);
  const doFill = isActive && hasSecondaryStamps && (fillTrack === 'secondary' || fillTrack === 'both');
  // secondary stays dim (inactive style) when fillTrack is 'main' — no active styling applied
  const treatAsActive = isActive && fillTrack !== 'main';
  const baseClass = `transition-colors duration-100 w-full font-lyrics break-words overflow-wrap-anywhere hyphens-auto ${treatAsActive
    ? `${activeSecondarySizes[sizeOption]} text-zinc-400 font-medium`
    : `${inactiveSecondarySizes[sizeOption]} text-zinc-600`
    }`;

  if (!doFill) {
    return <p className={baseClass}><ParsedSecondary text={line.secondary} /></p>;
  }

  const secWords = line.secondaryWords || [];

  // Estimate fill end time for the last timed secondary word
  const timedSecWordsList = secWords.filter((w2) => w2.time != null);
  let lastSecWordFillEnd: number | null = null;
  if (timedSecWordsList.length > 0) {
    const lastTW = timedSecWordsList[timedSecWordsList.length - 1];
    if (timedSecWordsList.length >= 2) {
      const avgDur = (lastTW.time! - timedSecWordsList[0].time!) / (timedSecWordsList.length - 1);
      lastSecWordFillEnd = lastTW.time! + avgDur;
    } else {
      lastSecWordFillEnd = lastTW.time! + 0.8;
    }
  }

  return (
    <p className={baseClass}>
      {secWords.map((w, wi) => {
        // Calculate effective start and end times for this word (interpolate if untimed)
        let startTime = w.time;
        let endTime: number | null = null;

        if (startTime == null) {
          // Untimed word: find surrounding timed anchors
          let prevT = line.timestamp ?? 0;
          let untimedCountBefore = 0;
          for (let j = wi - 1; j >= 0; j--) {
            if (secWords[j].time != null) { prevT = secWords[j].time!; break; }
            untimedCountBefore++;
          }
          let nextT = lastSecWordFillEnd;
          let untimedCountAfter = 0;
          for (let j = wi + 1; j < secWords.length; j++) {
            if (secWords[j].time != null) { nextT = secWords[j].time!; break; }
            untimedCountAfter++;
          }
          const totalGapWords = untimedCountBefore + untimedCountAfter + 1;
          const gapDur = Math.max(0.1, (nextT ?? (prevT + 1)) - prevT);
          const slice = gapDur / (totalGapWords + 1);
          startTime = prevT + (slice * (untimedCountBefore + 1));
          endTime = prevT + (slice * (untimedCountBefore + 2));
        } else {
          // Timed word: ends when next timed word starts
          endTime = secWords.slice(wi + 1).find((w2) => w2.time != null)?.time ?? lastSecWordFillEnd;
        }
        const addSpace = wi < secWords.length - 1;
        return (
          <React.Fragment key={wi}>
            <span className="relative inline-block">
              <span className="text-zinc-600 transition-colors duration-100">{w.word}</span>
              <span
                className="absolute left-0 top-0 h-full overflow-hidden text-zinc-200 whitespace-nowrap karaoke-fill-mask"
                style={{
                  animationName: 'karaoke-fill-anim',
                  animationDuration: `${(endTime! - startTime!) / playbackSpeed}s`,
                  animationTimingFunction: fillEasing,
                  animationFillMode: 'both',
                  animationDelay: `${(startTime! - playbackPosition) / playbackSpeed}s`,
                  animationPlayState: isPlaying ? 'running' : 'paused',
                }}
                onAnimationStart={(e) => { e.currentTarget.style.willChange = 'width'; }}
                onAnimationEnd={(e) => { e.currentTarget.style.willChange = ''; }}
              >
                {w.word}
              </span>
            </span>
            {addSpace ? ' ' : null}
          </React.Fragment>
        );
      })}
    </p>
  );
}

// ——— Parse {word|reading} markup in secondary text into rendered ruby elements ———
function ParsedSecondary({ text }: { text?: string }) {
  if (!text) return null;
  const { segments } = parseRubyMarkup(text);
  let charOffset = 0;
  return segments.map((seg: { text: string; reading?: string | null }) => {
    const key = charOffset;
    charOffset += seg.text.length;
    return seg.reading ? (
      <ruby key={key}>{seg.text}<rp>(</rp><rt style={{ paddingBottom: '2px', marginInline: '0.25em' }}>{seg.reading}</rt><rp>)</rp></ruby>
    ) : (
      <React.Fragment key={key}>{seg.text}</React.Fragment>
    );
  });
}

// ——— Kanji detection: only kanji get ruby annotations, not hiragana/katakana ———
const KANJI_RE = /[一-鿿㐀-䶿豈-﫿]/;
function isKanjiWord(word?: string): boolean {
  return KANJI_RE.test(word || '');
}


// ——— Render line text with ruby annotations from word.reading (only on kanji) ———
function renderLineWithReadings(line: EditorLine, fmtReading: ReadingFmt, showFurigana = true) {
  const words = line.words || [];
  if (words.length === 0) return line.text || '♪';
  return words.map((w, i) => {
    const addSpace = needsSpaceAfter(w.word, words[i + 1]?.word);
    if (w.reading && isKanjiWord(w.word) && showFurigana) {
      return (

        <React.Fragment key={`word-${i}`}>
          <ruby>{w.word}<rp>(</rp><rt style={{ paddingBottom: '2px', marginInline: '0.25em' }}>{fmtReading(w.reading)}</rt><rp>)</rp></ruby>
          {addSpace ? ' ' : null}
        </React.Fragment>
      );
    }

    return <React.Fragment key={`word-${i}`}>{w.word}{addSpace ? ' ' : null}</React.Fragment>;
  });
}
