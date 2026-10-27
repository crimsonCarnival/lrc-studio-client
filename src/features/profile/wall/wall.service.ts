import { gqlRequest } from '@/app/graphql.client';

export interface WallAuthor {
  id: string;
  accountName: string;
  displayName: string | null;
  avatarUrl: string | null;
  staffRole: string | null;
  /** False when this author switched tagging off. */
  allowsTags: boolean;
}

export interface WallMention {
  id: string;
  accountName: string;
  displayName: string | null;
}

export interface WallProjectRef {
  publicId: string;
  title: string;
  slug: string;
  coverImage: string | null;
  ownerAccountName: string;
}

export interface WallComment {
  id: string;
  /** May contain tag tokens; see wall-tags.ts. */
  body: string;
  mentions: WallMention[];
  projectRefs: WallProjectRef[];
  createdAt: string;
  /** Set once the author edited it. */
  editedAt: string | null;
  /** 0 for a comment, 1 for a reply, 2 for a reply to a reply. */
  depth: number;
  author: WallAuthor;
  canDelete: boolean;
  /** The viewer wrote it and the edit window is still open. */
  canEdit: boolean;
  /** Pinned by the wall's owner (shown first on page one). */
  pinned: boolean;
  likeCount: number;
  likedByMe: boolean;
  /** For a reply at the deepest level: the sibling it answers (listed right after it). */
  replyToId: string | null;
  /** It answered a comment that is no longer shown. */
  replyToMissing: boolean;
  /** Direct replies in total and everything beneath; `replies` may hold only the first few. */
  replyCount: number;
  descendantCount: number;
  replies: WallComment[];
}

export interface Wall {
  enabled: boolean;
  comments: WallComment[];
  hasMore: boolean;
  /** Top-level comments that page (not counting the pinned one). */
  total: number;
  /** Every comment, replies included. */
  totalAll: number;
  /** The page returned (0-based). */
  page: number;
  subscribed: boolean;
}

/** Top-level comments per page; the server's default. */
export const WALL_PAGE_SIZE = 20;

/** The deepest a comment can sit; mirrors the server. */
export const WALL_MAX_DEPTH = 2;
export const WALL_MAX_LENGTH = 500;

const COMMENT_FIELDS = `id body createdAt editedAt depth canDelete canEdit pinned likeCount likedByMe
  replyToId replyToMissing replyCount descendantCount
  author { id accountName displayName avatarUrl staffRole allowsTags }
  mentions { id accountName displayName }
  projectRefs { publicId title slug coverImage ownerAccountName }`;

// A comment with its replies, down to the deepest level.
const THREAD_FIELDS = `${COMMENT_FIELDS} replies { ${COMMENT_FIELDS} replies { ${COMMENT_FIELDS} } }`;

const WALL_QUERY = /* GraphQL */ `
  query Wall($accountName: String!, $page: Int, $focus: ID) {
    wall(accountName: $accountName, page: $page, focus: $focus) {
      enabled hasMore total totalAll page subscribed
      comments { ${THREAD_FIELDS} }
    }
  }
`;

/** The query stops at the deepest level, which has no `replies` field; give every comment an array. */
function withReplyArrays(comment: WallComment): WallComment {
  return { ...comment, replies: (comment.replies ?? []).map(withReplyArrays) };
}

/** One page of a wall; with `focus`, the page holding that comment, its thread in full. */
export async function getWall(accountName: string, { page = 0, focus = null }: { page?: number; focus?: string | null } = {}): Promise<Wall> {
  const data = await gqlRequest<{ wall: Wall }>(WALL_QUERY, { accountName, page, focus });
  return { ...data.wall, comments: data.wall.comments.map(withReplyArrays) };
}

/** More replies to a comment, after the `offset` already shown. */
export async function getWallReplies(commentId: string, offset: number, limit = 10): Promise<WallComment[]> {
  const data = await gqlRequest<{ wallReplies: WallComment[] }>(/* GraphQL */ `
    query WallReplies($commentId: ID!, $offset: Int, $limit: Int) {
      wallReplies(commentId: $commentId, offset: $offset, limit: $limit) { ${THREAD_FIELDS} }
    }
  `, { commentId, offset, limit });
  return data.wallReplies.map(withReplyArrays);
}

