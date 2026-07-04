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
import WordsModeColumn from '../modes/WordsModeColumn';
import LineTextContent from './LineTextContent';
import LineActionToolbar from './LineActionToolbar';
import SectionPickerDropdown from './SectionPickerDropdown';
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';
import { validateLineSingers } from '@features/editor/utils/sections';
import type { EditorLine, EditorWord } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';

function getSingers(line: EditorLine): string[] {
  return line.singers || [];
}

interface CharSelection {
  start: number | null;
  end: number | null;
  range: { s: number; e: number } | null;
}

type FocusedTs = { lineIndex: number; type: string } | null;
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
  playerRef?: PlayerRef;
  shiftTime: (i: number, delta: number) => void;
  handleAddLine?: (i: number) => void;
  handleClearLine?: (i: number) => void;
  handleDeleteLine: (i: number) => void;
  handleToggleLine: (i: number) => void;
  handleMark?: (opts?: { forceAdvance?: boolean }) => void;
  handleSetWordReading?: (i: number, wi: number, val: string) => void;
  handleCycleWordSinger?: (i: number, wi: number) => void;
  handleSetWordSinger?: (i: number, wi: number, slot: number) => void;
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
  playerRef,
  shiftTime,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  handleToggleLine,
  handleMark,
  handleSetWordReading,
  handleCycleWordSinger,
  handleSetWordSinger,
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

      // Initial click: open reading input immediately for contiguous kanji
      if (prev.start === null) {
        if (!isCharKanji) return { start: null, end: null, range: null };

        let s = ci, e = ci;
        while (s > 0 && isKanji(textChars[s - 1])) s--;
        while (e < textChars.length - 1 && isKanji(textChars[e + 1])) e++;
        return { start: null, end: null, range: { s, e } };
      }

      // Subsequent click
      const s = prev.start;
      const eRange = prev.end !== null ? prev.end : s;
      const minS = Math.min(s, eRange);
      const maxE = Math.max(s, eRange);

      if (ci >= minS && ci <= maxE) {
        // Clicked inside -> Confirm
        return { start: null, end: null, range: { s: minS, e: maxE } };
      }

      // Clicked outside -> Replace if Kanji, else Clear
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

  // Used to distinguish single-click from double-click on word chips/rubies in words mode
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

  const handleWordClick = useCallback((e: ReactMouseEvent, w: EditorWord, wi: number) => {
    e.stopPropagation();
    if (w.time != null && playerRef?.current?.seek) {
      playerRef.current.seek(w.time);
      if (settings.playback?.seekPlays && playerRef.current.play) playerRef.current.play();
    }
    if (activeWordIndex !== -1) handleSetActiveWordIndex(wi);
  }, [playerRef, settings.playback?.seekPlays, activeWordIndex, handleSetActiveWordIndex]);

  const handleTimestampWheel = useCallback((e: { preventDefault: () => void; deltaY: number }, index: number) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    shiftTime(index, delta);
    showNudge(delta);
  }, [shiftTime, showNudge]);

  // Cleanup timers
  useEffect(() => () => {
    clearTimeout(nudgeTimerRef.current);
    clearTimeout(wordClickTimerRef.current);
  }, []);

  // Just-synced flash: trigger when line transitions from unsynced to synced
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

  // Segment progress for active synced line
  const segmentEnd = line.endTime ?? nextTimestamp;
  const segmentProgress = isActive && isSynced && segmentEnd != null && playbackPosition != null && line.timestamp != null
    ? Math.min(1, Math.max(0, (playbackPosition - line.timestamp) / (segmentEnd - line.timestamp)))
    : null;

  const distanceFromActive = displayedActiveIndex != null ? Math.abs(i - displayedActiveIndex) : 0;
  const staggerDelay = `${Math.min(distanceFromActive * 20, 150)}ms`;

  const invalidSingers = sectionLines ? validateLineSingers(sectionLines, i) : [];

  // Display number counting only lyric lines, so section markers don't consume
  // a number and leave gaps in the sequence.
  const lyricNumber = sectionLines
    ? sectionLines.slice(0, i).filter((l) => l.type !== 'section').length + 1
    : i + 1;

  // Section marker — full-width divider with editable label
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
        ref={isActive ? activeLineRef : null}
        onClick={(e) => handleLineClick(i, e)}
        onDoubleClick={() => {
          setEditingLineIndex(i);
          setEditingText(line.label || '');
          const singers = getSingers(line);
          setEditingSingers([...singers, '', '', '', ''].slice(0, 4));
        }}
        style={{ animationDelay: staggerDelay }}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg cursor-pointer group animate-preview-line-in ${selectedLines.has(i) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-zinc-800/30 border border-transparent'} ${isRoot ? 'mt-4 mb-2' : ''}`}
      >
        <div className={`flex-1 h-px ${isRoot ? 'bg-primary/40' : 'bg-zinc-800/50'}`} />
        {isEditing ? (
          <div className="flex items-start gap-1.5" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { handleSaveLineText(i, editingText, undefined, undefined, editingSingers); setEditingLineIndex(null); } }} onKeyDown={(e) => { if (e.key === 'Enter') { handleSaveLineText(i, editingText, undefined, undefined, editingSingers); setEditingLineIndex(null); } if (e.key === 'Escape') setEditingLineIndex(null); }}>
            <SectionPickerDropdown
              value={editingText}
              onChange={(v: string) => setEditingText(v)}
            />
            {editingSingers.map((singerVal, idx) => {
              const isFilled = !!singerVal;
              const nextEmpty = editingSingers.findIndex(s => !s);
              if (!isFilled && idx !== nextEmpty) return null;
              return (
                <input
                  key={idx}
                  value={singerVal}
                  onChange={(e) => setEditingSingers(prev => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                  placeholder={idx === 0 ? t('editor.singerOptPlaceholder') : t('editor.singerN', 'Singer {{n}}', { n: idx + 1 })}
                  list={`section-singers-${i}`}
                  className={`bg-zinc-800 border border-zinc-600 text-xs text-zinc-400 rounded px-2 py-0.5 w-20 focus:outline-none focus:border-primary/60 ${['', 'italic', 'font-bold', 'font-bold italic'][idx]}`}
                />
              );
            })}
            {songArtists && songArtists.length > 0 && (
              <datalist id={`section-singers-${i}`}>
                {songArtists.map((a) => <option key={a} value={a} />)}
              </datalist>
            )}
            <Tip content={t('editor.done')}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSaveLineText(i, editingText, undefined, undefined, editingSingers); setEditingLineIndex(null); }}
                className="text-zinc-500 hover:text-primary px-1 flex items-center self-center"
                aria-label={t('editor.done')}
              ><Icon name="check" size={16} /></button>
            </Tip>
          </div>
        ) : (
          <span className={`px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
            isRoot
              ? 'text-xs font-bold tracking-widest uppercase text-primary bg-primary/10 border-primary/30 group-hover:border-primary/50'
              : 'text-[10px] font-semibold tracking-widest uppercase text-zinc-600 bg-zinc-900/40 border-zinc-800 group-hover:text-zinc-400 group-hover:border-zinc-700'
          }`}>
            {(() => {
              const label = formatSectionLabel(line.label, t);
              const lineSingers = getSingers(line);
              const singersStr = lineSingers.join(' · ');
              if (singersStr) {
                return isRoot ? `${label} · ${singersStr}` : `[${label}: ${singersStr}]`;
              }
              return label;
            })()}
          </span>
        )}
        <div className={`flex-1 h-px ${isRoot ? 'bg-primary/40' : 'bg-zinc-800/50'}`} />
        {selectedLines.size === 0 && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Tip content={isRoot ? t('editor.sections.demote') : t('editor.sections.promote')}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleDepth?.(i); }}
                className="text-zinc-600 hover:text-primary text-xs px-1"
              >{isRoot ? '⇲' : '⇱'}</button>
            </Tip>
            <Tip content={t('editor.deleteSection')}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteLine(i); }}
                className="text-zinc-600 hover:text-destructive px-1 flex items-center"
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
      className={`outline-none flex ${editorMode === 'words' ? 'items-start' : 'items-center'} gap-3 sm:gap-4 px-4 py-3 sm:px-3 sm:py-2 rounded-xl sm:rounded-lg transition-colors duration-300 ease-out cursor-pointer group relative overflow-hidden animate-preview-line-in ${selectedLines.has(i)
        ? `bg-primary/15 border border-${isModified ? 'warning' : 'primary'}/40 ring-1 ring-${isModified ? 'warning' : 'primary'}/20`
        : isActive
          ? isLocked
            ? `bg-primary/10 border border-${isModified ? 'warning' : 'primary'}/30`
            : `bg-primary/5 border border-${isModified ? 'warning' : 'primary'}/20 border-dashed`
          : dragOverIndex === i
            ? 'bg-accent-blue/10 border border-accent-blue/30'
            : (upcomingDepth ?? 0) > 0
              ? `bg-primary/${upcomingDepth === 1 ? '5' : upcomingDepth === 2 ? '3' : '2'} border border-primary/${upcomingDepth === 1 ? '15' : '10'} border-dashed`
              : `hover:bg-zinc-800/40 border border-${isModified ? 'warning/30' : 'transparent'}`
        } ${dragIndex === i ? 'opacity-40' : ''} ${justSynced ? 'ring-2 ring-primary/60 animate-just-synced' : ''}`}
    >
      {/* Lock/unlock indicator */}
      {isActive && (
        <div className={`absolute left-0 inset-y-0 w-1 z-0 rounded-l-xl animate-bar-grow ${isLocked
          ? `${isModified ? 'bg-warning shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-primary shadow-[0_0_12px_rgba(29,185,84,0.6)]'} opacity-90`
          : `${isModified ? 'bg-warning/60' : 'bg-primary/40'} opacity-60`
          }`} />
      )}
      {/* Drag Handle & Line number */}
      <div className="flex items-center gap-1 shrink-0">
        <Tip content={t('editor.dragToReorder')}>
          <div
            className="cursor-grab active:cursor-grabbing text-zinc-800 hover:text-zinc-500 transition-colors p-0.5 -ml-1 select-none"
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
              <span className="text-[10px] font-mono tabular-nums text-zinc-700/70 select-none text-right">
                {lyricNumber}
              </span>
            )}
          </div>
        )}
      </div>

      <span
        className={`text-xs font-mono tabular-nums shrink-0 transition-colors relative ${editorMode === 'words' ? 'self-start pt-0.5' : ''} ${isSynced
          ? 'text-primary'
          : isActive
            ? 'text-zinc-400 animate-pulse-glow'
            : 'text-zinc-600'
          }`}
        style={{ width: editorMode === 'words' ? '240px' : '92px', flexShrink: 0 }}
      >
        {editorMode === 'words' ? (
          <WordsModeColumn
            line={line as ComponentProps<typeof WordsModeColumn>['line']}
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
            handleWordClick={handleWordClick as ComponentProps<typeof WordsModeColumn>['handleWordClick']}
            handleClearWordTimestamp={handleClearWordTimestamp as ComponentProps<typeof WordsModeColumn>['handleClearWordTimestamp']}
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
            className={`absolute -right-2 size-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)] animate-in fade-in zoom-in duration-300 z-10 ${
              editorMode === 'words' ? 'top-3' : 'top-1/2 -translate-y-1/2'
            }`}
          />
        )}
      </span>


      {/* Lyrics text container */}
      <div
        className="flex-1 min-w-0 flex items-start gap-2 overflow-x-hidden pb-0.5 mt-0.5 select-text"
        data-no-drag
        onDoubleClick={() => {
          setEditingLineIndex(i);
          setEditingText(serializeToRubyMarkup(line.words) || line.text || '');
          setEditingSecondary(line.secondary || '');
          setEditingTranslations(line.translations ? [...line.translations] : []);
          const singers = getSingers(line);
          setEditingSingers([...singers, '', '', '', ''].slice(0, 4));
        }}>
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
          handleSetWordSinger={handleSetWordSinger as ComponentProps<typeof LineTextContent>['handleSetWordSinger']}
          songSingers={projectSingers}
        />

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
      {/* Progress stripe for active synced line */}
      {segmentProgress != null && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800/50 animate-in fade-in duration-300">
          <div
            className="h-full bg-primary/50 rounded-full"
            style={{ width: `${segmentProgress * 100}%` }}
          />
        </div>
      )}
    </div>
    </EditorLineContextMenu>
  );
});

export default EditorLineItem;
