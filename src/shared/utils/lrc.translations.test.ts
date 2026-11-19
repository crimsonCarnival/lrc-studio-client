import { describe, expect, it } from 'vitest';
import { parseLrcSrtFile } from './lrc';

describe('parseLrcSrtFile translations', () => {
  it('gives a 3rd+ same-timestamp line a language, which the save API requires', () => {
    const lrc = '[00:01.00]main\n[00:01.00]secondary\n[00:01.00]translation';
    const [line] = parseLrcSrtFile(lrc, 'song.lrc');
    expect(line.text).toBe('main');
    expect(line.secondary).toBe('secondary');
    expect(line.translations).toEqual([{ text: 'translation', language: '' }]);
  });
});
