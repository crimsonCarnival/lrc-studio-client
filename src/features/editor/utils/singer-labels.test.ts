import { describe, expect, it } from 'vitest';
import { applySingerLabels } from './singer-labels';
import type { EditorLine } from '@/features/editor/editor.types';

const L = (id: string, text: string, extra: Partial<EditorLine> = {}): EditorLine => ({ id, text, ...extra });

describe('applySingerLabels', () => {
  it('labels a line by id after a line was inserted above it while the request was open', () => {
    const a = L('a', 'one');
    const b = L('b', 'two');
    const opened = [a, b];
    const current = [L('new', 'inserted'), a, b];
    const { lines, changed } = applySingerLabels(current, [{ lineIndex: 1, singers: ['Ann'] }], opened);
    expect(lines[0]).toBe(current[0]);
    expect(lines[2].singers).toEqual(['Ann']);
    expect(lines[1]).toBe(a);
    expect(changed).toEqual([2]);
  });

  it('a deleted line is skipped', () => {
    const a = L('a', 'one');
    const b = L('b', 'two');
    const { lines, changed } = applySingerLabels([a], [{ lineIndex: 1, singers: ['Ann'] }], [a, b]);
    expect(changed).toEqual([]);
    expect(lines).toEqual([a]);
  });

  it('an unchanged line is not reported', () => {
    const a = L('a', 'one', { singers: ['Ann'], mode: 'solo' });
    const b = L('b', 'two');
    const { changed } = applySingerLabels([a, b], [{ lineIndex: 0, singers: ['Ann'] }, { lineIndex: 1, singers: ['Bob'] }], [a, b]);
    expect(changed).toEqual([1]);
  });

  it('two singers → mode duet, one → solo', () => {
    const a = L('a', 'one');
    const b = L('b', 'two');
    const { lines } = applySingerLabels([a, b], [{ lineIndex: 0, singers: ['Ann', 'Bob'] }, { lineIndex: 1, singers: ['Bob'] }], [a, b]);
    expect(lines[0]).toMatchObject({ singers: ['Ann', 'Bob'], mode: 'duet' });
    expect(lines[1]).toMatchObject({ singers: ['Bob'], mode: 'solo' });
  });

  it('a line with word-level singerIndex is left alone', () => {
    const a = L('a', 'one', { words: [{ word: 'one', time: 1, singerIndex: 0 }] });
    const current = [a];
    const res = applySingerLabels(current, [{ lineIndex: 0, singers: ['Ann', 'Bob'] }], [a]);
    expect(res.changed).toEqual([]);
    expect(res.lines).toBe(current);
  });

  it('section markers are untouched', () => {
    const sec: EditorLine = { id: 's', type: 'section', label: 'chorus' };
    const a = L('a', 'one');
    const { lines, changed } = applySingerLabels([sec, a], [{ lineIndex: 0, singers: ['Ann'] }], [a]);
    expect(lines[0]).toBe(sec);
    expect(lines[1].singers).toEqual(['Ann']);
    expect(changed).toEqual([1]);
  });

  it('no change returns the same array', () => {
    const a = L('a', 'one', { singers: ['Ann'], mode: 'solo' });
    const current = [a];
    expect(applySingerLabels(current, [{ lineIndex: 0, singers: ['Ann'] }], [a]).lines).toBe(current);
    expect(applySingerLabels(current, [], [a]).lines).toBe(current);
  });
});
