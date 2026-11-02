import { describe, it, expect, beforeEach } from 'vitest';
import { clampZoom, zoomFromWheel, readStoredZoom, storeZoom, ZOOM_MIN, ZOOM_MAX } from './lyrics-zoom';

describe('clampZoom', () => {
  it('keeps the zoom inside its bounds and rounds to whole percents', () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(9)).toBe(ZOOM_MAX);
    expect(clampZoom(1.23456)).toBe(1.23);
  });

  it('falls back to 100% for a value that is not a number', () => {
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(Infinity)).toBe(1);
  });
});

describe('zoomFromWheel', () => {
  it('zooms in on scroll up and out on scroll down', () => {
    expect(zoomFromWheel(1, -100)).toBeGreaterThan(1);
    expect(zoomFromWheel(1, 100)).toBeLessThan(1);
  });

  it('is symmetric: one notch in and one out comes back to where it started', () => {
    expect(zoomFromWheel(zoomFromWheel(1, -100), 100)).toBeCloseTo(1, 1);
  });

  it('treats line-mode deltas (Firefox mouse wheels) like pixels', () => {
    expect(zoomFromWheel(1, 3, 1)).toBe(zoomFromWheel(1, 99, 0));
  });

  it('never leaves the bounds however hard it is scrolled', () => {
    expect(zoomFromWheel(1, -100000)).toBe(ZOOM_MAX);
    expect(zoomFromWheel(1, 100000)).toBe(ZOOM_MIN);
  });
});

describe('stored zoom', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips and ignores garbage', () => {
    expect(readStoredZoom()).toBe(1);
    storeZoom(1.5);
    expect(readStoredZoom()).toBe(1.5);
    localStorage.setItem('lrc_public_lyrics_zoom', 'big');
    expect(readStoredZoom()).toBe(1);
  });
});
