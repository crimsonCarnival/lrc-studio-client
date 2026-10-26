import { useCallback } from 'react';
import { hasCJK } from '@/shared/utils/furigana';
import { groupMorphemes } from '@/features/editor/utils/morpheme-group';
import { normalizeLineMode } from '../services/editor.service';
import type { Dispatch, SetStateAction } from 'react';
import type { EditorLine, EditorWord } from '@/features/editor/editor.types';

interface UseWordsModeParams {
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  /** Dirty tracking is owned by useEditor; these handlers only ever add to it. */
  setModifiedLines: Dispatch<SetStateAction<Set<number>>>;
}

/**
 * Per-word editing: readings, chip grouping, per-word timestamps and singer attribution.
 *
 * Split out of useEditor because every handler here needs exactly two things — setLines and
 * setModifiedLines — and none of that hook's eighteen state slots. The two clear-timestamp
 * handlers stayed behind deliberately: they need the confirm dialog and the current
 * lines/activeLineIndex, so moving them would have added coupling rather than removed it.
 */
export function useWordsMode({ setLines, setModifiedLines }: UseWordsModeParams) {
  const handleSetWordReading = useCallback((lineIndex: number, wordIndex: number, reading: string | null) => {
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

  /**
   * Repairs for the cases automatic grouping cannot settle: a kana prefix that
   * belongs to the kanji after it, a 熟字訓 whose reading does not decompose, or
   * a chip the rules joined that the singer actually holds apart.
   *
   * The merged chip keeps the earlier timestamp, because that is when the sound
   * it now covers begins.
   */
  const handleMergeWordWithNext = useCallback((lineIndex: number, wordIndex: number) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[lineIndex] };
      const words = [...(line.words || [])];
      const a = words[wordIndex];
      const b = words[wordIndex + 1];
      if (!a || !b) return prev;
      const merged: EditorWord = { ...a, word: (a.word || '') + (b.word || '') };
      const time = a.time ?? b.time ?? null;
      if (time == null) delete merged.time; else merged.time = time;
      const reading = a.reading || b.reading;
      if (reading) merged.reading = reading; else delete merged.reading;
      words.splice(wordIndex, 2, merged);
      line.words = words;
      updated[lineIndex] = line;
      return updated;
    });
  }, [setLines, setModifiedLines]);

  /**
   * Breaks a chip back into single characters so it can be regrouped by hand.
   * Deliberately not a guess at the "right" split point: the first character
   * keeps the timestamp and the rest start untimed.
   */
  const handleSplitWord = useCallback((lineIndex: number, wordIndex: number) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[lineIndex] };
      const words = [...(line.words || [])];
      const target = words[wordIndex];
      const chars = [...(target?.word || '')];
      if (!target || chars.length < 2) return prev;
      const pieces = chars.map((ch, i) => (i === 0
        ? { ...target, word: ch }
        : { word: ch, time: null }));
      words.splice(wordIndex, 1, ...pieces);
      line.words = words;
      updated[lineIndex] = line;
      return updated;
    });
  }, [setLines, setModifiedLines]);

  /** Re-runs automatic grouping over a line, keeping times and readings where the text still matches. */
  const handleRegroupLine = useCallback((lineIndex: number) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[lineIndex] };
      if (!hasCJK(line.text || '')) return prev;
      const oldTimeAtPos = new Map<number, number | null>();
      const oldReadingByText = new Map<string | undefined, string>();
      let flat = 0;
      for (const w of line.words || []) {
        oldTimeAtPos.set(flat, w.time ?? null);
        flat += [...(w.word || '')].length;
        if (w.reading) oldReadingByText.set(w.word, w.reading);
      }
      let charPos = 0;
      line.words = groupMorphemes(line.text || '').map((token) => {
        const w: EditorWord = { word: token.text, time: oldTimeAtPos.get(charPos) ?? null };
        const reading = oldReadingByText.get(token.text) ?? oldReadingByText.get(token.kanji);
        if (reading) w.reading = reading;
        charPos += [...token.text].length;
        return w;
      });
      updated[lineIndex] = line;
      return updated;
    });
  }, [setLines, setModifiedLines]);

  const handleClearWordTimestamp = useCallback((lineIndex: number, wordIndex: number, field: string = 'words') => {
    setLines((prev) => {
      const updated = [...prev];
      const line = updated[lineIndex];
      if (!line?.[field]) return prev;
      const newWords = [...(line[field] as EditorWord[])];
      newWords[wordIndex] = { ...newWords[wordIndex], time: null };
      updated[lineIndex] = { ...line, [field]: newWords };
      return updated;
    });
    // activeWordIndex is synced by the lines effect in useEditor
  }, [setLines]);

  const handleCycleWordSinger = useCallback((lineIndex: number, wordIndex: number) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => applyToWordSinger(prev, lineIndex, wordIndex, (current, singerCount) => (
      current === null ? 0 : current + 1 >= singerCount ? null : current + 1
    )));
  }, [setLines, setModifiedLines]);

  /**
   * Directly set a word's singerIndex (unlike cycle which rotates).
   * Pass singerIndex=null to remove attribution.
   */
  const handleSetWordSinger = useCallback((lineIndex: number, wordIndex: number, singerIndex: number | null) => {
    setModifiedLines(prev => new Set(prev).add(lineIndex));
    setLines((prev) => applyToWordSinger(prev, lineIndex, wordIndex, () => singerIndex));
  }, [setLines, setModifiedLines]);

  return {
    handleSetWordReading,
    handleMergeWordWithNext,
    handleSplitWord,
    handleRegroupLine,
    handleClearWordTimestamp,
    handleCycleWordSinger,
    handleSetWordSinger,
  };
}

/**
 * A duet/split line can be attributed per word before it has any word timings, which is the
 * only reason this exists: LRC and SRT lines carry text but no words[], so the first
 * attribution has to derive the tokens. Spaces are appended to the preceding word rather
 * than kept as entries of their own, so the token count still matches what gets rendered.
 */
function ensureWords(line: EditorLine): EditorWord[] | null {
  if (line.words && line.words.length > 0) return [...line.words];
  if (!line.text) return null;
  const tokens = line.text.split(/(\s+)/);
  const words: EditorWord[] = [];
  for (const tok of tokens) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) {
      if (words.length > 0) words[words.length - 1] = { ...words[words.length - 1], word: words[words.length - 1].word + tok };
    } else {
      words.push({ word: tok, time: null });
    }
  }
  return words;
}

/**
 * Shared body of cycle/set: both were the same twenty lines apart from how the next
 * singerIndex is chosen, including a verbatim copy of the token-derivation above.
 */
function applyToWordSinger(
  lines: EditorLine[],
  lineIndex: number,
  wordIndex: number,
  nextIndexOf: (current: number | null, singerCount: number) => number | null,
): EditorLine[] {
  const updated = [...lines];
  const line = { ...updated[lineIndex] };
  const singers = line.singers || [];
  if (singers.length < 2) return lines;

  const words = ensureWords(line);
  if (!words) return lines;

  const w = words[wordIndex];
  if (!w) return lines;

  const next = nextIndexOf(w.singerIndex ?? null, singers.length);
  words[wordIndex] = next === null
    ? (() => { const { singerIndex: _s, ...rest } = w; return rest; })()
    : { ...w, singerIndex: next };
  line.words = words;
  line.mode = normalizeLineMode(line);
  updated[lineIndex] = line;
  return updated;
}
