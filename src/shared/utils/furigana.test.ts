import { describe, it, expect } from 'vitest';
import { rubyRatioClass, splitOkurigana, rubyFitEm, needsSpaceAfter } from './furigana';

// The three reference cases from the ruby-rules design sheet. The ratio decides
// whether a reading needs no adjustment, may overhang into the token's constant
// inline padding, or has to tighten and shrink before it reaches its neighbour.
describe('rubyRatioClass', () => {
  it('leaves a compound with a short reading unadjusted', () => {
    expect(rubyRatioClass('目指', 'めざ')).toBe('r1');
  });

  it('lets a reading wider than its single kanji overhang', () => {
    expect(rubyRatioClass('高', 'たか')).toBe('r2');
  });

  it('escalates a reading that far outruns its base', () => {
    expect(rubyRatioClass('承', 'うけたまわ')).toBe('r3');
  });

  it('treats a missing reading as needing no adjustment', () => {
    expect(rubyRatioClass('高', null)).toBe('r1');
    expect(rubyRatioClass('高', '')).toBe('r1');
    expect(rubyRatioClass(undefined, 'たか')).toBe('r1');
  });

  it('counts by code point, so surrogate pairs do not inflate the ratio', () => {
    // A single astral-plane kanji is one base unit, not two.
    expect(rubyRatioClass('𠮟', 'しか')).toBe('r2');
  });
});

// A reading annotates the kanji, not the kana around it. Morpheme grouping puts
// the okurigana inside the token, so the renderer has to pull it back out.
describe('splitOkurigana', () => {
  it('keeps the inflecting kana outside the reading', () => {
    expect(splitOkurigana('目指して')).toEqual({ lead: '', kanji: '目指', tail: 'して' });
    expect(splitOkurigana('高み')).toEqual({ lead: '', kanji: '高', tail: 'み' });
    expect(splitOkurigana('険しい')).toEqual({ lead: '', kanji: '険', tail: 'しい' });
  });

  it('keeps a kana prefix outside too', () => {
    expect(splitOkurigana('お花')).toEqual({ lead: 'お', kanji: '花', tail: '' });
  });

  it('leaves an all-kanji word whole', () => {
    expect(splitOkurigana('弾丸')).toEqual({ lead: '', kanji: '弾丸', tail: '' });
  });

  it('reports no kanji for a word that has none', () => {
    expect(splitOkurigana('ライナー')).toEqual({ lead: 'ライナー', kanji: '', tail: '' });
    expect(splitOkurigana('')).toEqual({ lead: '', kanji: '', tail: '' });
  });
});

// A long reading has to shrink to stay over its own kanji instead of running
// across the words beside it.
describe('rubyFitEm', () => {
  it('shrinks a reading that outruns its kanji', () => {
    // ごくさいしょく is 6.5 squares over 3 kanji (ょ is a small kana).
    const em = rubyFitEm('極彩色', 'ごくさいしょく');
    expect(em).toBeCloseTo(3 / 6.5, 2);
    expect(em!).toBeLessThan(0.5);
  });

  it('leaves a reading that already fits at full size', () => {
    // めざ over 目指 is square for square, so no shrink is asked for.
    expect(rubyFitEm('目指して', 'めざ')).toBeCloseTo(1, 2);
  });

  it('measures against the kanji, not the okurigana around it', () => {
    expect(rubyFitEm('高み', 'たか')).toBeCloseTo(0.5, 2);
  });

  it('asks for nothing when there is no reading or no kanji', () => {
    expect(rubyFitEm('ライナー', 'x')).toBeNull();
    expect(rubyFitEm('高', null)).toBeNull();
  });
});

// Word chips are joined back into a line; only spaceless scripts run together.
describe('needsSpaceAfter', () => {
  it('spaces Latin words and runs CJK words together', () => {
    expect(needsSpaceAfter('closing', 'in')).toBe(true);
    expect(needsSpaceAfter('夢', 'を')).toBe(false);
  });

  it('keeps CJK and Latin words apart', () => {
    expect(needsSpaceAfter('君の', 'love')).toBe(true);
    expect(needsSpaceAfter('baby', '愛して')).toBe(true);
  });

  it('lets punctuation stick to the CJK word it follows or leads', () => {
    expect(needsSpaceAfter('夢', '!')).toBe(false);
    expect(needsSpaceAfter('…', '夢')).toBe(false);
  });

  it('adds nothing after the last word', () => {
    expect(needsSpaceAfter('end', undefined)).toBe(false);
  });
});
