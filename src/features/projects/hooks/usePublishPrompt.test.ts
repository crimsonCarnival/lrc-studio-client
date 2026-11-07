import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePublishPrompt } from './usePublishPrompt';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('usePublishPrompt', () => {
  it('offers once the project is eligible and stops after dismissal', () => {
    const { result } = renderHook(() => usePublishPrompt('abc', true));
    expect(result.current.show).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.show).toBe(false);
  });

  it('remembers the dismissal per project across mounts', () => {
    const first = renderHook(() => usePublishPrompt('abc', true));
    act(() => first.result.current.dismiss());
    expect(renderHook(() => usePublishPrompt('abc', true)).result.current.show).toBe(false);
    expect(renderHook(() => usePublishPrompt('other', true)).result.current.show).toBe(true);
  });

  it('stays hidden when not eligible or without a saved project', () => {
    expect(renderHook(() => usePublishPrompt('abc', false)).result.current.show).toBe(false);
    expect(renderHook(() => usePublishPrompt(null, true)).result.current.show).toBe(false);
  });

  it('survives unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    const { result } = renderHook(() => usePublishPrompt('abc', true));
    expect(result.current.show).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.show).toBe(false);
  });
});
