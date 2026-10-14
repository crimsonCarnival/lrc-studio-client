/**
 * An ad-lib as it is written in lyrics: in parentheses. Text that already has them (older
 * ad-libs were typed that way) is left alone.
 */
export function adLibLabel(text: string | undefined): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('(') ? trimmed : `(${trimmed})`;
}
