/**
 * The timestamp to show (and sort by) as a project's last edit.
 *
 * `updatedAt` is the server's write stamp, not an edit: it also moves when the
 * editor saves playback state, when a counter or a maintenance job writes the
 * row, or when a backfill runs. `contentUpdatedAt` is written only when the
 * lyrics, title/metadata, cover or attached media actually change, so it is the
 * one a reader means by "edited 1 hour ago". Rows last written before that
 * field existed have no value for it, hence the fallbacks.
 */
export function projectEditedAt<V extends string | number>(
  project: { contentUpdatedAt?: V | null; updatedAt?: V | null; createdAt?: V | null } | null | undefined,
): V | null {
  return project?.contentUpdatedAt ?? project?.updatedAt ?? project?.createdAt ?? null;
}
