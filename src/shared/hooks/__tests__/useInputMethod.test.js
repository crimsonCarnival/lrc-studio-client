import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useInputMethod from '../useInputMethod';

describe('useInputMethod', () => {
  let matchMediaMock;
  let hoverQueryListeners = [];
  let coarsePointerQueryListeners = [];
  let orientationChangeListeners = [];

  beforeEach(() => {
    // Clear all listeners
    hoverQueryListeners = [];
    coarsePointerQueryListeners = [];
    orientationChangeListeners = [];

    // Mock matchMedia
    matchMediaMock = vi.fn((query) => {
      let listeners = [];

      if (query === '(hover: hover)') {
        listeners = hoverQueryListeners;
      } else if (query === '(pointer: coarse)') {
        listeners = coarsePointerQueryListeners;
      }

      return {
        matches: false,
        media: query,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'change') {
            listeners.push(callback);
          }
        }),
        removeEventListener: vi.fn((event, callback) => {
          if (event === 'change') {
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }),
      };
    });

    window.matchMedia = matchMediaMock;

    // Mock window event listeners
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;

    window.addEventListener = vi.fn((event, callback) => {
      if (event === 'orientationchange') {
        orientationChangeListeners.push(callback);
      } else {
        originalAddEventListener.call(window, event, callback);
      }
    });

    window.removeEventListener = vi.fn((event, callback) => {
      if (event === 'orientationchange') {
        const index = orientationChangeListeners.indexOf(callback);
        if (index > -1) {
          orientationChangeListeners.splice(index, 1);
        }
      } else {
        originalRemoveEventListener.call(window, event, callback);
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return a string', () => {
    const { result } = renderHook(() => useInputMethod());

    expect(typeof result.current).toBe('string');
  });

  it('should detect touch device (coarse pointer, no hover)', () => {
    matchMediaMock.mockImplementation((query) => {
      const isHover = query === '(hover: hover)';
      const isCoarse = query === '(pointer: coarse)';

      return {
        matches: isCoarse, // coarse: true, hover: false
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useInputMethod());

    expect(result.current).toBe('touch');
  });

  it('should detect mouse device (hover, no coarse pointer)', () => {
    matchMediaMock.mockImplementation((query) => {
      const isHover = query === '(hover: hover)';
      const isCoarse = query === '(pointer: coarse)';

      return {
        matches: isHover, // hover: true, coarse: false
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useInputMethod());

    expect(result.current).toBe('mouse');
  });

  it('should detect hybrid device (both hover and coarse pointer)', () => {
    matchMediaMock.mockImplementation((query) => {
      // Both queries match
      return {
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useInputMethod());

    expect(result.current).toBe('hybrid');
  });

  it('should handle initial unknown state when neither is supported', () => {
    matchMediaMock.mockImplementation((query) => {
      // Neither query matches
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useInputMethod());

    expect(result.current).toBe('unknown');
  });

  it('should return unknown if matchMedia is not supported', () => {
    const originalMatchMedia = window.matchMedia;
    delete window.matchMedia;

    const { result } = renderHook(() => useInputMethod());

    expect(result.current).toBe('unknown');

    window.matchMedia = originalMatchMedia;
  });

  it('should update state when media query changes', () => {
    let hoverCallback;
    let coarseCallback;
    let currentMatches = {
      hover: true,
      coarse: false,
    };

    matchMediaMock.mockImplementation((query) => {
      const isHover = query === '(hover: hover)';

      return {
        get matches() {
          return isHover ? currentMatches.hover : currentMatches.coarse;
        },
        media: query,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'change') {
            if (isHover) {
              hoverCallback = callback;
            } else {
              coarseCallback = callback;
            }
          }
        }),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useInputMethod());

    // Initially should be 'mouse'
    expect(result.current).toBe('mouse');

    // Simulate coarse pointer being detected
    act(() => {
      // Update mock state
      currentMatches.hover = false;
      currentMatches.coarse = true;

      // Trigger the callback
      if (coarseCallback) {
        coarseCallback();
      }
    });

    // After change, should detect 'touch'
    expect(result.current).toBe('touch');
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    const { unmount } = renderHook(() => useInputMethod());

    // Component mounted, so addEventListener should have been called
    expect(addEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));

    // Unmount the component
    unmount();

    // removeEventListener should have been called
    expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));

    removeEventListenerSpy.mockRestore();
    addEventListenerSpy.mockRestore();
  });

  it('should update on orientation change', () => {
    let orientationCallback;
    let currentMatches = {
      hover: true,
      coarse: false,
    };

    window.addEventListener = vi.fn((event, callback) => {
      if (event === 'orientationchange') {
        orientationCallback = callback;
      }
    });

    matchMediaMock.mockImplementation((query) => {
      const isHover = query === '(hover: hover)';

      return {
        get matches() {
          return isHover ? currentMatches.hover : currentMatches.coarse;
        },
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useInputMethod());

    // Initially 'mouse'
    expect(result.current).toBe('mouse');

    // Simulate orientation change
    act(() => {
      // Update mock state
      currentMatches.hover = false;
      currentMatches.coarse = true;

      if (orientationCallback) {
        orientationCallback();
      }
    });

    // After orientation change, should detect 'touch'
    expect(result.current).toBe('touch');
  });

  it('should handle matchMedia media query listeners properly', () => {
    const addEventListenerMocks = {
      hover: vi.fn(),
      coarse: vi.fn(),
    };

    matchMediaMock.mockImplementation((query) => {
      const isHover = query === '(hover: hover)';

      return {
        matches: isHover,
        media: query,
        addEventListener: isHover ? addEventListenerMocks.hover : addEventListenerMocks.coarse,
        removeEventListener: vi.fn(),
      };
    });

    const { unmount } = renderHook(() => useInputMethod());

    // Both media queries should have listeners added
    expect(addEventListenerMocks.hover).toHaveBeenCalledWith('change', expect.any(Function));
    expect(addEventListenerMocks.coarse).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();
  });
});
