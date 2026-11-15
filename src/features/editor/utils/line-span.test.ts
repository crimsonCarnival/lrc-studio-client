import { describe, it, expect } from 'vitest';
import { heldUntil, isHeldAt, lineBands, lineOverlap, lineSpanEnd, naturalLineEnd, nextTimedIndex, prevTimedIndex } from './line-span';

const lines = [
  { type: 'section', label: 'Chorus' },
  { text: 'just go my way', timestamp: 20.36, words: [{ word: 'just', time: 20.36 }, { word: 'way', time: 23.8, end: 25.04 }] },
  { text: 'not timed yet' },
  { text: 'right here', timestamp: 24.42, words: [{ word: 'right', time: 24.42 }, { word: 'here', time: 25 }] },
  { text: 'right now', timestamp: 27 },
];

describe('line spans', () => {
  it('finds the timed lines around a line, skipping sections and untimed lines', () => {
    expect(nextTimedIndex(lines, 1)).toBe(3);
    expect(prevTimedIndex(lines, 3)).toBe(1);
    expect(prevTimedIndex(lines, 1)).toBe(-1);
    expect(nextTimedIndex(lines, 4)).toBe(-1);
  });

  it('ends a line at the next timed line, or at the end of the track', () => {
    expect(naturalLineEnd(lines, 1, 240)).toBe(24.42);
    expect(naturalLineEnd(lines, 4, 240)).toBe(240);
    expect(naturalLineEnd(lines, 4)).toBeNull();
  });

  it('runs a line on while its last word is held over the next one', () => {
    expect(lineSpanEnd(lines, 1, 240)).toBe(25.04);
    expect(lineSpanEnd(lines, 3, 240)).toBe(27);
    expect(lineOverlap(lines, 1)?.nextIndex).toBe(3);
    expect(lineOverlap(lines, 1)?.seconds).toBeCloseTo(0.62);
    expect(lineOverlap(lines, 3)).toBeNull();
  });

  it('does not call a pause before the next line an overlap', () => {
    const paused = lines.map((l, i) => (i === 1 ? { ...l, words: [{ word: 'just', time: 20.36 }, { word: 'way', time: 23.8, end: 24.1 }] } : l));
    expect(lineSpanEnd(paused, 1, 240)).toBe(24.42);
    expect(lineOverlap(paused, 1)).toBeNull();
  });

  it('knows while a line is still sounding over the next one', () => {
    expect(heldUntil(lines[1], 24.42)).toBe(25.04);
    expect(heldUntil(lines[3], 27)).toBeNull();
    expect(isHeldAt(lines[1], 24.42, 24.3)).toBe(false);
    expect(isHeldAt(lines[1], 24.42, 24.7)).toBe(true);
    expect(isHeldAt(lines[1], 24.42, 25.04)).toBe(false);
    expect(isHeldAt(lines[1], 24.42, null)).toBe(false);
  });

  it('puts a line that starts under the one before it on the second lane', () => {
    const bands = lineBands(lines, 240);
    expect(bands.map((b) => [b.index, b.number, b.lane])).toEqual([[1, 1, 0], [3, 3, 1], [4, 4, 0]]);
    expect(bands[0].to).toBe(25.04);
  });
});
