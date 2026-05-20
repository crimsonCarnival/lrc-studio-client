import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useMediaQuery from '../useMediaQuery';

describe('useMediaQuery', () => {
  let matchMediaMock;
  let mediaQueryListeners = {};

  beforeEach(() => {
    // Clear all listeners
    mediaQueryListeners = {};

    // Mock matchMedia
    matchMediaMock = vi.fn((query) => {
      if (!mediaQueryListeners[query]) {
        mediaQueryListeners[query] = [];
      }

      return {
        matches: false,
        media: query,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'change') {
            mediaQueryListeners[query].push(callback);
          }
        }),
        removeEventListener: vi.fn((event, callback) => {
          if (event === 'change') {
            const index = mediaQueryListeners[query].indexOf(callback);
            if (index > -1) {
              mediaQueryListeners[query].splice(index, 1);
            }
          }
        }),
      };
    });

    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return a boolean', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(typeof result.current).toBe('boolean');
  });

  it('should correctly return initial match state when query matches', () => {
    matchMediaMock.mockImplementation((query) => {
      return {
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(true);
  });

  it('should correctly return initial match state when query does not match', () => {
    matchMediaMock.mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(false);
  });

  it('should update when media query changes from false to true', () => {
    let callback;
    let currentMatches = false;

    matchMediaMock.mockImplementation((query) => {
      return {
        get matches() {
          return currentMatches;
        },
        media: query,
        addEventListener: vi.fn((event, cb) => {
          if (event === 'change') {
            callback = cb;
          }
        }),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      currentMatches = true;
      if (callback) {
        callback({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it('should update when media query changes from true to false', () => {
    let callback;
    let currentMatches = true;

    matchMediaMock.mockImplementation((query) => {
      return {
        get matches() {
          return currentMatches;
        },
        media: query,
        addEventListener: vi.fn((event, cb) => {
          if (event === 'change') {
            callback = cb;
          }
        }),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(true);

    // Simulate media query change
    act(() => {
      currentMatches = false;
      if (callback) {
        callback({ matches: false });
      }
    });

    expect(result.current).toBe(false);
  });

  it('should clean up listener on unmount', () => {
    let listeners = [];
    matchMediaMock.mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn((event, cb) => {
          if (event === 'change') {
            listeners.push(cb);
          }
        }),
        removeEventListener: vi.fn((event, cb) => {
          if (event === 'change') {
            const index = listeners.indexOf(cb);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }),
      };
    });

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    // Should have one listener registered
    expect(listeners.length).toBe(1);

    // Unmount the component
    unmount();

    // Listener should be removed
    expect(listeners.length).toBe(0);
  });

  it('should work with min-width media query', () => {
    matchMediaMock.mockImplementation((query) => {
      const isMinWidth1024 = query === '(min-width: 1024px)';
      return {
        matches: isMinWidth1024,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(true);
  });

  it('should work with max-width media query', () => {
    matchMediaMock.mockImplementation((query) => {
      const isMaxWidth768 = query === '(max-width: 768px)';
      return {
        matches: isMaxWidth768,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('should work with prefers-reduced-motion media query', () => {
    matchMediaMock.mockImplementation((query) => {
      const isPrefersReducedMotion = query === '(prefers-reduced-motion: reduce)';
      return {
        matches: isPrefersReducedMotion,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMediaQuery('(prefers-reduced-motion: reduce)'));

    expect(result.current).toBe(true);
  });

  it('should handle matchMedia not being supported', () => {
    const originalMatchMedia = window.matchMedia;
    delete window.matchMedia;

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    // Should return false as default when matchMedia is not supported
    expect(result.current).toBe(false);

    window.matchMedia = originalMatchMedia;
  });

  it('should update when query prop changes', () => {
    let callback1024;
    let callback768;

    matchMediaMock.mockImplementation((query) => {
      const isMin1024 = query === '(min-width: 1024px)';

      return {
        get matches() {
          return isMin1024;
        },
        media: query,
        addEventListener: vi.fn((event, cb) => {
          if (event === 'change') {
            if (isMin1024) {
              callback1024 = cb;
            } else {
              callback768 = cb;
            }
          }
        }),
        removeEventListener: vi.fn(),
      };
    });

    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(min-width: 1024px)' } }
    );

    expect(result.current).toBe(true);

    // Change the query
    rerender({ query: '(min-width: 768px)' });

    expect(result.current).toBe(false);
  });
});
