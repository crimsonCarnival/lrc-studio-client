import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/app/api';
import { STORAGE_KEYS } from './storage.service';
import {
  dropProgrammaticEmptyExpectation, expectProgrammaticEmpty, guestLyricsCleared, markGuestLyricsCleared, mayWriteGuestDraft, noteLinesBecameEmpty,
  clearRejectedGuestDraft, resetGuestLyricsCleared, restoreGuestDraft, storedGuestDraftLineCount,
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

  // A guest coming back from the sign-in page (or reloading) used to lose every section's
  // singers, and each line's sing mode, per-word singers, secondary timing and timing source.
  it('keeps singer and timing fields: a reload must not strip what the editor shows', () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify({
      lines: [
        { type: 'section', label: 'verse 1', depth: 1, id: 's1', singers: ['Ryo', 'Daisuke'] },
        {
          text: 'Two voices', id: 'a', timestamp: 2, singers: ['Ryo', 'Daisuke'], mode: 'split', source: 'asr',
          words: [{ word: 'Two', time: 2, singerIndex: 0 }, { word: 'voices', time: 2.5, singerIndex: 1 }],
          secondaryWords: [{ word: 'futatsu', time: 2 }],
        },
      ],
    }));
    const [section, line] = restoreGuestDraft()!.lines;
    expect(section).toMatchObject({ type: 'section', label: 'verse 1', singers: ['Ryo', 'Daisuke'] });
    expect(line).toMatchObject({ singers: ['Ryo', 'Daisuke'], mode: 'split', source: 'asr', secondaryWords: [{ word: 'futatsu', time: 2 }] });
    expect(line.words).toEqual([{ word: 'Two', time: 2, singerIndex: 0 }, { word: 'voices', time: 2.5, singerIndex: 1 }]);
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

describe('cleared flag across tabs', () => {
  it('stops applying once another tab has written a different draft', () => {
    store(2);
    markGuestLyricsCleared();
    expect(guestLyricsCleared()).toBe(true);
    store(4); // another tab
    expect(guestLyricsCleared()).toBe(false);
    expect(mayWriteGuestDraft(0)).toBe(false);
  });
});

describe('expectation housekeeping', () => {
  it('dropping the expectation means a later empty transition counts as the user', () => {
    expectProgrammaticEmpty();
    dropProgrammaticEmptyExpectation();
    noteLinesBecameEmpty();
    expect(guestLyricsCleared()).toBe(true);
  });
});

describe('rejected drafts stay recoverable', () => {
  it('copies unusable raw text, overwriting the previous copy, but not a plain empty draft', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{"lines":[]}');
    restoreGuestDraft();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBeNull();
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{nope');
    restoreGuestDraft();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBe('{nope');
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{"lines":[null]}');
    restoreGuestDraft();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBe('{"lines":[null]}');
  });
});

describe('rejected-draft backup and sign-in state', () => {
  it('is not written for a signed-in user', () => {
    vi.spyOn(api, 'getAccessToken').mockReturnValue(true as never);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{nope');
    restoreGuestDraft();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBeNull();
  });

  it('is removed by clearRejectedGuestDraft (sign-out, sign-in, new project)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{nope');
    restoreGuestDraft();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBe('{nope');
    clearRejectedGuestDraft();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBeNull();
  });
});
