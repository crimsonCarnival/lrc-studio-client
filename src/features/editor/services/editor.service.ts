/**
 * Pure functions for editor logic — no side effects, no React imports.
 */
import type { EditorLine, EditorWord, LineMode } from '../editor.types';

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
  wordIndex?: number;
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
 * Always skips section markers (they are headings, not lines to time), skips blank lines
 * when skipBlank is true, and skips already-timestamped lines when mode is 'next-unsynced'.
 */
function computeNextIndex(lines: EditorLine[], fromIndex: number, skipBlank?: boolean, mode?: string): number {
  let nextIndex = fromIndex + 1;
  while (nextIndex < lines.length) {
    const line = lines[nextIndex];
    const text = line?.text?.trim();
    if (line?.type === 'section') { nextIndex++; continue; }
    if (skipBlank && (!text || text === '♪')) { nextIndex++; continue; }
    if (mode === 'next-unsynced' && line?.timestamp != null) { nextIndex++; continue; }
    break;
  }
  // Ran off the end: stay on the last timable line rather than on a trailing section marker.
  if (nextIndex >= lines.length) {
    for (let i = lines.length - 1; i > fromIndex; i--) if (lines[i].type !== 'section') return i;
    return fromIndex;
  }
  return nextIndex;
}

/**
 * The time window a word of `lines[lineIndex]` may be placed in: from the line's
 * own start to where the line stops (its end time, else the start of the next
 * timed line). `max` is Infinity when nothing bounds the line from above, and
 * `min` is 0 for a line that has no start yet. A counterpart is bounded only by its own
 * end time: it is sung over the lines after it, so their starts do not end it.
 */
export function wordTimeBounds(lines: EditorLine[], lineIndex: number): { min: number; max: number } {
  const line = lines[lineIndex];
  const min = line?.timestamp ?? 0;
  let max = line?.endTime ?? Infinity;
  if (max === Infinity && line?.adLibOf == null) {
    for (let i = lineIndex + 1; i < lines.length; i++) {
      const next = lines[i];
      // Counterparts run alongside their parent line; they do not end it.
      if (next.type === 'section' || next.adLibOf != null || next.timestamp == null) continue;
      max = next.timestamp;
      break;
    }
  }
  // A line whose "end" is not after its start bounds nothing useful.
  return { min, max: max > min ? max : Infinity };
}

/** Keeps a word's time inside its line (see wordTimeBounds). */
export function clampWordTime(lines: EditorLine[], lineIndex: number, time: number): number {
  const { min, max } = wordTimeBounds(lines, lineIndex);
  return Math.min(max, Math.max(min, time));
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
 * Words mode: a line starts when its first word is sung, so `line.timestamp` and
 * `words[0].time` are two views of one instant. Every write to either side goes
 * through here, because once they drift the line highlights at one time while its
 * karaoke fill starts at another.
 *
 * Only the main layer is aligned. The romaji track is marked independently and a
 * mark there must not silently retime the Japanese word underneath it.
 */
export function alignLineStart(line: EditorLine, time: number): EditorLine {
  const next: EditorLine = { ...line, timestamp: time };
  const words = next.words as EditorWord[] | undefined;
  if (!words?.length || words[0].time === time) return next;
  const aligned = [...words];
  aligned[0] = { ...aligned[0], time };
  return { ...next, words: aligned };
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
export function applyMark(params: ApplyMarkParams): ApplyMarkResult {
  const { lines, activeLineIndex, focusedTimestamp } = params;
  // A section marker is a heading, never a mark target: if the cursor sits on one (clicked, or
  // the song starts with one), mark the first line under it, so a section start isn't a double mark.
  if (focusedTimestamp || lines[activeLineIndex]?.type !== 'section') return applyMarkAt(params);
  let target = activeLineIndex + 1;
  while (target < lines.length && lines[target].type === 'section') target++;
  if (target >= lines.length) return { nextLines: lines, nextActiveLineIndex: null, nextAwaitingEndMark: undefined };
  const result = applyMarkAt({ ...params, activeLineIndex: target });
  return result.nextActiveLineIndex == null ? { ...result, nextActiveLineIndex: target } : result;
}

function applyMarkAt({ lines, activeLineIndex, time, editorMode, activeWordIndex = 0, stampTarget = 'main', awaitingEndMark, focusedTimestamp, settings, forceAdvance = false }: ApplyMarkParams): ApplyMarkResult {
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
      if (focusedTimestamp.type === 'word' || focusedTimestamp.type === 'secondaryWord') {
        const wordField = focusedTimestamp.type === 'secondaryWord' ? 'secondaryWords' : 'words';
        const words = (line[wordField] as EditorWord[] | undefined) || [];
        const wi = focusedTimestamp.wordIndex ?? 0;
        if (wi >= 0 && wi < words.length) {
          const newWords = [...words];
          newWords[wi] = { ...newWords[wi], time };
          const stamped: EditorLine = { ...line, source: 'manual', [wordField]: newWords };
          updated[focusedTimestamp.lineIndex] = wi === 0 && wordField === 'words'
            ? alignLineStart(stamped, time)
            : stamped;

          const nextWordIdx = wi + 1;
          if (nextWordIdx < words.length) {
            return { nextLines: updated, nextActiveLineIndex: null, nextAwaitingEndMark: null, nextActiveWordIndex: nextWordIdx };
          } else {
            const nextIdx = (autoAdvance || forceAdvance) ? computeNextIndex(lines, focusedTimestamp.lineIndex, skipBlank, advanceMode) : null;
            return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
          }
        }
      } else if (focusedTimestamp.type === 'start') {
        const started: EditorLine = { ...line, source: 'manual', timestamp: time };
        updated[focusedTimestamp.lineIndex] = editorMode === 'words' ? alignLineStart(started, time) : started;
      } else {
        updated[focusedTimestamp.lineIndex] = {
          ...line,
          source: 'manual',
          endTime: Math.max(line.timestamp ?? 0, time),
        };
      }
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
      // Stamp line.timestamp + words[0] in one press. alignLineStart also snaps
      // the MAIN track's word[0] to this time, which is wrong when wordField is
      // secondaryWords — the romaji track is marked separately and must not pull
      // the main word along (see "alignLineStart — leaves the romaji track alone").
      const newWords = [...words];
      newWords[0] = { ...newWords[0], time };
      const stamped: EditorLine = { ...line, source: 'manual', [wordField]: newWords };
      updated[activeLineIndex] = wordField === 'words' ? alignLineStart(stamped, time) : { ...stamped, timestamp: time };
      if (words.length === 1) {
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
      const stamped: EditorLine = { ...line, [wordField]: newWords };
      // Re-marking the first word moves the line's start with it.
      updated[activeLineIndex] = clampedIdx === 0 && wordField === 'words'
        ? alignLineStart(stamped, time)
        : stamped;
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
  if (updated[activeLineIndex].adLibOf == null) {
    for (let j = activeLineIndex + 1; j < updated.length; j++) {
      if (updated[j].type === 'section') break;
      if (updated[j].adLibOf != null) {
        updated[j] = { ...updated[j], adLibOf: time };
      } else {
        break;
      }
    }
  }

  if (skipBlank) {
    const result = stampBlanks(updated, activeLineIndex, time, false);
    updated = result.lines;
  }

  const nextIdx = (autoAdvance || forceAdvance)
    ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode)
    : null;

  return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
}
