// @vitest-environment node
/**
 * The offline mirror of the server's LRC compiler/parser must round-trip counterparts the
 * same way (see server/src/utils/lrc.counterparts.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { COUNTERPART_MARKER, compileLRC, parseLrcSrtFile } from './lrc';
import type { EditorLine } from '@/features/editor/services/editor.service';

const song: EditorLine[] = [
  { text: 'My walls are closing in', timestamp: 72.4 },
  { text: 'Without a sense', timestamp: 73.05, adLibOf: 72.4, words: [{ word: 'Without', time: 73.05 }, { word: 'a', time: 73.6 }, { word: 'sense', time: 79.2 }] },
  { text: "I've felt this way before", timestamp: 76.8 },
];

describe('counterparts in LRC (client mirror)', () => {
  it('round-trips a counterpart through the marker', () => {
    const lrc = compileLRC(song);
    expect(lrc.split('\n')[1]).toBe(COUNTERPART_MARKER);
    const parsed = parseLrcSrtFile(lrc, 'song.lrc');
    expect(parsed.map((l) => l.adLibOf ?? null)).toEqual([null, 72.4, null]);
    expect(parsed[1].words?.at(-1)).toEqual({ word: 'sense', time: 79.2 });
  });

  it('does not read the marker as a section', () => {
    const parsed = parseLrcSrtFile(`[00:10.00] Main\n${COUNTERPART_MARKER}\n[00:10.00] Over it`, 'x.lrc');
    expect(parsed.some((l) => l.type === 'section')).toBe(false);
    expect(parsed[0].secondary).toBeUndefined();
    expect(parsed[1]).toMatchObject({ text: 'Over it', adLibOf: 10 });
  });
});
