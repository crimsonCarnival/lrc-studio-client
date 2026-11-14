import { describe, it, expect } from 'vitest';
import { layoutWords, snapTime, splitMorae, wordKana } from './word-timing';

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

  it('ignores an end that does not fall inside the word', () => {
    const [seg] = layoutWords([{ word: 'a', time: 1, end: 5 }, { word: 'b', time: 2 }], 0, 3);
    expect(seg).toMatchObject({ to: 2, hasEnd: false });
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
