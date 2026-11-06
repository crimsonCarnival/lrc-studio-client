import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

// A tiny fake of the settings API: `server` is what the account has stored.
const server: { interface: Record<string, unknown> } = { interface: {} };
let getDelay = 0;
const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));

vi.mock('@/app/api', () => ({
  settings: api,
  getAccessToken: () => true,
}));

import { SettingsProvider } from './SettingsContext';
import { useSettings } from './useSettings';

const wrapper = ({ children }: { children: ReactNode }) => <SettingsProvider>{children}</SettingsProvider>;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  localStorage.clear();
  server.interface = {};
  getDelay = 0;
  api.get.mockImplementation(async () => {
    const snapshot = structuredClone(server);
    if (getDelay) await wait(getDelay);
    return snapshot;
  });
  api.patch.mockImplementation(async (input: { interface?: Record<string, unknown> }) => {
    Object.assign(server.interface, input.interface ?? {});
    return {};
  });
});

const pass = (ms: number) => act(async () => { await wait(ms); });

describe('theme survives a reload', () => {
  it('signed in: picked, pushed, remounted + synced', async () => {
    server.interface = { theme: 'dark' };
    const first = renderHook(() => useSettings(), { wrapper });
    act(() => { first.result.current.syncFromServer(); });
    await pass(30);
    act(() => { first.result.current.updateSetting('interface.theme', 'matrix'); });
    await pass(450);
    expect(server.interface.theme).toBe('matrix');
    first.unmount();

    const second = renderHook(() => useSettings(), { wrapper });
    expect(second.result.current.settings.interface.theme).toBe('matrix');
    act(() => { second.result.current.syncFromServer(); });
    await pass(50);
    expect(second.result.current.settings.interface.theme).toBe('matrix');
  });

  it('signed in: reload inside the 300ms push window', async () => {
    server.interface = { theme: 'dark' };
    const first = renderHook(() => useSettings(), { wrapper });
    act(() => { first.result.current.syncFromServer(); });
    await pass(30);
    act(() => { first.result.current.updateSetting('interface.theme', 'matrix'); });
    await pass(50);
    first.unmount(); // page torn down before the debounced push fired

    const second = renderHook(() => useSettings(), { wrapper });
    act(() => { second.result.current.syncFromServer(); });
    await pass(50);
    expect(second.result.current.settings.interface.theme).toBe('matrix');
  });

  it('signed in: a sync already in flight must not undo a pick', async () => {
    server.interface = { theme: 'dark' };
    const view = renderHook(() => useSettings(), { wrapper });
    getDelay = 100;
    act(() => { view.result.current.syncFromServer(); }); // GET starts, will answer with the old theme
    await pass(20);
    act(() => { view.result.current.updateSetting('interface.theme', 'matrix'); });
    await pass(400);
    expect(view.result.current.settings.interface.theme).toBe('matrix');
    expect(JSON.parse(localStorage.getItem('lrc-syncer-settings')!).interface.theme).toBe('matrix');
  });

  it('signed in: a second sync (user object refreshed) must not undo a pick the server has not seen yet', async () => {
    server.interface = { theme: 'dark' };
    const view = renderHook(() => useSettings(), { wrapper });
    act(() => { view.result.current.syncFromServer(); });
    await pass(30);
    act(() => { view.result.current.updateSetting('interface.theme', 'matrix'); });
    await pass(50); // push still pending
    act(() => { view.result.current.syncFromServer(); }); // e.g. refreshUserProfile replaced `user`
    await pass(400);
    expect(view.result.current.settings.interface.theme).toBe('matrix');
  });
});
