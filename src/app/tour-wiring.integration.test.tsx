import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@ui/tooltip';
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { resetGuestLyricsCleared } from '@/features/projects/services/guest-draft';
import { consumeNewProject, consumeTourReplay, markNewProject, requestTourReplay } from '@/features/editor/tour/tour-launch';
import App from './App';

// The real App + SettingsProvider under a MemoryRouter, as in guest-draft.integration.test.tsx.
// Stubbed: auth (a guest), sockets, the player, and the breakpoint, so a test can cross `lg`.
let isLg = true;
const lgListeners = new Set<() => void>();
const setLg = (v: boolean) => { isLg = v; lgListeners.forEach((l) => l()); };
vi.mock('@/shared/hooks/useBreakpoint', () => ({
  useBreakpoint: () => useSyncExternalStore((cb) => { lgListeners.add(cb); return () => { lgListeners.delete(cb); }; }, () => isLg),
}));
vi.mock('@/features/auth/useAuthContext', () => ({
  useAuthContext: () => ({ user: null, logout: vi.fn(), isLoading: false }),
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

const SETTINGS_KEY = 'lrc-syncer-settings';
const draft = JSON.stringify({
  lines: ['one', 'two', 'three'].map((x, i) => ({ text: `Line ${x}`, timestamp: null, id: `d${i}` })),
  editorMode: 'lrc', syncMode: true, activeLineIndex: 0, title: 'demo',
});
const storedInterface = () => (JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').interface ?? {}) as Record<string, unknown>;

function mount(path = '/project/local') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

const realSetTimeout = globalThis.setTimeout;
async function settle(ms = 50) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    await new Promise((r) => realSetTimeout(r, 30));
    await vi.advanceTimersByTimeAsync(0);
  });
}
async function settleUntil(cond: () => boolean, deadlineMs = 25000) {
  const end = Date.now() + deadlineMs;
  for (; !cond() && Date.now() < end;) await settle(100);
  await settle(100);
}
// The tour card's "n of N" counter is only on screen while the tour is.
const tourOpen = () => screen.queryByText(/^\d+ of \d+$/) !== null;

const SIZES = { clientHeight: 600, clientWidth: 360, offsetHeight: 56, offsetWidth: 360, scrollHeight: 4000 };
const SIZE_KEYS = Object.keys(SIZES) as (keyof typeof SIZES)[];
const savedSizes = SIZE_KEYS.map((k) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, k));
const originalScrollTo = Element.prototype.scrollTo;
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  localStorage.clear();
  sessionStorage.clear();
  resetGuestLyricsCleared();
  consumeNewProject();
  consumeTourReplay();
  isLg = true;
  localStorage.setItem(STORAGE_KEYS.PROJECT, draft);
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom measures every element as 0x0, which the tour reads as "target not on screen" and skips.
  const measured = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.hasAttribute('data-tour') ? new DOMRect(20, 20, 120, 40) : measured.call(this);
  });
  SIZE_KEYS.forEach((k) => Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => SIZES[k] }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  Element.prototype.scrollTo = originalScrollTo;
  SIZE_KEYS.forEach((k, i) => { const d = savedSizes[i]; if (d) Object.defineProperty(HTMLElement.prototype, k, d); });
});

// The tour skips a step whose target is not mounted and closes when all are missing, so on a cold
// start (lazy route chunks still loading when the lines arrive) it would open and close at once.
// Load the chunks once, with no tour requested, before the first real test.
const warmed = new Set<boolean>();
async function warmChunks() {
  if (warmed.has(isLg)) return;
  mount();
  await settleUntil(() => document.querySelector('[data-tour]') !== null);
  cleanup();
  warmed.add(isLg);
}

describe('editor tour wiring', { timeout: 45000 }, () => {
  it('breakpoint change closes the tour', async () => {
    await warmChunks();
    requestTourReplay();
    mount();
    await settleUntil(tourOpen);
    expect(tourOpen()).toBe(true);
    act(() => { setLg(false); });
    await settle(300);
    expect(tourOpen()).toBe(false);
  });

  it('replay request starts the tour on return without counting it', async () => {
    await warmChunks();
    requestTourReplay();
    mount();
    await settleUntil(tourOpen);
    expect(tourOpen()).toBe(true);
    expect(storedInterface().editorTourShown ?? 0).toBe(0);
  });

  it('a new project on a phone consumes its flag there and starts the tour', async () => {
    isLg = false;
    await warmChunks();
    markNewProject();
    mount();
    await settleUntil(tourOpen);
    expect(tourOpen()).toBe(true);
    expect(consumeNewProject()).toBe(false);
  });

  it('guest opt-out persists to the settings stored in localStorage', async () => {
    await warmChunks();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ interface: { editorTourShown: 1 } }));
    markNewProject();
    mount();
    await settleUntil(tourOpen);
    fireEvent.click(screen.getByRole('checkbox', { name: /don.t show this again/i }));
    // Steps whose target is not mounted here are skipped, and running off the end closes the
    // tour exactly as Done does, so click whichever of Next / Done is showing until it is gone.
    for (let i = 0; i < 12 && tourOpen(); i++) {
      fireEvent.click(screen.getByRole('button', { name: /^(next|done)$/i }));
      await settle(50);
    }
    expect(tourOpen()).toBe(false);
    expect(storedInterface().editorTourEnabled).toBe(false);
  });
});
