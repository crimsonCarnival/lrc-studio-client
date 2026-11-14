import { describe, it, expect } from 'vitest';
import { compileLRC, parseLrcSrtFile } from './lrc';

describe('word end times in enhanced LRC', () => {
  const line = {
    text: 'fighting dreamers',
    timestamp: 9.42,
    words: [
      { word: 'fighting', time: 9.42, end: 10.33 },
      { word: 'dreamers', time: 10.33, end: 10.98 },
    ],
  };

  it('closes a word with an empty timed token only when it stops before the next word', () => {
    expect(compileLRC([line]).trim()).toBe('[00:09.42] <00:09.42>fighting <00:10.33>dreamers<00:10.98>');
  });

  it('reads the empty token back as the end of the word before it', () => {
    const [parsed] = parseLrcSrtFile('[00:10.33] <00:10.33>dreamers<00:10.98> <00:11.12>again', 'a.lrc');
    expect(parsed.words).toEqual([
      { word: 'dreamers', time: 10.33, end: 10.98 },
      { word: 'again', time: 11.12 },
    ]);
  });
});
