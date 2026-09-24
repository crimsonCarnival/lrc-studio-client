import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ComponentProps, Dispatch, RefObject, SetStateAction, MouseEvent as ReactMouseEvent } from 'react';
import { EditorLineContextMenu } from './EditorLineContextMenu';
import { useTranslation } from 'react-i18next';
import { serializeToRubyMarkup, parseRubyMarkup, isKanji, hasKanji } from '@/shared/utils/furigana';
import { Checkbox } from '@ui/checkbox';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import LineTextEditingForm from './LineTextEditingForm';
import { useLineGestures } from '../../hooks/useLineGestures';
import LrcModeColumn from '../modes/LrcModeColumn';
import SrtModeColumn from '../modes/SrtModeColumn';
import { WordsModeTimestamp, WordsModeChips } from '../modes/WordsModeColumn';
import LineTextContent from './LineTextContent';
import LineActionToolbar from './LineActionToolbar';
import SectionPickerDropdown from './SectionPickerDropdown';
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';
import { validateLineSingers } from '@features/editor/utils/sections';
import { SINGER_GRADIENT_STOPS, singerColorIndex } from '@features/editor/utils/singer-colors';
import type { EditorLine, EditorWord } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';
import type { ConfidenceInfo } from '@/features/editor/hooks/useAutoStamp';

function getSingers(line: EditorLine): string[] {
  return line.singers || [];
}

interface CharSelection {
  start: number | null;
  end: number | null;
  range: { s: number; e: number } | null;
}

type FocusedTs = { lineIndex: number; type: string; wordIndex?: number } | null;
type PlayerRef = RefObject<{ seek?: (t: number) => void; play?: () => void } | null> | null;

interface EditorLineItemProps {
  line: EditorLine;
  nextTimestamp?: number | null;
  i: number;
  displayedActiveIndex?: number | null;
  isActive: boolean;
  isLocked: boolean;
  isSynced: boolean;
  editorMode: string;
  awaitingEndMark?: number | null;
  focusedTimestamp?: FocusedTs;
  setFocusedTimestamp: (v: FocusedTs) => void;
  activeLineRef?: RefObject<HTMLDivElement | null>;
  handleLineClick: (i: number, e: ReactMouseEvent) => void;
  handleLineHover: (i: number) => void;
  handleLineHoverEnd: () => void;
  handleDragStart: (e: React.DragEvent, i: number) => void;
  handleDragOver: (e: React.DragEvent, i: number) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, i: number) => void;
  dragOverIndex?: number | null;
  dragIndex?: number | null;
  selectedLines: Set<number>;
  settings: AppSettings;
  editingLineIndex: number | null;
  setEditingLineIndex: (v: number | null) => void;
  editingText: string;
  setEditingText: (v: string) => void;
  editingSecondary: string;
  setEditingSecondary: (v: string) => void;
  editingTranslations: unknown[];
  setEditingTranslations: (v: unknown[]) => void;
  editingSingers: string[];
  setEditingSingers: Dispatch<SetStateAction<string[]>>;
  handleSaveLineText: (i: number, text: string, secondary?: string, translations?: unknown[], singers?: string[]) => void;
  handleInsertSection?: (i: number) => void;
  onToggleDepth?: (i: number) => void;
  handleMoveToSection?: (i: number, target: unknown) => void;
  sectionLines?: EditorLine[];
  handleAssignSinger?: (name: string, lineIndices: number[], slot?: number, onlyFirst?: boolean) => void;
  songArtists?: string[];
  projectSingers?: string[];
  singerColors?: string[];
  activeSingers?: string[];
  playerRef?: PlayerRef;
  shiftTime: (i: number, delta: number) => void;
  handleAddLine?: (i: number) => void;
  handleClearLine?: (i: number) => void;
  handleDeleteLine: (i: number) => void;
  handleToggleLine: (i: number) => void;
  handleMark?: (opts?: { forceAdvance?: boolean }) => void;
  handleSetWordReading?: (i: number, wi: number, val: string) => void;
  handleCycleWordSinger?: (i: number, wi: number) => void;
  activeWordIndex: number;
  handleClearWordTimestamp?: (i: number, wi: number) => void;
  handleSetActiveWordIndex: (wi: number) => void;
  handleSetTimestamp: (lineIndex: number, which: string, val: number) => void;
  stampTarget?: string;
  handleStampTargetToggle?: () => void;
  playbackPosition?: number | null;
  upcomingDepth?: number;
  onWordMenu?: (...args: unknown[]) => void;
  onLineMenu?: (...args: unknown[]) => void;
  isModified?: boolean;
  onToggleLineMode?: (i: number, next: EditorLine) => void;
  confidenceInfo?: ConfidenceInfo;
  handleToggleAdLib?: (lineIndex: number) => void;
}

