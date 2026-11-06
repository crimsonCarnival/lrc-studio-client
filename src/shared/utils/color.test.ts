import { describe, expect, it } from 'vitest';
import { hexToHsv, hsvToHex, isHex6 } from './color';

describe('color conversion', () => {
  it('round-trips hex through HSV', () => {
    for (const hex of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#888888', '#6f5a8f', '#c4a7e7']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });

  it('maps primaries to the expected hue', () => {
    expect(hexToHsv('#ff0000').h).toBe(0);
    expect(hexToHsv('#00ff00').h).toBe(120);
    expect(hexToHsv('#0000ff').h).toBe(240);
  });

  it('falls back to grey on malformed input instead of throwing', () => {
    expect(hexToHsv('nope')).toEqual({ h: 0, s: 0, v: 0.53 });
    expect(isHex6('#abc')).toBe(false);
  });
});
