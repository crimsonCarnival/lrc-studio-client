import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { resetGuestLyricsCleared } from '@/features/projects/services/guest-draft';
import App from './App';
import { markGuestLyricsCleared } from '@/features/projects/services/guest-draft';

// The real App (useAppState + AppRouter + the POP reset effect + handleSetupComplete) under a
// MemoryRouter. Only the outside world is stubbed: settings, auth, sockets, the player and the
// heavy setup screen, which becomes one "Start Syncing" button that calls the real onComplete.
let mockSettings: typeof DEFAULT_SETTINGS = DEFAULT_SETTINGS;
vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings, updateSetting: vi.fn(), updateSettings: vi.fn(), syncFromServer: vi.fn() }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({
  useAuthContext: () => ({ user: null, logout: vi.fn(), isLoading: false }),
}));
vi.mock('@/app/socket.client', () => ({
  connectSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false }),
  getSocket: () => null,
}));
vi.mock('@/features/player/PlayerContext', async (orig) => {
  const actual = await orig<typeof import('@/features/player/PlayerContext')>();
  return {
    ...actual,
    PlayerEngine: ({ children }: { children?: ReactNode }) => <>{children}</>,
    usePlayer: () => ({
      source: 'local', isPlaying: false, currentTime: 0, duration: 180, playbackSpeed: 1,
      hasMedia: true, isSeeking: false, loop: { a: null, b: null }, loopA: null, loopB: null,
      local: {}, yt: {}, mediaUploads: [], cdnLoading: false, syncMode: true, viewerMode: false,
      speedPresets: [0.5, 1], MIN_SPEED: 0.25, MAX_SPEED: 2, lines: [], playbackPosition: 0,
      audioRef: { current: null }, detectedUrlType: '', fetchUploads: vi.fn(),
      mediaPopoverProps: {}, togglePlay: vi.fn(), seek: vi.fn(), applySpeed: vi.fn(),
      setLoop: vi.fn(), handleLoopChange: vi.fn(), clearLoop: vi.fn(), handleUrlLoad: vi.fn(),
      handleSelectUpload: vi.fn(), handleClearMedia: vi.fn(), failedAudioUrl: null,
      retryAudio: vi.fn(), setLoopActiveLine: vi.fn(),
    }),
  };
});
vi.mock('@features/editor/components/setup/SetupScreen', () => ({
  default: ({ onComplete }: { onComplete: (d: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onComplete({
        editorMode: 'lrc',
        lines: ['one', 'two', 'three', 'four', 'five', 'six'].map((n, i) => ({ text: `Line ${n}`, timestamp: null, id: `s${i}` })),
      })}
    >
      Start Syncing
    </button>
  ),
}));

const NAMES = ['one', 'two', 'three', 'four', 'five', 'six'];
const draft = (n = 6) => JSON.stringify({
  lines: NAMES.slice(0, n).map((x, i) => ({ text: `Line ${x}`, timestamp: null, id: `d${i}` })),
  editorMode: 'lrc', syncMode: true, activeLineIndex: 0, title: 'demo',
});
const storedCount = () => (JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECT) ?? '{"lines":[]}').lines as unknown[]).length;

let nav: { navigate: ReturnType<typeof useNavigate>; location: ReturnType<typeof useLocation>; type: string };
function Probe() {
  const navigate = useNavigate();
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => { nav = { navigate, location, type }; });
  return null;
}

function mount(path = '/project/local') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <Probe />
        <App />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

// Fake timers drive the app's own timers; lazy route chunks load through the real event loop.
const realSetTimeout = globalThis.setTimeout;
async function settle(ms = 50) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    await new Promise((r) => realSetTimeout(r, 30));
    await vi.advanceTimersByTimeAsync(0);
  });
}
/** Settles until `cond` holds, with a generous real-time deadline (lazy chunks load slowly under load). */
async function settleUntil(cond: () => boolean, deadlineMs = 10000) {
  const end = Date.now() + deadlineMs;
  for (; !cond() && Date.now() < end;) await settle(100);
  await settle(100);
}
/** Lets the 1.5 s guest save timer fire. */
const autosave = () => settle(2000);
const shown = () => NAMES.filter((n) => document.body.textContent?.includes(`Line ${n}`)).length;
const pageIsBlank = () => (document.body.textContent ?? '').trim() === '' && document.querySelectorAll('button, input, textarea, [role=tab]').length === 0;

