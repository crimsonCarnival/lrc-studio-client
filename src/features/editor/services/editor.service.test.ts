// @vitest-environment node
/**
 * applyMark and the timestamp transforms.
 *
 * applyMark is the pure core of sync mode: one keypress in, a new lines array
 * plus the next cursor position out. It branches on editor mode, auto-advance
 * mode, SRT snap, words-mode word cursor and focused-timestamp overrides, and
 * every branch is reachable from the same key. Nothing else in the editor has
 * this much behaviour per line of code.
 */
import { describe, it, expect } from 'vitest';
import {
  applyMark,
  applyBulkShift,
  applyGlobalOffset,
  clearAllTimestamps,
  clearLineTimestamp,
  detectDuplicateTimestamps,
} from './editor.service';
import type { EditorLine } from './editor.service';

type Settings = Parameters<typeof applyMark>[0]['settings'];

const settings = (over: Record<string, unknown> = {}): Settings =>
  ({
    autoAdvance: { enabled: true, mode: 'next', skipBlank: false },
    srt: { snapToNextLine: false, minSubtitleGap: 0 },
    ...over,
  } as Settings);

const line = (text: string, extra: Partial<EditorLine> = {}): EditorLine =>
  ({ text, timestamp: null, ...extra } as EditorLine);

const mark = (over: Partial<Parameters<typeof applyMark>[0]>) =>
  applyMark({
    lines: [],
    activeLineIndex: 0,
    time: 10,
    editorMode: 'lrc',
    settings: settings(),
    ...over,
  } as Parameters<typeof applyMark>[0]);

describe('applyMark — LRC mode', () => {
  it('stamps the active line and advances', () => {
    const lines = [line('one'), line('two')];
    const res = mark({ lines, activeLineIndex: 0, time: 12.5, editorMode: 'lrc' });
    expect(res.nextLines[0].timestamp).toBe(12.5);
    expect(res.nextActiveLineIndex).toBe(1);
  });

  it('tags the stamp as manual, distinguishing it from an Auto Stamp result', () => {
    const res = mark({ lines: [line('one')], editorMode: 'lrc' });
    expect(res.nextLines[0].source).toBe('manual');
  });

  it('does not mutate the input array', () => {
    const lines = [line('one'), line('two')];
    mark({ lines, editorMode: 'lrc' });
    expect(lines[0].timestamp).toBeNull();
  });

  it('leaves other lines untouched', () => {
    const lines = [line('one'), line('two', { timestamp: 99 })];
    const res = mark({ lines, activeLineIndex: 0, editorMode: 'lrc' });
    expect(res.nextLines[1].timestamp).toBe(99);
  });

  it('overwrites an existing timestamp on re-mark', () => {
    const lines = [line('one', { timestamp: 5 })];
    const res = mark({ lines, time: 20, editorMode: 'lrc' });
    expect(res.nextLines[0].timestamp).toBe(20);
  });

  it('clears any pending end-mark state', () => {
    const res = mark({ lines: [line('one')], editorMode: 'lrc', awaitingEndMark: 0 });
    expect(res.nextAwaitingEndMark).toBeNull();
  });

  it('is a no-op when the active index is past the end', () => {
    const lines = [line('one')];
    const res = mark({ lines, activeLineIndex: 5, editorMode: 'lrc' });
    expect(res.nextLines).toBe(lines);
    expect(res.nextActiveLineIndex).toBeNull();
  });
});

