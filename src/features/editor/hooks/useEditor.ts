import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { lyrics } from '@/app/api';
import { matchKey } from '@/shared/utils/keyboard';
import { parseRubyMarkup, hasCJK, isKanji } from '@/shared/utils/furigana';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import useConfirm from '@/shared/hooks/useConfirm';
import {
  applyBulkShift,
  applyGlobalOffset,
  clearAllTimestamps,
  clearLineTimestamp,
  applyMark,
  detectDuplicateTimestamps,
  normalizeLineMode,
} from '../services/editor.service';
import { parseSectionHeader } from '@/features/editor/utils/sections';
import { getDefaultDepthForLabel } from '../constants/sectionTypes';
import { useFileImport } from './useFileImport';
import { useDragReorder } from './useDragReorder';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import type { EditorLine, EditorWord, EditorTranslation } from '../services/editor.service';
import type { PlayerHandle } from '@/shared/hooks/useAppState';

interface FocusedTs {
  lineIndex: number;
  type: string;
  wordIndex?: number;
}

interface UseEditorParams {
  lines: EditorLine[];
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  syncMode: boolean;
  setSyncMode: Dispatch<SetStateAction<boolean>>;
  activeLineIndex: number;
  setActiveLineIndex: Dispatch<SetStateAction<number>>;
  playbackPosition: number;
  playerRef: RefObject<PlayerHandle | null>;
  editorMode: string;
  setEditorMode: (mode: string) => void;
  onImport?: () => void;
  clearHistory: () => void;
}

