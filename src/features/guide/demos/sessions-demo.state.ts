export type SessionsDemoState = {
  myLine: number;
  role: 'editor' | 'viewer';
  denied: number | null;
  saveState: 'saved' | 'saving';
  lastEditAt: number | null;
};

type SessionsDemoAction =
  | { type: 'select'; line: number }
  | { type: 'edit'; at: number }
  | { type: 'tick'; now: number }
  | { type: 'setRole'; role: 'editor' | 'viewer' };

// Mika is working on the fifth line.
export const MIKA_LINE = 4;
// Demo-local: how long after the last edit the demo flips to "saved". The copy never states a number.
export const DEMO_SAVE_DELAY_MS = 2000;

export const initialSessionsDemoState: SessionsDemoState = {
  myLine: 2,
  role: 'editor',
  denied: null,
  saveState: 'saved',
  lastEditAt: null,
};

export function sessionsDemoReducer(state: SessionsDemoState, action: SessionsDemoAction): SessionsDemoState {
  switch (action.type) {
    case 'select':
      if (state.role === 'viewer') return state;
      if (action.line === MIKA_LINE) return { ...state, denied: MIKA_LINE };
      return { ...state, myLine: action.line, denied: null };
    case 'edit':
      if (state.role === 'viewer') return state;
      return { ...state, saveState: 'saving', lastEditAt: action.at };
    case 'tick':
      if (state.saveState !== 'saving' || state.lastEditAt === null) return state;
      return action.now - state.lastEditAt >= DEMO_SAVE_DELAY_MS ? { ...state, saveState: 'saved' } : state;
    case 'setRole':
      return { ...state, role: action.role, denied: null };
  }
}
