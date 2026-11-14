// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { syncedCoverage } from './sync-coverage';
import type { EditorLine } from '@/features/editor/editor.types';

const line = (timestamp: number | null, extra: Partial<EditorLine> = {}): EditorLine => ({ text: 'x', timestamp, ...extra });

describe('syncedCoverage', () => {
  it('runs each line to the next timed start, the last to the end of the song', () => {
    expect(syncedCoverage([line(10), line(20), line(null), line(30)], 100)).toBe(90);
  });

  it('uses a line\'s own end time and leaves the gap after it uncovered', () => {
    expect(syncedCoverage([line(0, { endTime: 5 }), line(10, { endTime: 12 })], 20)).toBe(7);
  });

  it('counts overlapping spans once and ignores section markers', () => {
    const lines = [{ type: 'section', label: 'verse', timestamp: 0 } as EditorLine, line(0, { endTime: 10 }), line(5, { endTime: 8 })];
    expect(syncedCoverage(lines, 20)).toBe(10);
  });

  it('clips to the song and is 0 without a duration', () => {
    expect(syncedCoverage([line(-2, { endTime: 4 }), line(18, { endTime: 30 })], 20)).toBe(6);
    expect(syncedCoverage([line(1)], 0)).toBe(0);
  });
});
