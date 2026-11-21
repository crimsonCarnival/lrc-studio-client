// A deploy replaces the hashed chunks, and the host answers a missing one with index.html, so a tab
// opened before it fails its next lazy import ("Expected a JavaScript module ... text/html").
// The fix is a reload to pick up the new build. Both the `vite:preloadError` listener and the
// ErrorBoundary route through here so the throttle and the "already reloading" state are shared.

const CHUNK_RELOAD_KEY = 'lrc_chunk_reload_at';
const RELOAD_WINDOW_MS = 60_000;

let reloading = false;

export function isChunkLoadError(error: unknown): boolean {
  const msg = (error as { message?: unknown } | null)?.message;
  if (typeof msg !== 'string') return false;
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Expected a JavaScript module') ||
    msg.includes('Unable to preload')
  );
}

/**
 * Reload the page to fetch the fresh build. Returns true when a reload is under way (started now or
 * by an earlier call on this page), false when one already happened in the last minute — a chunk
 * that is truly broken must reach the crash screen instead of looping.
 */
export function reloadForNewBuild(): boolean {
  if (reloading) return true;
  try {
    if (Date.now() - Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0) < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}
