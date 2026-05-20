import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSafeArea from '../useSafeArea';

describe('useSafeArea', () => {
  let getComputedStyleMock;
  let orientationChangeListeners = [];
  let resizeListeners = [];

  beforeEach(() => {
    // Clear listeners
    orientationChangeListeners = [];
    resizeListeners = [];

    // Mock getComputedStyle
    getComputedStyleMock = vi.fn(() => ({
      getPropertyValue: vi.fn((prop) => {
        // Default safe area values for testing
        const values = {
          '--safe-area-inset-top': '0px',
          '--safe-area-inset-right': '0px',
          '--safe-area-inset-bottom': '0px',
          '--safe-area-inset-left': '0px',
          'env(safe-area-inset-top)': '0px',
          'env(safe-area-inset-right)': '0px',
          'env(safe-area-inset-bottom)': '0px',
          'env(safe-area-inset-left)': '0px',
        };
        return values[prop] || '';
      }),
    }));

    window.getComputedStyle = getComputedStyleMock;

    // Mock addEventListener and removeEventListener
    window.addEventListener = vi.fn((event, callback) => {
      if (event === 'orientationchange') {
        orientationChangeListeners.push(callback);
      } else if (event === 'resize') {
        resizeListeners.push(callback);
      }
    });

    window.removeEventListener = vi.fn((event, callback) => {
      if (event === 'orientationchange') {
        const index = orientationChangeListeners.indexOf(callback);
        if (index > -1) {
          orientationChangeListeners.splice(index, 1);
        }
      } else if (event === 'resize') {
        const index = resizeListeners.indexOf(callback);
        if (index > -1) {
          resizeListeners.splice(index, 1);
        }
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return an object with top, right, bottom, left keys', () => {
    const { result } = renderHook(() => useSafeArea());

    expect(result.current).toHaveProperty('top');
    expect(result.current).toHaveProperty('right');
    expect(result.current).toHaveProperty('bottom');
    expect(result.current).toHaveProperty('left');
  });

  it('should return all values as numbers', () => {
    const { result } = renderHook(() => useSafeArea());

    expect(typeof result.current.top).toBe('number');
    expect(typeof result.current.right).toBe('number');
    expect(typeof result.current.bottom).toBe('number');
    expect(typeof result.current.left).toBe('number');
  });

  it('should return all values >= 0', () => {
    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBeGreaterThanOrEqual(0);
    expect(result.current.right).toBeGreaterThanOrEqual(0);
    expect(result.current.bottom).toBeGreaterThanOrEqual(0);
    expect(result.current.left).toBeGreaterThanOrEqual(0);
  });

  it('should handle missing env vars and return 0', () => {
    // getComputedStyle returns empty strings for missing values
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn(() => ''),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(0);
    expect(result.current.right).toBe(0);
    expect(result.current.bottom).toBe(0);
    expect(result.current.left).toBe(0);
  });

  it('should read CSS environment variables with px values', () => {
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': '44px',
          '--safe-area-inset-right': '0px',
          '--safe-area-inset-bottom': '34px',
          '--safe-area-inset-left': '0px',
        };
        return values[prop] || '';
      }),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(44);
    expect(result.current.right).toBe(0);
    expect(result.current.bottom).toBe(34);
    expect(result.current.left).toBe(0);
  });

  it('should handle numeric values without units', () => {
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': '20',
          '--safe-area-inset-right': '10',
          '--safe-area-inset-bottom': '20',
          '--safe-area-inset-left': '10',
        };
        return values[prop] || '';
      }),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(20);
    expect(result.current.right).toBe(10);
    expect(result.current.bottom).toBe(20);
    expect(result.current.left).toBe(10);
  });

  it('should update on orientationchange event', () => {
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': '44px',
          '--safe-area-inset-right': '0px',
          '--safe-area-inset-bottom': '34px',
          '--safe-area-inset-left': '0px',
        };
        return values[prop] || '';
      }),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(44);
    expect(result.current.bottom).toBe(34);

    // Change the mock to return different values
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': '0px',
          '--safe-area-inset-right': '44px',
          '--safe-area-inset-bottom': '0px',
          '--safe-area-inset-left': '44px',
        };
        return values[prop] || '';
      }),
    }));

    // Trigger orientationchange event
    act(() => {
      orientationChangeListeners.forEach((callback) => callback());
    });

    expect(result.current.top).toBe(0);
    expect(result.current.right).toBe(44);
    expect(result.current.bottom).toBe(0);
    expect(result.current.left).toBe(44);
  });

  it('should update on resize event', () => {
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': '10px',
          '--safe-area-inset-right': '10px',
          '--safe-area-inset-bottom': '10px',
          '--safe-area-inset-left': '10px',
        };
        return values[prop] || '';
      }),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(10);
    expect(result.current.right).toBe(10);
    expect(result.current.bottom).toBe(10);
    expect(result.current.left).toBe(10);

    // Change the mock to return different values
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': '20px',
          '--safe-area-inset-right': '20px',
          '--safe-area-inset-bottom': '20px',
          '--safe-area-inset-left': '20px',
        };
        return values[prop] || '';
      }),
    }));

    // Trigger resize event
    act(() => {
      resizeListeners.forEach((callback) => callback());
    });

    expect(result.current.top).toBe(20);
    expect(result.current.right).toBe(20);
    expect(result.current.bottom).toBe(20);
    expect(result.current.left).toBe(20);
  });

  it('should clean up listeners on unmount', () => {
    const { unmount } = renderHook(() => useSafeArea());

    // Should have listeners registered
    expect(orientationChangeListeners.length).toBe(1);
    expect(resizeListeners.length).toBe(1);

    // Unmount the hook
    unmount();

    // Listeners should be removed
    expect(orientationChangeListeners.length).toBe(0);
    expect(resizeListeners.length).toBe(0);
  });

  it('should handle errors gracefully and return zeros', () => {
    // Mock getComputedStyle to throw an error
    window.getComputedStyle = vi.fn(() => {
      throw new Error('getComputedStyle failed');
    });

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(0);
    expect(result.current.right).toBe(0);
    expect(result.current.bottom).toBe(0);
    expect(result.current.left).toBe(0);
  });

  it('should handle NaN values and return 0', () => {
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': 'invalid',
          '--safe-area-inset-right': 'abc',
          '--safe-area-inset-bottom': '20px',
          '--safe-area-inset-left': 'xyz',
        };
        return values[prop] || '';
      }),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(0);
    expect(result.current.right).toBe(0);
    expect(result.current.bottom).toBe(20);
    expect(result.current.left).toBe(0);
  });

  it('should register both orientationchange and resize event listeners', () => {
    renderHook(() => useSafeArea());

    // Check that addEventListener was called with correct events
    const addEventListenerCalls = window.addEventListener.mock.calls;
    const hasOrientationChange = addEventListenerCalls.some((call) => call[0] === 'orientationchange');
    const hasResize = addEventListenerCalls.some((call) => call[0] === 'resize');

    expect(hasOrientationChange).toBe(true);
    expect(hasResize).toBe(true);
  });

  it('should return different insets for notch and home indicator', () => {
    // Simulate iPhone with notch (44px top) and home indicator (34px bottom)
    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const values = {
          '--safe-area-inset-top': '44px',
          '--safe-area-inset-right': '0px',
          '--safe-area-inset-bottom': '34px',
          '--safe-area-inset-left': '0px',
        };
        return values[prop] || '';
      }),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(44);
    expect(result.current.bottom).toBe(34);
    expect(result.current.right).toBe(0);
    expect(result.current.left).toBe(0);
  });

  it('should handle multiple sequential orientation changes', () => {
    let orientation = 'portrait';

    getComputedStyleMock.mockImplementation(() => ({
      getPropertyValue: vi.fn((prop) => {
        const portraitValues = {
          '--safe-area-inset-top': '44px',
          '--safe-area-inset-right': '0px',
          '--safe-area-inset-bottom': '34px',
          '--safe-area-inset-left': '0px',
        };
        const landscapeValues = {
          '--safe-area-inset-top': '0px',
          '--safe-area-inset-right': '44px',
          '--safe-area-inset-bottom': '0px',
          '--safe-area-inset-left': '44px',
        };
        const values = orientation === 'portrait' ? portraitValues : landscapeValues;
        return values[prop] || '';
      }),
    }));

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(44);
    expect(result.current.right).toBe(0);

    // Trigger first orientation change to landscape
    orientation = 'landscape';
    act(() => {
      orientationChangeListeners.forEach((callback) => callback());
    });

    expect(result.current.top).toBe(0);
    expect(result.current.right).toBe(44);

    // Trigger second orientation change back to portrait
    orientation = 'portrait';
    act(() => {
      orientationChangeListeners.forEach((callback) => callback());
    });

    expect(result.current.top).toBe(44);
    expect(result.current.right).toBe(0);
  });
});
