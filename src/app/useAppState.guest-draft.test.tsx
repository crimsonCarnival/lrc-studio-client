import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { useAppState } from './useAppState';

// The guest draft sequence from the setup screen: Back keeps the stored draft but clears memory,
// Forward must bring it back, and nothing may overwrite the draft with an empty project.
vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: { ...DEFAULT_SETTINGS, advanced: { ...DEFAULT_SETTINGS.advanced, confirmDestructive: false, autoSave: { enabled: true, timeInterval: 1 } } }, updateSetting: vi.fn(), updateSettings: vi.fn() }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
vi.mock('@/app/socket.client', () => ({ connectSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false }), getSocket: () => null }));

const draft = (n: number) => JSON.stringify({
  lines: Array.from({ length: n }, (_, i) => ({ id: `l${i}`, text: `Line ${i + 1}`, timestamp: null })),
  editorMode: 'lrc', syncMode: true, activeLineIndex: 0, title: 'demo',
});
const storedCount = () => (JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECT) ?? '{"lines":[]}').lines as unknown[]).length;

function mount(path = '/project/local') {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  return renderHook(() => ({ app: useAppState(null), navigate: useNavigate() }), { wrapper });
}

/** Lets the 1.5 s guest save timer fire (real time: the timer is set by the effect, not by the test). */
async function autosaveTick() {
  await act(async () => { await new Promise((r) => setTimeout(r, 1700)); });
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('guest draft round trip through the setup screen', () => {
  it('restores on mount (reload)', () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(6));
    const { result } = mount();
    expect(result.current.app.lines).toHaveLength(6);
  });

  it('Back to setup then Forward restores the 6 lines and the stored draft stays 6 after autosave', async () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(6));
    const { result } = mount();
    expect(result.current.app.lines).toHaveLength(6);

    act(() => { result.current.navigate('/project/new'); });
    act(() => { result.current.app.resetAppState({ keepGuestDraft: true }); });
    expect(result.current.app.lines).toHaveLength(0);
    await autosaveTick();
    expect(storedCount()).toBe(6);

    act(() => { result.current.navigate('/project/local'); });
    expect(result.current.app.lines).toHaveLength(6);
    await autosaveTick();
    expect(storedCount()).toBe(6);
  });

  it('an explicit New project discards the draft, so nothing comes back', () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(6));
    const { result } = mount();
    act(() => { result.current.navigate('/project/new'); });
    act(() => { result.current.app.resetAppState(); });
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT)).toBeNull();
    act(() => { result.current.navigate('/project/local'); });
    expect(result.current.app.lines).toHaveLength(0);
  });

  it('removing all lyrics on purpose persists the empty project and does not restore it', async () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT, draft(6));
    const { result } = mount();
    act(() => { result.current.app.handleRemoveAllLyrics(); });
    expect(result.current.app.lines).toHaveLength(0);
    await autosaveTick();
    expect(storedCount()).toBe(0);
    act(() => { result.current.navigate('/project/new'); });
    act(() => { result.current.app.resetAppState({ keepGuestDraft: true }); });
    act(() => { result.current.navigate('/project/local'); });
    expect(result.current.app.lines).toHaveLength(0);
  });
});
