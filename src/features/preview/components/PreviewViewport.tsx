import { useRef, useEffect, useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import PreviewLineRaw from './PreviewLine';
import { buildSingerRoster } from '@features/editor/utils/singer-colors';

// PreviewLine is a large untyped component; alias to bypass prop checking until migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PreviewLine = PreviewLineRaw as any;

interface PreviewLineData {
  id?: string | number;
  type?: string;
  label?: string;
  timestamp?: number | null;
  singers?: string[];
  [key: string]: unknown;
}

interface PreviewViewportProps {
  lines: PreviewLineData[];
  currentIndex: number;
  hasSyncedLines: boolean;
  playbackPosition: number;
  handleLineClick: (...args: unknown[]) => void;
  showTranslationsInPreview?: boolean;
  showFuriganaInPreview?: boolean;
  sizeOption?: string;
  spacingOption?: string;
  activeSecondarySizes?: unknown;
  inactiveSecondarySizes?: unknown;
  activeFontSizes?: unknown;
  inactiveFontSizes?: unknown;
  activeMargin?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  editorMode: string;
  t: TFunction;
  hasMedia?: boolean;
  isPlaying?: boolean;
  playbackSpeed?: number;
  activeTranslationIndex?: number;
  // Pre-split song artists, threaded from the editor side so the roster (and thus
  // singer color identity) matches the editor pane. Standalone/public path omits this.
  songArtists?: string[];
  // Custom per-singer hex overrides (Settings → Interface, or per-project). Index-aligned
  // with the song-wide roster built below.
  singerColors?: string[];
  // Editor-preview options. All optional so the public viewer (LyricsStage) keeps
  // its stage look and its "hide groups nobody has synced yet" behaviour.
  /** 'review' lists every line, timed or not, as rows with a timestamp gutter. */
  variant?: 'stage' | 'review';
  showTimestamps?: boolean;
  showSections?: boolean;
  wordHighlight?: boolean;
  /** False pauses auto-scroll to the active line. */
  followPlayback?: boolean;
  /** Scroll to this index of `lines`; a new object re-triggers the scroll. */
  jumpRequest?: { index: number } | null;
  // Parent (Preview) still passes extra display-tuning props; allow passthrough until it migrates.
  [key: string]: unknown;
}

// ────────────────────────────────────────────────────────
// Virtualized preview viewport — handles both normal and dual-line modes
// containerRef and activeRef are created HERE so they're non-null when
// useVirtualizer mounts and sets up its ResizeObserver.
// ────────────────────────────────────────────────────────
export default function PreviewViewport({
  lines,
  currentIndex,
  hasSyncedLines,
  playbackPosition,
  handleLineClick,
  showTranslationsInPreview,
  showFuriganaInPreview,
  sizeOption,
  spacingOption,
  activeSecondarySizes,
  inactiveSecondarySizes,
  activeFontSizes,
  inactiveFontSizes,
  activeMargin,
  settings,
  editorMode,
  t,
  hasMedia,
  isPlaying,
  playbackSpeed,
  activeTranslationIndex = 0,
  songArtists,
  singerColors,
  variant = 'stage',
  showTimestamps = false,
  showSections = true,
  wordHighlight = true,
  followPlayback = true,
  jumpRequest = null,
}: PreviewViewportProps) {
  // Own the refs here — the virtualizer needs getScrollElement to return
  // a non-null element on mount for its ResizeObserver to attach properly.
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const isDualLine = settings.editor?.display?.dualLine;
  const showNextLine = settings.editor?.display?.showNextLine !== false;
  const scrollAlignment = settings.editor?.scroll?.alignment || 'center';
  const scrollMode = settings.editor?.scroll?.mode || 'smooth';
  const isReview = variant === 'review';

  // Map<line.id, number> — assigns sequential numbers to section types that appear >1 times
  const sectionNumbers = useMemo(() => {
    const baseCounts: Record<string, number> = {};
    for (const l of lines) {
      if (l.type !== 'section' || !l.label) continue;
      const base = l.label.trim().toLowerCase().replace(/\s+\d+$/, '');
      baseCounts[base] = (baseCounts[base] || 0) + 1;
    }
    const result = new Map<string | number | undefined, number>();
    const baseIndex: Record<string, number> = {};
    for (const l of lines) {
      if (l.type !== 'section' || !l.label) continue;
      const base = l.label.trim().toLowerCase().replace(/\s+\d+$/, '');
      if (baseCounts[base] > 1) {
        baseIndex[base] = (baseIndex[base] || 0) + 1;
        result.set(l.id, baseIndex[base]);
      }
    }
    return result;
  }, [lines]);

  // True when more than one distinct singer name exists across all lines
  const hasMultipleSingers = useMemo(() => {
    const names = new Set<string>();
    for (const l of lines) {
      if (l.singers) for (const s of l.singers) names.add(s);
      if (names.size > 1) return true;
    }
    return false;
  }, [lines]);

  // Distinct singer names in first-appearance order — stable identity for color mapping.
  // Uses the SAME shared builder + inputs as the editor pane so a given singer maps
  // to the same palette index in both. songArtists is absent on the standalone/public
  // path, which falls back to a lines-only roster (acceptable — parity only needs to
  // hold when the editor and its preview share a project).
  const songSingers = useMemo(
    () => buildSingerRoster(lines, songArtists),
    [lines, songArtists],
  );

  // Pre-compute nextTimestamp for karaoke fill — O(n) backward pass
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

  // #6: hide unsynced section groups from the normal preview. A "group" is a section
  // marker plus the lines under it (and a leading anonymous group for lines before the
  // first marker). A group with no timestamp anywhere is still being edited — don't show
  // its header or its lines in the preview until at least one line is synced.
  // An unlabeled, singer-less marker (e.g. the one tagging inserts after a partial
  // selection to end the new section) means "back to no section", so its lines rejoin
  // the shared unsectioned group instead of forming a new, hidden-until-synced group —
  // otherwise tagging a few lines made every unsynced line after them vanish.
  // The review variant exists to show what is still missing, so it keeps every group.
  const visibleLines = useMemo(() => {
    type Group = { hasTs: boolean };
    const unsectioned: Group = { hasTs: false };
    const owners: Group[] = [];
    let g: Group = unsectioned;
    lines.forEach((line, idx) => {
      if (line.type === 'section') {
        const isAnonymous = !line.label?.trim() && !(Array.isArray(line.singers) && line.singers.length > 0);
        g = isAnonymous ? unsectioned : { hasTs: false };
      }
      owners[idx] = g;
      if (line.timestamp != null) g.hasTs = true;
    });
    const result: { line: PreviewLineData; originalIndex: number }[] = [];
    lines.forEach((line, idx) => {
      if (!showSections && line.type === 'section') return;
      if (isReview || owners[idx].hasTs) result.push({ line, originalIndex: idx });
    });
    return result;
  }, [lines, isReview, showSections]);

  // Active line's position within the filtered list (-1 when it's in a hidden group).
  const mappedActiveIndex = useMemo(
    () => visibleLines.findIndex((v) => v.originalIndex === currentIndex),
    [visibleLines, currentIndex],
  );

  // Compute display lines for dual-line mode
  const dualDisplayLines = useMemo(() => {
    if (!isDualLine) return null;
    let result: { line: PreviewLineData; originalIndex: number }[];
    if (currentIndex === -1) {
      const firstSynced = lines.findIndex((l) => l.timestamp != null);
      result = firstSynced !== -1
        ? [{ line: lines[firstSynced], originalIndex: firstSynced }]
        : [{ line: lines[0], originalIndex: 0 }];
      if (showNextLine && result[0].originalIndex + 1 < lines.length) {
        const idx = result[0].originalIndex + 1;
        result.push({ line: lines[idx], originalIndex: idx });
      }
    } else {
      result = [{ line: lines[currentIndex], originalIndex: currentIndex }];
      if (showNextLine) {
        let nextIdx = currentIndex + 1;
        while (nextIdx < lines.length && lines[nextIdx].timestamp == null) nextIdx++;
        if (nextIdx < lines.length) result.push({ line: lines[nextIdx], originalIndex: nextIdx });
      }
    }
    return result;
  }, [isDualLine, lines, currentIndex, showNextLine]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: isDualLine ? 0 : visibleLines.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 52,
    overscan: 5,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 52,
    // Measured heights are cached per key. Keyed by row index (the default), a
    // row that takes over an index after the list is filtered (sections hidden,
    // a group becoming visible) inherits the previous occupant's height, and
    // rows overlap until something forces a re-measure. Keying by the line
    // itself keeps each height with its own row.
    getItemKey: (index) => visibleLines[index]?.line.id ?? `row-${visibleLines[index]?.originalIndex ?? index}`,
  });

  // Auto-scroll to active line (virtual)
  useEffect(() => {
    if (isDualLine || !followPlayback || scrollAlignment === 'none' || mappedActiveIndex < 0) return;

    // Use requestAnimationFrame to ensure the virtualizer has painted items before scrolling
    const raf = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(mappedActiveIndex, {
        align: scrollAlignment === 'start' ? 'start' : scrollAlignment === 'end' ? 'end' : 'center',
        behavior: scrollMode,
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedActiveIndex, isDualLine, followPlayback, scrollAlignment, scrollMode]);

  // Explicit jump (e.g. "go to the first untimed line")
  useEffect(() => {
    if (!jumpRequest || isDualLine) return;
    const target = visibleLines.findIndex((v) => v.originalIndex === jumpRequest.index);
    if (target < 0) return;
    const raf = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(target, { align: 'center', behavior: scrollMode });
    });
    return () => cancelAnimationFrame(raf);
    // Only a new request should scroll; visibleLines/scrollMode are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpRequest]);

  let content;

  if (!lines.length) {
    content = (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden mask-edges rounded-lg flex items-center justify-center"
      >
        <p className="text-zinc-600 text-xs sm:text-sm italic text-center px-4">
          {t('editor.pastePlaceholder')}
        </p>
      </div>
    );
  } else if (!hasSyncedLines) {
    content = (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden mask-edges rounded-lg flex items-center justify-center"
      >
        <p className="text-zinc-600 text-xs sm:text-sm italic text-center px-4">
          {t('preview.placeholder')}
        </p>
      </div>
    );
  } else if (isDualLine) {
    content = (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden scroll-smooth mask-edges rounded-lg"
      >
        <div className="h-full flex flex-col justify-center items-center gap-4 sm:gap-8 overflow-x-hidden px-1 sm:px-0">
          {dualDisplayLines!.map(({ line, originalIndex: i }) => (
            <PreviewLine
              key={i}
              line={{ ...line, nextTimestamp: nextTimestamps[i] ?? null }}
              nextTimestamp={nextTimestamps[i] ?? null}
              originalIndex={i}
              hasMultipleSingers={hasMultipleSingers}
              sectionNumbers={sectionNumbers}
              displayedActiveIndex={currentIndex}
              lockedLineIndex={null}
              isDualLine
              displayLines={dualDisplayLines}
              playbackPosition={playbackPosition}
              activeRef={activeRef}
              handleLineClick={handleLineClick}
              handleLineHover={() => { }}
              handleLineHoverEnd={() => { }}
              showTranslationsInPreview={showTranslationsInPreview}
              showFuriganaInPreview={showFuriganaInPreview}
              activeTranslationIndex={activeTranslationIndex}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              sizeOption={sizeOption}
              spacingOption={spacingOption}
              activeSecondarySizes={activeSecondarySizes}
              inactiveSecondarySizes={inactiveSecondarySizes}
              activeFontSizes={activeFontSizes}
              inactiveFontSizes={inactiveFontSizes}
              activeMargin={activeMargin}
              distanceFromActive={currentIndex >= 0 ? Math.abs(i - currentIndex) : null}
              totalLines={lines.length}
              editorMode={editorMode}
              hasMedia={hasMedia}
              roster={songSingers}
              singerColors={singerColors}
              wordHighlight={wordHighlight}
            />
          ))}
        </div>
      </div>
    );
  } else {
    // Normal mode — virtualized
    content = (
      <div
        ref={containerRef}
        tabIndex={isReview ? 0 : undefined}
        aria-label={isReview ? t('preview.lyricsListLabel') : undefined}
        className={`h-full overflow-y-auto overflow-x-hidden mask-edges rounded-lg ${isReview ? 'lrc-scroll outline-none focus-visible:ring-2 focus-visible:ring-primary/50' : ''}`}
      >
        <div
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          className={`overflow-x-hidden px-1 sm:px-0 ${isReview ? 'mx-auto w-full max-w-[820px]' : ''}`}
        >
          {virtualizer.getVirtualItems().map((vRow) => {
            const entry = visibleLines[vRow.index];
            if (!entry) return null;
            const i = entry.originalIndex;
            const line = entry.line;
            return (
              <div
                key={i}
                data-index={vRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                <PreviewLine
                  line={{ ...line, nextTimestamp: nextTimestamps[i] ?? null }}
                  nextTimestamp={nextTimestamps[i] ?? null}
                  originalIndex={i}
                  prevLine={i > 0 ? lines[i - 1] : null}
                  hasMultipleSingers={hasMultipleSingers}
                  sectionNumbers={sectionNumbers}
                  displayedActiveIndex={currentIndex}
                  lockedLineIndex={null}
                  isDualLine={false}
                  displayLines={null}
                  playbackPosition={i === currentIndex ? playbackPosition : null}
                  activeRef={i === currentIndex ? activeRef : null}
                  handleLineClick={handleLineClick}
                  handleLineHover={() => { }}
                  handleLineHoverEnd={() => { }}
                  showTranslationsInPreview={showTranslationsInPreview}
                  showFuriganaInPreview={showFuriganaInPreview}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  sizeOption={sizeOption}
                  spacingOption={spacingOption}
                  activeSecondarySizes={activeSecondarySizes}
                  inactiveSecondarySizes={inactiveSecondarySizes}
                  activeFontSizes={activeFontSizes}
                  inactiveFontSizes={inactiveFontSizes}
                  activeMargin={activeMargin}
                  distanceFromActive={currentIndex >= 0 ? Math.abs(i - currentIndex) : null}
                  totalLines={lines.length}
                  editorMode={editorMode}
                  hasMedia={hasMedia}
                  roster={songSingers}
                  singerColors={singerColors}
                  variant={variant}
                  showTimestamps={showTimestamps}
                  wordHighlight={wordHighlight}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      {content}
      <ScrollProgress containerRef={containerRef} className="absolute bottom-0 inset-x-0 h-[2px]" />
    </div>
  );
}
