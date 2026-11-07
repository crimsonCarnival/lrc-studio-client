import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShareFlow } from './useShareFlow';

const setup = (over: Partial<Parameters<typeof useShareFlow>[0]> = {}) => {
  const showLink = vi.fn();
  const onVisibilityChange = vi.fn();
  const save = vi.fn().mockResolvedValue(false);
  const hook = renderHook((p: Parameters<typeof useShareFlow>[0]) => useShareFlow(p), {
    initialProps: { publicId: 'abc1234567', isPublic: false, showLink, save, onVisibilityChange, ...over },
  });
  return { ...hook, showLink, onVisibilityChange, save };
};

describe('useShareFlow', () => {
  it('opens the publish dialog for a private project and shows no link yet', () => {
    const { result, showLink } = setup();
    act(() => result.current.requestShare());
    expect(result.current.publishOpen).toBe(true);
    expect(showLink).not.toHaveBeenCalled();
  });

  it('shows the link only after the dialog confirms the publish', () => {
    const { result, showLink, onVisibilityChange } = setup();
    act(() => result.current.requestShare());
    act(() => result.current.onPublished(true));
    expect(onVisibilityChange).toHaveBeenCalledWith(true);
    expect(showLink).toHaveBeenCalledTimes(1);
  });

  it('shows no link when the dialog is dismissed or the publish is a later, unrelated one', () => {
    const { result, showLink } = setup();
    act(() => result.current.requestShare());
    act(() => result.current.setPublishOpen(false));
    act(() => result.current.onPublished(true));
    expect(showLink).not.toHaveBeenCalled();
  });

  it('shows the link of a public project without opening the dialog', () => {
    const { result, showLink } = setup({ isPublic: true });
    act(() => result.current.requestShare());
    expect(showLink).toHaveBeenCalledTimes(1);
    expect(result.current.publishOpen).toBe(false);
  });

  it('saves a project with no server id first, then offers the confirmation', () => {
    const { result, rerender, save, showLink } = setup({ publicId: null });
    act(() => result.current.requestShare());
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.publishOpen).toBe(false);
    rerender({ publicId: 'abc1234567', isPublic: false, showLink, save, onVisibilityChange: vi.fn() });
    expect(result.current.publishOpen).toBe(true);
    expect(showLink).not.toHaveBeenCalled();
  });
});
