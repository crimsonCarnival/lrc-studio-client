import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useHapticFeedback from '../useHapticFeedback';

describe('useHapticFeedback', () => {
  let originalNavigator;
  let vibrateMock;

  beforeEach(() => {
    // Save original navigator for restoration
    originalNavigator = window.navigator;
    // Setup vibrate mock
    vibrateMock = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator
    window.navigator = originalNavigator;
    // Clean up vibrate mock
    delete window.navigator.vibrate;
    vi.clearAllMocks();
  });

  it('should return a trigger function', () => {
    const { result } = renderHook(() => useHapticFeedback());

    expect(result.current).toHaveProperty('trigger');
    expect(typeof result.current.trigger).toBe('function');
  });

  it('should call navigator.vibrate with light intensity (10ms)', () => {
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.trigger('light');
    });

    expect(vibrateMock).toHaveBeenCalledWith(10);
    expect(vibrateMock).toHaveBeenCalledTimes(1);
  });

  it('should call navigator.vibrate with medium intensity ([50, 50]ms)', () => {
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.trigger('medium');
    });

    expect(vibrateMock).toHaveBeenCalledWith([50, 50]);
    expect(vibrateMock).toHaveBeenCalledTimes(1);
  });

  it('should call navigator.vibrate with heavy intensity (100ms)', () => {
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.trigger('heavy');
    });

    expect(vibrateMock).toHaveBeenCalledWith(100);
    expect(vibrateMock).toHaveBeenCalledTimes(1);
  });

  it('should handle missing navigator.vibrate gracefully', () => {
    // Override vibrate to undefined for this test
    Object.defineProperty(window.navigator, 'vibrate', {
      value: undefined,
      configurable: true,
    });

    const { result } = renderHook(() => useHapticFeedback());

    // Should not throw an error
    expect(() => {
      act(() => {
        result.current.trigger('light');
      });
    }).not.toThrow();
  });

  it('should default to light pattern when intensity is unknown', () => {
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.trigger('unknown');
    });

    // Should default to light pattern (10ms)
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it('should default to light pattern when no intensity is provided', () => {
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.trigger();
    });

    // Should default to light pattern (10ms)
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });
});
