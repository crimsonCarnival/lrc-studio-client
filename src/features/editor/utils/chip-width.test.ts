import { describe, it, expect } from 'vitest';
import { chipWidthStep } from './chip-width';

// The width scale from the words-mode redesign sheet: five recognisable widths
// on a 32px grid, floored at 64px, rather than one width per word.
describe('chipWidthStep', () => {
  it('puts short words on the 64px floor', () => {
    expect(chipWidthStep('I')).toBe(64);
    expect(chipWidthStep('We')).toBe(64);
  });

  it('steps up with glyph count', () => {
    expect(chipWidthStep("don't")).toBe(96);
    expect(chipWidthStep('dreamers')).toBe(128);
    expect(chipWidthStep('unbelievable')).toBe(160);
  });

  it('counts a CJK glyph as a full em, so a particle stays narrow', () => {
    expect(chipWidthStep('を')).toBe(64);
    expect(chipWidthStep('目指して')).toBe(96);
  });

  it('fits whichever layer is wider so switching layer never resizes the chip', () => {
    // mezashite is longer than 目指して renders, so it decides the step.
    expect(chipWidthStep('目指して', 'mezashite')).toBe(128);
    expect(chipWidthStep('を', 'wo')).toBe(64);
  });

  it('falls back to the floor for empty input', () => {
    expect(chipWidthStep('')).toBe(64);
    expect(chipWidthStep(undefined, null)).toBe(64);
  });

  it('always lands on the 32px grid', () => {
    for (const w of ['a', 'abc', 'abcdefgh', 'a'.repeat(30), '日本語の歌詞']) {
      expect(chipWidthStep(w) % 32).toBe(0);
    }
  });
});
