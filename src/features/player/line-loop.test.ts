import { describe, it, expect } from 'vitest';
import { lineLoopAt } from './line-loop';
import type { EditorLine } from '@/features/editor/editor.types';

const lines: EditorLine[] = [
  { text: 'a', timestamp: 1 },
  { type: 'section', label: 'Chorus', text: '' },
  { text: 'b', timestamp: 4, endTime: 6 },
  { text: 'c', timestamp: null },
  { text: 'd', timestamp: 9 },
];

describe('lineLoopAt', () => {
  it('is null before the first timed line', () => {
    expect(lineLoopAt(lines, 0.5, 20)).toBeNull();
  });

  it('runs to the next timed line when the line has no end time', () => {
    expect(lineLoopAt(lines, 2, 20)).toEqual({ a: 1, b: 4 });
  });

  it('uses the line end time when it has one', () => {
    expect(lineLoopAt(lines, 5, 20)).toEqual({ a: 4, b: 6 });
  });

  it('runs to the end of the song after the last timed line', () => {
    expect(lineLoopAt(lines, 12, 20)).toEqual({ a: 9, b: 20 });
  });
});
