import type { EditorLine } from '../editor.types';

/**
 * For results of an async operation that come back positionally (result[i] is
 * about sent[i]): maps a line as it is NOW back to its index in what was sent.
 * By id when the line has one; otherwise by object identity, which still holds
 * for a line nobody touched. Anything inserted since resolves to undefined.
 *
 * Position alone is wrong once the request is in flight: an insert, delete or
 * reorder in the meantime (a collaborator's, or the user's own) shifts every
 * index after it, and applying by index then edits, or in a collab doc drops,
 * someone else's line.
 */
export function sentIndexResolver(sent: readonly EditorLine[]): (line: EditorLine) => number | undefined {
  const byId = new Map<string, number>();
  const byRef = new Map<EditorLine, number>();
  sent.forEach((line, i) => {
    if (line.id) byId.set(String(line.id), i);
    byRef.set(line, i);
  });
  return (line) => (line.id ? byId.get(String(line.id)) : undefined) ?? byRef.get(line);
}

/**
 * Applies inferred end times onto the current lines. Only `endTime` is written;
 * every other field (and the line's identity) stays as it is now. Lines that were
 * not part of the request, or are gone, are left alone. Returns `current` itself
 * when nothing changed.
 */
export function applyInferredEndTimes(
  current: EditorLine[],
  sentIndexOf: (line: EditorLine) => number | undefined,
  inferred: readonly { endTime?: number | null }[],
): EditorLine[] {
  let changed = false;
  const next = current.map((line) => {
    const i = sentIndexOf(line);
    if (i === undefined) return line;
    const endTime = inferred[i]?.endTime;
    if (typeof endTime !== 'number' || !Number.isFinite(endTime) || endTime === line.endTime) return line;
    changed = true;
    return { ...line, endTime };
  });
  return changed ? next : current;
}