describe('applyMark — auto-advance modes', () => {
  it('stays on the line when auto-advance is off', () => {
    const res = mark({
      lines: [line('one'), line('two')],
      settings: settings({ autoAdvance: { enabled: false, mode: 'next', skipBlank: false } }),
    });
    expect(res.nextActiveLineIndex).toBeNull();
    expect(res.nextLines[0].timestamp).toBe(10); // still stamps
  });

  it('advances anyway when forceAdvance overrides the setting', () => {
    const res = mark({
      lines: [line('one'), line('two')],
      forceAdvance: true,
      settings: settings({ autoAdvance: { enabled: false, mode: 'next', skipBlank: false } }),
    });
    expect(res.nextActiveLineIndex).toBe(1);
  });

  it('next-unsynced skips lines that already have a timestamp', () => {
    const lines = [line('one'), line('two', { timestamp: 1 }), line('three', { timestamp: 2 }), line('four')];
    const res = mark({
      lines,
      activeLineIndex: 0,
      settings: settings({ autoAdvance: { enabled: true, mode: 'next-unsynced', skipBlank: false } }),
    });
    expect(res.nextActiveLineIndex).toBe(3);
  });

  it('skipBlank skips empty lines and the musical-interlude marker', () => {
    const lines = [line('one'), line('   '), line('♪'), line('four')];
    const res = mark({
      lines,
      activeLineIndex: 0,
      settings: settings({ autoAdvance: { enabled: true, mode: 'next', skipBlank: true } }),
    });
    expect(res.nextActiveLineIndex).toBe(3);
  });

  it('stamps the blanks it skips with the same time, so gaps are not left unsynced', () => {
    const lines = [line('one'), line(''), line('♪'), line('four')];
    const res = mark({
      lines,
      activeLineIndex: 0,
      time: 7,
      settings: settings({ autoAdvance: { enabled: true, mode: 'next', skipBlank: true } }),
    });
    expect(res.nextLines[1].timestamp).toBe(7);
    expect(res.nextLines[2].timestamp).toBe(7);
    expect(res.nextLines[3].timestamp).toBeNull();
  });

  it('clamps to the last line rather than running off the end', () => {
    const res = mark({ lines: [line('one'), line('two')], activeLineIndex: 1 });
    expect(res.nextActiveLineIndex).toBe(1);
  });

  it('clamps when next-unsynced finds nothing unsynced ahead', () => {
    const lines = [line('one'), line('two', { timestamp: 1 })];
    const res = mark({
      lines,
      activeLineIndex: 0,
      settings: settings({ autoAdvance: { enabled: true, mode: 'next-unsynced', skipBlank: false } }),
    });
    expect(res.nextActiveLineIndex).toBe(1);
  });
});

