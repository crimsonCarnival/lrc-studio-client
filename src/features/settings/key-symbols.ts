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

/**
 * A shortcut string split into the key caps it is printed as: 'Ctrl+M' -> ['Ctrl', 'M'],
 * 'Shift+ArrowLeft' -> ['⇧ Shift', '←']. A lone '+' (and a trailing '++') is the plus key itself.
 */
export function shortcutParts(shortcut: string): string[] {
  const symbols = KEY_SYMBOLS as Record<string, string>;
  if (shortcut === '+') return [symbols['+'] ?? '+'];
  if (shortcut.endsWith('++')) {
    const parts = shortcut.slice(0, -2).split('+');
    parts.push('+');
    return parts.map((k) => symbols[k] ?? k);
  }
  return shortcut.split('+').map((k) => symbols[k] ?? k);
}
