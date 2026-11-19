import { describe, it, expect } from 'vitest';
import { layoutWords, snapTime, splitMorae, wordEndAt, wordKana } from './word-timing';
import { wordFillEnd } from './line-span';

describe('layoutWords', () => {
  const words = [
    { word: 'fighting', time: 9.42 },
    { word: 'dreamers', time: 10.33, end: 10.98 },
    { word: '高み', time: 11.12 },
    { word: 'を', time: null },
  ];

  it('runs a word into the next one unless it has its own end, which leaves a pause', () => {
    const [a, b] = layoutWords(words, 8.88, 13.04);
    expect(a).toMatchObject({ from: 9.42, to: 10.33, gapTo: 10.33, hasEnd: false });
    expect(b).toMatchObject({ from: 10.33, to: 10.98, gapTo: 11.12, hasEnd: true });
  });

  it('shares what is left of the line between the untimed words', () => {
    const segs = layoutWords(words, 8.88, 13.04);
    expect(segs[2].to).toBeCloseTo(12.08, 2);
    expect(segs[3]).toMatchObject({ timed: false });
    expect(segs[3].to).toBeCloseTo(13.04, 2);
  });

  it('keeps an end past the next word: the two overlap, held to the line', () => {
    const [seg] = layoutWords([{ word: 'a', time: 1, end: 5 }, { word: 'b', time: 2 }], 0, 3);
    expect(seg).toMatchObject({ to: 3, gapTo: 2, hasEnd: true });
  });

  it('ignores an end before the word starts, or right on the next word', () => {
    const [a] = layoutWords([{ word: 'a', time: 1, end: 0.5 }, { word: 'b', time: 2 }], 0, 3);
    expect(a).toMatchObject({ to: 2, hasEnd: false });
    const [b] = layoutWords([{ word: 'a', time: 1, end: 2.002 }, { word: 'b', time: 2 }], 0, 3);
    expect(b).toMatchObject({ to: 2, hasEnd: false });
  });
});

describe('wordEndAt', () => {
  const seg = { word: 'a', timed: true, from: 1, to: 2, gapTo: 2, hasEnd: false };
  it('pauses before the next word, joins on it, and overlaps past it up to the cap', () => {
    expect(wordEndAt(seg, 1.5, null, 3)).toBe(1.5);
    expect(wordEndAt(seg, 2.003, null, 3)).toBeNull();
    expect(wordEndAt(seg, 2.5, null, 3)).toBe(2.5);
    expect(wordEndAt(seg, 9, null, 3)).toBe(3);
  });
  it('lets a last word run on past the next line, up to the end of the track', () => {
    expect(wordEndAt(seg, 4, 2, 10)).toBe(4);
    expect(wordEndAt(seg, 2.001, 2, 10)).toBeNull();
  });
});

describe('wordFillEnd', () => {
  const words = [{ time: 1 }, { time: 2, end: 3.5 }, { time: 3 }, { time: 4, end: 4.5 }];
  it('fills a word to its own end, before or past the next word, else to the next word', () => {
    expect(wordFillEnd(words, 0, 9)).toBe(2);
    expect(wordFillEnd(words, 1, 9)).toBe(3.5);
    expect(wordFillEnd(words, 3, 9)).toBe(4.5);
    expect(wordFillEnd([{ time: 1 }], 0, 9)).toBe(9);
  });
});

describe('syllables', () => {
  it('reads a kanji word through its reading and keeps the okurigana', () => {
    expect(wordKana({ word: '目指して', reading: 'めざ' })).toBe('めざして');
    expect(wordKana({ word: 'を' })).toBe('を');
    expect(wordKana({ word: 'dreamers' })).toBeNull();
  });

  it('splits kana into morae, keeping small kana with the one before', () => {
    expect(splitMorae('めざして')).toEqual(['め', 'ざ', 'し', 'て']);
    expect(splitMorae('きょうっと')).toEqual(['きょ', 'う', 'っ', 'と']);
  });
});

describe('snapTime', () => {
  it('pulls onto the playhead or an edge only within reach, and rounds on the grid', () => {
    expect(snapTime(10.02, 'playhead', 0.05, 10, [])).toBe(10);
    expect(snapTime(10.2, 'playhead', 0.05, 10, [])).toBe(10.2);
    expect(snapTime(10.98, 'edges', 0.05, 0, [9, 11])).toBe(11);
    expect(snapTime(10.004, 'grid', 0, 0, [])).toBe(10);
    expect(snapTime(10.004, 'off', 1, 10, [10])).toBe(10.004);
  });
});
