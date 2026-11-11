import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDemoClock } from './useDemoClock';

let queue: FrameRequestCallback[] = [];
let now = 0;

function tick(ms: number) {
  now += ms;
  const batch = queue;
  queue = [];
  act(() => batch.forEach((cb) => cb(now)));
}

beforeEach(() => {
  queue = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => { queue = []; });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('useDemoClock', () => {
  it('advances time while playing', () => {
    const { result } = renderHook(() => useDemoClock({ duration: 10 }));
    act(() => result.current.play());
    tick(16);
    tick(500);
    expect(result.current.playing).toBe(true);
    expect(result.current.time).toBeCloseTo(0.5, 1);
  });

  it('stops advancing when paused', () => {
    const { result } = renderHook(() => useDemoClock({ duration: 10 }));
    act(() => result.current.play());
    tick(16);
    tick(1000);
    act(() => result.current.pause());
    const frozen = result.current.time;
    tick(1000);
    expect(result.current.time).toBe(frozen);
    expect(result.current.playing).toBe(false);
  });

  it('reset returns to zero and stops', () => {
    const { result } = renderHook(() => useDemoClock({ duration: 10 }));
    act(() => result.current.play());
    tick(16);
    tick(2000);
    act(() => result.current.reset());
    expect(result.current.time).toBe(0);
    expect(result.current.playing).toBe(false);
  });

  it('seek moves the playhead, clamped to the duration', () => {
    const { result } = renderHook(() => useDemoClock({ duration: 10 }));
    act(() => result.current.seek(4));
    expect(result.current.time).toBe(4);
    act(() => result.current.seek(99));
    expect(result.current.time).toBe(10);
  });

  it('stops at the duration', () => {
    const { result } = renderHook(() => useDemoClock({ duration: 2 }));
    act(() => result.current.play());
    tick(16);
    tick(5000);
    expect(result.current.time).toBe(2);
    expect(result.current.playing).toBe(false);
  });

  it('pauses when the document becomes hidden', () => {
    const { result } = renderHook(() => useDemoClock({ duration: 10 }));
    act(() => result.current.play());
    tick(16);
    tick(500);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.playing).toBe(false);
    const frozen = result.current.time;
    tick(1000);
    expect(result.current.time).toBe(frozen);
  });
});
