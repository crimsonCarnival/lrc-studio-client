/** Line `[mm:ss.xx]` tags and inline word `<mm:ss.xx>` tags. */
const LRC_TAG = /[[<]\d{1,2}:\d{2}(?:[.:]\d{1,3})?[\]>]/g;

/**
 * Strips LRC timing tags so synced lyrics can be imported as plain text.
 *
 * Used when a provider returns timestamped lyrics but the user unticked "keep
 * timestamps" — they want the words, not the timing.
 */
export function stripLrcTimestamps(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(LRC_TAG, '').trim())
    .join('\n')
    .trim();
}
