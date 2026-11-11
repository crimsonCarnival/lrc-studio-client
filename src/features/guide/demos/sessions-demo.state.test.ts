import { describe, expect, it } from 'vitest';
import { initialSessionsDemoState, sessionsDemoReducer, type SessionsDemoState } from './sessions-demo.state';

const reduce = (s: SessionsDemoState, ...actions: Parameters<typeof sessionsDemoReducer>[1][]) =>
  actions.reduce(sessionsDemoReducer, s);

describe('sessionsDemoReducer', () => {
  it('starts on line 3 as an editor with nothing denied or pending', () => {
    expect(initialSessionsDemoState).toEqual({ myLine: 2, role: 'editor', denied: null, saveState: 'saved', lastEditAt: null });
  });

  it('moves the cursor to a free line', () => {
    expect(reduce(initialSessionsDemoState, { type: 'select', line: 0 }).myLine).toBe(0);
  });

  it("denies Mika's line and leaves the cursor where it was", () => {
    const next = reduce(initialSessionsDemoState, { type: 'select', line: 4 });
    expect(next.denied).toBe(4);
    expect(next.myLine).toBe(2);
  });

  it('clears the denial when a free line is selected', () => {
    const next = reduce(initialSessionsDemoState, { type: 'select', line: 4 }, { type: 'select', line: 1 });
    expect(next.denied).toBeNull();
    expect(next.myLine).toBe(1);
  });

  it('shows saving after an edit and saved two seconds later', () => {
    const edited = reduce(initialSessionsDemoState, { type: 'edit', at: 1000 });
    expect(edited.saveState).toBe('saving');
    expect(reduce(edited, { type: 'tick', now: 2999 }).saveState).toBe('saving');
    expect(reduce(edited, { type: 'tick', now: 3000 }).saveState).toBe('saved');
  });

  it('restarts the wait when edits continue', () => {
    const next = reduce(initialSessionsDemoState, { type: 'edit', at: 1000 }, { type: 'edit', at: 2500 }, { type: 'tick', now: 3500 });
    expect(next.saveState).toBe('saving');
  });

  it('keeps a viewer read-only', () => {
    const viewer = reduce(initialSessionsDemoState, { type: 'setRole', role: 'viewer' });
    expect(viewer.role).toBe('viewer');
    expect(reduce(viewer, { type: 'select', line: 0 })).toEqual(viewer);
    expect(reduce(viewer, { type: 'edit', at: 5 })).toEqual(viewer);
  });

  it('drops a pending denial when the role changes', () => {
    const next = reduce(initialSessionsDemoState, { type: 'select', line: 4 }, { type: 'setRole', role: 'viewer' });
    expect(next.denied).toBeNull();
  });
});
