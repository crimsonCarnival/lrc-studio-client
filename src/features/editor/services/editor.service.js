/**
 * Pure functions for editor logic — no side effects, no React imports.
 */

/**
 * Detect duplicate/overlapping timestamps within a threshold.
 * Returns a Set of line indices that have a timestamp within ±threshold of another line.
 * @param {Array} lines
 * @param {number} threshold - seconds (default 0.05)
 * @returns {Set<number>}
 */
export function detectDuplicateTimestamps(lines, threshold = 0.05) {
  const overlapping = new Set();
  const timestamped = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timestamp != null && lines[i].type !== 'section') {
      timestamped.push({ index: i, time: lines[i].timestamp });
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
function computeNextIndex(lines, fromIndex, skipBlank, mode) {
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
export function applyBulkShift(lines, selectedIndices, delta) {
  const numericDelta = Number(delta) || 0;
  return lines.map((l, idx) => {
    if (!selectedIndices.has(idx) || l.timestamp == null) return l;
    const newTimestamp = Math.max(0, Number(l.timestamp) + numericDelta);
    if (isNaN(newTimestamp)) return l;
    const result = { ...l, timestamp: newTimestamp };
    if (result.endTime != null) {
      result.endTime = Math.max(0, Number(l.endTime) + numericDelta);
    }
    return result;
  });
}

/**
 * Applies a global offset shift (delta) to all lines with timestamps.
 */
export function applyGlobalOffset(lines, delta) {
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
export function clearAllTimestamps(lines, isSrt, isWords) {
  return lines.map((l) => ({
    ...l,
    timestamp: null,
    ...(isSrt && { endTime: null }),
    ...(isWords && l.words && { words: l.words.map((w) => ({ ...w, time: null })) }),
  }));
}

/**
 * Clears the timestamp for a single line.
 */
export function clearLineTimestamp(lines, index, isSrt, isWords) {
  return lines.map((l, i) =>
    i === index
      ? {
          ...l,
          timestamp: null,
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
function stampBlanks(lines, fromIndex, time, isSrt) {
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
 *
 * @param {object} params
 * @param {Array} params.lines - current lines array
 * @param {number} params.activeLineIndex
 * @param {number} params.time - current playback time
 * @param {string} params.editorMode - 'lrc' | 'srt' | 'words'
 * @param {number} params.activeWordIndex - current word index being stamped (words mode)
 * @param {number|null} params.awaitingEndMark - line index awaiting end mark, or null
 * @param {object|null} params.focusedTimestamp - { lineIndex, type } or null
 * @param {object} params.settings - editor settings subtree
 *
 * @returns {{ nextLines: Array, nextActiveLineIndex: number|null, nextAwaitingEndMark: object|null, nextActiveWordIndex?: number }}
 *   nextActiveLineIndex is null if unchanged, nextAwaitingEndMark is null to clear or an object to set.
 *   nextActiveWordIndex is only present in 'words' mode.
 */
export function applyMark({ lines, activeLineIndex, time, editorMode, activeWordIndex = 0, stampTarget = 'main', awaitingEndMark, focusedTimestamp, settings, forceAdvance = false }) {
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
    const words = line[wordField] || [];

    // First press on this line with no prior timestamp: set line.timestamp AND stamp word[0]
    // so that every Enter iterates through words directly (not a two-step line→words sequence).
    if (line.timestamp == null) {
      if (!words.length) {
        // No words at all — stamp line only and advance
        updated[activeLineIndex] = { ...line, timestamp: time };
        const nextIdx = (autoAdvance || forceAdvance) ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode) : null;
        return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
      }
      // Stamp line.timestamp + words[0] in one press
      const newWords = [...words];
      newWords[0] = { ...newWords[0], time };
      updated[activeLineIndex] = { ...line, timestamp: time, [wordField]: newWords };
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

      updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };

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
    updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };
    return {
      nextLines: updated,
      nextActiveLineIndex: null,
      nextAwaitingEndMark: { lineIndex: activeLineIndex, mode: editorMode },
    };
  }

  // LRC mode
  let updated = [...lines];
  updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };

  if (skipBlank) {
    const result = stampBlanks(updated, activeLineIndex, time, false);
    updated = result.lines;
  }

  const nextIdx = (autoAdvance || forceAdvance)
    ? computeNextIndex(lines, activeLineIndex, skipBlank, advanceMode)
    : null;

  return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
}