describe('applyMark — SRT mode', () => {
  it('first press sets the start time and waits for the end mark', () => {
    const lines = [line('one'), line('two')];
    const res = mark({ lines, time: 5, editorMode: 'srt' });
    expect(res.nextLines[0].timestamp).toBe(5);
    expect(res.nextLines[0].endTime).toBeUndefined();
    expect(res.nextActiveLineIndex).toBeNull();
    expect(res.nextAwaitingEndMark).toEqual({ lineIndex: 0, mode: 'srt' });
  });

  it('second press sets the end time and advances', () => {
    const lines = [line('one', { timestamp: 5 }), line('two')];
    const res = mark({ lines, time: 9, editorMode: 'srt', awaitingEndMark: 0 });
    expect(res.nextLines[0].endTime).toBe(9);
    expect(res.nextActiveLineIndex).toBe(1);
    expect(res.nextAwaitingEndMark).toBeNull();
  });

  it('never lets endTime fall below the start time', () => {
    // Seeking backwards between the two presses must not produce an inverted
    // block, which would fail SRT validation downstream.
    const lines = [line('one', { timestamp: 12 })];
    const res = mark({ lines, time: 4, editorMode: 'srt', awaitingEndMark: 0 });
    expect(res.nextLines[0].endTime).toBe(12);
  });

  it('an end-mark pending on a different line is treated as a fresh start mark', () => {
    const lines = [line('one', { timestamp: 1 }), line('two')];
    const res = mark({ lines, activeLineIndex: 1, time: 8, editorMode: 'srt', awaitingEndMark: 0 });
    expect(res.nextLines[1].timestamp).toBe(8);
    expect(res.nextAwaitingEndMark).toEqual({ lineIndex: 1, mode: 'srt' });
  });

  describe('snapToNextLine', () => {
    const snap = (over: Record<string, unknown> = {}) =>
      settings({ srt: { snapToNextLine: true, minSubtitleGap: 0, ...over } });

    it('stamps the start and closes the previous line in one press', () => {
      const lines = [line('one', { timestamp: 2 }), line('two')];
      const res = mark({ lines, activeLineIndex: 1, time: 6, editorMode: 'srt', settings: snap() });
      expect(res.nextLines[0].endTime).toBe(6);
      expect(res.nextLines[1].timestamp).toBe(6);
      expect(res.nextAwaitingEndMark).toBeNull();
    });

    it('subtracts the configured minimum gap from the closed line', () => {
      const lines = [line('one', { timestamp: 2 }), line('two')];
      const res = mark({ lines, activeLineIndex: 1, time: 6, editorMode: 'srt', settings: snap({ minSubtitleGap: 0.5 }) });
      expect(res.nextLines[0].endTime).toBe(5.5);
    });

    it('does not push the closed line below its own start time', () => {
      const lines = [line('one', { timestamp: 5.9 }), line('two')];
      const res = mark({ lines, activeLineIndex: 1, time: 6, editorMode: 'srt', settings: snap({ minSubtitleGap: 2 }) });
      expect(res.nextLines[0].endTime).toBe(5.9);
    });

    it('skips back over unsynced lines to find the one to close', () => {
      const lines = [line('one', { timestamp: 2 }), line('gap'), line('three')];
      const res = mark({ lines, activeLineIndex: 2, time: 9, editorMode: 'srt', settings: snap() });
      expect(res.nextLines[0].endTime).toBe(9);
      expect(res.nextLines[1].endTime).toBeUndefined();
    });

    it('leaves an already-closed previous line alone', () => {
      const lines = [line('one', { timestamp: 2, endTime: 3 }), line('two')];
      const res = mark({ lines, activeLineIndex: 1, time: 6, editorMode: 'srt', settings: snap() });
      expect(res.nextLines[0].endTime).toBe(3);
    });

    it('handles the very first line, with nothing to close', () => {
      const res = mark({ lines: [line('one'), line('two')], time: 1, editorMode: 'srt', settings: snap() });
      expect(res.nextLines[0].timestamp).toBe(1);
    });
  });
});

