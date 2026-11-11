import { describe, expect, it } from 'vitest';
import { initialSrtDemoState, srtDemoReducer } from './srt-demo.state';

describe('srtDemoReducer', () => {
  it('first mark sets start, second sets end', () => {
    let s = srtDemoReducer(initialSrtDemoState, { type: 'mark', time: 4 });
    expect(s).toEqual({ start: 4, end: null });
    s = srtDemoReducer(s, { type: 'mark', time: 7.5 });
    expect(s).toEqual({ start: 4, end: 7.5 });
  });

  it('ignores an end mark that is not after the start', () => {
    const s = srtDemoReducer({ start: 4, end: null }, { type: 'mark', time: 3 });
    expect(s).toEqual({ start: 4, end: null });
    expect(srtDemoReducer({ start: 4, end: null }, { type: 'mark', time: 4 }).end).toBeNull();
  });

  it('resets', () => {
    expect(srtDemoReducer({ start: 1, end: 2 }, { type: 'reset' })).toEqual(initialSrtDemoState);
  });
});
