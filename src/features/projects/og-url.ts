/**
 * The link to share for a published project: the server's Open Graph page, which unfurls
 * with a cover and title in chat apps and then redirects to the project.
 *
 * In production that page lives on the API origin. In development the API is only reachable
 * through Vite's /api proxy; a bare /og path on the dev server is a client route, and sent a
 * shared link to the sign-in page.
 */
export function ogShareUrl(publicId: string): string {
  const base = import.meta.env.PROD
    ? (import.meta.env.VITE_SERVER_ORIGIN || '')
    : `${window.location.origin}/api`;
  return `${base}/og/project/${publicId}`;
}
