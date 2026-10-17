import { describe, it, expect } from 'vitest';
import { rubyRatioClass, splitOkurigana } from './furigana';

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
