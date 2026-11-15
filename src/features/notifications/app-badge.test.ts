import { describe, expect, it, vi } from 'vitest';
import { syncAppBadge } from './app-badge';

const badgeNav = () => ({
  setAppBadge: vi.fn().mockResolvedValue(undefined),
  clearAppBadge: vi.fn().mockResolvedValue(undefined),
});

describe('syncAppBadge', () => {
  it('sets the count when there are unread notifications', () => {
    const nav = badgeNav();
    syncAppBadge(4, nav);
    expect(nav.setAppBadge).toHaveBeenCalledWith(4);
    expect(nav.clearAppBadge).not.toHaveBeenCalled();
  });

  it('clears the badge at zero', () => {
    const nav = badgeNav();
    syncAppBadge(0, nav);
    expect(nav.clearAppBadge).toHaveBeenCalledOnce();
    expect(nav.setAppBadge).not.toHaveBeenCalled();
  });

  it('does nothing without the Badging API', () => {
    expect(() => syncAppBadge(3, {})).not.toThrow();
  });

  it('swallows a platform refusal (vitest fails the run on an unhandled rejection)', async () => {
    const nav = { setAppBadge: vi.fn().mockRejectedValue(new Error('NotAllowedError')) };
    syncAppBadge(2, nav);
    await new Promise((r) => setTimeout(r, 0));
    expect(nav.setAppBadge).toHaveBeenCalledWith(2);
  });
});
