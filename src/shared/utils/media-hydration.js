/**
 * Converts a server upload object into a typed restoredMedia descriptor.
 * Returns null when the upload is absent or has no playable media URL.
 *
 * Descriptor shapes:
 *   { type: 'youtube',    url }
 *   { type: 'cloudinary', id, url, fileName, title, duration, publicId }
 *   { type: 'spotify',    id, trackId, title }
 */
export function uploadToRestoredMedia(upload) {
  if (!upload) return null;
  if (upload.source === 'youtube' && upload.youtubeUrl)
    return { type: 'youtube', url: upload.youtubeUrl };
  if (upload.source === 'cloudinary' && upload.uploadUrl)
    return {
      type: 'cloudinary',
      id: upload.id,
      url: upload.uploadUrl,
      fileName: upload.fileName ?? null,
      title: upload.title ?? null,
      duration: upload.duration ?? null,
      publicId: upload.publicId ?? null,
    };
  if (upload.source === 'spotify' && upload.spotifyTrackId)
    return {
      type: 'spotify',
      id: upload.id || upload.spotifyTrackId,
      trackId: upload.spotifyTrackId,
      title: upload.title || '',
    };
  return null;
}