export function useEditor({
  lines,
  setLines,
  syncMode,
  setSyncMode,
  activeLineIndex,
  setActiveLineIndex,
  playbackPosition,
  playerRef,
  editorMode,
  setEditorMode,
  onImport,
  clearHistory,
}: UseEditorParams) {
  const { t } = useTranslation();
  const { settings, updateSetting, updateSettings } = useSettings();
  const [rawText, setRawText] = useState('');
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingSecondary, setEditingSecondary] = useState('');
  const [editingTranslations, setEditingTranslations] = useState<EditorTranslation[]>([]);
  const [editingSingers, setEditingSingers] = useState<string[]>(['', '', '', '']);
  const [defaultSingers, setDefaultSingers] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  // awaitingEndMark is derived: only non-null when the stored context still matches
  const [awaitingEndMarkFor, setAwaitingEndMarkFor] = useState<{ lineIndex: number; mode: string } | null>(null);
  const awaitingEndMark =
    awaitingEndMarkFor?.lineIndex === activeLineIndex && awaitingEndMarkFor?.mode === editorMode
      ? awaitingEndMarkFor.lineIndex
      : null;
  const [focusedTimestamp, setFocusedTimestamp] = useState<FocusedTs | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [isActiveLineLocked, setIsActiveLineLocked] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [stampTarget, setStampTarget] = useState('main'); // 'main' | 'secondary'
  const [modifiedLines, setModifiedLines] = useState<Set<number>>(new Set()); // indices modified since last save

  const [requestConfirm, confirmModal] = useConfirm();

  const lastClickedRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { handleFileUpload, handleUrlImport, fileInputRef } = useFileImport({
    setLines, setEditorMode, setActiveLineIndex, setSyncMode, onImport, settings,
  });

  const { dragIndex, dragOverIndex, handleDragStart, handleDragOver, handleDragEnd, handleDrop } = useDragReorder({
    setLines, setActiveLineIndex,
  });

  // Stable refs to avoid recreating handleMark/keyboard effects on every frame
  const linesRef = useRef(lines);
  const playbackPositionRef = useRef(playbackPosition);
  const activeLineIndexRef = useRef(activeLineIndex);
  const focusedTimestampRef = useRef(focusedTimestamp);
  const selectedLinesRef = useRef(selectedLines);
  const activeWordIndexRef = useRef(0);
  const stampTargetRef = useRef('main');
  useEffect(() => {
    linesRef.current = lines;
    playbackPositionRef.current = playbackPosition;
    activeLineIndexRef.current = activeLineIndex;
    focusedTimestampRef.current = focusedTimestamp;
    selectedLinesRef.current = selectedLines;
    activeWordIndexRef.current = activeWordIndex;
    stampTargetRef.current = stampTarget;
  });

  const [prevActiveLineIndex, setPrevActiveLineIndex] = useState(activeLineIndex);
  const [prevEditorMode, setPrevEditorMode] = useState(editorMode);
  if (activeLineIndex !== prevActiveLineIndex || editorMode !== prevEditorMode) {
    setPrevActiveLineIndex(activeLineIndex);
    setPrevEditorMode(editorMode);
    setStampTarget('main');

    let newWordIdx = 0;
    if (editorMode === 'words') {
      const words = lines[activeLineIndex]?.words;
      if (words?.length) {
        const idx = words.findIndex((w) => w.time == null);
        newWordIdx = idx === -1 ? words.length : idx;
      }
    }
    setActiveWordIndex(newWordIdx);
  }

  useEffect(() => {
    if (editorMode !== 'words') return;

    setLines((prev) =>
      prev.map((line) => {
        const rawValue = (line.text || '').trim();
        if (!rawValue) return line;

        const { plainText, segments } = parseRubyMarkup(rawValue);
        const hasMarkup = segments.some(s => s.reading);

        // If no markup and already has words that match the current text, skip
        if (!hasMarkup && line.words?.length) {
          const existingText = line.words.map(w => w.word).join('');
          if (existingText === plainText) return line;
        }

        // Build a map from old char positions so timestamps survive edits if text didn't change too much
        const oldWordAtPos = new Map<number, EditorWord>();
        // Text→reading fallback for when position-based matching misses (e.g. 々 boundary shifts)
        const oldReadingByText = new Map<string, string>();
        let flat = 0;
        for (const w of line.words || []) {
          for (let k = 0; k < [...(w.word || "")].length; k++) oldWordAtPos.set(flat + k, w);
          flat += [...(w.word || "")].length;
          if (w.reading) oldReadingByText.set(w.word || "", w.reading);
        }

        let charPos = 0;
        const newWords: EditorWord[] = [];
        const isCJKText = hasCJK(plainText);

        for (const seg of segments) {
          const segChars = [...seg.text];
          if (seg.reading) {
            // Annotated segment — store as one word with the reading
            const anchor = oldWordAtPos.get(charPos);
            newWords.push({ word: seg.text, time: anchor?.time ?? null, reading: seg.reading });
            charPos += segChars.length;
          } else if (isCJKText) {
            // Mixed CJK+Latin: group contiguous Kanji, split other CJK chars, keep Latin runs
            let ci = 0;
            while (ci < segChars.length) {
              const ch = segChars[ci];
              if (!ch.trim()) { charPos++; ci++; continue; }
              
              if (isKanji(ch)) {
                let j = ci;
                while (j < segChars.length && isKanji(segChars[j])) j++;
                const kanjiGroup = segChars.slice(ci, j).join('');
                
                const old = oldWordAtPos.get(charPos);
                const w: EditorWord = { word: kanjiGroup, time: old?.time ?? null };
                if (old?.reading && old.word === kanjiGroup) w.reading = old.reading;
                if (!w.reading && oldReadingByText.has(kanjiGroup)) w.reading = oldReadingByText.get(kanjiGroup);
                newWords.push(w);
                
                charPos += [...kanjiGroup].length;
                ci = j;
              } else if (/[\u3000-\u9FFF\uF900-\uFAFF]/.test(ch)) {
                const old = oldWordAtPos.get(charPos);
                const w: EditorWord = { word: ch, time: old?.time ?? null };
                if (old?.reading) w.reading = old.reading;
                if (!w.reading && oldReadingByText.has(ch)) w.reading = oldReadingByText.get(ch);
                newWords.push(w);
                charPos++; ci++;
              } else {
                let j = ci;
                while (j < segChars.length && !/[\u3000-\u9FFF\uF900-\uFAFF]/.test(segChars[j]) && segChars[j].trim()) j++;
                const latinToken = segChars.slice(ci, j).join('');
                const old = oldWordAtPos.get(charPos);
                newWords.push({ word: latinToken, time: old?.time ?? null });
                charPos += [...latinToken].length;
                ci = j;
              }
            }
          } else {
            // Pure Latin
            const tokens = seg.text.split(/\s+/).filter(Boolean);
            for (const token of tokens) {
              const old = oldWordAtPos.get(charPos);
              newWords.push({ word: token, time: old?.time ?? null });
              charPos += [...token].length;
            }
          }
        }

        const filteredWords = newWords.filter(w => (w.word || "").trim());
        if (filteredWords.length === 0) return line;

        return { ...line, text: plainText, words: filteredWords };
      })
    );
    // setLines is a stable useState setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode]);

  const displayedActiveIndex = isActiveLineLocked
    ? activeLineIndex
    : (hoveredLineIndex ?? activeLineIndex);

  const handleLineHover = useCallback((i) => {
    if (!isActiveLineLocked) {
      setHoveredLineIndex(i);
    }
  }, [isActiveLineLocked]);

  const handleLineHoverEnd = useCallback(() => {
    setHoveredLineIndex(null);
  }, []);

  const handleConfirmLyrics = useCallback(async () => {
    const looksLikeLrc = /^\[(\d{1,2}):(\d{2}\.\d{2,3})\]/m.test(rawText);
    const looksLikeSrt = /^\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/m.test(rawText);
    const looksLikeWordLrc = looksLikeLrc && /<\d{1,2}:\d{2}\.\d{2,3}>/.test(rawText);
    if (looksLikeLrc || looksLikeSrt) {
      const filename = looksLikeSrt ? 'lyrics.srt' : 'lyrics.lrc';
      try {
        const { lines: parsed } = await lyrics.parse(rawText, filename) as { lines: EditorLine[] };
        if (parsed.length > 0) {
          setLines(parsed);
          clearHistory?.();
          if (looksLikeSrt) setEditorMode('srt');
          else if (looksLikeWordLrc) setEditorMode('words');
          else setEditorMode('lrc');
          setActiveLineIndex(Math.max(0, parsed.findIndex((l) => l.timestamp == null)));
          setSyncMode(true);
          return;
        }
      } catch (err) {
        console.error('Failed to parse lyrics via API', err);
        toast.error(t('import.failed') || 'Failed to parse lyrics');
        return;
      }
    }

    const rawLines = rawText.split('\n');
    const priorBodyLines = lines.filter((l) => l.type !== 'section');
    const updated: EditorLine[] = [];
    let oldOrdinal = 0; // index into priorBodyLines, for word/timestamp preservation

    for (const rawLine of rawLines) {
      const header = parseSectionHeader(rawLine);
      if (header) {
        updated.push({
          type: 'section',
          label: header.label,
          singers: header.singers.length ? header.singers : undefined,
          // Preserve structural depth so root dividers (e.g. [Part]) round-trip as roots,
          // not dim children — preview gates root styling on depth === 0.
          depth: getDefaultDepthForLabel(header.label),
          text: '',
        } as EditorLine);
        continue;
      }

      const { plainText, segments } = parseRubyMarkup(rawLine.trim());
      const isCJKText = hasCJK(plainText);
      const newWords: EditorWord[] = [];
      for (const seg of segments) {
        const segChars = [...seg.text];
        if (seg.reading) {
          newWords.push({ word: seg.text, time: null, reading: seg.reading });
        } else if (isCJKText) {
          let ci = 0;
          while (ci < segChars.length) {
            const ch = segChars[ci];
            if (!ch.trim()) { ci++; continue; }
            if (isKanji(ch)) {
              let j = ci;
              while (j < segChars.length && isKanji(segChars[j])) j++;
              newWords.push({ word: segChars.slice(ci, j).join(''), time: null });
              ci = j;
            } else if (/[\u3000-\u9FFF\uF900-\uFAFF]/.test(ch)) {
              newWords.push({ word: ch, time: null });
              ci++;
            } else {
              let j = ci;
              while (j < segChars.length && !/[\u3000-\u9FFF\uF900-\uFAFF]/.test(segChars[j]) && segChars[j].trim()) j++;
              newWords.push({ word: segChars.slice(ci, j).join(''), time: null });
              ci = j;
            }
          }
        } else {
          for (const token of seg.text.split(/\s+/).filter(Boolean)) {
            newWords.push({ word: token, time: null });
          }
        }
      }

      const old = priorBodyLines[oldOrdinal] || {};
      oldOrdinal++;
      const line: EditorLine = {
        ...old,
        text: plainText,
        timestamp: old.timestamp ?? null,
        id: old.id || crypto.randomUUID(),
      };
      if (newWords.length > 0) {
        if (old.words?.length) {
          let charIdx = 0;
          old.words.forEach((oldWord) => {
            let pos = 0;
            let tokIdx = 0;
            while (tokIdx < newWords.length && pos + [...(newWords[tokIdx].word || '')].length <= charIdx) {
              pos += [...(newWords[tokIdx].word || '')].length;
              tokIdx++;
            }
            if (tokIdx < newWords.length) {
              if (oldWord.time != null) newWords[tokIdx].time = oldWord.time;
              if (!newWords[tokIdx].reading && oldWord.reading) newWords[tokIdx].reading = oldWord.reading;
            }
            charIdx += [...(oldWord.word || '')].length;
          });
        }
        line.words = newWords;
      }
      line.mode = normalizeLineMode(line);
      updated.push(line);
    }

    setLines(updated);
    clearHistory?.();
    setActiveLineIndex(Math.max(0, updated.findIndex((l) => l.type !== 'section' && l.timestamp == null)));
    setSyncMode(true);
  }, [rawText, lines, clearHistory, t, setLines, setEditorMode, setActiveLineIndex, setSyncMode]);


  // ——— Timestamp operations ———

  // Set a timestamp to an exact value (for inline editing)
  const handleSetTimestamp = useCallback(
    (index, type, value) => {
      const numericValue = Number(value);
      if (isNaN(numericValue) || numericValue < 0) return;
      setLines((prev) => {
        const updated = [...prev];
        if (!updated[index]) return prev;
        if (type === 'end') {
          updated[index] = { ...updated[index], endTime: numericValue };
        } else if (type === 'word') {
          // Not used yet, but ready for future
        } else {
          updated[index] = { ...updated[index], timestamp: numericValue };
        }
        return updated;
      });
      if (playerRef?.current?.seek) {
        playerRef.current.seek(numericValue);
      }
    },
    [setLines, playerRef],
  );

  const shiftTime = useCallback(
    (index, delta) => {
      const numericDelta = Number(delta) || 0;
      const currentLines = linesRef.current;
      if (!currentLines[index]) return;

      // Compute target time before updating state — state updaters must be pure
      let targetTime: number | null = null;
      const ftWordField: 'words' | 'secondaryWords' = focusedTimestamp?.type === 'secondaryWord' ? 'secondaryWords' : 'words';

      // Nudge word only in 'words' mode
      if (
        editorMode === 'words' &&
        focusedTimestamp && focusedTimestamp.lineIndex === index &&
        (focusedTimestamp.type === 'word' || focusedTimestamp.type === 'secondaryWord') &&
        focusedTimestamp.wordIndex != null &&
        currentLines[index][ftWordField]?.[focusedTimestamp.wordIndex]?.time != null
      ) {
        const newWordTime = Math.max(0, (currentLines[index][ftWordField]![focusedTimestamp.wordIndex].time ?? 0) + numericDelta);
        if (!isNaN(newWordTime)) targetTime = newWordTime;
      } 
      // Nudge end time only in 'srt' or 'words' mode
      else if (
        (editorMode === 'srt' || editorMode === 'words') &&
        focusedTimestamp && focusedTimestamp.lineIndex === index &&
        focusedTimestamp.type === 'end' &&
        currentLines[index].endTime != null
      ) {
        const newEndTime = Math.max(0, Number(currentLines[index].endTime) + numericDelta);
        if (!isNaN(newEndTime)) targetTime = newEndTime;
      } 
      // Fallback: nudge line start
      else if (currentLines[index].timestamp != null) {
        const newTimestamp = Math.max(0, Number(currentLines[index].timestamp) + numericDelta);
        if (!isNaN(newTimestamp)) targetTime = newTimestamp;
      }

      setModifiedLines(prev => new Set(prev).add(index));
      setLines((prev) => {
        const updated = [...prev];
        if (!updated[index]) return prev;

        const wField: 'words' | 'secondaryWords' = focusedTimestamp?.type === 'secondaryWord' ? 'secondaryWords' : 'words';
        if (
          editorMode === 'words' &&
          focusedTimestamp && focusedTimestamp.lineIndex === index &&
          (focusedTimestamp.type === 'word' || focusedTimestamp.type === 'secondaryWord') &&
          focusedTimestamp.wordIndex != null &&
          updated[index][wField]?.[focusedTimestamp.wordIndex]?.time != null
        ) {
          const wi = focusedTimestamp.wordIndex;
          const newWordTime = Math.max(0, (updated[index][wField]![wi].time ?? 0) + numericDelta);
          if (!isNaN(newWordTime)) {
            const newWords = [...(updated[index][wField] || [])];
            newWords[wi] = { ...newWords[wi], time: newWordTime };
            updated[index] = { ...updated[index], [wField]: newWords };
          }
        } else if (
          (editorMode === 'srt' || editorMode === 'words') &&
          focusedTimestamp && focusedTimestamp.lineIndex === index &&
          focusedTimestamp.type === 'end' &&
          updated[index].endTime != null
        ) {
          const newEndTime = Math.max(0, Number(updated[index].endTime) + numericDelta);
          if (!isNaN(newEndTime)) {
            updated[index] = { ...updated[index], endTime: newEndTime };
          }
        } else if (updated[index].timestamp != null) {
          const newTimestamp = Math.max(0, Number(updated[index].timestamp) + numericDelta);
          if (!isNaN(newTimestamp)) {
            updated[index] = { ...updated[index], timestamp: newTimestamp };
          }
        }
        return updated;
      });

      if (targetTime !== null && playerRef?.current?.seek) {
        playerRef.current.seek(targetTime);
      }
    },
    [playerRef, setLines, setModifiedLines, focusedTimestamp, editorMode],
  );

  const handleMark = useCallback((opts: { forceAdvance?: boolean } = {}) => {
    const forceAdvance = opts?.forceAdvance ?? false;
    const currentLines = linesRef.current;
    const idx = activeLineIndexRef.current;
    if (idx >= currentLines.length) return;
    const time = playerRef?.current?.getCurrentTime?.() ?? playbackPositionRef.current;

    if (settings.editor?.autoPauseOnMark) {
      playerRef?.current?.pause?.();
    }

    const result = applyMark({
      lines: currentLines,
      activeLineIndex: idx,
      time,
      editorMode,
      activeWordIndex: activeWordIndexRef.current,
      stampTarget: stampTargetRef.current,
      awaitingEndMark,
      focusedTimestamp: focusedTimestampRef.current,
      settings: settings.editor || {},
      forceAdvance,
    });

    setModifiedLines(prev => new Set(prev).add(idx));
    setLines(result.nextLines);
    if (result.nextActiveLineIndex != null) {
      setActiveLineIndex(result.nextActiveLineIndex);
    }
    if (result.nextAwaitingEndMark !== undefined) {
      setAwaitingEndMarkFor(result.nextAwaitingEndMark);
    }
    if (result.nextActiveWordIndex !== undefined) {
      setActiveWordIndex(result.nextActiveWordIndex);
      activeWordIndexRef.current = result.nextActiveWordIndex;
    }
    // Clear focused timestamp after each mark — it's a one-shot action
    if (focusedTimestampRef.current) {
      setFocusedTimestamp(null);
      focusedTimestampRef.current = null;
    }
  }, [
    playerRef,
    setLines,
    setActiveLineIndex,
    editorMode,
    awaitingEndMark,
    settings.editor,
    setModifiedLines,
  ]);

  // ——— Shortcut handler (sync mode) ———
  useEffect(() => {
    if (!syncMode) return;

    const handler = (e) => {
      // Ignore IME composition events (e.g. Japanese input)
      if (e.isComposing || e.keyCode === 229) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const handleNudge = (delta) => {
        const ft = focusedTimestampRef.current;
        if (ft) {
          shiftTime(ft.lineIndex, delta);
        } else if (selectedLinesRef.current.size > 0) {
          setLines((prev) => applyBulkShift(prev, selectedLinesRef.current, delta));
        } else {
          shiftTime(activeLineIndexRef.current, delta);
        }
      };

      if (matchKey(e, settings.shortcuts?.mark?.[0] || 'Space')) {
        e.preventDefault();
        handleMark();
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleMark({ forceAdvance: true });
      } else if (matchKey(e, settings.shortcuts?.nudgeLeftFine?.[0] || 'Shift+ArrowLeft')) {
        e.preventDefault();
        handleNudge(-(settings.editor?.nudge?.fine || 0.01));
      } else if (matchKey(e, settings.shortcuts?.nudgeRightFine?.[0] || 'Shift+ArrowRight')) {
        e.preventDefault();
        handleNudge(settings.editor?.nudge?.fine || 0.01);
      } else if (matchKey(e, settings.shortcuts?.nudgeLeft?.[0] || 'Alt+ArrowLeft')) {
        e.preventDefault();
        handleNudge(-(settings.editor?.nudge?.default || 0.1));
      } else if (matchKey(e, settings.shortcuts?.nudgeRight?.[0] || 'Alt+ArrowRight')) {
        e.preventDefault();
        handleNudge(settings.editor?.nudge?.default || 0.1);
      } else if (matchKey(e, settings.shortcuts?.deselect?.[0] || 'Escape') && focusedTimestampRef.current) {
        e.preventDefault();
        setFocusedTimestamp(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    syncMode,
    handleMark,
    shiftTime,
    settings.editor?.nudge?.default,
    settings.editor?.nudge?.fine,
    setLines,
    settings.shortcuts?.mark,
    settings.shortcuts?.nudgeLeft,
    settings.shortcuts?.nudgeRight,
    settings.shortcuts?.nudgeLeftFine,
    settings.shortcuts?.nudgeRightFine,
    settings.shortcuts?.deselect,
    setEditorMode,
  ]);

  // Listen for touch-driven mark events dispatched by MiniPlayer / gesture handler
  useEffect(() => {
    if (!syncMode) return;
    const handler = () => handleMark({ forceAdvance: true });
    window.addEventListener('editor:mark', handler);
    return () => window.removeEventListener('editor:mark', handler);
  }, [syncMode, handleMark]);

  // Listen for Start Syncing button dispatched from AppHeader
  useEffect(() => {
    if (syncMode) return;
    const handler = () => handleConfirmLyrics();
    window.addEventListener('editor:start-syncing', handler);
    return () => window.removeEventListener('editor:start-syncing', handler);
  }, [syncMode, handleConfirmLyrics]);

  // ——— Line operations ———

  const handleClearLine = useCallback(
    (index) => {
      setLines((prev) => clearLineTimestamp(prev, index, editorMode === 'srt', editorMode === 'words'));
    },
    [setLines, editorMode],
  );

  const handleClearTimestamps = () => {
    requestConfirm(t('confirm.clearTimestamps') || 'Clear all timestamps?', () => {
      setLines((prev) => clearAllTimestamps(prev, editorMode === 'srt', editorMode === 'words'));
      setActiveLineIndex(0);
    }, { title: t('confirm.clearTimestampsTitle') || 'Clear Timestamps', variant: 'default' });
  };

  const handleClearAllWordTimestamps = () => {
    requestConfirm(t('confirm.clearWordTimestamps') || 'Clear all word timestamps?', () => {
      setLines((prev) => prev.map((l) =>
        l.words ? { ...l, words: l.words.map((w) => ({ ...w, time: null })) } : l
      ));
    }, { title: t('confirm.clearWordTimestampsTitle') || 'Clear Word Timestamps', variant: 'default' });
  };

  const handleClearActiveLineWordTimestamps = () => {
    const line = lines[activeLineIndex];
    if (!line?.words) return;
    setLines((prev) => {
      const updated = [...prev];
      updated[activeLineIndex] = { ...line, words: (line.words || []).map((w) => ({ ...w, time: null })) };
      return updated;
    });
  };

  const handleSaveLineText = (index, newText, newSecondary, newTranslations, singers) => {
    setModifiedLines(prev => new Set(prev).add(index));
    setLines((prev) => {
      const updated = [...prev];
      if (index < 0 || index >= updated.length) return prev;
      const prevLine = updated[index];

      // Section marker — just update label and singers array
      if (prevLine.type === 'section') {
        const cleanSingers = (singers || []).map(s => s?.trim() || '').filter(Boolean);
        // Persist as default for new lines when a section defines singers
        if (cleanSingers.length) setDefaultSingers(cleanSingers);
        updated[index] = {
          ...prevLine,
          label: newText?.trim() || prevLine.label,
          singers: cleanSingers.length ? cleanSingers : undefined,
        };
        return updated;
      }

      const { plainText, segments } = parseRubyMarkup(newText || '');
      const hasMarkup = segments.some(s => s.reading);
      const line = { ...prevLine, text: plainText };
      if (newSecondary !== undefined) line.secondary = newSecondary || undefined;
      if (newTranslations !== undefined) {
        const filtered = newTranslations.filter(t => t.text?.trim());
        line.translations = filtered.length > 0 ? filtered : undefined;
      }
      // singers array — cap at 4, strip blanks, guard empty
      if (singers !== undefined) {
        const cleanSingers = (singers || []).slice(0, 4).map(s => s?.trim() || '').filter(Boolean);
        line.singers = cleanSingers.length ? cleanSingers : undefined;
      }
      // Always re-tokenize when text or markup changed
      const textChanged = plainText !== (prevLine.text || '');
      // Always generate words if they are missing or text changed
      if (textChanged || hasMarkup || !line.words) {
        const isCJKText = hasCJK(plainText || '');
        // Build a map from old char positions so timestamps survive edits
        const oldWordAtPos = new Map<number, EditorWord>();
        const oldReadingByText = new Map<string, string>();
        let flat = 0;
        for (const w of prevLine.words || []) {
          for (let k = 0; k < [...(w.word || "")].length; k++) oldWordAtPos.set(flat + k, w);
          flat += [...(w.word || "")].length;
          if (w.reading) oldReadingByText.set(w.word || "", w.reading);
        }
        let charPos = 0;
        const newWords: EditorWord[] = [];
        for (const seg of segments) {
          const segChars = [...seg.text];
          if (seg.reading) {
            // Multi-char annotated segment — store as one word with the reading
            const anchor = oldWordAtPos.get(charPos);
            newWords.push({ word: seg.text, time: anchor?.time ?? null, reading: seg.reading });
            charPos += segChars.length;
          } else if (isCJKText) {
            // Mixed CJK+Latin: group Kanji, split other CJK, keep Latin runs
            let ci = 0;
            while (ci < segChars.length) {
              const ch = segChars[ci];
              if (!ch.trim()) { charPos++; ci++; continue; }
              if (isKanji(ch)) {
                let j = ci;
                while (j < segChars.length && isKanji(segChars[j])) j++;
                const kanjiGroup = segChars.slice(ci, j).join('');
                const old = oldWordAtPos.get(charPos);
                const w: EditorWord = { word: kanjiGroup, time: old?.time ?? null };
                if (old?.reading && old.word === kanjiGroup) w.reading = old.reading;
                if (!w.reading && oldReadingByText.has(kanjiGroup)) w.reading = oldReadingByText.get(kanjiGroup);
                newWords.push(w);
                charPos += [...kanjiGroup].length;
                ci = j;
              } else if (/[\u3000-\u9FFF\uF900-\uFAFF]/.test(ch)) {
                const old = oldWordAtPos.get(charPos);
                const w: EditorWord = { word: ch, time: old?.time ?? null };
                if (old?.reading) w.reading = old.reading;
                if (!w.reading && oldReadingByText.has(ch)) w.reading = oldReadingByText.get(ch);
                newWords.push(w);
                charPos++; ci++;
              } else {
                let j = ci;
                while (j < segChars.length && !/[\u3000-\u9FFF\uF900-\uFAFF]/.test(segChars[j]) && segChars[j].trim()) j++;
                const latinToken = segChars.slice(ci, j).join('');
                const old = oldWordAtPos.get(charPos);
                newWords.push({ word: latinToken, time: old?.time ?? null });
                charPos += [...latinToken].length;
                ci = j;
              }
            }
          } else {
            const tokens = seg.text.trim().split(/\s+/).filter(Boolean);
            for (const token of tokens) {
              const old = oldWordAtPos.get(charPos);
              newWords.push({ word: token, time: old?.time ?? null });
              charPos += [...token].length;
            }
          }
        }
        line.words = newWords.filter(w => (w.word || "").trim());
      }
      line.mode = normalizeLineMode(line);
      updated[index] = line;
      return updated;
    });
  };

  const handleToggleLineMode = useCallback((index: number, next: EditorLine) => {
    setModifiedLines(prev => new Set(prev).add(index));
    setLines((prev) => {
      const updated = [...prev];
      if (index < 0 || index >= updated.length) return prev;
      updated[index] = { ...next, mode: normalizeLineMode(next) };
      return updated;
    });
  }, [setLines, setModifiedLines]);

  const handleSetWordReading = useCallback((lineIndex, wordIndex, reading) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[lineIndex] };
      const words = [...(line.words || [])];
      const trimmed = reading?.trim() || null;
      words[wordIndex] = trimmed
        ? { ...words[wordIndex], reading: trimmed }
        : (() => { const { reading: _r, ...rest } = words[wordIndex]; return rest; })();
      line.words = words;
      updated[lineIndex] = line;
      return updated;
    });
  }, [setLines, setModifiedLines]);

  const handleDeleteLine = (index) => {
    requestConfirm(t('confirm.deleteLine') || 'Delete this line?', () => {
      setLines((prev) => {
        const newLines = prev.filter((_, i) => i !== index);
        setActiveLineIndex((prevIdx) => {
          if (prevIdx > index) return prevIdx - 1;
          if (prevIdx === index) return Math.max(0, Math.min(prevIdx, newLines.length - 1));
          return prevIdx;
        });
        return newLines;
      });
      setEditingLineIndex(null);
    }, { title: t('confirm.deleteLineTitle') || 'Delete Line', variant: 'danger' });
  };

  const handleAddLine = useCallback(
    (index, lineData = null, { before = false } = {}) => {
      setLines((prev) => {
        const updated = [...prev];
        const insertAt = before ? Math.max(0, index) : index + 1;
        const base = lineData || {
          text: '',
          timestamp: prev[index]?.timestamp ?? null,
          id: crypto.randomUUID(),
          // Inherit default singers from the last section context
          singers: defaultSingers.length ? [...defaultSingers] : undefined,
        };
        // Keep the solo/duet/split invariant in sync with the inherited singers.
        const newLine = { ...base, mode: normalizeLineMode(base) };
        updated.splice(insertAt, 0, newLine);
        return updated;
      });
    },
    [setLines, defaultSingers],
  );

  // ——— Global offset ———

  const handleApplyOffset = useCallback((direction) => {
    const amount = settings.editor?.shiftAllAmount ?? 0.5;
    const delta = direction * amount;
    setLines((prev) => applyGlobalOffset(prev, delta));
  }, [settings.editor?.shiftAllAmount, setLines]);

  // ——— Selection ———

  const handleLineClick = (i, e) => {
    const rangeKey = settings.shortcuts?.rangeSelect?.[0] || 'Shift';
    const toggleKey = settings.shortcuts?.toggleSelect?.[0] || 'Ctrl';
    const modActive = (mod) => {
      if (mod === 'Shift') return e.shiftKey;
      if (mod === 'Ctrl') return e.ctrlKey || e.metaKey;
      if (mod === 'Alt') return e.altKey;
      return false;
    };
    const isRange = modActive(rangeKey);
    const isToggle = modActive(toggleKey);

    // Modifier keys: handle selection without touching lock
    if (isRange || isToggle) {
      setActiveLineIndex(i);
      if (isRange && lastClickedRef.current != null) {
        const start = Math.min(lastClickedRef.current, i);
        const end = Math.max(lastClickedRef.current, i);
        setSelectedLines((prev) => {
          const next = new Set(prev);
          for (let idx = start; idx <= end; idx++) next.add(idx);
          return next;
        });
      } else if (isToggle) {
        setSelectedLines((prev) => {
          const next = new Set(prev);
          if (next.has(i)) next.delete(i);
          else next.add(i);
          return next;
        });
      }
      lastClickedRef.current = i;
      return;
    }

    // Plain click: toggle lock
    if (isActiveLineLocked && activeLineIndex === i) {
      // Clicking the locked active line unlocks
      setIsActiveLineLocked(false);
    } else {
      // Lock onto the clicked line
      setActiveLineIndex(i);
      setIsActiveLineLocked(true);
      setHoveredLineIndex(null);
    }
    lastClickedRef.current = i;
  };

  const clearSelection = useCallback(() => {
    setSelectedLines(new Set());
  }, []);

  const handleToggleLine = useCallback((i) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const handleBulkClearTimestamps = useCallback(() => {
    requestConfirm(t('confirm.bulkClear') || 'Clear timestamps for selected lines?', () => {
      setLines((prev) =>
        prev.map((l, idx) =>
          selectedLines.has(idx)
            ? { ...l, timestamp: null, ...(editorMode === 'srt' && { endTime: null }) }
            : l,
        ),
      );
      clearSelection();
    }, { title: t('confirm.bulkClearTitle') || 'Clear Selected Timestamps', variant: 'default' });
  }, [selectedLines, editorMode, setLines, clearSelection, requestConfirm, t]);

  const handleBulkDelete = useCallback(() => {
    requestConfirm(t('confirm.bulkDelete') || 'Delete selected lines?', () => {
      setLines((prev) => prev.filter((_, idx) => !selectedLines.has(idx)));
      setActiveLineIndex((prev) => {
        let offset = 0;
        for (const idx of selectedLines) {
          if (idx < prev) offset++;
        }
        return Math.max(0, prev - offset);
      });
      clearSelection();
    }, { title: t('confirm.bulkDeleteTitle') || 'Delete Lines', variant: 'danger' });
  }, [selectedLines, t, setLines, setActiveLineIndex, clearSelection, requestConfirm]);

  const handleBulkShift = (delta) => {
    setLines((prev) => applyBulkShift(prev, selectedLines, delta));
  };

  const handleClearWordTimestamp = useCallback((lineIndex, wordIndex, field = 'words') => {
    setLines((prev) => {
      const updated = [...prev];
      const line = updated[lineIndex];
      if (!line?.[field]) return prev;
      const newWords = [...(line[field] as EditorWord[])];
      newWords[wordIndex] = { ...newWords[wordIndex], time: null };
      updated[lineIndex] = { ...line, [field]: newWords };
      return updated;
    });
    // activeWordIndex is synced by the lines effect above
  }, [setLines]);

  const handleSetActiveWordIndex = useCallback((wordIndex) => {
    setActiveWordIndex(wordIndex);
    activeWordIndexRef.current = wordIndex;
  }, []);

  const handleStampTargetToggle = useCallback(() => {
    const line = linesRef.current[activeLineIndexRef.current];
    if (!line) return;
    const newTarget = stampTargetRef.current === 'main' ? 'secondary' : 'main';
    if (newTarget === 'secondary' && line.secondary) {
      if (!line.secondaryWords?.length) {
        const tokens = line.secondary.trim().split(/\s+/).filter(Boolean);
        if (tokens.length) {
          const secondaryWords = tokens.map((word) => ({ word, time: null }));
          // Eagerly update linesRef so the next keypress sees secondaryWords immediately
          linesRef.current = linesRef.current.map((l, idx) =>
            idx !== activeLineIndexRef.current ? l : { ...l, secondaryWords },
          );
          setLines((prev) => prev.map((l, idx) =>
            idx !== activeLineIndexRef.current ? l : { ...l, secondaryWords },
          ));
        }
      }
    }
    // Reset word cursor to 0 for the new layer
    setActiveWordIndex(0);
    activeWordIndexRef.current = 0;
    setStampTarget(newTarget);
    stampTargetRef.current = newTarget;
  }, [setLines]);

  // ——— Global keybinds ———
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (matchKey(e, settings.shortcuts?.deselect?.[0] || 'Escape') && selectedLines.size > 0) {
        clearSelection();
        return;
      }

      if (matchKey(e, settings.shortcuts?.deleteLine?.[0] || 'Delete')) {
        e.preventDefault();
        if (selectedLines.size > 0) {
          handleBulkDelete();
        } else {
          setLines((prev) => {
            const newLines = prev.filter((_, i) => i !== activeLineIndex);
            setActiveLineIndex((prevIndex) =>
              Math.max(0, Math.min(prevIndex, newLines.length - 1)),
            );
            return newLines;
          });
          clearSelection();
        }
      } else if (matchKey(e, settings.shortcuts?.addLine?.[0] || 'Insert')) {
        e.preventDefault();
        handleAddLine(activeLineIndex);
      } else if (matchKey(e, settings.shortcuts?.clearTimestamp?.[0] || 'Backspace')) {
        e.preventDefault();
        if (selectedLines.size > 0) {
          handleBulkClearTimestamps();
        } else {
          handleClearLine(activeLineIndex);
        }
      } else if (matchKey(e, settings.shortcuts?.switchMode?.[0])) {
        e.preventDefault();
        const nextMode = editorMode === 'lrc' ? 'srt' : 'lrc';
        setEditorMode(nextMode);
        updateSettings({
          'export.copyFormat': nextMode,
          'export.downloadFormat': nextMode
        } as unknown as Partial<import('@/features/settings/settings.types').AppSettings>);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    selectedLines,
    handleBulkDelete,
    clearSelection,
    settings.shortcuts?.deleteLine,
    settings.shortcuts?.addLine,
    settings.shortcuts?.clearTimestamp,
    settings.shortcuts?.switchMode,
    settings.shortcuts?.deselect,
    activeLineIndex,
    lines.length,
    handleAddLine,
    handleBulkClearTimestamps,
    handleClearLine,
    editorMode,
    setEditorMode,
    updateSettings,
    setLines,
    setActiveLineIndex,
  ]);

  // Duplicate/overlapping timestamp detection
  const overlappingLines = useMemo(
    () => detectDuplicateTimestamps(lines, settings.editor?.overlapThreshold ?? 0.05),
    [lines, settings.editor?.overlapThreshold],
  );

  const handleInsertSection = useCallback((afterIndex, label = 'verse') => {
    // Serialize the section label (e.g., "verse" -> "verse 2" if "verse" already exists).
    // Computed from current `lines` (not inside the updater) so we can seed the edit state
    // synchronously below and open the section editor on the freshly inserted marker.
    const baseLabel = label.trim().toLowerCase();
    let maxNumber = 0;
    for (const line of lines) {
      if (line.type === 'section' && line.label) {
        const l = line.label.trim().toLowerCase();
        if (l === baseLabel) {
          maxNumber = Math.max(maxNumber, 1);
        } else if (l.startsWith(`${baseLabel} `)) {
          const numStr = l.slice(baseLabel.length + 1).trim();
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && String(num) === numStr) {
            maxNumber = Math.max(maxNumber, num);
          }
        }
      }
    }

    // Always number from 1 so the first section of a type reads "Verse 1", not "Verse".
    // `maxNumber` already accounts for any legacy bare "verse" marker (counted as 1 above).
    const finalLabel = `${label} ${maxNumber + 1}`;
    const depth = getDefaultDepthForLabel(finalLabel);
    const newIndex = afterIndex + 1;

    setLines((prev) => {
      const updated = [...prev];
      updated.splice(newIndex, 0, { type: 'section', label: finalLabel, depth, timestamp: null, id: crypto.randomUUID() });
      return updated;
    });

    // Open the section editor immediately so the singer inputs are available without a
    // second click — the user can name singers right after adding the section.
    setEditingLineIndex(newIndex);
    setEditingText(finalLabel);
    setEditingSingers(['', '', '', '']);
  }, [lines, setLines, setEditingLineIndex, setEditingText, setEditingSingers]);

  const handleToggleSectionDepth = useCallback((index) => {
    setLines((prev) => {
      const updated = [...prev];
      if (updated[index] && updated[index].type === 'section') {
        const currentDepth = updated[index].depth ?? getDefaultDepthForLabel(updated[index].label);
        updated[index] = { ...updated[index], depth: currentDepth === 0 ? 1 : 0 };
      }
      return updated;
    });
  }, [setLines]);

  // Move a set of line indices to appear directly after a target section marker.
  // indices: number[] of line indices to move (section lines are skipped)
  // targetSectionIndex: index of the section marker in the current lines array
  const handleMoveToSection = useCallback((indices, targetSectionIndex) => {
    setLines((prev) => {
      const indicesSet = new Set(indices);
      const targetSection = prev[targetSectionIndex];
      if (!targetSection || targetSection.type !== 'section') return prev;
      const toMove = prev.filter((l, i) => indicesSet.has(i) && l.type !== 'section');
      if (toMove.length === 0) return prev;
      // Build new array: all lines except the moved ones, then splice toMove after target section
      const without = prev.filter((l, i) => !indicesSet.has(i) || l.type === 'section');
      const insertAt = without.indexOf(targetSection) + 1;
      const result = [...without];
      result.splice(insertAt, 0, ...toMove);
      return result;
    });
    setModifiedLines(prev => {
      const next = new Set(prev);
      indices.forEach(i => next.add(i));
      return next;
    });
  }, [setLines, setModifiedLines]);

  /**
   * Assign a singer name to a specific role slot on selected lines.
   * When `name` is empty, clears that slot. Other slots are preserved.
   * @param {string} name - singer name (empty to clear the slot)
   * @param {number[]} lineIndices
   * @param {number} [slot=0] - which role index (0-3) to assign to
   */
  const handleAssignSinger = useCallback((name, lineIndices, slot = 0, onlyFirst = false) => {
    setLines((prev) => {
      const updated = [...prev];
      const targets = onlyFirst ? [lineIndices[0]] : lineIndices;
      for (const i of targets) {
        if (i == null || i < 0 || i >= updated.length) continue;
        const line = updated[i];
        const current = line.singers ? [...line.singers] : [];
        while (current.length <= slot) current.push('');
        current[slot] = name?.trim() || '';
        const cleanSingers = current.slice(0, 4).filter(Boolean);
        const next = {
          ...line,
          singers: cleanSingers.length ? cleanSingers : undefined,
        };
        next.mode = normalizeLineMode(next);
        updated[i] = next;
      }
      return updated;
    });
  }, [setLines]);

  /**
   * Cycle the singerIndex of a single word within a line.
   * Each right-click advances: null → 0 → 1 → … → (singerCount-1) → null.
   * If no words array exists yet (LRC/SRT mode), auto-creates one by splitting line.text.
   */
  const handleCycleWordSinger = useCallback((lineIndex, wordIndex) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[lineIndex] };
      const singers = line.singers || [];
      if (singers.length < 2) return prev;

      // Auto-create words array from text when none exists yet (LRC/SRT mode)
      let words = line.words ? [...line.words] : null;
      if (!words || words.length === 0) {
        if (!line.text) return prev;
        // Split preserving spaces: tokenize into word+space chunks
        const tokens = line.text.split(/(\s+)/);
        const newWords: EditorWord[] = [];
        for (const tok of tokens) {
          if (!tok) continue;
          if (/^\s+$/.test(tok)) {
            // Append space to the last word rather than creating a space entry
            if (newWords.length > 0) newWords[newWords.length - 1] = { ...newWords[newWords.length - 1], word: newWords[newWords.length - 1].word + tok };
          } else {
            newWords.push({ word: tok, time: null });
          }
        }
        words = newWords;
      }

      const w = words[wordIndex];
      if (!w) return prev;
      const current = w.singerIndex ?? null;
      const next = current === null ? 0 : current + 1 >= singers.length ? null : current + 1;
      words[wordIndex] = next === null
        ? (() => { const { singerIndex: _s, ...rest } = w; return rest; })()
        : { ...w, singerIndex: next };
      line.words = words;
      line.mode = normalizeLineMode(line);
      updated[lineIndex] = line;
      return updated;
    });
  }, [setLines, setModifiedLines]);

  /**
   * Directly set a word's singerIndex (used by paint mode, unlike cycle which rotates).
   * Pass singerIndex=null to remove attribution.
   */
  const handleSetWordSinger = useCallback((lineIndex, wordIndex, singerIndex) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[lineIndex] };
      const singers = line.singers || [];
      if (singers.length < 2) return prev;

      let words = line.words ? [...line.words] : null;
      if (!words || words.length === 0) {
        if (!line.text) return prev;
        const tokens = line.text.split(/(\s+)/);
        const newWords: EditorWord[] = [];
        for (const tok of tokens) {
          if (!tok) continue;
          if (/^\s+$/.test(tok)) {
            if (newWords.length > 0) newWords[newWords.length - 1] = { ...newWords[newWords.length - 1], word: newWords[newWords.length - 1].word + tok };
          } else {
            newWords.push({ word: tok, time: null });
          }
        }
        words = newWords;
      }

      const w = words[wordIndex];
      if (!w) return prev;
      words[wordIndex] = singerIndex === null
        ? (() => { const { singerIndex: _s, ...rest } = w; return rest; })()
        : { ...w, singerIndex };
      line.words = words;
      line.mode = normalizeLineMode(line);
      updated[lineIndex] = line;
      return updated;
    });
  }, [setLines, setModifiedLines]);

  // ── Number key shortcuts: 1-4 → assign singer, 0 → clear singers on active line ──
  useEffect(() => {
    const handleNumberKey = (e) => {
      // Don't fire if typing in an input, textarea, or select
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const idx = activeLineIndexRef.current;
      if (idx == null || idx < 0) return;
      const line = linesRef.current[idx];
      if (!line || line.type === 'section') return;

      if (e.key === '0') {
        // Clear all singers from the active line
        setModifiedLines(prev => new Set(prev).add(idx));
        setLines(prev => {
          const updated = [...prev];
          const next = { ...updated[idx], singers: undefined };
          next.mode = normalizeLineMode(next);
          updated[idx] = next;
          return updated;
        });
      } else if (e.key >= '1' && e.key <= '4') {
        const singerNum = parseInt(e.key, 10); // 1-indexed
        // Only do anything if the line has enough singers
        const singers = line.singers || [];
        if (singers.length < singerNum) return;
        const singerName = singers[singerNum - 1];
        if (!singerName) return;
        // Assign this singer to the whole line (adds to singers if not present)
        setModifiedLines(prev => new Set(prev).add(idx));
        setLines(prev => {
          const updated = [...prev];
          const existing = updated[idx].singers || [];
          // If singer not yet in array, append it; otherwise line already has it
          if (!existing.includes(singerName)) {
            const next = { ...updated[idx], singers: [...existing, singerName].slice(0, 4) };
            next.mode = normalizeLineMode(next);
            updated[idx] = next;
          }
          return updated;
        });
      }
    };

    window.addEventListener('keydown', handleNumberKey);
    return () => window.removeEventListener('keydown', handleNumberKey);
  }, [setLines, setModifiedLines]);

  const projectSingers = useMemo(() => {
    const s = new Set();
    for (const line of lines) {
      if (line.singers) {
        for (const singer of line.singers) {
          if (singer) s.add(singer);
        }
      }
    }
    return Array.from(s);
  }, [lines]);

  return {
    // state
    projectSingers,
    songSingers: projectSingers,
    rawText,
    setRawText,
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
    defaultSingers,
    dragIndex,
    dragOverIndex,
    selectedLines,
    setSelectedLines,
    awaitingEndMark,
    focusedTimestamp,
    setFocusedTimestamp,
    displayedActiveIndex,
    isActiveLineLocked,
    handleLineHover,
    handleLineHoverEnd,
    // refs
    listRef,
    fileInputRef,
    // handlers
    handleConfirmLyrics,
    handleFileUpload,
    handleUrlImport,
    shiftTime,
    handleMark,
    handleClearLine,
    handleClearTimestamps,
    handleClearAllWordTimestamps,
    handleClearActiveLineWordTimestamps,
    handleSaveLineText,
    handleToggleLineMode,
    handleDeleteLine,
    handleAddLine,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    handleApplyOffset,
    handleLineClick,
    clearSelection,
    handleToggleLine,
    handleBulkClearTimestamps,
    handleBulkDelete,
    handleBulkShift,
    handleClearWordTimestamp,
    handleSetActiveWordIndex,
    handleSetTimestamp,
    handleSetWordReading,
    stampTarget,
    handleStampTargetToggle,
    activeWordIndex,
    overlappingLines,
    modifiedLines,
    handleInsertSection,
    handleToggleSectionDepth,
    handleMoveToSection,
    handleAssignSinger,
    handleCycleWordSinger,
    handleSetWordSinger,
    clearModifiedLines: () => setModifiedLines(new Set()),
    // extras
    requestConfirm,
    confirmModal,
    settings,
    t,
    updateSetting,
  };
}
