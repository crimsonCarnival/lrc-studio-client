/** The server accepts a romanize language hint of at most this many characters. */
const MAX_HINT = 35;

/**
 * The project's language as a free-text hint for Romanize, from the metadata's `songLanguage`
 * (the language option's value, e.g. "Japanese"). Undefined when unset so no empty `language` is sent.
 */
export function songLanguageHint(metadata: Record<string, unknown> | null | undefined): string | undefined {
  const raw = metadata?.songLanguage;
  if (typeof raw !== 'string') return undefined;
  const hint = raw.trim().slice(0, MAX_HINT);
  return hint || undefined;
}
