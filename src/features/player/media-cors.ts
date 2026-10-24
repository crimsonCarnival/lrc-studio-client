// Media hosts known to answer with CORS headers. The <audio> element requests these in CORS
// mode, which keeps the decoded samples readable by Web Audio (the public view's background
// visualizer). A host without the headers would refuse to load in that mode at all, so this
// is an opt-in list rather than "every https URL".
const CORS_MEDIA_HOST = /^https:\/\/res\.cloudinary\.com\//;

export function audioCorsMode(url: string | null | undefined): 'anonymous' | undefined {
  return url && CORS_MEDIA_HOST.test(url) ? 'anonymous' : undefined;
}

/**
 * Whether Web Audio may read this URL's samples once it plays in the player's <audio>.
 * A cross-origin source fetched without CORS comes out of a MediaElementSource as silence,
 * so the visualizer only ever routes an element whose URL passes this.
 */
export function isReadableAudioUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('blob:') || url.startsWith('data:') || audioCorsMode(url)) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}
