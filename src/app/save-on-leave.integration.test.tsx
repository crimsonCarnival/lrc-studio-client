import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { resetGuestLyricsCleared } from '@/features/projects/services/guest-draft';
import { setAccessToken } from '@/app/api';
import App from './App';

// Real App under a MemoryRouter, signed in or not. The save itself is a spy (handleManualSave),
// so these tests pin WHEN a save is started on leaving the editor, not what the save does.
const h = vi.hoisted(() => ({
  save: vi.fn(),
  getProject: vi.fn(),
  getShare: vi.fn(),
  collab: { role: null as string | null },
}));

vi.mock('@/features/editor/hooks/useManualSave', async (orig) => {
  const actual = await orig<typeof import('@/features/editor/hooks/useManualSave')>();
  return { ...actual, useManualSave: (p: Parameters<typeof actual.useManualSave>[0]) => ({ ...actual.useManualSave(p), handleManualSave: h.save }) };
});
vi.mock('@/app/api', async (orig) => {
  const actual = await orig<typeof import('@/app/api')>();
  return { ...actual, projects: { ...actual.projects, get: h.getProject, getShare: h.getShare } };
});
vi.mock('@/features/collab/useCollabSession', () => ({
  useCollabSession: () => ({ doc: null, provider: null, status: 'connecting', me: null, locks: new Map(), role: h.collab.role, retry: vi.fn() }),
}));
vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSetting: vi.fn(), updateSettings: vi.fn(), syncFromServer: vi.fn() }),
}));
const USER = { id: 'u1', accountName: 'someone', permissions: [], role: 'user' };
let signedIn = true;
vi.mock('@/features/auth/useAuthContext', () => ({
  useAuthContext: () => ({ user: signedIn ? USER : null, logout: vi.fn(), isLoading: false }),
}));
vi.mock('@/features/notifications/NotificationsContext', () => ({
  useNotificationsContext: () => ({ notifications: [], unreadCount: 0, markRead: vi.fn(), markAllRead: vi.fn(), dismiss: vi.fn() }),
  NotificationsProvider: ({ children }: { children: unknown }) => children,
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
    <button type="button" onClick={() => onComplete({ editorMode: 'lrc', lines: [{ text: 'Line one', timestamp: null, id: 's0' }] })}>Start Syncing</button>
  ),
}));

const EDIT = '/someone/projects/demo-abcdefghij/edit';
const NAMES = ['one', 'two', 'three'];
const serverProject = {
  publicId: 'abcdefghij', title: 'demo', metadata: {}, public: false, user: { id: 'u1' },
  state: { syncMode: true, activeLineIndex: 0, playbackPosition: 0, playbackSpeed: 1 },
  lyrics: { editorMode: 'lrc', sections: [{ lines: NAMES.map((n, i) => ({ text: `Line ${n}`, timestamp: null, endTime: null, secondary: '', id: `p${i}` })) }] },
  upload: null,
};

let nav: ReturnType<typeof useNavigate>;
let loc: ReturnType<typeof useLocation>;
function Probe() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { nav = navigate; loc = location; });
  return null;
}
const mount = (path: string) => render(
  <MemoryRouter initialEntries={[path]}><TooltipProvider><Probe /><App /></TooltipProvider></MemoryRouter>,
);

const realSetTimeout = globalThis.setTimeout;
async function settle(ms = 50) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    await new Promise((r) => realSetTimeout(r, 30));
    await vi.advanceTimersByTimeAsync(0);
  });
}
async function settleUntil(cond: () => boolean, deadlineMs = 10000) {
  const end = Date.now() + deadlineMs;
  for (; !cond() && Date.now() < end;) await settle(100);
  await settle(100);
}
const shown = () => NAMES.filter((n) => document.body.textContent?.includes(`Line ${n}`)).length;

async function removeFirstLine() {
  fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
  await settleUntil(() => screen.queryByRole('dialog') !== null);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /remove this line/i }));
  await settleUntil(() => screen.queryByRole('button', { name: /^confirm$/i }) !== null);
  fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
  await settle(200);
}
const hide = () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
};