describe('applyMark — words mode', () => {
  const words = (...ws: string[]) => ws.map((word) => ({ word, time: null }));

  it('first press stamps both the line and the first word', () => {
    const lines = [line('one two', { words: words('one', 'two') } as Partial<EditorLine>)];
    const res = mark({ lines, time: 3, editorMode: 'words' });
    expect(res.nextLines[0].timestamp).toBe(3);
    expect(res.nextLines[0].words?.[0].time).toBe(3);
    expect(res.nextActiveWordIndex).toBe(1);
    expect(res.nextActiveLineIndex).toBeNull();
  });

  it('later presses walk the word cursor without touching the line', () => {
    const lines = [line('one two three', {
      timestamp: 3,
      words: [{ word: 'one', time: 3 }, { word: 'two', time: null }, { word: 'three', time: null }],
    } as Partial<EditorLine>)];
    const res = mark({ lines, time: 4, editorMode: 'words', activeWordIndex: 1 });
    expect(res.nextLines[0].words?.[1].time).toBe(4);
    expect(res.nextLines[0].timestamp).toBe(3);
    expect(res.nextActiveWordIndex).toBe(2);
  });

  it('advances the line and resets the word cursor after the last word', () => {
    const lines = [
      line('one two', { timestamp: 3, words: [{ word: 'one', time: 3 }, { word: 'two', time: null }] } as Partial<EditorLine>),
      line('next'),
    ];
    const res = mark({ lines, time: 5, editorMode: 'words', activeWordIndex: 1 });
    expect(res.nextLines[0].words?.[1].time).toBe(5);
    expect(res.nextActiveLineIndex).toBe(1);
    expect(res.nextActiveWordIndex).toBe(0);
  });

  it('advances immediately for a single-word line', () => {
    const lines = [line('one', { words: words('one') } as Partial<EditorLine>), line('two')];
    const res = mark({ lines, time: 3, editorMode: 'words' });
    expect(res.nextActiveLineIndex).toBe(1);
    expect(res.nextActiveWordIndex).toBe(0);
  });

  it('stamps the line only when it has no word tokens', () => {
    const lines = [line('untokenized'), line('two')];
    const res = mark({ lines, time: 3, editorMode: 'words' });
    expect(res.nextLines[0].timestamp).toBe(3);
    expect(res.nextActiveLineIndex).toBe(1);
  });

  it('clamps a word cursor that has run past the token list', () => {
    const lines = [line('one', { timestamp: 1, words: [{ word: 'one', time: null }] } as Partial<EditorLine>), line('two')];
    const res = mark({ lines, time: 5, editorMode: 'words', activeWordIndex: 99 });
    expect(res.nextLines[0].words?.[0].time).toBe(5);
    expect(res.nextActiveLineIndex).toBe(1);
  });

  it('targets the secondary track when asked', () => {
    const lines = [line('one', {
      timestamp: 1,
      words: [{ word: 'one', time: 1 }],
      secondaryWords: [{ word: 'ichi', time: null }],
    } as Partial<EditorLine>)];
    const res = mark({ lines, time: 6, editorMode: 'words', stampTarget: 'secondary', activeWordIndex: 0 });
    expect(res.nextLines[0].secondaryWords?.[0].time).toBe(6);
    expect(res.nextLines[0].words?.[0].time).toBe(1);
  });

  it('preserves per-word singer attribution while stamping', () => {
    const lines = [line('a b', {
      timestamp: 1,
      words: [{ word: 'a', time: 1, singerIndex: 0 }, { word: 'b', time: null, singerIndex: 1 }],
    } as Partial<EditorLine>)];
    const res = mark({ lines, time: 2, editorMode: 'words', activeWordIndex: 1 });
    expect(res.nextLines[0].words?.[1]).toMatchObject({ time: 2, singerIndex: 1 });
  });
});

describe('applyMark — focused timestamp override', () => {
  it('stamps the focused line start and stays put', () => {
    const lines = [line('one'), line('two')];
    const res = mark({ lines, activeLineIndex: 0, time: 9, focusedTimestamp: { lineIndex: 1, type: 'start' } });
    expect(res.nextLines[1].timestamp).toBe(9);
    expect(res.nextLines[0].timestamp).toBeNull();
    expect(res.nextActiveLineIndex).toBeNull();
  });

  it('stamps the focused end time without inverting the block', () => {
    const lines = [line('one', { timestamp: 10 })];
    const res = mark({ lines, time: 3, editorMode: 'srt', focusedTimestamp: { lineIndex: 0, type: 'end' } });
    expect(res.nextLines[0].endTime).toBe(10);
  });

  it('stamps a focused word and moves to the next word', () => {
    const lines = [line('a b', { words: [{ word: 'a', time: null }, { word: 'b', time: null }] } as Partial<EditorLine>)];
    const res = mark({ lines, time: 4, editorMode: 'words', focusedTimestamp: { lineIndex: 0, type: 'word', wordIndex: 0 } });
    expect(res.nextLines[0].words?.[0].time).toBe(4);
    expect(res.nextActiveWordIndex).toBe(1);
  });

  it('advances the line after the focused last word', () => {
    const lines = [
      line('a', { words: [{ word: 'a', time: null }] } as Partial<EditorLine>),
      line('next'),
    ];
    const res = mark({ lines, time: 4, editorMode: 'words', focusedTimestamp: { lineIndex: 0, type: 'word', wordIndex: 0 } });
    expect(res.nextActiveLineIndex).toBe(1);
    expect(res.nextActiveWordIndex).toBe(0);
  });

  it('ignores a focused word index that is out of range', () => {
    const lines = [line('a', { words: [{ word: 'a', time: null }] } as Partial<EditorLine>)];
    const res = mark({ lines, time: 4, editorMode: 'words', focusedTimestamp: { lineIndex: 0, type: 'word', wordIndex: 7 } });
    expect(res.nextLines[0].words?.[0].time).toBeNull();
  });

  it('ignores a focused line index that does not exist', () => {
    const lines = [line('one')];
    const res = mark({ lines, time: 4, focusedTimestamp: { lineIndex: 9, type: 'start' } });
    expect(res.nextLines[0].timestamp).toBeNull();
  });
});

