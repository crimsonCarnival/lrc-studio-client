/** The last decoded file's peaks. One entry is enough: only one file plays at a time. */
export interface PeaksEntry { url: string; peaks: Array<Float32Array | number[]>; duration: number }

let peaksCache: PeaksEntry | null = null;

/** Fired on window when a file's peaks have been decoded, for views that draw from them. */
export const PEAKS_EVENT = 'lrc:waveform-peaks';

export function getPeaksEntry(): PeaksEntry | null {
  return peaksCache;
}

export function setPeaksEntry(entry: PeaksEntry): void {
  peaksCache = entry;
  window.dispatchEvent(new Event(PEAKS_EVENT));
}

/** The peaks of the file playing now, if they have been decoded (the words timeline draws them). */
export function getCachedPeaks(): { peaks: Array<Float32Array | number[]>; duration: number } | null {
  return peaksCache ? { peaks: peaksCache.peaks, duration: peaksCache.duration } : null;
}
