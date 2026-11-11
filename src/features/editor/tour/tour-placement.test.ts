import { describe, it, expect } from 'vitest';
import { placeCard } from './tour-placement';

describe('placeCard', () => {
  it('places below when room', () => {
    const r = placeCard({ top: 100, left: 20, width: 200, height: 40 }, 180, { width: 1280, height: 800 }, false);
    expect(r.top).toBe(156);
    expect(r.width).toBe(320);
  });

  it('places above when no room below', () => {
    const r = placeCard({ top: 650, left: 20, width: 200, height: 60 }, 180, { width: 1280, height: 800 }, false);
    expect(r.top + 180 + 16).toBeLessThanOrEqual(650);
  });

  it('narrow uses full width minus gutters', () => {
    const r = placeCard({ top: 100, left: 16, width: 343, height: 40 }, 180, { width: 375, height: 812 }, true);
    expect(r.left).toBe(16);
    expect(r.width).toBe(343);
  });

  it('phone mark bar at bottom: card goes above', () => {
    const r = placeCard({ top: 740, left: 16, width: 343, height: 56 }, 220, { width: 375, height: 812 }, true);
    expect(r.top + 220).toBeLessThanOrEqual(740 - 16);
  });

  it('clamps to the viewport when neither side fits', () => {
    const r = placeCard({ top: 200, left: 20, width: 200, height: 400 }, 300, { width: 1280, height: 800 }, false);
    expect(r.top).toBeGreaterThanOrEqual(16);
    expect(r.top + 300).toBeLessThanOrEqual(800 - 16);
  });
});
