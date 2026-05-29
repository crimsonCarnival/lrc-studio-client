// Single source of truth for resolving a cover image to display.

const YT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=)|youtu\.be\/)([^&?/\s]{11})/;

export function youtubeThumbnail(url) {
  if (!url) return null;
  const v = String(url).trim();
  const id = v.match(YT_PATTERN)?.[1] || (/^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** Resolve a cover from an upload record (stored cover, else derived YT thumbnail). */
export function resolveUploadCover(upload) {
  if (!upload) return null;
  return upload.coverImage || youtubeThumbnail(upload.youtubeUrl) || null;
}

/** Resolve the cover for a project: explicit cover → album art → upload-derived. */
export function resolveCoverImage(project) {
  if (!project) return null;
  return (
    project.coverImage ||
    project.metadata?.albumArt ||
    resolveUploadCover(project.upload) ||
    null
  );
}
