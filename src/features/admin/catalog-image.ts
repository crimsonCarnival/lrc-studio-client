/** Only Cloudinary-hosted images are rendered: a submitted URL is user-influenced, so anything else is not fetched. */
export function isCloudinaryUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}
