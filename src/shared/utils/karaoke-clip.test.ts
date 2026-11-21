import { describe, expect, it } from 'vitest';
import { easeKaraokeFill, karaokeClipPath, karaokeFillGlowClass, karaokeFillPrefs } from './karaoke-clip';

const B = 'var(--karaoke-bleed)';

describe('karaokeClipPath', () => {
  it('reaches past the word on the top, bottom and left, and up to the fill on the right', () => {
    expect(karaokeClipPath(0.25)).toBe(`inset(${B} 75% ${B} ${B})`);
  });

  it('lets a fully sung word spill on the right too', () => {
    expect(karaokeClipPath(1)).toBe(`inset(${B} ${B} ${B} ${B})`);
  });

  it('clamps out-of-range and missing values', () => {
    expect(karaokeClipPath(-1)).toBe(`inset(${B} 100% ${B} ${B})`);
    expect(karaokeClipPath(2)).toBe(`inset(${B} ${B} ${B} ${B})`);
    expect(karaokeClipPath(NaN)).toBe(`inset(${B} 100% ${B} ${B})`);
  });
});

describe('karaoke fill preferences', () => {
  it('defaults to a glowing, linear fill', () => {
    expect(karaokeFillPrefs(undefined)).toEqual({ style: 'glow', easing: 'linear' });
    expect(karaokeFillPrefs({ karaokeFillStyle: 'neon', karaokeFillEasing: 'bounce' })).toEqual({ style: 'glow', easing: 'linear' });
    expect(karaokeFillPrefs({ karaokeFillStyle: 'plain', karaokeFillEasing: 'ease-in-out' })).toEqual({ style: 'plain', easing: 'ease-in-out' });
  });

  it('drops the halo for the plain style', () => {
    expect(karaokeFillGlowClass('glow')).toBe('karaoke-fill-glow');
    expect(karaokeFillGlowClass('plain')).toBe('');
  });

  it('eases the fill in and out across a word, ending where linear does', () => {
    expect(easeKaraokeFill(0.5, 'linear')).toBe(0.5);
    expect(easeKaraokeFill(0, 'ease-in-out')).toBeCloseTo(0);
    expect(easeKaraokeFill(0.25, 'ease-in-out')).toBeLessThan(0.25);
    expect(easeKaraokeFill(0.5, 'ease-in-out')).toBeCloseTo(0.5);
    expect(easeKaraokeFill(0.75, 'ease-in-out')).toBeGreaterThan(0.75);
    expect(easeKaraokeFill(1, 'ease-in-out')).toBeCloseTo(1);
  });
});
