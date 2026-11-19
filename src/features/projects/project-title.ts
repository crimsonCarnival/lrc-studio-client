/**
 * What a project is called wherever it is listed: the song name (the project's title is derived
 * from it), then the stored title for projects that have no song name, then the audio file's name.
 */
export function projectDisplayTitle(
  project: { title?: string | null; metadata?: { songName?: string | null } | null; upload?: { fileName?: string | null; [key: string]: unknown } | null },
  fallback = '',
): string {
  return project.metadata?.songName?.trim() || project.title?.trim() || project.upload?.fileName || fallback;
}
