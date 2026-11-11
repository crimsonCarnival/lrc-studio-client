export type SyncDemoState = { stamps: (number | null)[]; active: number };

type SyncDemoAction = { type: 'mark'; time: number } | { type: 'reset' };

export const initialSyncDemoState = (lineCount: number): SyncDemoState => ({
  stamps: Array.from({ length: lineCount }, () => null),
  active: 0,
});

// Mirrors the editor's default auto-advance: a mark stamps the active line and moves on.
// On the last line the cursor stays, so a further mark re-stamps it.
export function syncDemoReducer(state: SyncDemoState, action: SyncDemoAction): SyncDemoState {
  if (action.type === 'reset') return initialSyncDemoState(state.stamps.length);
  const stamps = state.stamps.map((stamp, i) => (i === state.active ? action.time : stamp));
  return { stamps, active: Math.min(state.active + 1, state.stamps.length - 1) };
}
