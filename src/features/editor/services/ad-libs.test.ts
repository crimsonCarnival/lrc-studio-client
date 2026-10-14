// @vitest-environment node
/**
 * Ad-lib capture and placement. An ad-lib's position in the list is part of its meaning
 * (it belongs to the line it follows), so inserting or moving one in the wrong place
 * silently attaches it to another line.
 */
import { describe, it, expect } from 'vitest';
import { captureAdLib, moveAdLib, adLibBounds, frequentAdLibs, adLibWindow, listAdLibs, isPendingAdLib } from './ad-libs';
import type { EditorLine } from './editor.service';

const song = (): EditorLine[] => [
  { type: 'section', label: 'Verse 1', id: 's' },
  { id: 'a', text: 'First line', timestamp: 10 },
  { id: 'b', text: 'Second line', timestamp: 20 },
  { id: 'c', text: 'Not synced yet', timestamp: null },
];

describe('captureAdLib', () => {
  it('puts a pending ad-lib after the line being sung', () => {
    const result = captureAdLib(song(), 12.5, 'x')!;
    expect(result.index).toBe(2);
    expect(result.lines[2]).toMatchObject({ id: 'x', text: '', timestamp: 12.5, adLibOf: 10 });
    expect(isPendingAdLib(result.lines[2])).toBe(true);
    expect(result.lines).toHaveLength(5);
  });

  it('keeps several ad-libs on one line in time order', () => {
    let lines = captureAdLib(song(), 15, 'late')!.lines;
    lines = captureAdLib(lines, 12, 'early')!.lines;
    lines = captureAdLib(lines, 18, 'last')!.lines;
    expect(lines.slice(1, 5).map((l) => l.id)).toEqual(['a', 'early', 'late', 'last']);
  });

  it('attaches to the later line once it has started', () => {
    const result = captureAdLib(song(), 21, 'x')!;
    expect(result.index).toBe(3);
    expect(result.lines[3].adLibOf).toBe(20);
  });

  it('returns null before the first synced line', () => {
    expect(captureAdLib(song(), 3, 'x')).toBeNull();
    expect(captureAdLib([{ id: 'a', text: 'unsynced', timestamp: null }], 3, 'x')).toBeNull();
  });

  it('inherits the singers of the previous ad-lib', () => {
    const lines = song();
    lines.splice(2, 0, { id: 'p', text: 'yeah', timestamp: 11, adLibOf: 10, singers: ['Feat'] });
    const result = captureAdLib(lines, 22, 'x')!;
    expect(result.lines[result.index].singers).toEqual(['Feat']);
  });

  it('does not mutate its input', () => {
    const lines = song();
    captureAdLib(lines, 12, 'x');
    expect(lines).toHaveLength(4);
  });
});

describe('moveAdLib', () => {
  const withAdLib = () => captureAdLib(song(), 12, 'x')!.lines;

  it('moves the ad-lib and nothing else', () => {
    const lines = withAdLib();
    const moved = moveAdLib(lines, 2, 14);
    expect(moved[2].timestamp).toBe(14);
    expect(moved[1]).toBe(lines[1]);
    expect(moved[3]).toBe(lines[3]);
  });

  it('keeps it inside its line', () => {
    const lines = withAdLib();
    expect(adLibBounds(lines, 2)).toEqual({ min: 10, max: 20 });
    expect(moveAdLib(lines, 2, 4)[2].timestamp).toBe(10);
    expect(moveAdLib(lines, 2, 99)[2].timestamp).toBe(19.99);
  });

  it('has no upper bound on the last synced line', () => {
    const lines = captureAdLib(song(), 25, 'x')!.lines;
    expect(adLibBounds(lines, 3)).toEqual({ min: 20, max: null });
    expect(moveAdLib(lines, 3, 99)[3].timestamp).toBe(99);
  });

  it('ignores lines that are not ad-libs', () => {
    const lines = song();
    expect(moveAdLib(lines, 1, 14)).toBe(lines);
  });
});

describe('frequentAdLibs', () => {
  it('lists what the song uses first, most used first, then defaults without repeats', () => {
    const lines: EditorLine[] = [
      { text: 'Line', timestamp: 1 },
      { text: 'skrrt', timestamp: 2, adLibOf: 1 },
      { text: 'Yeah', timestamp: 3, adLibOf: 1 },
      { text: 'skrrt', timestamp: 4, adLibOf: 1 },
      { text: '', timestamp: 5, adLibOf: 1 },
    ];
    expect(frequentAdLibs(lines, ['yeah', 'ayy', 'uh'], 4)).toEqual(['skrrt', 'Yeah', 'ayy', 'uh']);
  });
});

describe('adLibWindow', () => {
  it('spans the line being sung and the next one', () => {
    const lines: EditorLine[] = [{ timestamp: 10 }, { timestamp: 14 }, { timestamp: 19 }, { timestamp: 30 }];
    expect(adLibWindow(lines, 15)).toEqual({ start: 13.5, end: 30 });
  });

  it('is never narrower than four seconds and survives an unsynced song', () => {
    expect(adLibWindow([{ timestamp: 10 }, { timestamp: 11 }, { timestamp: 12 }], 10.2)).toEqual({ start: 9.5, end: 13.5 });
    expect(adLibWindow([], 5)).toEqual({ start: 4, end: 12 });
  });
});

describe('listAdLibs', () => {
  it('returns ad-libs with their flat index, skipping section markers', () => {
    const lines = captureAdLib(song(), 12, 'x')!.lines;
    expect(listAdLibs(lines).map((a) => [a.index, a.time])).toEqual([[2, 12]]);
  });
});
