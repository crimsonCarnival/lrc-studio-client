// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import '@/app/i18n';
import { HEAVY_LINE_LIMIT, useHeavyUsage } from './useHeavyUsage';
import { getUsage } from './assist.service';
import type { HeavyUsage } from './assist.types';

vi.mock('./assist.service');
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

const mockedUsage = vi.mocked(getUsage);
const USAGE: HeavyUsage = { used: 2, limit: 5, remaining: 3, resetsAt: '2026-11-16T00:00:00.000Z' };
const apiError = (code: string | undefined, body: Record<string, unknown> = {}) =>
  Object.assign(new Error(code ?? 'x'), { status: 429, code, body: code ? { error: code, ...body } : body });

beforeEach(async () => {
  mockedUsage.mockReset();
  mockedUsage.mockResolvedValue(USAGE);
  toast.error.mockReset();
  await i18n.changeLanguage('en');
});

describe('useHeavyUsage', () => {
  it('exports the 200-line limit', () => expect(HEAVY_LINE_LIMIT).toBe(200));

  it('fetches usage once when enabled', async () => {
    const { result, rerender } = renderHook(({ on }) => useHeavyUsage(on), { initialProps: { on: false } });
    expect(mockedUsage).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(result.current.usage).toEqual(USAGE));
    rerender({ on: true });
    expect(mockedUsage).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the usage fetch fails', async () => {
    mockedUsage.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useHeavyUsage(true));
    await waitFor(() => expect(mockedUsage).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.usage).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('ignores a fetch that resolves after unmount', async () => {
    let resolve!: (u: HeavyUsage) => void;
    mockedUsage.mockReturnValue(new Promise((r) => { resolve = r; }));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useHeavyUsage(true));
    unmount();
    await act(async () => { resolve(USAGE); });
    expect(result.current.usage).toBeNull();
    err.mockRestore();
  });

  it('a 429 assist_daily_cap marks exhausted and toasts the cap message', async () => {
    const { result } = renderHook(() => useHeavyUsage(true));
    await waitFor(() => expect(result.current.usage).toEqual(USAGE));
    expect(result.current.exhausted).toBe(false);
    act(() => result.current.reportError(apiError('assist_daily_cap', { resetsAt: '2026-11-16T00:00:00.000Z' })));
    expect(result.current.exhausted).toBe(true);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error.mock.calls[0][0]).toContain("daily");
  });

  it('maps unavailable and unknown errors, including the hourly 429, to their own messages', () => {
    const { result } = renderHook(() => useHeavyUsage(false));
    act(() => result.current.reportError(apiError('assist_unavailable')));
    act(() => result.current.reportError(apiError(undefined, { message: 'Rate limit exceeded' })));
    act(() => result.current.reportError(new Error('network')));
    const msgs = toast.error.mock.calls.map((c) => c[0]);
    expect(msgs[0]).toBe(i18n.t('editor.assist.errors.unavailable'));
    expect(msgs[1]).toBe(i18n.t('editor.assist.errors.upstream'));
    expect(msgs[2]).toBe(i18n.t('editor.assist.errors.upstream'));
    expect(result.current.exhausted).toBe(false);
  });

  it('setUsage from a run response updates remaining and exhausted', async () => {
    const { result } = renderHook(() => useHeavyUsage(true));
    await waitFor(() => expect(result.current.usage).toEqual(USAGE));
    act(() => result.current.setUsage({ ...USAGE, used: 5, remaining: 0 }));
    expect(result.current.usage?.remaining).toBe(0);
    expect(result.current.exhausted).toBe(true);
  });

  it('has plural and Spanish heavy strings', async () => {
    expect(i18n.t('editor.assist.heavy.left', { count: 1 })).toMatch(/1 /);
    await i18n.changeLanguage('es');
    expect(i18n.t('editor.assist.heavy.left', { count: 1 })).not.toBe(i18n.t('editor.assist.heavy.left', { count: 2 }));
    expect(i18n.t('editor.assist.heavy.tooLong', { max: 200 })).toContain('200');
  });
});
