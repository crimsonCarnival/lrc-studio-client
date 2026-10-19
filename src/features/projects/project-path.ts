/**
 * Readable project URL paths. The algorithm mirrors the server
 * (`src/utils/project-slug.ts`) and must stay byte-identical to it.
 *
 * The slug in a URL is cosmetic: projects are always resolved by `publicId`
 * (the last 10 characters of the final path segment), so a stale slug or
 * account name never breaks a link. That is why the router can accept any
 * `:slugId` and still find the right project.
 *
 * There is exactly one project URL shape. `/project/:publicId` is gone — not
 * redirected — so nothing in the client may construct it.
 */

const MAX_SLUG_LENGTH = 60;
/** nanoid(10); the id is the tail of the segment, never found by splitting on '-'. */
export const PROJECT_ID_LENGTH = 10;

export function slugify(input: string): string {
  let s = input.normalize('NFD');
  // Latin diacritics only (U+0300–U+036F). Kana dakuten U+3099/U+309A are left
  // alone so が does not decay into か.
  s = s.replace(/[̀-ͯ]/g, '');
  s = s.normalize('NFC').toLowerCase();
  s = s.replace(/['’]/g, '');
  s = s.replace(/[^\p{L}\p{N}]+/gu, '-');
  s = s.replace(/^-+|-+$/g, '');
  s = s.slice(0, MAX_SLUG_LENGTH);
  // A cut can land between the halves of a surrogate pair, which would make
  // encodeURIComponent throw on the resulting path.
  if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1);
  return s.replace(/-+$/g, '');
}

type SlugMetadata = {
  songName?: string | null;
  songArtist?: string | null;
  songArtists?: (string | null)[] | null;
};

export type ProjectPathSource = {
  publicId: string;
  /** The server's stored slug. Preferred over recomputing when present. */
  slug?: string | null;
  title?: string | null;
  metadata?: object | null;
  /** The owner, however the query happened to shape it. */
  user?: { accountName?: string | null } | null;
  accountName?: string | null;
};

export function projectSlug(p: ProjectPathSource): string {
  const m = (p.metadata ?? {}) as SlugMetadata;
  const artist = m.songArtist || m.songArtists?.[0] || '';
  const songName = m.songName || '';
  return slugify(`${artist} ${songName}`) || slugify(p.title || '') || '';
}

/**
 * Canonical path for a project, or null when the owner is not known here.
 *
 * Null rather than a fallback URL: every project URL is owner-scoped, so a
 * caller without the owner's name has nothing to link to and must either query
 * it or not render the link. Silently emitting a half-built path would produce
 * links that 404 only in production.
 */
export function projectPath(p: ProjectPathSource, ownerAccountName?: string | null): string | null {
  const owner = ownerAccountName ?? p.user?.accountName ?? p.accountName;
  if (!owner) return null;
  const slug = p.slug || projectSlug(p);
  const segment = slug ? `${slug}-${p.publicId}` : p.publicId;
  return `/${encodeURIComponent(owner)}/projects/${encodeURIComponent(segment)}`;
}

export function projectEditPath(p: ProjectPathSource, ownerAccountName?: string | null): string | null {
  const base = projectPath(p, ownerAccountName);
  return base && `${base}/edit`;
}

export function projectForkPath(p: ProjectPathSource, ownerAccountName?: string | null): string | null {
  const base = projectPath(p, ownerAccountName);
  return base && `${base}/fork`;
}

/**
 * Route-shape predicates. The router, the layout and the header all need to ask
 * "is this a project page?" and there is now exactly one shape to ask about, so
 * the patterns live next to the builders rather than being re-typed per file.
 *
 * `/project/new` and `/project/local` are deliberately *not* matched: they are
 * action routes with no project identity, and callers that care about them test
 * for them literally.
 */
const PROJECT_VIEW_PATH = /^\/[^/]+\/projects\/[^/]+$/;
const PROJECT_EDIT_PATH = /^\/[^/]+\/projects\/[^/]+\/edit$/;
const PROJECT_ANY_PATH = /^\/[^/]+\/projects\/[^/]+(\/(edit|fork))?$/;

/** The public, read-only project page. */
export function isProjectViewPath(pathname: string): boolean {
  return PROJECT_VIEW_PATH.test(pathname);
}

/** The editor workspace: a saved project's `/edit` page, or the local draft. */
export function isEditorPath(pathname: string): boolean {
  return PROJECT_EDIT_PATH.test(pathname) || pathname === '/project/local';
}

/** Any canonical project path — view, `/edit` or `/fork`. */
export function isProjectPath(pathname: string): boolean {
  return PROJECT_ANY_PATH.test(pathname);
}

/**
 * A canonical path rebuilt from route params.
 *
 * Route params arrive URL-decoded, so `/%2Fevil.com/projects/<real-slug-id>`
 * hands back an account name of `/evil.com`, and interpolating that straight
 * back into a path yields `//evil.com/projects/...` — protocol-relative, i.e.
 * an off-site navigation from a link that looks like one of ours. Nothing
 * validates the account segment for us either: it is cosmetic, the project
 * resolves by the id at the tail of the slug segment, so such a link loads a
 * real project and only diverges when a button rebuilds the path.
 *
 * Prefer `projectPath()` with loaded project data where it is available; this
 * is for the places that only have the params. Re-encoding each segment keeps
 * the result a same-origin relative path.
 */
export function canonicalPathFromParams(accountName?: string, slugId?: string): string {
  return `/${encodeURIComponent(accountName ?? '')}/projects/${encodeURIComponent(slugId ?? '')}`;
}

/**
 * The publicId inside a `:slugId` route param — the last 10 characters, because
 * the nanoid alphabet contains '-' and the slug may too.
 */
export function publicIdFromSlugId(slugId: string | undefined): string | null {
  if (!slugId || slugId.length < PROJECT_ID_LENGTH) return null;
  const publicId = slugId.slice(-PROJECT_ID_LENGTH);
  return /^[A-Za-z0-9_-]{10}$/.test(publicId) ? publicId : null;
}
