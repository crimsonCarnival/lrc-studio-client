import { describe, it, expect } from 'vitest';
import { computeCurrentIndex } from './lyrics-position';

const L = (timestamp, endTime) => ({ text: 'x', timestamp, endTime });

describe('computeCurrentIndex', () => {
  it('returns -1 before the first synced line', () => {
    expect(computeCurrentIndex([L(5), L(10)], 2, 'lrc')).toBe(-1);
  });

  it('returns the last line whose timestamp has passed', () => {
    expect(computeCurrentIndex([L(0), L(5), L(10)], 7, 'lrc')).toBe(1);
  });

  it('skips lines with null timestamps', () => {
    expect(computeCurrentIndex([L(0), L(null), L(8)], 9, 'lrc')).toBe(2);
  });

  it('srt: returns -1 when not started and no duration', () => {
    expect(computeCurrentIndex([L(0, 3)], 0, 'srt')).toBe(-1);
  });

  it('srt: excludes a line whose endTime has passed', () => {
    expect(computeCurrentIndex([L(0, 3), L(5, 8)], 4, 'srt')).toBe(-1);
  });
});
