export const KEY_SYMBOLS = {
  Space: ' ␣ ',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Enter: '↵ Enter',
  Backspace: '⌫',
  Delete: 'Del',
  Escape: 'Esc',
  Tab: '⇥ ',
  Shift: '⇧ Shift',
  Ctrl: 'Ctrl',
  Alt: 'Alt',
  Meta: '⌘',
};

/** A shortcut key as printed on a key cap, e.g. "Enter" -> "↵ Enter". Combos pass through as they are. */
export function keyCap(key: string): string {
  const symbol = (KEY_SYMBOLS as Record<string, string>)[key];
  return (symbol ?? key).trim() || key;
}
