import { describe, expect, it } from 'vitest';
import { syncDemoReducer, type SyncDemoState } from './sync-demo.state';

const empty: SyncDemoState = { stamps: [null, null, null], active: 0 };

describe('syncDemoReducer', () => {
  it('stamps the active line with the time and advances', () => {
    const next = syncDemoReducer(empty, { type: 'mark', time: 2.5 });
    expect(next).toEqual({ stamps: [2.5, null, null], active: 1 });
  });

  it('keeps the active line on the last one when marking past the end', () => {
    let state = empty;
    for (const time of [1, 2, 3, 4]) state = syncDemoReducer(state, { type: 'mark', time });
    expect(state.active).toBe(2);
    expect(state.stamps).toEqual([1, 2, 4]);
  });

  it('clears every stamp on reset', () => {
    const marked = syncDemoReducer(empty, { type: 'mark', time: 2 });
    expect(syncDemoReducer(marked, { type: 'reset' })).toEqual(empty);
  });
});
