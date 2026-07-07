/**
 * Pure functions for editor logic — no side effects, no React imports.
 */

export interface EditorWord {
  word?: string;
  time?: number | null;
  reading?: string;
  singerIndex?: number;
}

export interface EditorTranslation {
  text?: string;
  language?: string;
}

export interface EditorLine {
  type?: string;
  text?: string;
  timestamp?: number | null;
  endTime?: number | null;
  words?: EditorWord[];
  secondaryWords?: EditorWord[];
  secondary?: string;
  translations?: EditorTranslation[];
  furigana?: unknown;
  singers?: string[];
  mode?: 'solo' | 'duet' | 'split';
  label?: string;
  id?: string | number;
  /** Tracks whether this line's timestamp was set by ASR ('asr') or manually ('manual').
   *  null = legacy/unknown lines (treated as manual). Cleared when timestamp is removed. */
  source?: 'manual' | 'asr' | null;
  // Lines carry other presentation fields preserved across spreads.
  [key: string]: unknown;
}

export type LineMode = 'solo' | 'duet' | 'split';

/**
 * Single source of truth for the singers/words ↔ mode invariant.
 * - 0/1 singers          → 'solo'
 * - any word attributed  → 'split'
 * - else explicit 'split' is preserved, otherwise multi-singer defaults to 'duet'
 */
export function normalizeLineMode(line: EditorLine): LineMode {
  const count = line.singers?.length ?? 0;
  if (count <= 1) return 'solo';
  const hasWordAttribution = (line.words ?? []).some((w) => w.singerIndex != null);
  if (hasWordAttribution) return 'split';
  return line.mode === 'split' ? 'split' : 'duet';
}

interface EditorSettings {
  autoAdvance?: { skipBlank?: boolean; enabled?: boolean; mode?: string };
  srt?: { snapToNextLine?: boolean; minSubtitleGap?: number };
}

interface FocusedTimestamp {
  lineIndex: number;
  type: string;
}

interface ApplyMarkParams {
  lines: EditorLine[];
  activeLineIndex: number;
  time: number;
  editorMode: string;
  activeWordIndex?: number;
  stampTarget?: string;
  awaitingEndMark?: number | null;
  focusedTimestamp?: FocusedTimestamp | null;
  settings: EditorSettings;
  forceAdvance?: boolean;
}

interface ApplyMarkResult {
  nextLines: EditorLine[];
  nextActiveLineIndex: number | null;
  nextAwaitingEndMark?: { lineIndex: number; mode: string } | null;
  nextActiveWordIndex?: number;
}

/**
 * Detect duplicate/overlapping timestamps within a threshold.
 * Returns a Set of line indices that have a timestamp within ±threshold of another line.
 */
export function detectDuplicateTimestamps(lines: EditorLine[], threshold = 0.05): Set<number> {
  const overlapping = new Set<number>();
  const timestamped: { index: number; time: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timestamp != null && lines[i].type !== 'section') {
      timestamped.push({ index: i, time: lines[i].timestamp as number });
    }
  }
  for (let a = 0; a < timestamped.length; a++) {
    for (let b = a + 1; b < timestamped.length; b++) {
      if (Math.abs(timestamped[a].time - timestamped[b].time) <= threshold) {
        overlapping.add(timestamped[a].index);
        overlapping.add(timestamped[b].index);
      }
    }
  }
  return overlapping;
}

/**
 * Computes the next active line index after marking.
 * Skips blank lines when skipBlank is true, skips already-timestamped lines when mode is 'next-unsynced'.
 */
function computeNextIndex(lines: EditorLine[], fromIndex: number, skipBlank?: boolean, mode?: string): number {
  let nextIndex = fromIndex + 1;
  while (nextIndex < lines.length) {
    const line = lines[nextIndex];
    const text = line?.text?.trim();
    if (skipBlank && (!text || text === '♪')) { nextIndex++; continue; }
    if (mode === 'next-unsynced' && line?.timestamp != null) { nextIndex++; continue; }
    break;
  }
  return Math.min(nextIndex, lines.length - 1);
}

/**
 * Applies a timestamp shift delta to all lines whose indices are in the selection set.
 * Also shifts endTime if present.
 */