const SIZES = { clientHeight: 600, clientWidth: 360, offsetHeight: 56, offsetWidth: 360, scrollHeight: 4000 };
const SIZE_KEYS = Object.keys(SIZES) as (keyof typeof SIZES)[];
const savedSizes = SIZE_KEYS.map((k) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, k));
const originalScrollTo = Element.prototype.scrollTo;
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  localStorage.clear();
  sessionStorage.clear();
  resetGuestLyricsCleared();
  h.save.mockReset().mockResolvedValue(true);
  h.getProject.mockReset().mockResolvedValue({ project: serverProject });
  h.getShare.mockReset();
  h.collab.role = null;
  signedIn = true;
  setAccessToken('t');
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  SIZE_KEYS.forEach((k) => Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => SIZES[k] }));
});
afterEach(() => {
  cleanup();
  setAccessToken(null);
  vi.restoreAllMocks();
  vi.useRealTimers();
  Element.prototype.scrollTo = originalScrollTo;
  SIZE_KEYS.forEach((k, i) => { const d = savedSizes[i]; if (d) Object.defineProperty(HTMLElement.prototype, k, d); });
});

describe('save on leave (signed in, real App)', { timeout: 40000 }, () => {
  it('an existing server project with unsaved edits is saved once, silently, when the user leaves', async () => {
    mount(EDIT);
    await settleUntil(() => shown() === 3);
    await removeFirstLine();
    expect(shown()).toBe(2);
    h.save.mockClear(); // only the leave flush is under test
    act(() => { nav('/a/b/c/d/e'); });
    // The router commits the transition only after the lazy route chunk resolves, which can take
    // far longer than a fixed wait under load: wait for the flush, then settle to catch a second one.
    await settleUntil(() => h.save.mock.calls.length >= 1);
    expect(h.save).toHaveBeenCalledTimes(1);
    expect(h.save).toHaveBeenCalledWith({ silent: true });
  });

  it('hidden then pagehide while that save is in flight starts no second save', async () => {
    mount(EDIT);
    await settleUntil(() => shown() === 3);
    await removeFirstLine();
    h.save.mockClear();
    h.save.mockImplementation(() => new Promise(() => {})); // never settles: a save in flight
    hide();
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(h.save).toHaveBeenCalledTimes(1);
  });

  it('staying on the editor (query change, timers) saves nothing', async () => {
    mount(EDIT);
    await settleUntil(() => shown() === 3);
    await removeFirstLine();
    h.save.mockClear();
    act(() => { nav(`${EDIT}?t=5`); });
    await settle(300);
    expect(h.save).not.toHaveBeenCalled();
  });

  it('leaving /project/new with lyrics while signed in never creates a project', async () => {
    mount('/project/new');
    await settleUntil(() => screen.queryByRole('button', { name: 'Start Syncing' }) !== null);
    fireEvent.click(screen.getByRole('button', { name: 'Start Syncing' }));
    await settleUntil(() => loc.pathname === '/project/local');
    h.save.mockClear();
    act(() => { nav('/a/b/c/d/e'); });
    await settle(100);
    hide();
    await settle(200);
    expect(h.save).not.toHaveBeenCalled();
  });

  it('a project still loading is not flushed', async () => {
    h.getProject.mockReturnValue(new Promise(() => {}));
    mount(EDIT);
    await settle(300);
    act(() => { nav('/a/b/c/d/e'); });
    await settle(100);
    hide();
    expect(h.save).not.toHaveBeenCalled();
  });

  it.each(['viewer', 'owner'])('a collab session (%s) is not flushed: the server stores the shared doc', async (role) => {
    h.collab.role = role;
    mount('/session/abc123');
    await settle(300);
    hide();
    act(() => { nav('/a/b/c/d/e'); });
    await settle(100);
    expect(h.save).not.toHaveBeenCalled();
  });
});

describe('save on leave (shared project)', { timeout: 40000 }, () => {
  it('a project opened from a share link is not flushed, signed in or not', async () => {
    for (const asUser of [true, false]) {
      signedIn = asUser;
      setAccessToken(asUser ? 't' : null);
      h.getShare.mockResolvedValue({ project: { ...serverProject, readOnly: true } });
      window.history.replaceState(null, '', '/#s=abcdefghij');
      const view = mount('/project/local');
      await settleUntil(() => shown() === 3);
      expect(shown()).toBe(3);
      h.save.mockClear();
      act(() => { nav('/a/b/c/d/e'); });
      await settle(100);
      hide();
      expect(h.save).not.toHaveBeenCalled();
      expect(localStorage.getItem(STORAGE_KEYS.PROJECT)).toBeNull();
      view.unmount();
    }
  });
});
