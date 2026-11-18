/** The Badging API surface; absent outside installed-app capable browsers. */
export type BadgeNavigator = {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Shows `count` on the installed app's icon (taskbar, dock, iOS home screen) and clears it at 0.
 * A no-op where the Badging API is missing. The promise rejects when the platform refuses
 * (iOS without notification permission, a plain browser tab), which is not an error worth surfacing.
 */
export function syncAppBadge(count: number, nav: BadgeNavigator = navigator as BadgeNavigator): void {
  if (typeof nav.setAppBadge !== 'function') return;
  const pending = count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.();
  pending?.catch(() => {});
}
