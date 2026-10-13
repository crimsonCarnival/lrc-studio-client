/** Splits `text` around the first case-insensitive occurrence of `query`; null when it is absent. */
export function splitMatch(text: string, query: string): [string, string, string] | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return null;
  return [text.slice(0, at), text.slice(at, at + needle.length), text.slice(at + needle.length)];
}
