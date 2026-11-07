import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from './storage.service';
import { markGuestLyricsCleared, mayWriteGuestDraft } from './guest-draft';

const store = (n: number) => localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify({ lines: Array.from({ length: n }, () => ({ text: 'Line' })) }));

describe('mayWriteGuestDraft', () => {
  beforeEach(() => { localStorage.clear(); mayWriteGuestDraft(1); });

  it('never lets an empty project replace a non-empty stored draft', () => {
    store(6);
    expect(mayWriteGuestDraft(0)).toBe(false);
  });

  it('lets an empty project write when nothing non-empty is stored', () => {
    expect(mayWriteGuestDraft(0)).toBe(true);
    store(0);
    expect(mayWriteGuestDraft(0)).toBe(true);
  });

  it('lets a non-empty project write', () => {
    store(6);
    expect(mayWriteGuestDraft(3)).toBe(true);
  });

  it('lets an empty project replace the draft after the user removed all lyrics, until lines come back', () => {
    store(6);
    markGuestLyricsCleared();
    expect(mayWriteGuestDraft(0)).toBe(true);
    expect(mayWriteGuestDraft(2)).toBe(true);
    expect(mayWriteGuestDraft(0)).toBe(false);
  });

  it('treats an unreadable draft as empty', () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{nope');
    expect(mayWriteGuestDraft(0)).toBe(true);
  });
});
