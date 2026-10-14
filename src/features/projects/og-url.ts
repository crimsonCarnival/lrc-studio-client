/**
 * The link to share for a published project: the server's Open Graph page, which unfurls
 * with a cover and title in chat apps and then redirects to the project.
 */
export function ogShareUrl(publicId: string): string {
  const origin = import.meta.env.PROD ? (import.meta.env.VITE_SERVER_ORIGIN || '') : window.location.origin;
  return `${origin}/og/project/${publicId}`;
}
