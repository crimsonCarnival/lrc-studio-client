import { describe, expect, it } from 'vitest';
import { initialWordsDemoState, wordsDemoReducer } from './words-demo.state';

describe('wordsDemoReducer', () => {
  const start = initialWordsDemoState(3);

  it('ignores switching to words before a line is stamped', () => {
    expect(wordsDemoReducer(start, { type: 'setMode', mode: 'words' }).mode).toBe('lines');
  });

  it('unlocks words after markLine', () => {
    const stamped = wordsDemoReducer(start, { type: 'markLine', time: 6 });
    expect(stamped.lineStamped).toBe(true);
    expect(wordsDemoReducer(stamped, { type: 'setMode', mode: 'words' }).mode).toBe('words');
  });

  it('stamps words in order and stays on the last one', () => {
    let s = wordsDemoReducer(start, { type: 'markWord', time: 1 });
    s = wordsDemoReducer(s, { type: 'markWord', time: 2 });
    expect(s.wordStamps).toEqual([1, 2, null]);
    expect(s.activeWord).toBe(2);
    s = wordsDemoReducer(s, { type: 'markWord', time: 3 });
    s = wordsDemoReducer(s, { type: 'markWord', time: 4 });
    expect(s.wordStamps).toEqual([1, 2, 4]);
    expect(s.activeWord).toBe(2);
  });

  it('resets to the locked start', () => {
    const s = wordsDemoReducer(wordsDemoReducer(start, { type: 'markLine', time: 6 }), { type: 'reset' });
    expect(s).toEqual(start);
  });
});
