import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { useLineGestures } from './useLineGestures';
import type { AppSettings } from '@/features/settings/settings.types';

const touch = (x: number, y = 0) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] }) as unknown as TouchEvent;

function swipe(swipeNudge?: boolean) {
  const shiftTime = vi.fn();
  const { result } = renderHook(() => useLineGestures({
    lineIndex: 2, isSynced: true, settings: {} as AppSettings, handleToggleLine: vi.fn(), shiftTime, showNudge: vi.fn(), swipeNudge,
  }));
  result.current.handleTouchStart(touch(10));
  result.current.handleTouchEnd(touch(120));
  return shiftTime;
}

describe('useLineGestures swipe-to-nudge', () => {
  it('nudges on a horizontal flick by default', () => {
    expect(swipe()).toHaveBeenCalledWith(2, 0.1);
  });

  it('does nothing on a flick when swipeNudge is off (phone rows)', () => {
    expect(swipe(false)).not.toHaveBeenCalled();
  });
});
