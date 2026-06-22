import { useRef, useEffect, useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import PreviewLineRaw from './PreviewLine';

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
}: PreviewViewportProps) {
  // Own the refs here — the virtualizer needs getScrollElement to return
  // a non-null element on mount for its ResizeObserver to attach properly.
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const isDualLine = settings.editor?.display?.dualLine;
  const showNextLine = settings.editor?.display?.showNextLine !== false;
  const scrollAlignment = settings.editor?.scroll?.alignment || 'center';
  const scrollMode = settings.editor?.scroll?.mode || 'smooth';

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

  // Distinct singer names in first-appearance order — stable identity for color mapping
  const songSingers = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const l of lines) {
      if (l.singers) {
        for (const s of l.singers) {
          if (!seen.has(s)) { seen.add(s); result.push(s); }
        }
      }
    }
    return result;
  }, [lines]);

  // Pre-compute nextTimestamp for karaoke fill — O(n) backward pass
  const nextTimestamps = useMemo(() => {
    const result: Record<number, number> = {};
    let nextTs: number | null = null;
    for (let idx = lines.length - 1; idx >= 0; idx--) {
      if (lines[idx].timestamp != null) {
        nextTs = lines[idx].timestamp!;
      }
      if (idx < lines.length - 1 && nextTs != null) {
        result[idx] = nextTs;
      }
    }
    return result;
  }, [lines]);

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
    count: isDualLine ? 0 : lines.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 52,
    overscan: 5,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 52,
  });

  // Auto-scroll to active line (virtual)
  useEffect(() => {
    if (isDualLine || scrollAlignment === 'none' || currentIndex < 0) return;

    // Use requestAnimationFrame to ensure the virtualizer has painted items before scrolling
    const raf = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(currentIndex, {
        align: scrollAlignment === 'start' ? 'start' : scrollAlignment === 'end' ? 'end' : 'center',
        behavior: scrollMode,
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isDualLine, scrollAlignment, scrollMode]);

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
              songSingers={songSingers}
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
        className="h-full overflow-y-auto overflow-x-hidden mask-edges rounded-lg"
      >
        <div
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          className={`overflow-x-hidden px-1 sm:px-0`}
        >
          {virtualizer.getVirtualItems().map((vRow) => {
            const i = vRow.index;
            const line = lines[i];
            return (
              <div
                key={i}
                data-index={i}
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
                  songSingers={songSingers}
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
