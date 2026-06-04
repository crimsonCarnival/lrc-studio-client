import { useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import PreviewLine from './PreviewLine';

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
}) {
  // Own the refs here — the virtualizer needs getScrollElement to return
  // a non-null element on mount for its ResizeObserver to attach properly.
  const containerRef = useRef(null);
  const activeRef = useRef(null);
  const isDualLine = settings.editor?.display?.dualLine;
  const showNextLine = settings.editor?.display?.showNextLine !== false;
  const scrollAlignment = settings.editor?.scroll?.alignment || 'center';
  const scrollMode = settings.editor?.scroll?.mode || 'smooth';

  // Pre-compute nextTimestamp for karaoke fill — O(n) backward pass
  const nextTimestamps = useMemo(() => {
    const result = {};
    let nextTs = null;
    for (let idx = lines.length - 1; idx >= 0; idx--) {
      if (lines[idx].timestamp != null) {
        nextTs = lines[idx].timestamp;
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
    let result;
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
    if (isDualLine || scrollAlignment === 'none' || currentIndex < 0 || settings.preview?.autoScroll === false) return;

    // Use requestAnimationFrame to ensure the virtualizer has painted items before scrolling
    const raf = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(currentIndex, {
        align: scrollAlignment === 'start' ? 'start' : scrollAlignment === 'end' ? 'end' : 'center',
        behavior: scrollMode,
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isDualLine, scrollAlignment, scrollMode, settings.preview?.autoScroll]);

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
          {dualDisplayLines.map(({ line, originalIndex: i }) => (
            <PreviewLine

              key={i}
              line={{ ...line, nextTimestamp: nextTimestamps[i] ?? null }}
              originalIndex={i}
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
