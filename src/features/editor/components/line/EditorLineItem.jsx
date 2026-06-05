import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { serializeToRubyMarkup, parseRubyMarkup, isKanji, hasKanji } from '@/shared/utils/furigana';
import { Checkbox } from '@ui/checkbox';
import { Tip } from '@ui/tip';
import { GripVertical } from 'lucide-react';
import LineTextEditingForm from './LineTextEditingForm';
import LineActionsPopover from './LineActionsPopover';
import { useLineGestures } from '../../hooks/useLineGestures';
import LrcModeColumn from '../modes/LrcModeColumn';
import SrtModeColumn from '../modes/SrtModeColumn';
import WordsModeColumn from '../modes/WordsModeColumn';
import LineTextContent from './LineTextContent';
import LineActionToolbar from './LineActionToolbar';

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
  editingSinger,
  setEditingSinger,
  handleSaveLineText,
  handleInsertSection,
  handleAssignSinger,
  songArtists,
  playerRef,
  shiftTime,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  handleToggleLine,
  handleMark,
  activeWordIndex,
  handleClearWordTimestamp,
  handleSetActiveWordIndex,
  handleSetTimestamp,
  handleSetWordReading,
  stampTarget = 'main',
  handleStampTargetToggle,
  playbackPosition,
  upcomingDepth,
  onWordMenu,
  onLineMenu,
  isModified,
}) => {

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const { t } = useTranslation();
  const [editingTimestamp, setEditingTimestamp] = useState(null); // null | 'start' | 'end'
  const [editingReadingWordIndex, setEditingReadingWordIndex] = useState(null);
  const [selection, setSelection] = useState({ start: null, end: null, range: null }); // { start: ci|null, end: ci|null, range: {s,e}|null }
  const [nudgeIndicator, setNudgeIndicator] = useState(null);
  const [justSynced, setJustSynced] = useState(false);
  const nudgeTimerRef = useRef(null);
  const justSyncedTimerRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingLineIndex === i) {
      const t = setTimeout(() => editInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [editingLineIndex, i]);

  const onCharClick = useCallback((ci) => {
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

  const handleReadingCommit = useCallback((val, wi, direction) => {
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
  const wordClickTimerRef = useRef(null);

  const showNudge = useCallback((delta) => {
    const sign = delta > 0 ? '+' : '';
    setNudgeIndicator(`${sign}${delta.toFixed(2)}s`);
    clearTimeout(nudgeTimerRef.current);
    const duration = { short: 300, normal: 600, long: 1200 }[settings.editor?.syncFlashDuration] || 600;
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

  const handleWordClick = useCallback((e, w, wi) => {
    e.stopPropagation();
    if (w.time != null && playerRef?.current?.seek) {
      playerRef.current.seek(w.time);
      if (settings.playback?.seekPlays && playerRef.current.play) playerRef.current.play();
    }
    if (activeWordIndex !== -1) handleSetActiveWordIndex(wi);
  }, [playerRef, settings.playback?.seekPlays, activeWordIndex, handleSetActiveWordIndex]);

  const handleTimestampWheel = useCallback((e, index) => {
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
      const duration = { short: 300, normal: 600, long: 1200 }[settings.editor?.syncFlashDuration] || 600;
      justSyncedTimerRef.current = setTimeout(() => setJustSynced(false), duration);
    }
    return () => clearTimeout(justSyncedTimerRef.current);
  }, [justSynced, settings.editor?.syncFlashDuration]);

  // Segment progress for active synced line
  const segmentEnd = line.endTime ?? nextTimestamp;
  const segmentProgress = isActive && isSynced && segmentEnd != null && playbackPosition != null
    ? Math.min(1, Math.max(0, (playbackPosition - line.timestamp) / (segmentEnd - line.timestamp)))
    : null;

  const distanceFromActive = displayedActiveIndex != null ? Math.abs(i - displayedActiveIndex) : 0;
  const staggerDelay = `${Math.min(distanceFromActive * 20, 150)}ms`;

  // Section marker — full-width divider with editable label
  if (line.type === 'section') {
    const isEditing = editingLineIndex === i;
    return (
      <div
        ref={isActive ? activeLineRef : null}
        onClick={(e) => handleLineClick(i, e)}
        onDoubleClick={() => {
          setEditingLineIndex(i);
          setEditingText(line.label || '');
          setEditingSinger(line.singer || '');
        }}
        style={{ animationDelay: staggerDelay }}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg cursor-pointer group animate-preview-line-in ${selectedLines.has(i) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-zinc-800/30 border border-transparent'}`}
      >
        <div className="flex-1 h-px bg-zinc-800/50" />
        {isEditing ? (
          <div className="flex items-center gap-1.5" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { handleSaveLineText(i, editingText, undefined, undefined, editingSinger); setEditingLineIndex(null); } }} onKeyDown={(e) => { if (e.key === 'Enter') { handleSaveLineText(i, editingText, undefined, undefined, editingSinger); setEditingLineIndex(null); } if (e.key === 'Escape') setEditingLineIndex(null); }}>
            <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)} placeholder={t('editor.sectionLabelPlaceholder')} className="bg-zinc-800 border border-zinc-600 text-xs text-zinc-200 rounded px-2 py-0.5 w-28 focus:outline-none focus:border-primary/60" />
            <input value={editingSinger} onChange={(e) => setEditingSinger(e.target.value)} placeholder={t('editor.singerOptPlaceholder')} list={`section-singers-${i}`} className="bg-zinc-800 border border-zinc-600 text-xs text-zinc-400 rounded px-2 py-0.5 w-28 focus:outline-none focus:border-primary/60" />
            {songArtists?.length > 0 && (
              <datalist id={`section-singers-${i}`}>
                {songArtists.map((a) => <option key={a} value={a} />)}
              </datalist>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/40 whitespace-nowrap group-hover:text-zinc-400 group-hover:border-zinc-700 transition-colors">
            {line.label || t('editor.sectionDefault')}{line.singer ? ` · ${line.singer}` : ''}
          </span>
        )}
        <div className="flex-1 h-px bg-zinc-800/50" />
        {selectedLines.size === 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDeleteLine(i); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-zinc-400 text-xs px-1"
            aria-label="Delete section"
          >✕</button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={isActive ? activeLineRef : null}
      role="button"
      aria-label={line.text || `Line ${i + 1}`}
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
        const target = e.target;
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
      className={`outline-none flex items-center gap-3 sm:gap-4 px-4 py-3 sm:px-3 sm:py-2 rounded-xl sm:rounded-lg transition-colors duration-300 ease-out cursor-pointer group relative overflow-hidden animate-preview-line-in ${selectedLines.has(i)
        ? `bg-primary/15 border border-${isModified ? 'warning' : 'primary'}/40 ring-1 ring-${isModified ? 'warning' : 'primary'}/20`
        : isActive
          ? isLocked
            ? `bg-primary/10 border border-${isModified ? 'warning' : 'primary'}/30`
            : `bg-primary/5 border border-${isModified ? 'warning' : 'primary'}/20 border-dashed`
          : dragOverIndex === i
            ? 'bg-accent-blue/10 border border-accent-blue/30'
            : upcomingDepth > 0
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
        <Tip content={t('editor.dragToReorder', 'Drag to reorder')}>
          <div
            className="cursor-grab active:cursor-grabbing text-zinc-800 hover:text-zinc-500 transition-colors p-0.5 -ml-1 select-none"
          >
            <GripVertical className="size-3" />
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
                {i + 1}
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
            line={line}
            lineIndex={i}
            isSynced={isSynced}
            isActive={isActive}
            isMobile={isMobile}
            settings={settings}
            editingTimestamp={editingTimestamp}
            setEditingTimestamp={setEditingTimestamp}
            focusedTimestamp={focusedTimestamp}
            setFocusedTimestamp={setFocusedTimestamp}
            stampTarget={stampTarget}
            handleStampTargetToggle={handleStampTargetToggle}
            activeWordIndex={activeWordIndex}
            handleSetTimestamp={handleSetTimestamp}
            handleTimestampWheel={handleTimestampWheel}
            nudgeIndicator={nudgeIndicator}
            handleWordClick={handleWordClick}
            handleClearWordTimestamp={handleClearWordTimestamp}
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
            focusedTimestamp={focusedTimestamp}
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
            focusedTimestamp={focusedTimestamp}
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

      {/* Singer badge */}
      {line.singer && (
        <span className="shrink-0 text-[9px] font-semibold text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded-full border border-zinc-700/40 max-w-[72px] truncate">
          {line.singer}
        </span>
      )}

      {/* Lyrics text container */}
      <div
        className="flex-1 min-w-0 flex items-start gap-2 overflow-x-hidden pb-0.5 mt-0.5 select-text"
        data-no-drag
        onDoubleClick={() => {
          setEditingLineIndex(i);
          setEditingText(serializeToRubyMarkup(line.words) || line.text);
          setEditingSecondary(line.secondary || '');
          setEditingTranslations(line.translations ? [...line.translations] : []);
          setEditingSinger(line.singer || '');
        }}>
        {editingLineIndex === i ? (
          <LineTextEditingForm
            ref={editInputRef}
            lineIndex={i}
            editingText={editingText}
            setEditingText={setEditingText}
            editingSecondary={editingSecondary}
            setEditingSecondary={setEditingSecondary}
            editingTranslations={editingTranslations}
            setEditingTranslations={setEditingTranslations}
            editingSinger={editingSinger}
            setEditingSinger={setEditingSinger}
            handleSaveLineText={handleSaveLineText}
            setEditingLineIndex={setEditingLineIndex}
            songArtists={songArtists}
          />
        ) : (
          <LineTextContent
            line={line}
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
            handleWordClick={handleWordClick}
            wordClickTimerRef={wordClickTimerRef}
            handleSaveLineText={handleSaveLineText}
          />
        )}
      </div>
      <LineActionToolbar
        line={line}
        lineIndex={i}
        isActive={isActive}
        isSynced={isSynced}
        editorMode={editorMode}
        settings={settings}
        editingLineIndex={editingLineIndex}
        setEditingLineIndex={setEditingLineIndex}
        setEditingText={setEditingText}
        setEditingSecondary={setEditingSecondary}
        setEditingTranslations={setEditingTranslations}
        setEditingSinger={setEditingSinger}
        serializeToRubyMarkup={serializeToRubyMarkup}
        handleInsertSection={handleInsertSection}
        handleAssignSinger={handleAssignSinger}
        songArtists={songArtists}
        handleMark={handleMark}
        playerRef={playerRef}
        shiftTime={shiftTime}
        handleAddLine={handleAddLine}
        handleClearLine={handleClearLine}
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
  );
});

export default EditorLineItem;