const SYNC_FLASH_MS: Record<string, number> = { short: 300, normal: 600, long: 1200 };

const EditorLineItem = React.memo(({
  line,
  nextTimestamp,
  i,
  displayedActiveIndex,
  isActive,
  isLocked,
  isSynced,
  editorMode,
  awaitingEndMark,
  focusedTimestamp,
  setFocusedTimestamp,
  activeLineRef,
  handleLineClick,
  handleLineHover,
  handleLineHoverEnd,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleDrop,
  dragOverIndex,
  dragIndex,
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
  onToggleDepth,
  handleMoveToSection,
  sectionLines,
  handleAssignSinger,
  songArtists,
  projectSingers,
  singerColors,
  playerRef,
  shiftTime,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  handleToggleLine,
  handleMark,
  handleSetWordReading,
  handleCycleWordSinger,
  activeWordIndex,
  handleClearWordTimestamp,
  handleSetActiveWordIndex,
  handleSetTimestamp,
  stampTarget = 'main',
  handleStampTargetToggle,
  playbackPosition,
  upcomingDepth,
  onWordMenu,
  onLineMenu,
  isModified,
  onToggleLineMode,
  confidenceInfo,
  activeSingers,
  handleToggleAdLib,
}: EditorLineItemProps) => {

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const { t } = useTranslation();
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null); // null | 'start' | 'end'
  const [editingReadingWordIndex, setEditingReadingWordIndex] = useState<number | null>(null);
  const [selection, setSelection] = useState<CharSelection>({ start: null, end: null, range: null });
  const [nudgeIndicator, setNudgeIndicator] = useState<string | null>(null);
  const [justSynced, setJustSynced] = useState(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const justSyncedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingLineIndex === i) {
      const timer = setTimeout(() => editInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingLineIndex, i]);

  const onCharClick = useCallback((ci: number) => {
    setSelection(prev => {
      if (prev.range) return prev;

      const { plainText } = parseRubyMarkup(line.text || '♪');
      const textChars = [...plainText];
      const ch = textChars[ci];
      if (!ch) return { start: null, end: null, range: null };
      const isCharKanji = isKanji(ch);

      if (prev.start === null) {
        if (!isCharKanji) return { start: null, end: null, range: null };

        let s = ci, e = ci;
        while (s > 0 && isKanji(textChars[s - 1])) s--;
        while (e < textChars.length - 1 && isKanji(textChars[e + 1])) e++;
        return { start: null, end: null, range: { s, e } };
      }

      const s = prev.start;
      const eRange = prev.end !== null ? prev.end : s;
      const minS = Math.min(s, eRange);
      const maxE = Math.max(s, eRange);

      if (ci >= minS && ci <= maxE) {
        return { start: null, end: null, range: { s: minS, e: maxE } };
      }

      if (isCharKanji) {
        let ns = ci, ne = ci;
        while (ns > 0 && isKanji(textChars[ns - 1])) ns--;
        while (ne < textChars.length - 1 && isKanji(textChars[ne + 1])) ne++;
        return { start: ns, end: (ns === ne ? null : ne), range: null };
      }
      return { start: null, end: null, range: null };
    });
  }, [line.text]);

  useEffect(() => {
    if (!isActive) {
      setSelection({ start: null, end: null, range: null });
    } else {
      activeLineRef?.current?.focus();
    }
  }, [isActive, activeLineRef]);

  const handleReadingCommit = useCallback((val: string, wi: number, direction: number) => {
    handleSetWordReading?.(i, wi, val);
    if (direction !== 0) {
      const words = line.words || [];
      let nextWi = wi + direction;
      while (nextWi >= 0 && nextWi < words.length && !hasKanji(words[nextWi].word)) {
        nextWi += direction;
      }
      if (nextWi >= 0 && nextWi < words.length) {
        setEditingReadingWordIndex(nextWi);
        return;
      }
    }
    setEditingReadingWordIndex(null);
  }, [i, line.words, handleSetWordReading, setEditingReadingWordIndex]);

  const wordClickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showNudge = useCallback((delta: number) => {
    const sign = delta > 0 ? '+' : '';
    setNudgeIndicator(`${sign}${delta.toFixed(2)}s`);
    clearTimeout(nudgeTimerRef.current);
    const duration = SYNC_FLASH_MS[settings.editor?.syncFlashDuration as string] || 600;
    nudgeTimerRef.current = setTimeout(() => setNudgeIndicator(null), duration);
  }, [settings.editor?.syncFlashDuration]);

  const { handleTouchStart, handleTouchEnd, handleTouchMove } = useLineGestures({
    lineIndex: i,
    isSynced,
    settings,
    handleToggleLine,
    shiftTime,
    showNudge,
  });

  const handleWordClick = useCallback((e: ReactMouseEvent, w: EditorWord, wi: number, isSecondary?: boolean) => {
    e.stopPropagation();
    if (!isActive && handleLineClick) {
      handleLineClick(i, e);
    }
    if (w.time != null && playerRef?.current?.seek) {
      playerRef.current.seek(w.time);
      if (settings.playback?.seekPlays && playerRef.current.play) playerRef.current.play();
    }
    handleSetActiveWordIndex(wi);
    if (setFocusedTimestamp) {
      setFocusedTimestamp({
        lineIndex: i,
        type: isSecondary ? 'secondaryWord' : 'word',
        wordIndex: wi,
      });
    }
  }, [isActive, handleLineClick, playerRef, settings.playback?.seekPlays, handleSetActiveWordIndex, setFocusedTimestamp, i]);

  const handleTimestampWheel = useCallback((e: { preventDefault: () => void; deltaY: number }, index: number) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    shiftTime(index, delta);
    showNudge(delta);
  }, [shiftTime, showNudge]);

  useEffect(() => () => {
    clearTimeout(nudgeTimerRef.current);
    clearTimeout(wordClickTimerRef.current);
  }, []);

  const [prevIsSynced, setPrevIsSynced] = useState(isSynced);
  if (isSynced !== prevIsSynced) {
    setPrevIsSynced(isSynced);
    if (isSynced && !prevIsSynced) setJustSynced(true);
  }

  useEffect(() => {
    if (justSynced) {
      clearTimeout(justSyncedTimerRef.current);
      const duration = SYNC_FLASH_MS[settings.editor?.syncFlashDuration as string] || 600;
      justSyncedTimerRef.current = setTimeout(() => setJustSynced(false), duration);
    }
    return () => clearTimeout(justSyncedTimerRef.current);
  }, [justSynced, settings.editor?.syncFlashDuration]);

  const segmentEnd = line.endTime ?? nextTimestamp;
  const segmentProgress = isActive && isSynced && segmentEnd != null && playbackPosition != null && line.timestamp != null
    ? Math.min(1, Math.max(0, (playbackPosition - line.timestamp) / (segmentEnd - line.timestamp)))
    : null;

  const distanceFromActive = displayedActiveIndex != null ? Math.abs(i - displayedActiveIndex) : 0;
  const staggerDelay = `${Math.min(distanceFromActive * 20, 150)}ms`;

  const invalidSingers = sectionLines ? validateLineSingers(sectionLines, i) : [];

  const confidenceThreshold = settings.autoStamp?.confidenceThreshold ?? 0.8;
  const confidenceTint = confidenceInfo
    ? confidenceInfo.status === 'matched' && confidenceInfo.confidence >= confidenceThreshold
      ? 'success'
      : 'warning'
    : null;

  const lyricNumber = sectionLines
    ? sectionLines.slice(0, i).filter((l) => l.type !== 'section').length + 1
    : i + 1;

  if (line.type === 'section') {
    const isEditing = editingLineIndex === i;
    const isRoot = line.depth === 0;

    return (
      <EditorLineContextMenu
        line={line}
        lineIndex={i}
        isSection
        selectedLines={selectedLines}
        sectionLines={sectionLines}
        handleAddLine={handleAddLine as (i: number, line?: EditorLine | null, opts?: { before?: boolean }) => void}
        handleDeleteLine={handleDeleteLine}
        handleMoveToSection={handleMoveToSection as unknown as (indices: number[], target: number) => void}
        onToggleDepth={onToggleDepth}
      >
        <div
          ref={isActive ? activeLineRef : undefined}
          onClick={(e) => handleLineClick(i, e)}
          style={{ animationDelay: staggerDelay }}
          className={`relative flex items-end px-4 cursor-pointer group animate-preview-line-in bg-background ${isRoot ? 'pt-8' : 'pt-4'}`}
        >
          {selectedLines.has(i) && <div className="absolute inset-0 bg-primary/10 pointer-events-none" />}
          {(() => {
            const lineSingers = getSingers(line);
            const firstSingerColorIdx = lineSingers.length > 0 && projectSingers ? singerColorIndex(lineSingers[0], projectSingers) : -1;
            const colorVar = firstSingerColorIdx >= 0 ? SINGER_GRADIENT_STOPS[firstSingerColorIdx] : 'var(--color-zinc-500)';

            const label = formatSectionLabel(line.label, t);
            const singersStr = lineSingers.length > 0 ? lineSingers.join(' + ') : t('editor.tagging.noSinger', 'No singer');

            return isEditing ? (
              <div className="flex items-center gap-2 relative z-20 pl-2 py-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-zinc-900 shadow-lg">
                  <SectionPickerDropdown
                    value={editingText}
                    onChange={(v: string) => setEditingText(v)}
                  />
                  <div className="w-px h-4 bg-zinc-700 mx-1" />
                  <div className="flex items-center gap-1">
                    {editingSingers.map((s, si) => (
                      <span key={si} className="text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full pl-2 pr-1 py-0.5 flex items-center gap-1">
                        {s}
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingSingers(prev => prev.filter((_, idx) => idx !== si)); }}
                          className="hover:text-destructive opacity-70 hover:opacity-100"
                        ><Icon name="close" size={10} /></button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={t('editor.tagging.addSinger', 'Add singer...')}
                      list="inline-singers-list"
                      className="text-[11px] bg-zinc-800/50 border border-zinc-700/50 rounded-full px-2 py-0.5 w-24 outline-none focus:border-primary/50 text-zinc-200 placeholder:text-zinc-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          const val = e.currentTarget.value.trim();
                          if (val && !editingSingers.includes(val)) {
                            setEditingSingers(prev => [...prev, val]);
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {songArtists && songArtists.length > 0 && (
                      <datalist id="inline-singers-list">
                        {songArtists.map(a => <option key={a} value={a} />)}
                      </datalist>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveLineText(i, editingText, undefined, undefined, editingSingers);
                      setEditingLineIndex(null);
                    }}
                    className="ml-2 text-primary hover:text-primary/80 transition-colors flex items-center justify-center p-1 rounded-full hover:bg-white/10"
                  >
                    <Icon name="check" size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <span
                className={`pl-2 py-1 flex items-center gap-2 relative z-10 hover:opacity-80 transition-opacity`}
                style={{ color: colorVar, borderLeft: `3px solid ${colorVar}` }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingLineIndex(i);
                  setEditingText(line.label || '');
                  setEditingSingers(getSingers(line));
                }}
                title={t('editor.doubleClickToEdit', 'Double click to edit')}
              >
                <span className={`text-[10px] font-semibold tracking-widest uppercase opacity-80 select-none`}>
                  {t('editor.tagging.sectionSingerFormat', '{{section}} · {{singer}}', { section: label, singer: singersStr })}
                </span>
              </span>
            );
          })()}
          <div className={`flex-1 h-px ml-2 ${isRoot ? 'bg-primary/20' : 'bg-zinc-800'}`} />

          {selectedLines.size === 0 && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bottom-0 mb-1 flex items-center gap-1 pl-6 pr-2 bg-gradient-to-l from-zinc-900 via-zinc-900 to-transparent">
              <Tip content={isRoot ? t('editor.sections.demote') : t('editor.sections.promote')}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleDepth?.(i); }}
                  className="text-zinc-500 hover:text-primary text-xs px-1"
                >{isRoot ? '⇲' : '⇱'}</button>
              </Tip>
              <Tip content={t('editor.deleteSection')}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteLine(i); }}
                  className="text-zinc-500 hover:text-destructive px-1 flex items-center"
                  aria-label={t('editor.deleteSection')}
                ><Icon name="delete" size={14} /></button>
              </Tip>
            </div>
          )}
        </div>
      </EditorLineContextMenu>
    );
  }

  return (
    <EditorLineContextMenu
      line={line}
      lineIndex={i}
      isSection={false}
      selectedLines={selectedLines}
      sectionLines={sectionLines}
      handleAddLine={handleAddLine as (i: number, line?: EditorLine | null, opts?: { before?: boolean }) => void}
      handleClearLine={handleClearLine}
      handleDeleteLine={handleDeleteLine}
      handleMoveToSection={handleMoveToSection as unknown as (indices: number[], target: number) => void}
      handleInsertSection={handleInsertSection}
      handleAssignSinger={handleAssignSinger}
      songArtists={songArtists}
      handleToggleAdLib={handleToggleAdLib}
    >
      <div
        ref={isActive ? activeLineRef : null}
        role="button"
        aria-label={line.text || `Line ${lyricNumber}`}
        onClick={(e) => {
          if (!selection.range) {
            setSelection({ start: null, end: null, range: null });
          }
          handleLineClick(i, e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && (selection.start !== null || selection.range !== null)) {
            e.stopPropagation();
            setSelection({ start: null, end: null, range: null });
          }
        }}
        tabIndex={isActive ? 0 : -1}
        onMouseEnter={() => handleLineHover(i)}
        onMouseLeave={handleLineHoverEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        draggable={editingLineIndex !== i}
        onDragStart={(e) => {
          // Only allow dragging if the target is the handle or the container itself (not text/inputs)
          const target = e.target as HTMLElement;
          if (target.closest('input, button, rt, [data-no-drag]')) {
            e.preventDefault();
            return;
          }
          handleDragStart(e, i);
        }}
        onDragOver={(e) => handleDragOver(e, i)}
        onDragEnd={handleDragEnd}
        onDrop={(e) => handleDrop(e, i)}
        style={{ animationDelay: staggerDelay }}
        className={`outline-none flex ${editorMode === 'words' ? 'items-start' : 'items-center'} gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-300 ease-out cursor-pointer group relative overflow-visible animate-preview-line-in ${selectedLines.has(i)
          ? `bg-primary/15 border border-${isModified ? 'warning' : 'primary'}/40 ring-1 ring-${isModified ? 'warning' : 'primary'}/20`
          : isActive
            ? isLocked
              ? `bg-primary/15 border border-${isModified ? 'warning' : 'primary'}/30 shadow-glow`
              : `bg-primary/5 border border-${isModified ? 'warning' : 'primary'}/20 border-dashed`
            : dragOverIndex === i
              ? 'bg-accent-blue/10 border border-accent-blue/30'
              : (upcomingDepth ?? 0) > 0
                ? `bg-primary/${upcomingDepth === 1 ? '5' : upcomingDepth === 2 ? '3' : '2'} border border-primary/${upcomingDepth === 1 ? '15' : '10'} border-dashed`
                : `bg-zinc-900/50 hover:bg-zinc-800/60 border border-zinc-800/50 hover:border-${isModified ? 'warning/30' : 'zinc-700/50'} shadow-sm`
          } ${dragIndex === i ? 'opacity-40' : ''} ${justSynced ? 'ring-2 ring-primary/60 animate-just-synced' : ''}`}
      >

        {/* Lock/unlock indicator */}
        {isActive && (
          <div className={`absolute left-1 top-2 bottom-2 w-1 z-0 rounded-full animate-bar-grow ${isLocked
            ? `${isModified ? 'bg-warning shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-primary shadow-[0_0_12px_rgba(29,185,84,0.6)]'} opacity-90`
            : `${isModified ? 'bg-warning/60' : 'bg-primary/40'} opacity-60`
            }`} />
        )}
        {/* Auto Stamp confidence indicator (only when the line isn't already showing the active/lock bar) */}
        {!isActive && confidenceTint && (
          <div className={`absolute left-1 top-2 bottom-2 w-1 z-0 rounded-full opacity-70 ${confidenceTint === 'success' ? 'bg-success' : 'bg-warning'}`} />
        )}
        {/* Drag Handle & Line number */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          <Tip content={t('editor.dragToReorder')}>
            <div
              className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 -ml-1 select-none"
            >
              <Icon name="drag_indicator" size={12} />
            </div>
          </Tip>
          {(settings.editor?.showLineNumbers ?? true) && (
            <div
              className={`w-5 shrink-0 flex ${editorMode === 'words' ? 'items-start pt-1' : 'items-center'} justify-center select-none`}
            >
              {selectedLines.size > 0 ? (
                <Checkbox
                  checked={selectedLines.has(i)}
                  onCheckedChange={() => handleToggleLine(i)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="size-3.5 border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              ) : (
                <span className="text-[10px] font-mono tabular-nums text-zinc-500 select-none text-right">
                  {lyricNumber}
                </span>
              )}
            </div>
          )}
        </div>

        <span
          className={`text-xs font-mono tabular-nums shrink-0 transition-colors relative z-10 ${editorMode === 'words' ? 'self-start pt-0.5' : ''} ${isSynced
            ? 'text-primary'
            : isActive
              ? 'text-zinc-400 animate-pulse-glow'
              : 'text-zinc-600'
            }`}
          style={{ width: editorMode === 'words' ? '240px' : '92px', flexShrink: 0 }}
        >
          {editorMode === 'words' ? (
            <WordsModeTimestamp
              line={line as ComponentProps<typeof WordsModeTimestamp>['line']}
              lineIndex={i}
              isSynced={isSynced}
              isActive={isActive}
              isMobile={isMobile}
              settings={settings}
              editingTimestamp={editingTimestamp}
              setEditingTimestamp={setEditingTimestamp}
              focusedTimestamp={focusedTimestamp ?? null}
              setFocusedTimestamp={setFocusedTimestamp}
              stampTarget={stampTarget}
              handleStampTargetToggle={handleStampTargetToggle}
              activeWordIndex={activeWordIndex}
              handleSetTimestamp={handleSetTimestamp}
              handleTimestampWheel={handleTimestampWheel}
              nudgeIndicator={nudgeIndicator}
              handleWordClick={handleWordClick as ComponentProps<typeof WordsModeTimestamp>['handleWordClick']}
              handleClearWordTimestamp={handleClearWordTimestamp as ComponentProps<typeof WordsModeTimestamp>['handleClearWordTimestamp']}
              onWordMenu={onWordMenu}
            />
          ) : editorMode === 'srt' ? (
            <SrtModeColumn
              line={line}
              lineIndex={i}
              isSynced={isSynced}
              isActive={isActive}
              settings={settings}
              awaitingEndMark={awaitingEndMark}
              editingTimestamp={editingTimestamp}
              setEditingTimestamp={setEditingTimestamp}
              focusedTimestamp={focusedTimestamp ?? null}
              setFocusedTimestamp={setFocusedTimestamp}
              handleSetTimestamp={handleSetTimestamp}
              handleTimestampWheel={handleTimestampWheel}
              nudgeIndicator={nudgeIndicator}
            />
          ) : (
            <LrcModeColumn
              line={line}
              lineIndex={i}
              isSynced={isSynced}
              isActive={isActive}
              settings={settings}
              editingTimestamp={editingTimestamp}
              setEditingTimestamp={setEditingTimestamp}
              focusedTimestamp={focusedTimestamp ?? null}
              setFocusedTimestamp={setFocusedTimestamp}
              handleSetTimestamp={handleSetTimestamp}
              handleTimestampWheel={handleTimestampWheel}
              nudgeIndicator={nudgeIndicator}
            />
          )}
          {isModified && (
            <div
              className={`absolute -right-2 size-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)] animate-in fade-in zoom-in duration-300 z-10 top-1/2 -translate-y-1/2`}
            />
          )}
        </span>

        {/* Lyrics text container */}
        <div
          className={`flex-1 min-w-0 flex ${editorMode === 'words' ? 'flex-col' : 'items-start'} gap-2 overflow-x-hidden pb-0.5 mt-0.5 select-text`}
          data-no-drag
          onDoubleClick={() => {
            setEditingLineIndex(i);
            setEditingText(serializeToRubyMarkup(line.words) || line.text || '');
            setEditingSecondary(line.secondary || '');
            setEditingTranslations(line.translations ? [...line.translations] : []);
            const singers = getSingers(line);
            setEditingSingers([...singers, '', '', '', ''].slice(0, 4));
          }}>
          {editorMode !== 'words' && (
            <LineTextContent
              line={line as ComponentProps<typeof LineTextContent>['line']}
              lineIndex={i}
              isActive={isActive}
              isSynced={isSynced}
              editorMode={editorMode}
              settings={settings}
              activeWordIndex={activeWordIndex}
              editingReadingWordIndex={editingReadingWordIndex}
              setEditingReadingWordIndex={setEditingReadingWordIndex}
              handleReadingCommit={handleReadingCommit}
              selection={selection}
              setSelection={setSelection}
              onCharClick={onCharClick}
              handleWordClick={handleWordClick as ComponentProps<typeof LineTextContent>['handleWordClick']}
              wordClickTimerRef={wordClickTimerRef as ComponentProps<typeof LineTextContent>['wordClickTimerRef']}
              handleSaveLineText={handleSaveLineText}
              handleCycleWordSinger={handleCycleWordSinger}
              songSingers={projectSingers}
              singerColors={singerColors}
              activeSingers={activeSingers}
            />
          )}

          {editorMode === 'words' && (
            <WordsModeChips
              line={line as ComponentProps<typeof WordsModeChips>['line']}
              lineIndex={i}
              isSynced={isSynced}
              isActive={isActive}
              isMobile={isMobile}
              settings={settings}
              editingTimestamp={editingTimestamp}
              setEditingTimestamp={setEditingTimestamp}
              focusedTimestamp={focusedTimestamp ?? null}
              setFocusedTimestamp={setFocusedTimestamp}
              stampTarget={stampTarget}
              handleStampTargetToggle={handleStampTargetToggle}
              activeWordIndex={activeWordIndex}
              handleSetTimestamp={handleSetTimestamp}
              handleTimestampWheel={handleTimestampWheel}
              nudgeIndicator={nudgeIndicator}
              handleWordClick={handleWordClick as ComponentProps<typeof WordsModeChips>['handleWordClick']}
              handleClearWordTimestamp={handleClearWordTimestamp as ComponentProps<typeof WordsModeChips>['handleClearWordTimestamp']}
              onWordMenu={onWordMenu}
              songSingers={projectSingers}
              singerColors={singerColors}
              activeSingers={activeSingers}
            />
          )}

          <ResponsiveModal
            open={editingLineIndex === i}
            onOpenChange={(open) => {
              if (!open) {
                handleSaveLineText(i, editingText, editingSecondary, editingTranslations, editingSingers);
                setEditingLineIndex(null);
              }
            }}
            title={t('editor.editLine', 'Edit Line')}
          >
            <div className="pt-2">
              <LineTextEditingForm
                ref={editInputRef}
                lineIndex={i}
                editingText={editingText}
                setEditingText={setEditingText}
                editingSecondary={editingSecondary}
                setEditingSecondary={setEditingSecondary}
                editingTranslations={editingTranslations as ComponentProps<typeof LineTextEditingForm>['editingTranslations']}
                setEditingTranslations={setEditingTranslations as ComponentProps<typeof LineTextEditingForm>['setEditingTranslations']}
                editingSingers={editingSingers}
                setEditingSingers={setEditingSingers}
                handleSaveLineText={handleSaveLineText}
                setEditingLineIndex={setEditingLineIndex}
                songArtists={songArtists}
                projectSingers={projectSingers}
              />
            </div>
          </ResponsiveModal>
        </div>
        {invalidSingers.length > 0 && (
          <Tip content={t('editor.invalidSingersWarning', { names: invalidSingers.join(', ') })}>
            <span className="text-warning text-[10px] shrink-0 select-none">⚠</span>
          </Tip>
        )}
        {(line.singers?.length ?? 0) >= 2 && onToggleLineMode && (
          <Tip content={t('editor.toggleSingMode')}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const mode = line.mode === 'duet' ? 'split' : 'duet';
                const next: EditorLine = {
                  ...line,
                  mode,
                  words: mode === 'duet' ? line.words?.map(({ singerIndex: _si, ...w }) => w) : line.words,
                };
                onToggleLineMode(i, next);
              }}
              className="text-zinc-600 hover:text-primary text-xs px-1 shrink-0 select-none"
              aria-label={t('editor.toggleSingMode')}
            >
              {line.mode === 'duet' ? t('editor.duetMode') : t('editor.splitMode')}
            </button>
          </Tip>
        )}
        <LineActionToolbar
          line={line as ComponentProps<typeof LineActionToolbar>['line']}
          lineIndex={i}
          isActive={isActive}
          isSynced={isSynced}
          editorMode={editorMode}
          settings={settings}
          editingLineIndex={editingLineIndex}
          setEditingLineIndex={setEditingLineIndex}
          setEditingText={setEditingText}
          setEditingSecondary={setEditingSecondary}
          setEditingTranslations={setEditingTranslations as ComponentProps<typeof LineActionToolbar>['setEditingTranslations']}
          setEditingSingers={setEditingSingers}
          serializeToRubyMarkup={serializeToRubyMarkup}
          handleInsertSection={handleInsertSection}
          handleMoveToSection={handleMoveToSection as ComponentProps<typeof LineActionToolbar>['handleMoveToSection']}
          sectionLines={sectionLines as ComponentProps<typeof LineActionToolbar>['sectionLines']}
          handleAssignSinger={handleAssignSinger}
          songArtists={songArtists}
          handleMark={handleMark as ComponentProps<typeof LineActionToolbar>['handleMark']}
          playerRef={playerRef as ComponentProps<typeof LineActionToolbar>['playerRef']}
          shiftTime={shiftTime}
          handleAddLine={handleAddLine as ComponentProps<typeof LineActionToolbar>['handleAddLine']}
          handleClearLine={handleClearLine as ComponentProps<typeof LineActionToolbar>['handleClearLine']}
          handleDeleteLine={handleDeleteLine}
          selectedLines={selectedLines}
          isMobile={isMobile}
          onLineMenu={onLineMenu}
          stampTarget={stampTarget}
          activeWordIndex={activeWordIndex}
          focusedTimestamp={focusedTimestamp}
        />

        {segmentProgress != null && (
          <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-xl sm:rounded-b-2xl overflow-hidden bg-zinc-800/60 z-10 pointer-events-none animate-in fade-in duration-300">
            <div
              className="h-full bg-primary rounded-r-full shadow-[0_0_8px_var(--color-primary)]"
              style={{ width: `${segmentProgress * 100}%` }}
            />
          </div>
        )}
      </div>
    </EditorLineContextMenu>
  );
});

export default EditorLineItem;