export function applyBulkShift(lines: EditorLine[], selectedIndices: Set<number>, delta: number): EditorLine[] {
  const numericDelta = Number(delta) || 0;
  return lines.map((l, idx) => {
    if (!selectedIndices.has(idx) || l.timestamp == null) return l;
    const newTimestamp = Math.max(0, Number(l.timestamp) + numericDelta);
    if (isNaN(newTimestamp)) return l;
    const result: EditorLine = { ...l, timestamp: newTimestamp };
    if (result.endTime != null) {
      result.endTime = Math.max(0, Number(l.endTime) + numericDelta);
    }
    return result;
  });
}

/**
 * Applies a global offset shift (delta) to all lines with timestamps.
 */
export function applyGlobalOffset(lines: EditorLine[], delta: number): EditorLine[] {
  const numericDelta = Number(delta);
  if (isNaN(numericDelta) || numericDelta === 0) return lines;
  return lines.map((l) => ({
    ...l,
    timestamp: l.timestamp != null ? Math.max(0, l.timestamp + numericDelta) : null,
    endTime: l.endTime != null ? Math.max(0, l.endTime + numericDelta) : l.endTime,
  }));
}

/**
 * Clears all timestamps (and optionally endTimes for SRT mode, or word times for words mode).
 */
export function clearAllTimestamps(lines: EditorLine[], isSrt?: boolean, isWords?: boolean): EditorLine[] {
  return lines.map((l) => ({
    ...l,
    timestamp: null,
    source: null,
    ...(isSrt && { endTime: null }),
    ...(isWords && l.words && { words: l.words.map((w) => ({ ...w, time: null })) }),
  }));
}

/**
 * Clears the timestamp for a single line.
 */
export function clearLineTimestamp(lines: EditorLine[], index: number, isSrt?: boolean, isWords?: boolean): EditorLine[] {
  return lines.map((l, i) =>
    i === index
      ? {
          ...l,
          timestamp: null,
          source: null,
          ...(isSrt && { endTime: null }),
          ...(isWords && l.words && { words: l.words.map((w) => ({ ...w, time: null })) }),
        }
      : l,
  );
}

/**
 * Stamps blank lines between fromIndex+1 and the next non-blank line with the given time.
 * Returns a new array with blanks stamped.
 */
function stampBlanks(lines: EditorLine[], fromIndex: number, time: number, isSrt?: boolean): { lines: EditorLine[]; nextBlankEnd: number } {
  const updated = [...lines];
  let nextIndex = fromIndex + 1;
  while (nextIndex < updated.length) {
    const text = updated[nextIndex]?.text?.trim();
    if (text && text !== '♪') break;
    nextIndex++;
  }
  for (let i = fromIndex + 1; i < nextIndex; i++) {
    updated[i] = isSrt
      ? { ...updated[i], timestamp: time, endTime: time }
      : { ...updated[i], timestamp: time };
  }
  return { lines: updated, nextBlankEnd: nextIndex };
}

/**
 * Pure function that computes the next lines state and side-effects from a mark action.
 * nextActiveLineIndex is null if unchanged, nextAwaitingEndMark is null to clear or an object to set.
 * nextActiveWordIndex is only present in 'words' mode.
 */
