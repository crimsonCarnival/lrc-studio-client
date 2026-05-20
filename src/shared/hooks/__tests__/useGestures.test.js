import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useGestures from '../useGestures';

describe('useGestures', () => {
  let mockElement;

  beforeEach(() => {
    // Create a mock DOM element for testing
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
  });

  it('should return three touch event handlers', () => {
    const { result } = renderHook(() => useGestures());

    expect(result.current).toHaveProperty('onTouchStart');
    expect(result.current).toHaveProperty('onTouchMove');
    expect(result.current).toHaveProperty('onTouchEnd');
    expect(typeof result.current.onTouchStart).toBe('function');
    expect(typeof result.current.onTouchMove).toBe('function');
    expect(typeof result.current.onTouchEnd).toBe('function');
  });

  it('should detect tap gesture on brief touch', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useGestures());
    const tapSpy = vi.fn();

    const element = document.createElement('div');
    document.body.appendChild(element);
    element.addEventListener('tap', tapSpy);

    const touch = {
      identifier: 0,
      clientX: 100,
      clientY: 100,
      screenX: 100,
      screenY: 100,
    };

    act(() => {
      result.current.onTouchStart(
        { touches: [touch], preventDefault: vi.fn() },
        element
      );
    });

    // Simulate quick tap (< 500ms)
    act(() => {
      vi.advanceTimersByTime(250);
      result.current.onTouchEnd(
        { changedTouches: [touch], preventDefault: vi.fn() },
        element
      );
    });

    // Tap should be dispatched
    expect(tapSpy).toHaveBeenCalledWith(expect.any(CustomEvent));

    document.body.removeChild(element);
    vi.useRealTimers();
  });

  it('should detect long-press gesture after 500ms', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useGestures());
    const longPressSpy = vi.fn();

    const element = document.createElement('div');
    document.body.appendChild(element);
    element.addEventListener('longPress', longPressSpy);

    const touch = {
      identifier: 0,
      clientX: 100,
      clientY: 100,
      screenX: 100,
      screenY: 100,
    };

    act(() => {
      result.current.onTouchStart(
        { touches: [touch], preventDefault: vi.fn() },
        element
      );
    });

    // Advance time to trigger long-press (500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Long-press should be dispatched
    expect(longPressSpy).toHaveBeenCalledWith(expect.any(CustomEvent));

    // Clean up
    act(() => {
      result.current.onTouchEnd(
        { changedTouches: [touch], preventDefault: vi.fn() },
        element
      );
    });

    document.body.removeChild(element);
    vi.useRealTimers();
  });

  it('should detect swipe gesture when distance exceeds 60px', () => {
    const { result } = renderHook(() => useGestures());
    const swipeSpy = vi.fn();

    const element = document.createElement('div');
    document.body.appendChild(element);
    element.addEventListener('swipe', swipeSpy);

    const startTouch = {
      identifier: 0,
      clientX: 100,
      clientY: 100,
      screenX: 100,
      screenY: 100,
    };

    const endTouch = {
      identifier: 0,
      clientX: 170, // 70px to the right
      clientY: 100,
      screenX: 170,
      screenY: 100,
    };

    act(() => {
      result.current.onTouchStart(
        { touches: [startTouch], preventDefault: vi.fn() },
        element
      );
    });

    act(() => {
      result.current.onTouchMove(
        { touches: [endTouch], preventDefault: vi.fn() },
        element
      );
    });

    act(() => {
      result.current.onTouchEnd(
        { changedTouches: [endTouch], preventDefault: vi.fn() },
        element
      );
    });

    // Swipe should be dispatched
    expect(swipeSpy).toHaveBeenCalledWith(expect.any(CustomEvent));

    document.body.removeChild(element);
  });

  it('should not detect swipe when distance is less than 60px', () => {
    const { result } = renderHook(() => useGestures());
    const swipeSpy = vi.fn();

    const element = document.createElement('div');
    document.body.appendChild(element);
    element.addEventListener('swipe', swipeSpy);

    const startTouch = {
      identifier: 0,
      clientX: 100,
      clientY: 100,
      screenX: 100,
      screenY: 100,
    };

    const endTouch = {
      identifier: 0,
      clientX: 150, // Only 50px to the right
      clientY: 100,
      screenX: 150,
      screenY: 100,
    };

    act(() => {
      result.current.onTouchStart(
        { touches: [startTouch], preventDefault: vi.fn() },
        element
      );
    });

    act(() => {
      result.current.onTouchMove(
        { touches: [endTouch], preventDefault: vi.fn() },
        element
      );
    });

    act(() => {
      result.current.onTouchEnd(
        { changedTouches: [endTouch], preventDefault: vi.fn() },
        element
      );
    });

    // Swipe should NOT be dispatched
    expect(swipeSpy).not.toHaveBeenCalled();

    document.body.removeChild(element);
  });

  it('should include gesture details in custom events', () => {
    const { result } = renderHook(() => useGestures());
    let swipeDetails = null;

    const element = document.createElement('div');
    document.body.appendChild(element);
    element.addEventListener('swipe', (e) => {
      swipeDetails = e.detail;
    });

    const startTouch = {
      identifier: 0,
      clientX: 100,
      clientY: 100,
    };

    const endTouch = {
      identifier: 0,
      clientX: 170, // 70px to the right
      clientY: 110, // 10px down
    };

    act(() => {
      result.current.onTouchStart(
        { touches: [startTouch], preventDefault: vi.fn() },
        element
      );
    });

    act(() => {
      result.current.onTouchMove(
        { touches: [endTouch], preventDefault: vi.fn() },
        element
      );
    });

    act(() => {
      result.current.onTouchEnd(
        { changedTouches: [endTouch], preventDefault: vi.fn() },
        element
      );
    });

    expect(swipeDetails).toBeDefined();
    expect(swipeDetails).toHaveProperty('distance');
    expect(swipeDetails).toHaveProperty('direction');

    document.body.removeChild(element);
  });

  it('should cancel long-press if touch moves beyond threshold', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useGestures());
    const longPressSpy = vi.fn();

    const element = document.createElement('div');
    document.body.appendChild(element);
    element.addEventListener('longPress', longPressSpy);

    const startTouch = {
      identifier: 0,
      clientX: 100,
      clientY: 100,
    };

    const movedTouch = {
      identifier: 0,
      clientX: 170, // Moved significantly
      clientY: 100,
    };

    act(() => {
      result.current.onTouchStart(
        { touches: [startTouch], preventDefault: vi.fn() },
        element
      );
    });

    // Move touch before long-press completes
    act(() => {
      vi.advanceTimersByTime(250);
      result.current.onTouchMove(
        { touches: [movedTouch], preventDefault: vi.fn() },
        element
      );
    });

    // Advance past the 500ms threshold
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Long-press should NOT be dispatched due to movement
    expect(longPressSpy).not.toHaveBeenCalled();

    document.body.removeChild(element);
    vi.useRealTimers();
  });
});
