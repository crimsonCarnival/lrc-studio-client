import { describe, it, expect } from 'vitest';
import { applyLineTiming } from './line-timing';
import type { EditorLine } from '@/features/editor/editor.types';

const mk = (text: string, times: number[], end?: number): EditorLine => ({
  id: text, text, timestamp: times[0],
  words: text.split(' ').map((w, i, a) => ({ word: w, time: times[i], ...(i === a.length - 1 && end ? { end } : {}) })),
});
const lines = (): EditorLine[] => [
  mk('a b', [10, 11]),
  mk('c d e', [20, 21, 22]),
  mk('f g', [24, 25], 26.5),
  mk('h i', [30, 31]),
];
const times = (ls: EditorLine[]) => ls.map((l) => ({ ts: l.timestamp, w: l.words!.map((w) => [w.time, w.end ?? null]) }));
// Everything of the other lines stays exactly as it was.
const othersUntouched = (a: EditorLine[], b: EditorLine[], index: number) => a.forEach((l, i) => { if (i !== index) expect(b[i]).toBe(l); });

describe('applyLineTiming', () => {
  it('moves only where the line starts, leaving its other words and the lines around it', () => {
    const before = lines();
    const after = applyLineTiming(before, 1, { kind: 'start', time: 19 }, 239);
    expect(times(after)[1]).toEqual({ ts: 19, w: [[19, null], [21, null], [22, null]] });
    othersUntouched(before, after, 1);
  });

  it('keeps the start before the line\'s second word and after the line before has started', () => {
    expect(applyLineTiming(lines(), 1, { kind: 'start', time: 30 }, 239)[1].timestamp).toBe(20.98);
    expect(applyLineTiming(lines(), 1, { kind: 'start', time: 1 }, 239)[1].timestamp).toBe(10.02);
  });

  it('moves only where the line ends: a pause before the next line, or on past it', () => {
    const before = lines();
    const pause = applyLineTiming(before, 1, { kind: 'end', time: 23 }, 239);
    expect(times(pause)[1]).toEqual({ ts: 20, w: [[20, null], [21, null], [22, 23]] });
    othersUntouched(before, pause, 1);
    const held = applyLineTiming(before, 1, { kind: 'end', time: 24.6 }, 239);
    expect(times(held)[1].w[2]).toEqual([22, 24.6]);
    othersUntouched(before, held, 1);
    // The next line's start is exactly where it was.
    expect(held[2].timestamp).toBe(24);
  });

  it('puts the end back when it is dropped on the start of the next line', () => {
    const held = applyLineTiming(lines(), 1, { kind: 'end', time: 24.6 }, 239);
    const back = applyLineTiming(held, 1, { kind: 'end', time: 24.002 }, 239);
    expect(times(back)[1].w[2]).toEqual([22, null]);
  });

  it('never puts the end before the last word has started', () => {
    expect(times(applyLineTiming(lines(), 1, { kind: 'end', time: 5 }, 239))[1].w[2]).toEqual([22, 22.02]);
  });

  it('moves the whole line, every word and end with it, and nothing else', () => {
    const before = lines();
    const after = applyLineTiming(before, 2, { kind: 'move', start: 24.5 }, 239);
    expect(times(after)[2]).toEqual({ ts: 24.5, w: [[24.5, null], [25.5, 27]] });
    othersUntouched(before, after, 2);
  });

  it('keeps the order of the lines when one is moved', () => {
    expect(applyLineTiming(lines(), 2, { kind: 'move', start: 40 }, 239)[2].timestamp).toBe(29.98);
    expect(applyLineTiming(lines(), 2, { kind: 'move', start: 1 }, 239)[2].timestamp).toBe(20.02);
  });

  it('moves the romaji track and an end time along with the line', () => {
    const before = lines();
    before[1] = { ...before[1], endTime: 23.5, secondaryWords: [{ word: 'x', time: 20 }, { word: 'y', time: 21.2 }] };
    const after = applyLineTiming(before, 1, { kind: 'move', start: 21 }, 239);
    expect(after[1].endTime).toBe(24.5);
    expect(after[1].secondaryWords!.map((w) => w.time)).toEqual([21, 22.2]);
  });

  it('marks a re-timed line as set by hand', () => {
    const before = lines();
    before[1] = { ...before[1], source: 'asr' };
    expect(applyLineTiming(before, 1, { kind: 'move', start: 21 }, 239)[1].source).toBe('manual');
  });

  it('leaves sections, untimed lines and counterparts alone', () => {
    const base = lines();
    const ls: EditorLine[] = [{ type: 'section', label: 'Chorus' }, { id: 'u', text: 'untimed' }, { ...base[0], adLibOf: 5 }, base[1]];
    expect(applyLineTiming(ls, 0, { kind: 'move', start: 3 })).toBe(ls);
    expect(applyLineTiming(ls, 1, { kind: 'move', start: 3 })).toBe(ls);
    expect(applyLineTiming(ls, 2, { kind: 'move', start: 3 })).toBe(ls);
  });
});
