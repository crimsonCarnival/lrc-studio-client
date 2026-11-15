import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useHistory from './useHistory';

describe('useHistory undo steps', () => {
  it('merges changes made in quick succession into one step', () => {
    const { result } = renderHook(() => useHistory<string>('a', { groupingThresholdMs: 1000 }));
    act(() => result.current[1]('b'));
    act(() => result.current[1]('c'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('a');
  });

  it('gives a change that asks for it a step of its own, between its neighbours', () => {
    const { result } = renderHook(() => useHistory<string>('a', { groupingThresholdMs: 1000 }));
    act(() => result.current[1]('marked'));
    act(() => result.current[1]('ended', { step: true }));
    act(() => result.current[1]('marked again'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('ended');
    act(() => result.current[2]());
    expect(result.current[0]).toBe('marked');
    act(() => result.current[2]());
    expect(result.current[0]).toBe('a');
  });
});
