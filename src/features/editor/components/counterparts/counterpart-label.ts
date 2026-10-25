/**
 * A counterpart as it is written in lyrics: in parentheses. Text that already has them (older
 * counterparts were typed that way) is left alone.
 */
export function counterpartLabel(text: string | undefined): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('(') ? trimmed : `(${trimmed})`;
}
