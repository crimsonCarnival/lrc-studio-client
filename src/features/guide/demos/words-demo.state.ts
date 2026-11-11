type Mode = 'lines' | 'words';

export type WordsDemoState = { lineStamped: boolean; lineTime: number | null; mode: Mode; wordStamps: (number | null)[]; activeWord: number };

type WordsDemoAction =
  | { type: 'markLine' | 'markWord'; time: number }
  | { type: 'setMode'; mode: Mode }
  | { type: 'reset' };

export const initialWordsDemoState = (wordCount: number): WordsDemoState => ({
  lineStamped: false,
  lineTime: null,
  mode: 'lines',
  wordStamps: Array.from({ length: wordCount }, () => null),
  activeWord: 0,
});

// Words mode stays locked until a line has a timestamp, as in the editor.
// Word marks fill left to right; the cursor stays on the last word, so a further mark re-stamps it.
export function wordsDemoReducer(state: WordsDemoState, action: WordsDemoAction): WordsDemoState {
  switch (action.type) {
    case 'markLine':
      return { ...state, lineStamped: true, lineTime: action.time };
    case 'setMode':
      return action.mode === 'words' && !state.lineStamped ? state : { ...state, mode: action.mode };
    case 'markWord':
      return {
        ...state,
        wordStamps: state.wordStamps.map((stamp, i) => (i === state.activeWord ? action.time : stamp)),
        activeWord: Math.min(state.activeWord + 1, state.wordStamps.length - 1),
      };
    case 'reset':
      return initialWordsDemoState(state.wordStamps.length);
  }
}
