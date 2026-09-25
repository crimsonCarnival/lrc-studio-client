import { useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { ComponentProps, RefObject } from 'react';
import { useVirtualizer, defaultRangeExtractor } from '@tanstack/react-virtual';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import EditorLineItem from '../line/EditorLineItem';
import { sectionCollapseKey } from '@/features/editor/utils/sections';
import type { CollapsedView } from '@/features/editor/utils/sections';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';
import type { ConfidenceInfo } from '@/features/editor/hooks/useAutoStamp';

const ESTIMATED_LINE_HEIGHT = 52;
const LINE_GAP = 4;

type LineItemProps = ComponentProps<typeof EditorLineItem>;

interface VirtualizedLineListProps {
  lines: EditorLine[];
  displayedActiveIndex: number;
  activeLineIndex: number;
  isActiveLineLocked: boolean;
  editorMode: string;
  awaitingEndMark?: number | null;
  focusedTimestamp: LineItemProps['focusedTimestamp'];
  setFocusedTimestamp: LineItemProps['setFocusedTimestamp'];
  handleLineClick: LineItemProps['handleLineClick'];
  handleLineHover: LineItemProps['handleLineHover'];
  handleLineHoverEnd: LineItemProps['handleLineHoverEnd'];
  handleDragStart: LineItemProps['handleDragStart'];
  handleDragOver: LineItemProps['handleDragOver'];
  handleDragEnd: LineItemProps['handleDragEnd'];
  handleDrop: LineItemProps['handleDrop'];
  dragOverIndex?: number | null;
  dragIndex?: number | null;
  projectSingers?: string[];
  singerColors?: string[];
  selectedLines: Set<number>;
  settings: AppSettings;
  editingLineIndex: number | null;
  setEditingLineIndex: LineItemProps['setEditingLineIndex'];
  editingText: string;
  setEditingText: LineItemProps['setEditingText'];
  editingSecondary: string;
  setEditingSecondary: LineItemProps['setEditingSecondary'];
  editingTranslations: LineItemProps['editingTranslations'];
  setEditingTranslations: LineItemProps['setEditingTranslations'];
  editingSingers: string[];
  setEditingSingers: LineItemProps['setEditingSingers'];
  handleSaveLineText: LineItemProps['handleSaveLineText'];
  handleInsertSection?: LineItemProps['handleInsertSection'];
  handleToggleSectionDepth?: LineItemProps['onToggleDepth'];
  handleMoveToSection?: LineItemProps['handleMoveToSection'];
  handleAssignSinger?: LineItemProps['handleAssignSinger'];
  songArtists?: string[];
  playerRef?: LineItemProps['playerRef'];
  shiftTime: LineItemProps['shiftTime'];
  handleAddLine?: LineItemProps['handleAddLine'];
  handleClearLine?: LineItemProps['handleClearLine'];
  handleDeleteLine: LineItemProps['handleDeleteLine'];
  listRef: RefObject<HTMLDivElement | null>;
  handleMark?: LineItemProps['handleMark'];
  handleToggleLine: LineItemProps['handleToggleLine'];
  updateSetting?: (path: string, value: unknown) => void;
  activeWordIndex: number;
  handleClearWordTimestamp?: LineItemProps['handleClearWordTimestamp'];
  handleSetActiveWordIndex: LineItemProps['handleSetActiveWordIndex'];
  handleSetTimestamp: LineItemProps['handleSetTimestamp'];
  handleSetWordReading?: LineItemProps['handleSetWordReading'];
  handleCycleWordSinger?: LineItemProps['handleCycleWordSinger'];
  stampTarget?: string;
  handleStampTargetToggle?: LineItemProps['handleStampTargetToggle'];
  playbackPosition?: number | null;
  onWordMenu?: LineItemProps['onWordMenu'];
  onLineMenu?: LineItemProps['onLineMenu'];
  modifiedLines?: Set<number>;
  onToggleLineMode?: LineItemProps['onToggleLineMode'];
  confidenceByIndex?: Map<number, ConfidenceInfo>;
  handleToggleAdLib?: (lineIndex: number) => void;
  /** Collapsed section keys (sectionCollapseKey) and the derived visible-row view. */
  collapsedSections: ReadonlySet<string>;
  collapsedView: CollapsedView;
  onToggleSectionCollapse: (key: string) => void;
}

export default function VirtualizedLineList({
  lines,
  displayedActiveIndex,
  activeLineIndex,
  isActiveLineLocked,
  editorMode,
  awaitingEndMark,
  focusedTimestamp,
  setFocusedTimestamp,
  handleLineClick,
  handleLineHover,
  handleLineHoverEnd,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleDrop,
  dragOverIndex,
  dragIndex,
  projectSingers,
  singerColors,
  selectedLines,
  settings,
  editingLineIndex,
  setEditingLineIndex,
  editingText,
  setEditingText,
  editingSecondary,
  setEditingSecondary,
  editingTranslations,
  setEditingTranslations,
  editingSingers,
  setEditingSingers,
  handleSaveLineText,
  handleInsertSection,
  handleToggleSectionDepth,
  handleMoveToSection,
  handleAssignSinger,
  songArtists,
  playerRef,
  shiftTime,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  listRef,
  handleMark,
  handleToggleLine,
  activeWordIndex,
  handleClearWordTimestamp,
  handleSetActiveWordIndex,
  handleSetTimestamp,
  handleSetWordReading,
  handleCycleWordSinger,
  stampTarget,
  handleStampTargetToggle,
  playbackPosition,
  onWordMenu,
  onLineMenu,
  modifiedLines,
  onToggleLineMode,
  confidenceByIndex,
  handleToggleAdLib,
  collapsedSections,
  collapsedView,
  onToggleSectionCollapse,
}: VirtualizedLineListProps) {
  const scrollAlignment = settings.editor?.scroll?.alignment || 'center';
  const scrollMode = settings.editor?.scroll?.mode || 'smooth';

  // ——— Section collapse (state + auto-expand live in useEditor; see computeCollapsedView) ———
  // rows[r] = line index rendered at virtual row r. Everything outside the virtualizer keeps
  // using ORIGINAL line indices (actions, selection, drag, marking); only the virtualizer
  // and its DOM `data-index` speak row indices. rowOfLine is the inverse (-1 = hidden).
  const { rows, rowOfLine, blockLyricCounts } = collapsedView;

  const activeSections = useMemo(() => {
    const result: number[] = [];
    rows.forEach((lineIdx, r) => { if (lines[lineIdx].type === 'section') result.push(r); });
    return result;
  }, [rows, lines]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    // Key measurements by line identity so collapsing/expanding doesn't reuse another row's size.
    getItemKey: (r: number) => {
      const lineIdx = rows[r];
      const id = lines[lineIdx]?.id;
      return id ? `id:${id}` : `idx:${lineIdx}`;
    },
    getScrollElement: () => listRef.current,
    // Words mode items are taller (word chips wrap); a larger estimate reduces
    // first-render overlap while ResizeObserver corrects the true height.
    estimateSize: () => editorMode === 'words' ? 96 : ESTIMATED_LINE_HEIGHT,
    gap: LINE_GAP,
    overscan: 8,
    rangeExtractor: useCallback((range: import('@tanstack/react-virtual').Range) => {
      // 1. Get the default range based on current scroll position and overscan
      const defaultRange = defaultRangeExtractor(range);

      // 2. Find the active sticky section (closest section index <= first visible index)
      let activeSectionIndex = -1;
      for (const idx of activeSections) {
        if (idx <= range.startIndex) activeSectionIndex = idx;
        else break;
      }

      // 3. Keep the active section mounted if it's not already in the default range
      const newRange = new Set(defaultRange);
      if (activeSectionIndex !== -1) {
        newRange.add(activeSectionIndex);
      }

      // 4. Return sorted indices
      return Array.from(newRange).sort((a, b) => a - b);
    }, [activeSections]),
  });

  // Re-measure all items when the scroll container is resized (e.g. window/panel resize
  // changes available width, causing text to wrap differently — items don't self-measure
  // because their *height* hasn't changed yet from ResizeObserver's perspective).
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let lastWidth = el.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth !== lastWidth) {
        lastWidth = el.offsetWidth;
        virtualizer.measure();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [virtualizer, listRef]);

  // DOM rows carry the virtual ROW index in data-index; translate a line index to its row
  // element (null when the line is hidden inside a collapsed section or not rendered).
  const measureLine = useCallback((lineIdx: number) => {
    const row = lineIdx >= 0 && lineIdx < rowOfLine.length ? rowOfLine[lineIdx] : -1;
    if (row < 0) return;
    const el = listRef.current?.querySelector(`[data-index="${row}"]`);
    if (el) virtualizer.measureElement(el as HTMLElement);
  }, [rowOfLine, virtualizer, listRef]);

  // Force-measure editing item synchronously before paint so subsequent items
  // don't overlap during the one frame before ResizeObserver fires.
  const prevEditingLineIndexRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const prev = prevEditingLineIndexRef.current;
    prevEditingLineIndexRef.current = editingLineIndex;
    const toMeasure = new Set([editingLineIndex, prev].filter((x): x is number => x !== null));
    toMeasure.forEach(measureLine);
  }, [editingLineIndex, measureLine]);

  // The active line grows when selected (highlight box padding + text wrapping), but the
  // virtualizer only self-measures via ResizeObserver — which doesn't fire on the one frame
  // the active styling is applied. Force-measure the current (and previously) active row
  // synchronously so the following rows don't overlap it. Mirrors the editing-line effect above.
  const prevActiveLineIndexRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const prev = prevActiveLineIndexRef.current;
    prevActiveLineIndexRef.current = displayedActiveIndex;
    const toMeasure = new Set([displayedActiveIndex, prev].filter((x): x is number => x != null && x >= 0));
    toMeasure.forEach(measureLine);
  }, [displayedActiveIndex, measureLine]);

  // Force-measure drag target so if we add a drop gap (e.g. mt-12), it expands
  const prevDragOverIndexRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const prev = prevDragOverIndexRef.current;
    prevDragOverIndexRef.current = dragOverIndex ?? null;
    const toMeasure = new Set([dragOverIndex, prev].filter((x): x is number => x != null && x >= 0));
    toMeasure.forEach(measureLine);
  }, [dragOverIndex, measureLine]);

  // Force-measure dragged item
  const prevDragIndexRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const prev = prevDragIndexRef.current;
    prevDragIndexRef.current = dragIndex ?? null;
    const toMeasure = new Set([dragIndex, prev].filter((x): x is number => x != null && x >= 0));
    toMeasure.forEach(measureLine);
  }, [dragIndex, measureLine]);

  // Auto-scroll to active line via virtualizer (line index → row; hidden lines don't scroll)
  const prevActiveRef = useCallback((idx: number) => {
    if (scrollAlignment === 'none') return;
    const row = idx < rowOfLine.length ? rowOfLine[idx] : -1;
    if (row < 0) return;
    virtualizer.scrollToIndex(row, {
      align: scrollAlignment === 'start' ? 'start' : scrollAlignment === 'end' ? 'end' : 'center',
      behavior: scrollMode,
    });
  }, [virtualizer, scrollAlignment, scrollMode, rowOfLine]);

  // Handle visualViewport resize (keyboard opening)
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      if (editingLineIndex !== null) {
        // Scroll the editing line into view when the keyboard opens/resizes
        setTimeout(() => {
          const row = editingLineIndex !== null && editingLineIndex < rowOfLine.length ? rowOfLine[editingLineIndex] : -1;
          if (row >= 0) {
            virtualizer.scrollToIndex(row, { align: 'center', behavior: 'smooth' });
          }
        }, 150);
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange, { passive: true });
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [editingLineIndex, virtualizer, rowOfLine]);

  // Keep a stable ref to the latest scroll callback so the effect below doesn't
  // need it in deps (avoids re-firing when virtualizer identity changes).
  const prevActiveRefRef = useRef(prevActiveRef);
  prevActiveRefRef.current = prevActiveRef;

  // Scroll when active line changes (not on hover)
  const lastScrolledIndex = useRef(-1);
  useEffect(() => {
    if (activeLineIndex >= 0 && activeLineIndex !== lastScrolledIndex.current) {
      lastScrolledIndex.current = activeLineIndex;
      prevActiveRefRef.current(activeLineIndex);
    }
  }, [activeLineIndex]);

  // Pre-compute nextTimestamp and active section contexts for each line
  const { nextTimestamps, activeSingers } = useMemo(() => {
    const nextTsResult: (number | null)[] = new Array(lines.length).fill(null);
    let lastTs: number | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      nextTsResult[i] = lastTs;
      if (line.type !== 'section' && line.timestamp != null) {
        lastTs = line.timestamp;
      }
    }

    const singersResult: (string[] | undefined)[] = new Array(lines.length).fill(undefined);
    let currentSingers: string[] | undefined = undefined;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].type === 'section') {
        currentSingers = lines[i].singers;
      }
      singersResult[i] = currentSingers;
    }

    return { nextTimestamps: nextTsResult, activeSingers: singersResult };
  }, [lines]);

  return (
    <div className="flex flex-col flex-1 gap-3 animate-fade-in min-h-0">
      <div className="relative flex-1 min-h-0">
        <div
          ref={listRef}
          onMouseLeave={handleLineHoverEnd}
          className="h-full overflow-y-auto pr-1 mask-edges pb-32"
        >
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
            className="px-1 sm:px-0"
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const i = rows[virtualRow.index]; // original line index — used for every action
              const line = lines[i];
              if (!line) return null;
              const isActive = i === displayedActiveIndex;
              const isSynced = line.timestamp != null;
              // Upcoming depth: 1-3 for the next unsynced lines after active
              const upcomingDepth = !isSynced && i > displayedActiveIndex && i <= displayedActiveIndex + 3
                ? i - displayedActiveIndex
                : 0;

              const isSection = line.type === 'section';

              return (
                <div
                  key={line.id || i}
                  data-index={virtualRow.index}
                  ref={isSection ? undefined : virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: isSection ? virtualRow.start : 0,
                    bottom: isSection ? 0 : undefined,
                    left: 0,
                    width: '100%',
                    transform: isSection ? undefined : `translateY(${virtualRow.start}px)`,
                    paddingTop: dragOverIndex === i ? 52 : 0,
                    transition: 'padding-top 0.2s ease-out',
                    pointerEvents: isSection ? 'none' : 'auto',
                    zIndex: isSection ? 20 + i : undefined,
                  }}
                >
                  {isSection ? (
                    <div
                      ref={virtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{ position: 'sticky', top: 0, pointerEvents: 'auto' }}
                    >
                      <EditorLineItem
                        line={line}
                        nextTimestamp={nextTimestamps[i]}
                        i={i}
                        isActive={isActive}
                        isLocked={isActiveLineLocked && i === activeLineIndex}
                        isSynced={isSynced}
                        activeLineRef={undefined}
                        handleLineClick={handleLineClick}
                        handleLineHover={handleLineHover}
                        handleLineHoverEnd={handleLineHoverEnd}
                        handleDragStart={handleDragStart}
                        handleDragOver={handleDragOver}
                        handleDragEnd={handleDragEnd}
                        handleDrop={handleDrop}
                        dragOverIndex={dragOverIndex}
                        dragIndex={dragIndex}
                        projectSingers={projectSingers}
                        singerColors={singerColors}
                        activeSingers={activeSingers[i]}
                        selectedLines={selectedLines}
                        settings={settings}
                        editingLineIndex={editingLineIndex}
                        setEditingLineIndex={setEditingLineIndex}
                        editingText={editingText}
                        setEditingText={setEditingText}
                        editingSecondary={editingSecondary}
                        setEditingSecondary={setEditingSecondary}
                        editingTranslations={editingTranslations}
                        setEditingTranslations={setEditingTranslations}
                        editingSingers={editingSingers}
                        setEditingSingers={setEditingSingers}
                        handleSaveLineText={handleSaveLineText}
                        handleInsertSection={handleInsertSection}
                        handleMoveToSection={handleMoveToSection}
                        handleAssignSinger={handleAssignSinger}
                        songArtists={songArtists}
                        playerRef={playerRef}
                        shiftTime={shiftTime}
                        handleAddLine={handleAddLine}
                        handleClearLine={handleClearLine}
                        handleDeleteLine={handleDeleteLine}
                        handleToggleAdLib={handleToggleAdLib}
                        handleMark={handleMark}
                        handleToggleLine={handleToggleLine}
                        activeWordIndex={activeWordIndex}
                        handleClearWordTimestamp={handleClearWordTimestamp}
                        handleSetActiveWordIndex={handleSetActiveWordIndex}
                        handleSetTimestamp={handleSetTimestamp}
                        setFocusedTimestamp={setFocusedTimestamp}
                        handleSetWordReading={handleSetWordReading}
                        handleCycleWordSinger={handleCycleWordSinger}
                        stampTarget={stampTarget}
                        handleStampTargetToggle={handleStampTargetToggle}
                        playbackPosition={playbackPosition}
                        onWordMenu={onWordMenu}
                        onLineMenu={onLineMenu}
                        isModified={modifiedLines?.has(i) || false}
                        editorMode={editorMode}
                        onToggleLineMode={onToggleLineMode}
                        upcomingDepth={upcomingDepth}
                        onToggleDepth={handleToggleSectionDepth}
                        sectionLineCount={blockLyricCounts.get(i) ?? 0}
                        isCollapsed={collapsedSections.has(sectionCollapseKey(line, i))}
                        onToggleCollapse={onToggleSectionCollapse}
                      />
                    </div>
                  ) : (
                    <EditorLineItem
                      line={line}
                      nextTimestamp={nextTimestamps[i]}
                      i={i}
                      displayedActiveIndex={displayedActiveIndex}
                      isActive={isActive}
                      isLocked={isActiveLineLocked && i === activeLineIndex}
                      isSynced={isSynced}
                      editorMode={editorMode}
                      awaitingEndMark={awaitingEndMark}
                      focusedTimestamp={focusedTimestamp}
                      setFocusedTimestamp={setFocusedTimestamp}
                      activeLineRef={undefined}
                      handleLineClick={handleLineClick}
                      handleLineHover={handleLineHover}
                      handleLineHoverEnd={handleLineHoverEnd}
                      handleDragStart={handleDragStart}
                      projectSingers={projectSingers}
                      singerColors={singerColors}
                      handleDragOver={handleDragOver}
                      handleDragEnd={handleDragEnd}
                      handleDrop={handleDrop}
                      dragOverIndex={dragOverIndex}
                      dragIndex={dragIndex}
                      activeSingers={activeSingers[i]}
                      selectedLines={selectedLines}
                      settings={settings}
                      editingLineIndex={editingLineIndex}
                      setEditingLineIndex={setEditingLineIndex}
                      editingText={editingText}
                      setEditingText={setEditingText}
                      editingSecondary={editingSecondary}
                      setEditingSecondary={setEditingSecondary}
                      editingTranslations={editingTranslations}
                      setEditingTranslations={setEditingTranslations}
                      editingSingers={editingSingers}
                      setEditingSingers={setEditingSingers}
                      handleSaveLineText={handleSaveLineText}
                      handleInsertSection={handleInsertSection}
                      onToggleDepth={handleToggleSectionDepth}
                      handleMoveToSection={handleMoveToSection}
                      sectionLines={lines}
                      handleAssignSinger={handleAssignSinger}
                      songArtists={songArtists}
                      playerRef={playerRef}
                      shiftTime={shiftTime}
                      handleAddLine={handleAddLine}
                      handleClearLine={handleClearLine}
                      handleDeleteLine={handleDeleteLine}
                      handleToggleAdLib={handleToggleAdLib}
                      handleToggleLine={handleToggleLine}
                      handleMark={handleMark}
                      activeWordIndex={i === activeLineIndex ? activeWordIndex : -1}
                      handleClearWordTimestamp={handleClearWordTimestamp}
                      handleSetActiveWordIndex={handleSetActiveWordIndex}
                      handleSetTimestamp={handleSetTimestamp}
                      handleSetWordReading={handleSetWordReading}
                      handleCycleWordSinger={handleCycleWordSinger}
                      stampTarget={i === activeLineIndex ? stampTarget : 'main'}
                      handleStampTargetToggle={handleStampTargetToggle}
                      playbackPosition={isActive ? playbackPosition : null}
                      upcomingDepth={upcomingDepth}
                      onWordMenu={onWordMenu}
                      onLineMenu={onLineMenu}
                      isModified={modifiedLines?.has(i)}
                      onToggleLineMode={onToggleLineMode}
                      confidenceInfo={confidenceByIndex?.get(i)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <ScrollProgress containerRef={listRef} className="absolute bottom-0 inset-x-0 h-[2px]" />
      </div>

    </div>
  );
}
