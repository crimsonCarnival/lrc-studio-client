/**
 * Zoom for the public lyrics stage. It multiplies the stage's base font size only,
 * so the page chrome, the player and the browser's own zoom are untouched.
 */

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.5;
export const ZOOM_DEFAULT = 1;
export const ZOOM_PRESETS = [0.75, 1, 1.25, 1.5, 2] as const;

const STORAGE_KEY = 'lrc_public_lyrics_zoom';

// WheelEvent.deltaMode: 0 = pixels, 1 = lines, 2 = pages.
const LINE_PX = 33;
const PAGE_PX = 800;
// e^(-100 * 0.0015) ≈ 0.86: one notch of a mouse wheel (≈100px) is about 15%, while a
// trackpad pinch, which Chromium and Firefox report as ctrl+wheel in small pixel
// deltas, scales smoothly instead of jumping a preset at a time.
const PX_SENSITIVITY = 0.0015;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ZOOM_DEFAULT;
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) * 100) / 100;
}

/** The zoom after one ctrl+wheel event. Scrolling up (negative deltaY) zooms in. */
export function zoomFromWheel(zoom: number, deltaY: number, deltaMode = 0): number {
  const px = deltaMode === 1 ? deltaY * LINE_PX : deltaMode === 2 ? deltaY * PAGE_PX : deltaY;
  return clampZoom(zoom * Math.exp(-px * PX_SENSITIVITY));
}

export function readStoredZoom(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw == null ? ZOOM_DEFAULT : clampZoom(parseFloat(raw));
  } catch {
    return ZOOM_DEFAULT;
  }
}

export function storeZoom(zoom: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(zoom));
  } catch {
    // Storage unavailable (private mode, quota): the zoom still applies for this visit.
  }
}