describe('timestamp transforms', () => {
  it('applyGlobalOffset shifts starts and ends but never below zero', () => {
    const lines = [line('one', { timestamp: 1, endTime: 2 }), line('two', { timestamp: null })];
    const out = applyGlobalOffset(lines, -5);
    expect(out[0]).toMatchObject({ timestamp: 0, endTime: 0 });
    expect(out[1].timestamp).toBeNull();
  });

  it('applyGlobalOffset treats a non-numeric delta as zero', () => {
    const lines = [line('one', { timestamp: 3 })];
    expect(applyGlobalOffset(lines, 'abc' as unknown as number)[0].timestamp).toBe(3);
  });

  it('applyBulkShift only touches the selected, already-synced lines', () => {
    const lines = [line('one', { timestamp: 1 }), line('two', { timestamp: 2 }), line('three')];
    const out = applyBulkShift(lines, new Set([0, 2]), 1.5);
    expect(out[0].timestamp).toBe(2.5);
    expect(out[1].timestamp).toBe(2);
    expect(out[2].timestamp).toBeNull();
  });

  it('applyBulkShift clamps at zero and carries endTime along', () => {
    const lines = [line('one', { timestamp: 1, endTime: 2 })];
    const out = applyBulkShift(lines, new Set([0]), -10);
    expect(out[0]).toMatchObject({ timestamp: 0, endTime: 0 });
  });

  it('clearAllTimestamps clears starts, and ends/word times only when asked', () => {
    const lines = [line('one', { timestamp: 1, endTime: 2, words: [{ word: 'one', time: 1 }] } as Partial<EditorLine>)];

    const lrc = clearAllTimestamps(lines);
    expect(lrc[0].timestamp).toBeNull();
    expect(lrc[0].endTime).toBe(2);

    const srt = clearAllTimestamps(lines, true);
    expect(srt[0].endTime).toBeNull();

    const wordsCleared = clearAllTimestamps(lines, false, true);
    expect(wordsCleared[0].words?.[0].time).toBeNull();
  });

  it('clearLineTimestamp clears one line and leaves the rest alone', () => {
    const lines = [line('one', { timestamp: 1 }), line('two', { timestamp: 2 })];
    const out = clearLineTimestamp(lines, 0);
    expect(out[0].timestamp).toBeNull();
    expect(out[1].timestamp).toBe(2);
  });

  it('clearing drops the source tag too, so a cleared ASR line is no longer badged', () => {
    const lines = [line('one', { timestamp: 1, source: 'asr' } as Partial<EditorLine>)];
    expect(clearAllTimestamps(lines)[0].source).toBeNull();
    expect(clearLineTimestamp(lines, 0)[0].source).toBeNull();
  });

  it('detectDuplicateTimestamps flags both sides of a near-collision', () => {
    const lines = [line('one', { timestamp: 1 }), line('two', { timestamp: 1.01 }), line('three', { timestamp: 5 })];
    const dupes = detectDuplicateTimestamps(lines, 0.05);
    expect([...dupes].sort()).toEqual([0, 1]);
  });

  it('detectDuplicateTimestamps respects the threshold and ignores unsynced lines', () => {
    const lines = [line('one', { timestamp: 1 }), line('two', { timestamp: 1.2 }), line('three')];
    expect(detectDuplicateTimestamps(lines, 0.05).size).toBe(0);
  });
});
