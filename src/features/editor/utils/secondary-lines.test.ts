// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { applySecondaryLines, mainLineIndices, secondaryText, splitSecondaryText } from './secondary-lines';
import type { EditorLine } from '@/features/editor/editor.types';

const lyric = (text: string, extra: Partial<EditorLine> = {}): EditorLine =>
  ({ text, timestamp: null, ...extra } as EditorLine);
const marker = (label: string): EditorLine => ({ type: 'section', label, text: '' } as EditorLine);

describe('secondary lines', () => {
  const lines = [marker('verse'), lyric('一', { secondary: 'ichi' }), lyric('二'), marker('chorus'), lyric('三')];

  it('skips section markers when pairing', () => {
    expect(mainLineIndices(lines)).toEqual([1, 2, 4]);
  });

  it('round-trips the existing secondaries through the text form', () => {
    const text = secondaryText(lines);
    expect(text).toBe('ichi\n\n');
    expect(applySecondaryLines(lines, splitSecondaryText(text)).changed).toEqual([]);
  });

  it('writes by position, a blank clears, and only changed lines are reported', () => {
    const { lines: next, changed } = applySecondaryLines(lines, splitSecondaryText('\r\nni\r\nsan'));
    expect(changed).toEqual([1, 2, 4]);
    expect(next[1].secondary).toBeUndefined();
    expect(next[2].secondary).toBe('ni');
    expect(next[4].secondary).toBe('san');
    expect(next[0]).toBe(lines[0]);
  });

  it('ignores values past the last main line', () => {
    const { lines: next } = applySecondaryLines(lines, ['a', 'b', 'c', 'd']);
    expect(next).toHaveLength(lines.length);
    expect(next.map((l) => l.secondary)).toEqual([undefined, 'a', 'b', undefined, 'c']);
  });

  it('drops stale secondaryWords when the secondary text changes', () => {
    const timed = [lyric('一', { secondary: 'ichi', secondaryWords: [{ word: 'ichi', time: 1 }] })];
    expect(applySecondaryLines(timed, ['ichi']).lines[0].secondaryWords).toHaveLength(1);
    expect(applySecondaryLines(timed, ['itchi']).lines[0].secondaryWords).toBeUndefined();
  });
});