// jsdom has no layout: give the lyric list a viewport so its virtualizer mounts rows.
const SIZES = { clientHeight: 600, clientWidth: 360, offsetHeight: 56, offsetWidth: 360, scrollHeight: 4000 };
const SIZE_KEYS = Object.keys(SIZES) as (keyof typeof SIZES)[];
const savedSizes = SIZE_KEYS.map((k) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, k));
const originalScrollTo = Element.prototype.scrollTo;
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  localStorage.clear();
  sessionStorage.clear();
  resetGuestLyricsCleared();
  mockSettings = DEFAULT_SETTINGS;
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  SIZE_KEYS.forEach((k) => Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => SIZES[k] }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Element.prototype.scrollTo = originalScrollTo;
  SIZE_KEYS.forEach((k, i) => { const d = savedSizes[i]; if (d) Object.defineProperty(HTMLElement.prototype, k, d); });
});

describe('guest draft through the real route gate', { timeout: 30000 }, () => {
  it('restores the stored draft when the app opens on /project/local', async () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft());
    mount();
    await settleUntil(() => shown() === 6);
    expect(shown()).toBe(6);
    expect(pageIsBlank()).toBe(false);
  });

  it('Start Syncing (PUSH) -> Back (POP) -> Forward (POP) keeps all 6 lines and the stored draft', async () => {
    mount('/project/new');
    await settleUntil(() => screen.queryByRole('button', { name: 'Start Syncing' }) !== null);
    fireEvent.click(screen.getByRole('button', { name: 'Start Syncing' }));
    await settleUntil(() => shown() === 6);
    expect(nav.location.pathname).toBe('/project/local');
    expect(shown()).toBe(6);
    await autosave();
    expect(storedCount()).toBe(6);

    act(() => { nav.navigate(-1); });
    await settle(500);
    expect(nav.location.pathname).toBe('/project/new');
    expect(nav.type).toBe('POP');
    // Memory is empty here; both the 1.5 s guest save and the interval autosave get their chance.
    await settle(65000);
    expect(storedCount()).toBe(6);

    act(() => { nav.navigate(1); });
    await settleUntil(() => shown() === 6);
    expect(nav.location.pathname).toBe('/project/local');
    expect(shown()).toBe(6);
    await autosave();
    expect(storedCount()).toBe(6);
    expect(pageIsBlank()).toBe(false);
  });

  it('an explicit New project (PUSH) discards the draft and Forward does not bring it back', async () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft());
    mount();
    await settle(500);
    act(() => { nav.navigate('/project/new'); });
    await settle(500);
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT)).toBeNull();
    act(() => { nav.navigate('/project/local'); });
    await settle(500);
    expect(shown()).toBe(0);
    // Nothing to restore and no draft: the old behaviour, back to setup, not a blank page.
    expect(nav.location.pathname).toBe('/project/new');
    expect(pageIsBlank()).toBe(false);
  });

  it.each([
    ['a null inside words', JSON.stringify({ lines: [{ text: 'Line one', id: 'a', words: [null, { word: 'Line', time: 1 }] }] })],
    ['a line without an id and no crypto.randomUUID', JSON.stringify({ lines: [{ text: 'Line one' }, { text: 'Line two' }] })],
  ])('opens a draft with %s without a blank page', async (_name, raw) => {
    vi.stubGlobal('crypto', { randomUUID: undefined });
    localStorage.setItem(STORAGE_KEYS.PROJECT, raw);
    mount();
    await settleUntil(() => (document.body.textContent ?? '').includes('Line'));
    expect(document.body.textContent).toContain('Line');
    expect(pageIsBlank()).toBe(false);
    vi.unstubAllGlobals();
  });

  it.each([
    ['unreadable JSON', '{nope'],
    ['no usable line', JSON.stringify({ lines: [null, { a: 1 }] })],
  ])('falls back to the old behaviour for a draft with %s, not a blank page', async (_name, raw) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEYS.PROJECT, raw);
    mount();
    await settle(500);
    expect(nav.location.pathname).toBe('/project/new');
    expect(pageIsBlank()).toBe(false);
  });

  it('storage that throws is the old behaviour (setup), not a blank page', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft());
    const getItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === STORAGE_KEYS.PROJECT) throw new Error('denied');
      return getItem.call(this, key);
    });
    mount();
    await settleUntil(() => nav.location.pathname === '/project/new');
    expect(nav.location.pathname).toBe('/project/new');
    expect(pageIsBlank()).toBe(false);
  });
});