export function applyMark({ lines, activeLineIndex, time, editorMode, activeWordIndex = 0, stampTarget = 'main', awaitingEndMark, focusedTimestamp, settings, forceAdvance = false }: ApplyMarkParams): ApplyMarkResult {
  if (activeLineIndex >= lines.length) {
    return { nextLines: lines, nextActiveLineIndex: null, nextAwaitingEndMark: undefined };
  }

  const skipBlank = settings.autoAdvance?.skipBlank;
  const autoAdvance = settings.autoAdvance?.enabled;
  const advanceMode = settings.autoAdvance?.mode;
  const isSrt = editorMode === 'srt';

  // Focused timestamp takes priority
  if (focusedTimestamp) {
    const updated = [...lines];
    const line = updated[focusedTimestamp.lineIndex];
    if (line) {
      updated[focusedTimestamp.lineIndex] = {
        ...line,
        source: 'manual',
        ...(focusedTimestamp.type === 'start'
          ? { timestamp: time }
          : { endTime: Math.max(line.timestamp ?? 0, time) }),
      };
    }
    return { nextLines: updated, nextActiveLineIndex: null, nextAwaitingEndMark: undefined };
  }

  const isWords = editorMode === 'words';

  if (isWords) {
    const updated = [...lines];
    const line = updated[activeLineIndex];
    const wordField = stampTarget === 'secondary' ? 'secondaryWords' : 'words';
    const words = (line[wordField] as EditorWord[] | undefined) || [];

    // First press on this line with no prior timestamp: set line.timestamp AND stamp word[0]
    // so that every Enter iterates through words directly (not a two-step line→words sequence).
    if (line.timestamp == null) {
      if (!words.length) {
        // No words at all — stamp line only and advance
        updated[activeLineIndex] = { ...line, timestamp: time, source: 'manual' };
        const nextIdx = (autoAdvance || forceAdvance) ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode) : null;
        return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
      }
      // Stamp line.timestamp + words[0] in one press
      const newWords = [...words];
      newWords[0] = { ...newWords[0], time };
      updated[activeLineIndex] = { ...line, timestamp: time, source: 'manual', [wordField]: newWords };
      if (newWords.length === 1) {
        const nextIdx = (autoAdvance || forceAdvance) ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode) : null;
        return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
      }
      return { nextLines: updated, nextActiveLineIndex: null, nextAwaitingEndMark: null, nextActiveWordIndex: 1 };
    }

    // Subsequent presses: stamp words one by one
    const clampedIdx = Math.min(activeWordIndex, words.length - 1);
    if (clampedIdx >= 0) {
      const newWords = [...words];
      newWords[clampedIdx] = { ...newWords[clampedIdx], time };
      updated[activeLineIndex] = { ...line, [wordField]: newWords };
      const nextWordIdx = clampedIdx + 1;
      if (nextWordIdx >= words.length) {
        // All words stamped — advance line
        const nextIdx = (autoAdvance || forceAdvance) ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode) : null;
        return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
      }
      return { nextLines: updated, nextActiveLineIndex: null, nextAwaitingEndMark: null, nextActiveWordIndex: nextWordIdx };
    }

    // Safety: advance if out of bounds
    const nextIdx = (autoAdvance || forceAdvance) ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode) : null;
    return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
  }

  if (isSrt) {
    if (settings.srt?.snapToNextLine) {
      let updated = [...lines];

      // Close previous line's endTime
      let lastSyncedIndex = activeLineIndex - 1;
      while (lastSyncedIndex >= 0 && updated[lastSyncedIndex].timestamp == null) {
        lastSyncedIndex--;
      }
      if (lastSyncedIndex >= 0 && updated[lastSyncedIndex].endTime == null) {
        updated[lastSyncedIndex] = {
          ...updated[lastSyncedIndex],
          endTime: Math.max(
            updated[lastSyncedIndex].timestamp ?? 0,
            time - (settings.srt?.minSubtitleGap || 0),
          ),
        };
      }

      updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time, source: 'manual' };

      if (skipBlank) {
        const result = stampBlanks(updated, activeLineIndex, time, true);
        updated = result.lines;
      }

      const nextIdx = (autoAdvance || forceAdvance)
        ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode)
        : null;

      return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
    }

    // SRT non-snap mode
    if (awaitingEndMark === activeLineIndex) {
      let updated = [...lines];
      updated[activeLineIndex] = {
        ...updated[activeLineIndex],
        endTime: Math.max(updated[activeLineIndex].timestamp ?? 0, time),
      };

      if (skipBlank) {
        const result = stampBlanks(updated, activeLineIndex, time, true);
        updated = result.lines;
      }

      const nextIdx = (autoAdvance || forceAdvance)
        ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode)
        : null;

      return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
    }

    // SRT first mark on line (set start time)
    const updated = [...lines];
    updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time, source: 'manual' };
    return {
      nextLines: updated,
      nextActiveLineIndex: null,
      nextAwaitingEndMark: { lineIndex: activeLineIndex, mode: editorMode },
    };
  }

  // LRC mode
  let updated = [...lines];
  updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time, source: 'manual' };

  if (skipBlank) {
    const result = stampBlanks(updated, activeLineIndex, time, false);
    updated = result.lines;
  }

  const nextIdx = (autoAdvance || forceAdvance)
    ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode)
    : null;

  return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
}
