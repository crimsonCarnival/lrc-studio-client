import { describe, it, expect } from 'vitest';
import { groupMorphemes } from './morpheme-group';

const texts = (s: string) => groupMorphemes(s).map((t) => t.text);

describe('groupMorphemes', () => {
  it('groups the reference line the way the design sheet does', () => {
    // The old per-character split produced 高/み/を/目指/し/て.
    expect(texts('We are fighting dreamers 高みを目指して')).toEqual([
      'We', 'are', 'fighting', 'dreamers', '高み', 'を', '目指して',
    ]);
  });

  it('keeps okurigana with the kanji it inflects', () => {
    expect(texts('険しい')).toEqual(['険しい']);
    expect(texts('目指して')).toEqual(['目指して']);
    expect(texts('広げても')).toEqual(['広げて', 'も']);
  });

  it('gives particles a chip of their own', () => {
    expect(texts('修羅の道')).toEqual(['修羅', 'の', '道']);
    const tokens = groupMorphemes('高みを');
    expect(tokens.map((t) => t.isParticle)).toEqual([false, true]);
  });

  it('takes a katakana run as one chip, extenders included', () => {
    expect(texts('ライナー')).toEqual(['ライナー']);
    // A katakana run is its own chip, so the compound 弾丸ライナー is two.
    expect(texts('弾丸ライナー')).toEqual(['弾丸', 'ライナー']);
  });

  it('attaches punctuation to the chip before it instead of making one', () => {
    expect(texts('弾丸ライナー！')).toEqual(['弾丸', 'ライナー！']);
    expect(texts('行く、そして')).toEqual(['行く、', 'そして']);
  });

  // Known residue: kana that prefixes a kanji word rather than inflecting it
  // cannot be told apart by rule. ぶっ belongs to ぶっ放せ, but nothing in the
  // text says so, and merging it is a one-click fix in the editor.
  it('leaves a kana prefix as its own chip, for the user to merge', () => {
    expect(texts('ぶっ放せ')).toEqual(['ぶっ', '放せ']);
  });

  it('does not split a particle out of a run of kana', () => {
    // こんにちは must not become こんにち + は.
    expect(texts('こんにちは')).toEqual(['こんにちは']);
  });

  it('reports the kanji a reading would sit over, not the whole token', () => {
    const [token] = groupMorphemes('目指して');
    expect(token).toMatchObject({ text: '目指して', kanji: '目指' });
  });

  it('keeps latin words whole, including the marks that join them', () => {
    expect(texts("I don't stay low-key")).toEqual(['I', "don't", 'stay', 'low-key']);
    expect(texts('Oli-oli-oli-oh! Just go my way!'))
      .toEqual(['Oli-oli-oli-oh!', 'Just', 'go', 'my', 'way!']);
  });

  it('returns nothing for empty input', () => {
    expect(groupMorphemes('')).toEqual([]);
    expect(groupMorphemes(undefined)).toEqual([]);
  });
});