describe('the editor stays up when the user empties it', { timeout: 40000 }, () => {
  const removeLine = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    await settle(100);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /remove this line/i }));
    await settle(100);
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    await settle(200);
  };

  it('deleting every line one by one never blanks the page and persists the empty project', async () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(3));
    mount();
    await settleUntil(() => shown() === 3);
    for (let left = 3; left > 0; left--) {
      expect(shown()).toBe(left);
      await removeLine();
      expect(pageIsBlank()).toBe(false);
    }
    await autosave();
    expect(shown()).toBe(0);
    // With no media loaded the existing route sends an emptied editor to setup (it stays up when media
    // is loaded: see the live check). Either way something renders.
    expect(pageIsBlank()).toBe(false);
    // The deleted lines must not come back from a stale draft, here or after a reload.
    expect(storedCount()).toBe(0);
    cleanup();
    mount();
    await settle(600);
    expect(shown()).toBe(0);
    expect(pageIsBlank()).toBe(false);
  });

  it('undoing Start Syncing back to empty keeps the editor and persists the empty project', async () => {
    mount('/project/new');
    await settleUntil(() => screen.queryByRole('button', { name: 'Start Syncing' }) !== null);
    fireEvent.click(screen.getByRole('button', { name: 'Start Syncing' }));
    await settleUntil(() => shown() === 6);
    await autosave();
    expect(storedCount()).toBe(6);
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true });
    await settle(300);
    expect(shown()).toBe(0);
    expect(pageIsBlank()).toBe(false);
    await autosave();
    expect(storedCount()).toBe(0);
    cleanup();
    mount();
    await settle(600);
    expect(shown()).toBe(0);
    expect(pageIsBlank()).toBe(false);
  });

  it('Remove all lyrics persists empty and a later arrival does not resurrect the draft', async () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(3));
    mount();
    await settleUntil(() => shown() === 3);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await settle(200);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Tools' })).getByRole('button', { name: /remove all lyrics/i }));
    await settle(200);
    // The Tools row and the removal itself may each ask to confirm.
    for (let i = 0; i < 2; i++) {
      await settle(300);
      const ok = screen.queryByRole('button', { name: /^confirm$/i, hidden: true });
      if (ok) fireEvent.click(ok);
      await settle(300);
    }
    expect(shown()).toBe(0);
    expect(pageIsBlank()).toBe(false);
    await autosave();
    expect(storedCount()).toBe(0);
  });
});

describe('draft intent across redirects and tabs', { timeout: 40000 }, () => {
  it('keeps a non-empty draft through the editor own REPLACE redirect to setup', async () => {
    mount('/project/new');
    await settleUntil(() => screen.queryByRole('button', { name: 'Start Syncing' }) !== null);
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(4));
    markGuestLyricsCleared(); // this tab emptied it, the 1.5 s save has not run yet
    act(() => { nav.navigate('/project/local'); });
    await settleUntil(() => nav.type === 'REPLACE', 3000);
    // Checked before the 1.5 s guest save: the reset itself must not have deleted the draft.
    expect(nav.location.pathname).toBe('/project/new');
    expect(nav.type).toBe('REPLACE');
    expect(storedCount()).toBe(4);
  });

  it('restores a draft another tab wrote after this tab cleared its lyrics', async () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(2));
    markGuestLyricsCleared();
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(4)); // "tab B"
    mount();
    await settleUntil(() => shown() === 4);
    expect(shown()).toBe(4);
    await autosave();
    expect(storedCount()).toBe(4);
  });

  it('a rejected draft is copied to the rejected key before the redirect resets it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = JSON.stringify({ lines: [null, { a: 1 }] });
    localStorage.setItem(STORAGE_KEYS.PROJECT, raw);
    mount();
    await settleUntil(() => nav.location.pathname === '/project/new');
    expect(nav.location.pathname).toBe('/project/new');
    expect(localStorage.getItem('lrc-syncer-project-rejected')).toBe(raw);
  });

  it('setup needs lyrics, so a new project from setup shows its own lines, not an older kept draft', async () => {
    const older = JSON.stringify({ lines: [{ text: 'Old one', id: 'o1' }, { text: 'Old two', id: 'o2' }], editorMode: 'lrc', title: 'older' });
    localStorage.setItem(STORAGE_KEYS.PROJECT, older);
    mount('/project/new');
    await settleUntil(() => screen.queryByRole('button', { name: 'Start Syncing' }) !== null);
    fireEvent.click(screen.getByRole('button', { name: 'Start Syncing' }));
    await settleUntil(() => shown() === 6);
    expect(document.body.textContent).not.toContain('Old one');
    await autosave();
    expect(storedCount()).toBe(6);
  });
});
