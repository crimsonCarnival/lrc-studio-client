// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getIncludeFeaturedInTitle, setIncludeFeaturedInTitle, useIncludeFeaturedInTitle } from './include-featured-setting';

afterEach(() => { localStorage.clear(); setIncludeFeaturedInTitle(false); });

describe('include featured in title', () => {
  it('is off by default', () => {
    expect(getIncludeFeaturedInTitle()).toBe(false);
    expect(renderHook(() => useIncludeFeaturedInTitle()).result.current[0]).toBe(false);
  });

  it('is remembered and shared between everything that shows it', () => {
    const a = renderHook(() => useIncludeFeaturedInTitle());
    const b = renderHook(() => useIncludeFeaturedInTitle());
    act(() => a.result.current[1](true));
    expect(b.result.current[0]).toBe(true);
    expect(getIncludeFeaturedInTitle()).toBe(true);
  });
});
