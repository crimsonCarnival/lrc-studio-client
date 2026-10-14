import type { CSSProperties } from 'react';

const tint = (color: string, pct: number) => `color-mix(in srgb, var(--color-${color}) ${pct}%, transparent)`;

// Background and ink pairs from redesign sheet 10.
const HUES: CSSProperties[] = [
  { background: tint('iris', 20), color: 'var(--color-primary-ink)' },
  { background: tint('foam', 20), color: 'var(--color-foam-ink)' },
  { background: tint('gold', 20), color: 'var(--color-gold-ink)' },
  { background: tint('rose', 20), color: 'var(--color-rose)' },
  { background: tint('pine', 25), color: 'var(--color-foam-ink)' },
  { background: tint('love', 18), color: 'var(--color-love-ink)' },
];

/**
 * The colours of a user's fallback avatar. Derived from the handle, so the same person is
 * the same colour everywhere and on every visit.
 */
export function avatarHue(handle: string): CSSProperties {
  let sum = 0;
  for (const ch of handle) sum += ch.charCodeAt(0);
  return HUES[sum % HUES.length];
}
