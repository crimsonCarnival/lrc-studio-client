import { describe, expect, it } from 'vitest';
import type { EditorLine } from '@/features/editor/editor.types';
import { buildSectionSegments, segmentAt } from './section-segments';

const sec = (label?: string): EditorLine => ({ type: 'section', label, text: '' }) as EditorLine;
const ln = (timestamp: number | null, extra: Partial<EditorLine> = {}): EditorLine =>
  ({ text: 'Line one', timestamp, ...extra }) as EditorLine;

describe('buildSectionSegments', () => {
  it('returns no segments when the duration is unknown', () => {
    expect(buildSectionSegments([sec('A'), ln(1)], 0)).toEqual([]);
    expect(buildSectionSegments([sec('A'), ln(1)], NaN)).toEqual([]);
  });

  it('is one unnamed segment without sections', () => {
    expect(buildSectionSegments([ln(3), ln(8)], 60)).toEqual([{ label: null, start: 0, end: 60 }]);
    expect(buildSectionSegments([], 60)).toEqual([{ label: null, start: 0, end: 60 }]);
  });

  it('starts each section at its first timed line and ends the last at the duration', () => {
    const lines = [sec('Verse one'), ln(4), ln(9), sec('Chorus one'), ln(20), ln(25)];
    expect(buildSectionSegments(lines, 40)).toEqual([
      { label: 'Verse one', start: 0, end: 20 },
      { label: 'Chorus one', start: 20, end: 40 },
    ]);
  });

  it('skips a section with no timed line', () => {
    const lines = [sec('A'), ln(2), sec('B'), ln(null), sec('C'), ln(30)];
    expect(buildSectionSegments(lines, 50).map((s) => s.label)).toEqual(['A', 'C']);
  });

  it('keeps starts strictly increasing: out-of-order and duplicate boundaries are dropped', () => {
    const lines = [sec('A'), ln(10), sec('B'), ln(5), sec('C'), ln(10), sec('D'), ln(30)];
    expect(buildSectionSegments(lines, 60)).toEqual([
      { label: 'A', start: 0, end: 30 },
      { label: 'D', start: 30, end: 60 },
    ]);
  });

  it('drops a section that starts at or after the end of the track', () => {
    const lines = [sec('A'), ln(1), sec('B'), ln(70)];
    expect(buildSectionSegments(lines, 60)).toEqual([{ label: 'A', start: 0, end: 60 }]);
  });

  it('gives timed lines before the first marker an unnamed lead segment', () => {
    const lines = [ln(2), sec('A'), ln(12)];
    expect(buildSectionSegments(lines, 30)).toEqual([
      { label: null, start: 0, end: 12 },
      { label: 'A', start: 12, end: 30 },
    ]);
  });

  it('ignores ad-lib counterparts when placing a section', () => {
    const lines = [sec('A'), ln(5), sec('B'), ln(8, { adLibOf: 5 }), ln(20)];
    expect(buildSectionSegments(lines, 40)).toEqual([
      { label: 'A', start: 0, end: 20 },
      { label: 'B', start: 20, end: 40 },
    ]);
  });
});

describe('segmentAt', () => {
  const segs = [
    { label: 'A', start: 0, end: 10 },
    { label: 'B', start: 10, end: 20 },
  ];
  it('finds the segment, and clamps to the last at the end', () => {
    expect(segmentAt(segs, 9.9)?.label).toBe('A');
    expect(segmentAt(segs, 10)?.label).toBe('B');
    expect(segmentAt(segs, 20)?.label).toBe('B');
    expect(segmentAt([], 5)).toBeNull();
  });
});
