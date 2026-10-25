// @vitest-environment node
/**
 * Counterpart capture and placement. A counterpart's position in the list is part of its meaning
 * (it belongs to the line it follows), so inserting or moving one in the wrong place
 * silently attaches it to another line.
 */
import { describe, it, expect } from 'vitest';
import { captureCounterpart, moveCounterpart, counterpartBounds, frequentCounterparts, counterpartWindow, listCounterparts, isPendingCounterpart, counterpartEnd, counterpartNeedsWords } from './counterparts';
import type { EditorLine } from './editor.service';

describe('counterpartEnd', () => {
  const base = { timestamp: 73, adLibOf: 72 };

  it('runs past the next main line when its words do', () => {
    // Words at 73, 75, 77: average gap 2, so the last word ends at 79.
    const line = { ...base, words: [{ time: 73 }, { time: 75 }, { time: 77 }] };
    expect(counterpartEnd(line, 76)).toBe(79);
  });

  it('never ends before the next main line', () => {
    expect(counterpartEnd({ ...base, words: [{ time: 73 }] }, 76)).toBe(76);
  });

  it('prefers its own end time', () => {
    expect(counterpartEnd({ ...base, endTime: 90, words: [{ time: 77 }] }, 76)).toBe(90);
  });

  it('falls back to the next main line, then to five seconds, without word times', () => {
    expect(counterpartEnd({ ...base, words: [{ time: null }] }, 76)).toBe(76);
    expect(counterpartEnd(base, null)).toBe(78);
  });
});

describe('counterpartNeedsWords', () => {
  it('flags a named counterpart with no word times only', () => {
    expect(counterpartNeedsWords({ text: 'phrase', timestamp: 73, adLibOf: 72 })).toBe(true);
    const stamped: EditorLine = { text: 'phrase', timestamp: 73, adLibOf: 72, words: [{ word: 'phrase', time: 73 }] };
    expect(counterpartNeedsWords(stamped)).toBe(false);
    expect(counterpartNeedsWords({ text: '', timestamp: 73, adLibOf: 72 })).toBe(false);
    expect(counterpartNeedsWords({ text: 'main line', timestamp: 73 })).toBe(false);
  });
});

const song = (): EditorLine[] => [
  { type: 'section', label: 'Verse 1', id: 's' },
  { id: 'a', text: 'First line', timestamp: 10 },
  { id: 'b', text: 'Second line', timestamp: 20 },
  { id: 'c', text: 'Not synced yet', timestamp: null },
];

describe('captureCounterpart', () => {
  it('puts a pending counterpart after the line being sung', () => {
    const result = captureCounterpart(song(), 12.5, 'x')!;
    expect(result.index).toBe(2);
    expect(result.lines[2]).toMatchObject({ id: 'x', text: '', timestamp: 12.5, adLibOf: 10 });
    expect(isPendingCounterpart(result.lines[2])).toBe(true);
    expect(result.lines).toHaveLength(5);
  });

  it('keeps several counterparts on one line in time order', () => {
    let lines = captureCounterpart(song(), 15, 'late')!.lines;
    lines = captureCounterpart(lines, 12, 'early')!.lines;
    lines = captureCounterpart(lines, 18, 'last')!.lines;
    expect(lines.slice(1, 5).map((l) => l.id)).toEqual(['a', 'early', 'late', 'last']);
  });

  it('attaches to the later line once it has started', () => {
    const result = captureCounterpart(song(), 21, 'x')!;
    expect(result.index).toBe(3);
    expect(result.lines[3].adLibOf).toBe(20);
  });

  it('returns null before the first synced line', () => {
    expect(captureCounterpart(song(), 3, 'x')).toBeNull();
    expect(captureCounterpart([{ id: 'a', text: 'unsynced', timestamp: null }], 3, 'x')).toBeNull();
  });

  it('inherits the singers of the previous counterpart', () => {
    const lines = song();
    lines.splice(2, 0, { id: 'p', text: 'yeah', timestamp: 11, adLibOf: 10, singers: ['Feat'] });
    const result = captureCounterpart(lines, 22, 'x')!;
    expect(result.lines[result.index].singers).toEqual(['Feat']);
  });

  it('does not mutate its input', () => {
    const lines = song();
    captureCounterpart(lines, 12, 'x');
    expect(lines).toHaveLength(4);
  });
});

describe('moveCounterpart', () => {
  const withCounterpart = () => captureCounterpart(song(), 12, 'x')!.lines;

  it('moves the counterpart and nothing else', () => {
    const lines = withCounterpart();
    const moved = moveCounterpart(lines, 2, 14);
    expect(moved[2].timestamp).toBe(14);
    expect(moved[1]).toBe(lines[1]);
    expect(moved[3]).toBe(lines[3]);
  });

  it('keeps it inside its line', () => {
    const lines = withCounterpart();
    expect(counterpartBounds(lines, 2)).toEqual({ min: 10, max: 20 });
    expect(moveCounterpart(lines, 2, 4)[2].timestamp).toBe(10);
    expect(moveCounterpart(lines, 2, 99)[2].timestamp).toBe(19.99);
  });

  it('has no upper bound on the last synced line', () => {
    const lines = captureCounterpart(song(), 25, 'x')!.lines;
    expect(counterpartBounds(lines, 3)).toEqual({ min: 20, max: null });
    expect(moveCounterpart(lines, 3, 99)[3].timestamp).toBe(99);
  });

  it('ignores lines that are not counterparts', () => {
    const lines = song();
    expect(moveCounterpart(lines, 1, 14)).toBe(lines);
  });
});

describe('frequentCounterparts', () => {
  it('lists what the song uses first, most used first, then defaults without repeats', () => {
    const lines: EditorLine[] = [
      { text: 'Line', timestamp: 1 },
      { text: 'skrrt', timestamp: 2, adLibOf: 1 },
      { text: 'Yeah', timestamp: 3, adLibOf: 1 },
      { text: 'skrrt', timestamp: 4, adLibOf: 1 },
      { text: '', timestamp: 5, adLibOf: 1 },
    ];
    expect(frequentCounterparts(lines, ['yeah', 'ayy', 'uh'], 4)).toEqual(['skrrt', 'Yeah', 'ayy', 'uh']);
  });
});

describe('counterpartWindow', () => {
  it('spans the line being sung and the next one', () => {
    const lines: EditorLine[] = [{ timestamp: 10 }, { timestamp: 14 }, { timestamp: 19 }, { timestamp: 30 }];
    expect(counterpartWindow(lines, 15)).toEqual({ start: 13.5, end: 30 });
  });

  it('is never narrower than four seconds and survives an unsynced song', () => {
    expect(counterpartWindow([{ timestamp: 10 }, { timestamp: 11 }, { timestamp: 12 }], 10.2)).toEqual({ start: 9.5, end: 13.5 });
    expect(counterpartWindow([], 5)).toEqual({ start: 4, end: 12 });
  });
});

describe('listCounterparts', () => {
  it('returns counterparts with their flat index, skipping section markers', () => {
    const lines = captureCounterpart(song(), 12, 'x')!.lines;
    expect(listCounterparts(lines).map((a) => [a.index, a.time])).toEqual([[2, 12]]);
  });
});
