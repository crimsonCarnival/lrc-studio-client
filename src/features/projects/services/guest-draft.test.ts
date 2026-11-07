import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from './storage.service';
import {
  expectProgrammaticEmpty, guestLyricsCleared, markGuestLyricsCleared, mayWriteGuestDraft, noteLinesBecameEmpty,
  resetGuestLyricsCleared, restoreGuestDraft, storedGuestDraftLineCount,
} from './guest-draft';

const store = (n: number) => localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify({ lines: Array.from({ length: n }, (_, i) => ({ text: `Line ${i}`, id: `l${i}` })) }));

beforeEach(() => { localStorage.clear(); resetGuestLyricsCleared(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('mayWriteGuestDraft (pure)', () => {
  it('never lets an empty project replace a non-empty stored draft', () => {
    store(6);
    expect(mayWriteGuestDraft(0)).toBe(false);
  });

  it('lets an empty project write when nothing usable is stored', () => {
    expect(mayWriteGuestDraft(0)).toBe(true);
    store(0);
    expect(mayWriteGuestDraft(0)).toBe(true);
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{nope');
    expect(mayWriteGuestDraft(0)).toBe(true);
  });

  it('lets a non-empty project write, and does not change any state', () => {
    store(6);
    markGuestLyricsCleared();
    expect(mayWriteGuestDraft(3)).toBe(true);
    expect(guestLyricsCleared()).toBe(true);
  });

  it('lets an empty project replace the draft once the user cleared the lyrics', () => {
    store(6);
    markGuestLyricsCleared();
    expect(mayWriteGuestDraft(0)).toBe(true);
    resetGuestLyricsCleared();
    expect(mayWriteGuestDraft(0)).toBe(false);
  });
});

describe('noteLinesBecameEmpty', () => {
  it('marks the lyrics as cleared by the user', () => {
    noteLinesBecameEmpty();
    expect(guestLyricsCleared()).toBe(true);
  });

  it('does not when the app emptied memory on purpose, and only once', () => {
    expectProgrammaticEmpty();
    noteLinesBecameEmpty();
    expect(guestLyricsCleared()).toBe(false);
    noteLinesBecameEmpty();
    expect(guestLyricsCleared()).toBe(true);
  });

  it('a lingering expectation is dropped when lines come back (reset)', () => {
    expectProgrammaticEmpty();
    resetGuestLyricsCleared();
    noteLinesBecameEmpty();
    expect(guestLyricsCleared()).toBe(true);
  });
});

describe('restoreGuestDraft', () => {
  it('returns the lines and the rest of the stored project', () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify({ lines: [{ text: 'Line one', id: 'a', timestamp: 2 }], editorMode: 'srt' }));
    const d = restoreGuestDraft()!;
    expect(d.lines).toHaveLength(1);
    expect(d.lines[0]).toMatchObject({ text: 'Line one', id: 'a', timestamp: 2 });
    expect(d.parsed.editorMode).toBe('srt');
    expect(storedGuestDraftLineCount()).toBe(1);
  });

  it('tolerates null words, null lines, bad fields and a line without an id', () => {
    vi.stubGlobal('crypto', { randomUUID: undefined });
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify({
      lines: [null, 5, { text: 'Line one', words: [null, { word: 'Line', time: 1 }, { word: 7 }, 'x'] }, { text: 'Line two', timestamp: 'x' }, { type: 'section' }, { nope: 1 }],
    }));
    const d = restoreGuestDraft()!;
    expect(d.lines).toHaveLength(3);
    expect(d.lines[0].words).toEqual([{ word: 'Line', time: 1 }]);
    expect(typeof d.lines[0].id).toBe('string');
    expect(d.lines[1].timestamp).toBeNull();
    expect(new Set(d.lines.map((l) => l.id)).size).toBe(3);
  });

  it('never throws: unreadable, wrong shape or no usable line is null', () => {
    expect(restoreGuestDraft()).toBeNull();
    for (const raw of ['{nope', 'null', '"x"', '{"lines":"x"}', '{"lines":[]}', '{"lines":[null,{"a":1}]}']) {
      localStorage.setItem(STORAGE_KEYS.PROJECT, raw);
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(restoreGuestDraft()).toBeNull();
      expect(storedGuestDraftLineCount()).toBe(0);
    }
  });

  it('survives a localStorage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(restoreGuestDraft()).toBeNull();
  });
});
