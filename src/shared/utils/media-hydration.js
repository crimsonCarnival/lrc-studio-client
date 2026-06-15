/**
 * Converts a server upload object into a typed restoredMedia descriptor.
 * Returns null when the upload is absent or has no playable media URL.
 *
 * Descriptor shapes:
 *   { type: 'youtube',    url }
 *   { type: 'cloudinary', id, url, fileName, title, duration, publicId }
 */
export function uploadToRestoredMedia(upload) {
  if (!upload) return null;
  if (upload.source === 'youtube' && upload.uploadUrl)
    return { type: 'youtube', url: upload.uploadUrl };
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
  return null;
}
