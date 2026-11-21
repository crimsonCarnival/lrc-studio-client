import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import i18next from 'i18next';

// `server` is what the account has stored.
const server: { interface: Record<string, unknown> } = { interface: {} };
const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));

vi.mock('@/app/api', () => ({
  settings: api,
  getAccessToken: () => true,
}));

import { SettingsProvider } from './SettingsContext';
import { useSettings } from './useSettings';

const wrapper = ({ children }: { children: ReactNode }) => <SettingsProvider>{children}</SettingsProvider>;
const pass = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

beforeEach(async () => {
  localStorage.clear();
  server.interface = {};
  api.get.mockImplementation(async () => structuredClone(server));
  api.patch.mockReset();
  api.patch.mockImplementation(async (input: { interface?: Record<string, unknown> }) => {
    Object.assign(server.interface, input.interface ?? {});
    return {};
  });
  await i18next.changeLanguage('en');
});

afterEach(async () => { await i18next.changeLanguage('en'); });

describe('language follows the account', () => {
  it('a switch outside the settings page (header, drawer) is saved to the account', async () => {
    const view = renderHook(() => useSettings(), { wrapper });
    act(() => { view.result.current.syncFromServer(); });
    await pass(30);
    await act(async () => { await i18next.changeLanguage('es'); });
    await pass(400);
    expect(view.result.current.settings.interface.defaultLanguage).toBe('es');
    expect(server.interface.defaultLanguage).toBe('es');
  });

  it('a language the account stored is applied on another device', async () => {
    server.interface = { defaultLanguage: 'es' };
    const view = renderHook(() => useSettings(), { wrapper });
    act(() => { view.result.current.syncFromServer(); });
    await pass(100);
    expect(i18next.resolvedLanguage).toBe('es');
  });

  it('an account that never chose keeps the language on screen and does not save it', async () => {
    await i18next.changeLanguage('es');
    const view = renderHook(() => useSettings(), { wrapper });
    act(() => { view.result.current.syncFromServer(); });
    await pass(400);
    expect(i18next.resolvedLanguage).toBe('es');
    expect(view.result.current.settings.interface.defaultLanguage).toBe('es');
    expect(server.interface.defaultLanguage).toBeUndefined();
  });
});

describe('featured-in-title export choice moves to the account', () => {
  it('a value this browser kept is folded into settings and pushed up once', async () => {
    localStorage.setItem('lrc:export:includeFeaturedInTitle', '1');
    const view = renderHook(() => useSettings(), { wrapper });
    expect(view.result.current.settings.export.includeFeaturedInTitle).toBe(true);
    expect(localStorage.getItem('lrc:export:includeFeaturedInTitle')).toBeNull();
    act(() => { view.result.current.syncFromServer(); });
    await pass(400);
    expect(view.result.current.settings.export.includeFeaturedInTitle).toBe(true);
    expect(api.patch).toHaveBeenCalledWith(expect.objectContaining({ export: { includeFeaturedInTitle: true } }));
  });
});
