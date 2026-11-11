export type SrtDemoState = { start: number | null; end: number | null };

type SrtDemoAction = { type: 'mark'; time: number } | { type: 'reset' };

export const initialSrtDemoState: SrtDemoState = { start: null, end: null };

// First mark sets the start; later marks set the end, but only after the start (end must be > start).
export function srtDemoReducer(state: SrtDemoState, action: SrtDemoAction): SrtDemoState {
  if (action.type === 'reset') return initialSrtDemoState;
  if (state.start === null) return { start: action.time, end: null };
  return action.time > state.start ? { ...state, end: action.time } : state;
}
