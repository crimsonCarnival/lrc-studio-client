import { beforeEach, describe, expect, it, vi } from 'vitest';

// A plain function, not vi.fn(): the spy would track the rejected promise on its own and report it as unhandled.
const api = vi.hoisted(() => ({ offline: false, calls: [] as Array<[string, { body: string }]> }));
vi.mock('@/app/api.client', () => ({
  request: (path: string, init: { body: string }) => {
    api.calls.push([path, init]);
    // A real browser fetch() throws TypeError on a network failure — that's
    // what isNetworkError() in lyrics.service.ts actually checks for, so the
    // mock has to produce the same shape rather than an arbitrary Error.
    return api.offline ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ output: '', format: 'lrc' });
  },
}));

import { lyricsService } from './lyrics.service';

const credits = [
  { name: 'Drake', role: 'primary' as const, order: 0 },
  { name: 'Rihanna', role: 'featured' as const, order: 1 },
];
const base = { lines: [], metadata: { ti: 'Song', ar: 'ignored' } };
const lastBody = () => JSON.parse(api.calls[api.calls.length - 1][1].body);

describe('lyricsService.compileLrc', () => {
  beforeEach(() => { api.offline = false; api.calls = []; });

  it('sends metadata.artists as { name, role } and the title option to the server', async () => {
    await lyricsService.compileLrc({ ...base, artists: credits, includeFeaturedInTitle: true });
    expect(api.calls[0][0]).toBe('/lyrics/compile/lrc');
    expect(lastBody().metadata.artists).toEqual([{ name: 'Drake', role: 'primary' }, { name: 'Rihanna', role: 'featured' }]);
    expect(lastBody().includeFeaturedInTitle).toBe(true);
  });

  it('keeps the title plain by default', async () => {
    await lyricsService.compileLrc({ ...base, artists: credits });
    expect(lastBody().includeFeaturedInTitle).toBe(false);
  });

  it('passes the old strings through untouched when there are no credits', async () => {
    await lyricsService.compileLrc({ ...base });
    expect(lastBody().metadata).toEqual({ ti: 'Song', ar: 'ignored' });
    expect(lastBody().includeFeaturedInTitle).toBe(false);
  });

  it('writes the same header locally when the server is unreachable', async () => {
    api.offline = true;
    const plain = await lyricsService.compileLrc({ ...base, artists: credits }) as { output: string };
    expect(plain.output).toContain('[ti:Song]');
    expect(plain.output).toContain('[ar:Drake feat. Rihanna]');
    const withTitle = await lyricsService.compileLrc({ ...base, artists: credits, includeFeaturedInTitle: true }) as { output: string };
    expect(withTitle.output).toContain('[ti:Song (feat. Rihanna)]');
  });
});