/** One comment as the viewer sees it (live updates); null when it isn't shown to them. */
export async function getWallComment(id: string): Promise<WallComment | null> {
  const data = await gqlRequest<{ wallComment: WallComment | null }>(/* GraphQL */ `
    query WallComment($id: ID!) { wallComment(id: $id) { ${THREAD_FIELDS} } }
  `, { id });
  return data.wallComment ? withReplyArrays(data.wallComment) : null;
}

export async function getWallLikers(id: string): Promise<{ users: WallAuthor[]; total: number }> {
  const data = await gqlRequest<{ wallCommentLikers: { users: WallAuthor[]; total: number } }>(/* GraphQL */ `
    query WallCommentLikers($id: ID!) {
      wallCommentLikers(id: $id, limit: 20) { total users { id accountName displayName avatarUrl staffRole allowsTags } }
    }
  `, { id });
  return data.wallCommentLikers;
}

export async function editWallComment(id: string, body: string): Promise<WallComment> {
  const data = await gqlRequest<{ editWallComment: WallComment }>(/* GraphQL */ `
    mutation EditWallComment($id: ID!, $body: String!) { editWallComment(id: $id, body: $body) { ${COMMENT_FIELDS} } }
  `, { id, body });
  return withReplyArrays(data.editWallComment);
}

export async function setWallCommentPin(id: string, pinned: boolean): Promise<void> {
  await gqlRequest(/* GraphQL */ `
    mutation SetWallCommentPin($id: ID!, $pinned: Boolean!) { setWallCommentPin(id: $id, pinned: $pinned) }
  `, { id, pinned });
}

export async function addWallComment(accountName: string, body: string, parentId?: string | null): Promise<WallComment> {
  const data = await gqlRequest<{ addWallComment: WallComment }>(/* GraphQL */ `
    mutation AddWallComment($accountName: String!, $body: String!, $parentId: ID) {
      addWallComment(accountName: $accountName, body: $body, parentId: $parentId) { ${COMMENT_FIELDS} }
    }
  `, { accountName, body, parentId: parentId ?? null });
  return withReplyArrays(data.addWallComment);
}

export async function setWallCommentLike(id: string, liked: boolean): Promise<{ liked: boolean; likeCount: number }> {
  const data = await gqlRequest<{ setWallCommentLike: { liked: boolean; likeCount: number } }>(/* GraphQL */ `
    mutation SetWallCommentLike($id: ID!, $liked: Boolean!) {
      setWallCommentLike(id: $id, liked: $liked) { liked likeCount }
    }
  `, { id, liked });
  return data.setWallCommentLike;
}

/**
 * Siblings oldest first, except that a reply to a sibling comes right after it (and after the
 * earlier replies to it). Mirrors the server's order, for comments added on this page.
 */
export function orderSiblings(siblings: WallComment[]): WallComment[] {
  const ids = new Set(siblings.map((s) => s.id));
  const answers = new Map<string, WallComment[]>();
  const roots: WallComment[] = [];
  for (const s of siblings) {
    if (s.replyToId && ids.has(s.replyToId)) answers.set(s.replyToId, [...(answers.get(s.replyToId) ?? []), s]);
    else roots.push(s);
  }
  const out: WallComment[] = [];
  const visit = (s: WallComment) => { out.push(s); for (const a of answers.get(s.id) ?? []) visit(a); };
  roots.forEach(visit);
  return out;
}

export async function deleteWallComment(id: string): Promise<void> {
  await gqlRequest(/* GraphQL */ `mutation DeleteWallComment($id: ID!) { deleteWallComment(id: $id) }`, { id });
}

export async function setWallSubscription(accountName: string, subscribed: boolean): Promise<boolean> {
  const data = await gqlRequest<{ setWallSubscription: boolean }>(/* GraphQL */ `
    mutation SetWallSubscription($accountName: String!, $subscribed: Boolean!) {
      setWallSubscription(accountName: $accountName, subscribed: $subscribed)
    }
  `, { accountName, subscribed });
  return data.setWallSubscription;
}

