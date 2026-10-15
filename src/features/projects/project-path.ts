/**
 * Public project URLs: `/:accountName/projects/:slug-:publicId`, e.g.
 * `/32blunts/projects/radiohead-creep-k3x9a2c7qm`.
 *
 * The trailing publicId is the only part that identifies the project. The account name
 * and slug are cosmetic, so a renamed song or account never breaks a link: the page
 * resolves by id and redirects to the current canonical URL (see PublicProjectViewPage).
 * The server builds the same URLs for Open Graph / sitemap, so keep `slugify` in step with
 * the algorithm documented in docs/server-slug-urls.md.
 */

/** Length of a server-issued publicId (nanoid(10)). Its alphabet includes `-` and `_`, so the id can't be split off by delimiter. */
export const PUBLIC_ID_LENGTH = 10;

const MAX_SLUG_LENGTH = 60;

/** Lowercase, accent-stripped, `-`-separated; keeps non-Latin letters (CJK, Cyrillic…) so those titles still get a slug. */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFD')
    // Latin diacritics only: kana dakuten/handakuten (U+3099/309A) are part of the letter.
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
}

interface SlugSource {
  title?: string | null;
  metadata?: { songName?: string | null; songArtist?: string | null; songArtists?: string[] | null } | null;
}

/** "artist song", falling back to the project title. Empty when there is nothing usable. */
export function projectSlug({ title, metadata }: SlugSource): string {
  const artist = metadata?.songArtist || metadata?.songArtists?.[0] || '';
  const song = metadata?.songName || '';
  return slugify(`${artist} ${song}`) || slugify(title || '');
}

interface ProjectPathSource extends SlugSource {
  publicId: string;
  accountName?: string | null;
  user?: { accountName?: string | null } | null;
  owner?: { accountName?: string | null } | null;
}

/**
 * Canonical public URL of a project. Falls back to the legacy `/project/:publicId`
 * (which redirects to the canonical URL) when the owner's account name isn't known.
 */
export function projectPath(project: ProjectPathSource): string {
  const accountName = project.accountName || project.user?.accountName || project.owner?.accountName;
  if (!accountName) return `/project/${project.publicId}`;
  const slug = projectSlug(project);
  const last = slug ? `${slug}-${project.publicId}` : project.publicId;
  return `/${encodeURIComponent(accountName)}/projects/${encodeURIComponent(last)}`;
}

/** Editor URL of one of your own projects: the canonical path plus `/edit` (legacy `/project/:id/edit` without an account name). */
export function editorPath(project: ProjectPathSource): string {
  return `${projectPath(project)}/edit`;
}

/** Extracts the publicId from the `:slug-:publicId` URL segment (also accepts a bare id). */
export function parseSlugId(slugId: string | undefined): string | undefined {
  if (!slugId) return undefined;
  if (slugId.length > PUBLIC_ID_LENGTH && slugId[slugId.length - PUBLIC_ID_LENGTH - 1] === '-') {
    return slugId.slice(-PUBLIC_ID_LENGTH);
  }
  return slugId;
}

/** True for `/:accountName/projects/:slugId`, the public project view page. */
export function isProjectViewPath(pathname: string): boolean {
  return /^\/[^/]+\/projects\/[^/]+\/?$/.test(pathname);
}

/** True for `/:accountName/projects/:slugId/edit`, the editor for one of your own projects. */
export function isProjectEditorPath(pathname: string): boolean {
  return /^\/[^/]+\/projects\/[^/]+\/edit\/?$/.test(pathname);
}
