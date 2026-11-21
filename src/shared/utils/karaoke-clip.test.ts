import { describe, expect, it } from 'vitest';
import { karaokeClipPath } from './karaoke-clip';

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