// ── Tag popup candidates ─────────────────────────────────────────────────────

export interface TagPerson {
  id: string;
  accountName: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface TagProject {
  publicId: string;
  title: string;
  coverImage: string | null;
}

const FOLLOWING_PAGE = 50;
const MAX_FOLLOWING = 200;

/**
 * The people `accountName` follows who allow tags (the @ popup), up to MAX_FOLLOWING.
 * Someone who switched tags off is left out; the server refuses the tag anyway.
 */
export async function getTaggablePeople(accountName: string): Promise<TagPerson[]> {
  const people: TagPerson[] = [];
  let seen = 0;
  for (let offset = 0; offset < MAX_FOLLOWING; offset += FOLLOWING_PAGE) {
    const data = await gqlRequest<{ followList: { users: Array<TagPerson & { allowsTags: boolean }>; total: number } | null }>(/* GraphQL */ `
      query TaggablePeople($accountName: String!, $offset: Int) {
        followList(accountName: $accountName, type: FOLLOWING, offset: $offset) {
          users { id accountName displayName avatarUrl allowsTags }
          total
        }
      }
    `, { accountName, offset });
    const page = data.followList?.users ?? [];
    seen += page.length;
    people.push(...page.filter((p) => p.allowsTags).map(({ allowsTags: _allowsTags, ...person }) => person));
    if (page.length < FOLLOWING_PAGE || seen >= (data.followList?.total ?? 0)) break;
  }
  return people;
}

/** Anyone matching `query` who allows tags (the @ popup, beyond the people you follow). */
export async function searchTaggablePeople(query: string, limit = 8): Promise<TagPerson[]> {
  const data = await gqlRequest<{ searchUsers: Array<TagPerson & { allowsTags: boolean }> }>(/* GraphQL */ `
    query TaggableSearch($query: String!, $limit: Int) {
      searchUsers(query: $query, limit: $limit) { id accountName displayName avatarUrl allowsTags }
    }
  `, { query, limit });
  return (data.searchUsers ?? []).filter((p) => p.allowsTags).map(({ allowsTags: _allowsTags, ...person }) => person);
}

/**
 * `accountName`'s projects as the viewer may see them (the @owner/ popup): public ones, plus
 * private ones when the viewer is the owner. Null when there is no such user.
 */
export async function getTaggableProjects(accountName: string): Promise<TagProject[] | null> {
  const data = await gqlRequest<{ publicProfile: { projects: Array<{ publicId: string; title: string | null; coverImage: string | null; upload: { coverImage: string | null } | null }> } | null }>(/* GraphQL */ `
    query TaggableProjects($accountName: String!) {
      publicProfile(accountName: $accountName) {
        projects { publicId title coverImage upload { coverImage } }
      }
    }
  `, { accountName });
  if (!data.publicProfile) return null;
  // Only a stored cover (the project's, else its upload's, both from the song-info lookup);
  // no cover means none is shown.
  return data.publicProfile.projects.map((p) => ({
    publicId: p.publicId,
    title: p.title ?? '',
    coverImage: p.coverImage || p.upload?.coverImage || null,
  }));
}

const WALL_ERROR_KEYS = ['rate_limited', 'wall_disabled', 'forbidden', 'invalid_body', 'max_depth', 'not_found', 'tag_not_allowed', 'edit_window_closed'] as const;

/** The i18n key of the message for a failed wall call: its code's, or the generic one. */
export function wallErrorKey(err: unknown): string {
  const code = wallErrorCode(err);
  return `profile.wall.errors.${(WALL_ERROR_KEYS as readonly string[]).includes(code) ? code : 'failed'}`;
}

/** The server's error code (`rate_limited`, `wall_disabled`, ...) from a failed wall call, lower-cased. */
export function wallErrorCode(err: unknown): string {
  const code = (err as { graphqlErrors?: { extensions?: { code?: string } }[] })?.graphqlErrors?.[0]?.extensions?.code;
  return (code ?? 'failed').toLowerCase();
}
