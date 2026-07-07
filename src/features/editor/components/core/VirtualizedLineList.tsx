import { useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { ComponentProps, RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { useTranslation } from 'react-i18next';
import EditorLineItem from '../line/EditorLineItem';
import SelectionActionBar from './SelectionActionBar';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleApplyOffset?: (...args: any[]) => void;
  handleBulkClearTimestamps?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleBulkShift?: (...args: any[]) => void;
  handleBulkDelete?: () => void;
  clearSelection?: () => void;
  handleToggleLine: LineItemProps['handleToggleLine'];
  updateSetting?: (path: string, value: unknown) => void;
  activeWordIndex: number;
  handleClearWordTimestamp?: LineItemProps['handleClearWordTimestamp'];
  handleSetActiveWordIndex: LineItemProps['handleSetActiveWordIndex'];
  handleSetTimestamp: LineItemProps['handleSetTimestamp'];
  handleSetWordReading?: LineItemProps['handleSetWordReading'];
  handleCycleWordSinger?: LineItemProps['handleCycleWordSinger'];
  handleSetWordSinger?: LineItemProps['handleSetWordSinger'];
  stampTarget?: string;
  handleStampTargetToggle?: LineItemProps['handleStampTargetToggle'];
  playbackPosition?: number | null;
  onWordMenu?: LineItemProps['onWordMenu'];
  onLineMenu?: LineItemProps['onLineMenu'];
  onBulkMenu?: () => void;
  modifiedLines?: Set<number>;
  onToggleLineMode?: LineItemProps['onToggleLineMode'];
  confidenceByIndex?: Map<number, ConfidenceInfo>;
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
  handleApplyOffset,
  handleBulkClearTimestamps,
  handleBulkShift,
  handleBulkDelete,
  clearSelection,
  handleToggleLine,
  activeWordIndex,
  handleClearWordTimestamp,
  handleSetActiveWordIndex,
  handleSetTimestamp,
  handleSetWordReading,
  handleCycleWordSinger,
  handleSetWordSinger,
  stampTarget,
  handleStampTargetToggle,
  playbackPosition,
  onWordMenu,
  onLineMenu,
  onBulkMenu,
  modifiedLines,
  onToggleLineMode,
  confidenceByIndex,
}: VirtualizedLineListProps) {
  const { t } = useTranslation();
  const scrollAlignment = settings.editor?.scroll?.alignment || 'center';
  const scrollMode = settings.editor?.scroll?.mode || 'smooth';

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => listRef.current,
    // Words mode items are taller (word chips wrap); a larger estimate reduces
    // first-render overlap while ResizeObserver corrects the true height.
    estimateSize: () => editorMode === 'words' ? 96 : ESTIMATED_LINE_HEIGHT,
    gap: LINE_GAP,
    overscan: 8,
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

  // Force-measure editing item synchronously before paint so subsequent items
  // don't overlap during the one frame before ResizeObserver fires.
  const prevEditingLineIndexRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const prev = prevEditingLineIndexRef.current;
    prevEditingLineIndexRef.current = editingLineIndex;
    const toMeasure = new Set([editingLineIndex, prev].filter((x): x is number => x !== null));
    toMeasure.forEach(idx => {
      const el = listRef.current?.querySelector(`[data-index="${idx}"]`);
      if (el) virtualizer.measureElement(el as HTMLElement);
    });
  }, [editingLineIndex, virtualizer, listRef]);

  // The active line grows when selected (highlight box padding + text wrapping), but the
  // virtualizer only self-measures via ResizeObserver — which doesn't fire on the one frame
  // the active styling is applied. Force-measure the current (and previously) active row
  // synchronously so the following rows don't overlap it. Mirrors the editing-line effect above.
  const prevActiveLineIndexRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const prev = prevActiveLineIndexRef.current;
    prevActiveLineIndexRef.current = displayedActiveIndex;
    const toMeasure = new Set([displayedActiveIndex, prev].filter((x): x is number => x != null && x >= 0));
    toMeasure.forEach(idx => {
      const el = listRef.current?.querySelector(`[data-index="${idx}"]`);
      if (el) virtualizer.measureElement(el as HTMLElement);
    });
  }, [displayedActiveIndex, virtualizer, listRef]);

  // Auto-scroll to active line via virtualizer
  const prevActiveRef = useCallback((idx: number) => {
    if (scrollAlignment === 'none') return;
    virtualizer.scrollToIndex(idx, {
      align: scrollAlignment === 'start' ? 'start' : scrollAlignment === 'end' ? 'end' : 'center',
      behavior: scrollMode,
    });
  }, [virtualizer, scrollAlignment, scrollMode]);

  // Handle visualViewport resize (keyboard opening)
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      if (editingLineIndex !== null) {
        // Scroll the editing line into view when the keyboard opens/resizes
        setTimeout(() => {
          if (editingLineIndex !== null) {
            virtualizer.scrollToIndex(editingLineIndex, { align: 'center', behavior: 'smooth' });
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
  }, [editingLineIndex, virtualizer]);

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

  // Pre-compute nextTimestamp for each line
  const nextTimestamps = useMemo(() => {
    const result: (number | null)[] = new Array(lines.length).fill(null);
    let lastTs: number | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      result[i] = lastTs;
      if (lines[i].timestamp != null) lastTs = lines[i].timestamp ?? null;
    }
    return result;
  }, [lines]);

  return (
    <div className="flex flex-col flex-1 gap-3 animate-fade-in min-h-0">
      <div className="relative flex-1 min-h-0">
      <div
        ref={listRef}
        onMouseLeave={handleLineHoverEnd}
        className="h-full overflow-y-auto pr-1 mask-edges"
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const i = virtualRow.index;
            const line = lines[i];
            const isActive = i === displayedActiveIndex;
            const isSynced = line.timestamp != null;
            // Upcoming depth: 1-3 for the next unsynced lines after active
            const upcomingDepth = !isSynced && i > displayedActiveIndex && i <= displayedActiveIndex + 3
              ? i - displayedActiveIndex
              : 0;

            return (
              <div
                key={line.id || i}
                data-index={i}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
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
                  handleDragOver={handleDragOver}
                  handleDragEnd={handleDragEnd}
                  handleDrop={handleDrop}
                  dragOverIndex={dragOverIndex}
                  dragIndex={dragIndex}
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
                  handleToggleLine={handleToggleLine}
                  handleMark={handleMark}
                  activeWordIndex={i === activeLineIndex ? activeWordIndex : -1}
                  handleClearWordTimestamp={handleClearWordTimestamp}
                  handleSetActiveWordIndex={handleSetActiveWordIndex}
                  handleSetTimestamp={handleSetTimestamp}
                  handleSetWordReading={handleSetWordReading}
                  handleCycleWordSinger={handleCycleWordSinger}
                  handleSetWordSinger={handleSetWordSinger}
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
              </div>
            );
          })}
        </div>
      </div>
        <ScrollProgress containerRef={listRef} className="absolute bottom-0 inset-x-0 h-[2px]" />
      </div>

        <div className="hidden xl:block relative z-20">
          <SelectionActionBar
            selectedLines={selectedLines}
            lines={lines}
            settings={settings}
            handleBulkClearTimestamps={handleBulkClearTimestamps as ComponentProps<typeof SelectionActionBar>['handleBulkClearTimestamps']}
            handleBulkShift={handleBulkShift as ComponentProps<typeof SelectionActionBar>['handleBulkShift']}
            handleBulkDelete={handleBulkDelete as ComponentProps<typeof SelectionActionBar>['handleBulkDelete']}
            clearSelection={clearSelection as ComponentProps<typeof SelectionActionBar>['clearSelection']}
            handleApplyOffset={handleApplyOffset as ComponentProps<typeof SelectionActionBar>['handleApplyOffset']}
            handleAssignSinger={handleAssignSinger}
            handleMoveToSection={handleMoveToSection as ComponentProps<typeof SelectionActionBar>['handleMoveToSection']}
            songArtists={songArtists}
          />
        </div>

        {typeof window !== 'undefined' && window.innerWidth < 1024 && selectedLines.size > 0 && onBulkMenu && (
          <div className="flex flex-row gap-2 pt-2 border-t border-zinc-800/50 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkMenu}
              className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 text-xs h-8 rounded-full px-3"
            >
              <Icon name="more_horiz" size={14} className="mr-1.5" />
              {t('editor.selection.actions') || 'Selection Actions'}
              <span className="ml-1.5 bg-primary/20 px-1.5 rounded-full text-[10px] font-bold">
                {selectedLines.size}
              </span>
            </Button>
          </div>
        )}
    </div>
  );
}
