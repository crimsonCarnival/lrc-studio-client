/**
 * Checks if a keyboard event matches a shortcut key definition.
 * Supports modifiers: Ctrl/Cmd/Meta, Alt, Shift and special keys like Space.
 *
 * @param {KeyboardEvent} e
 * @param {string} targetKey – e.g. "Space", "Ctrl+Z", "Shift+ArrowLeft"
 * @returns {boolean}
 */
export function matchKey(e, targetKey) {
  if (!targetKey) return false;
  // Split on '+' but handle standalone '+' (the last segment is always the key)
  const parts = targetKey.split('+');
  const key = parts.pop();
  // If splitting '+' produced ['', ''], key is '' — treat it as literal '+'
  const actualKey = key === '' ? '+' : key;
  const needsCtrl = parts.includes('Ctrl') || parts.includes('Cmd') || parts.includes('Meta');
  const needsAlt = parts.includes('Alt');
  const needsShift = parts.includes('Shift');
  const hasCtrl = e.ctrlKey || e.metaKey;
  if (needsCtrl !== hasCtrl || needsAlt !== e.altKey) return false;
  // Symbol keys (non-alphanumeric single chars like '+', '-', '?') may require Shift
  // on some keyboard layouts. If Shift is not explicitly in the shortcut definition,
  // skip the shift check so the semantic character always matches.
  const isSymbol = actualKey.length === 1 && !/[a-zA-Z0-9]/.test(actualKey);
  if (!isSymbol && needsShift !== e.shiftKey) return false;
  if (isSymbol && needsShift && !e.shiftKey) return false;
  if (actualKey === 'Space') return e.code === 'Space';
  if (e.key.length === 1) return e.key.toUpperCase() === actualKey.toUpperCase();
  return e.key === actualKey;
}
