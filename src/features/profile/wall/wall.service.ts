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
  /** 0 for a comment, 1 for a reply, 2 for a reply to a reply. */
  depth: number;
  author: WallAuthor;
  canDelete: boolean;
  likeCount: number;
  likedByMe: boolean;
  /** For a reply at the deepest level: the sibling it answers (listed right after it). */
  replyToId: string | null;
  replies: WallComment[];
}

export interface Wall {
  enabled: boolean;
  comments: WallComment[];
  hasMore: boolean;
  total: number;
  subscribed: boolean;
}

/** The deepest a comment can sit; mirrors the server. */
export const WALL_MAX_DEPTH = 2;
export const WALL_MAX_LENGTH = 500;

const COMMENT_FIELDS = `id body createdAt depth canDelete likeCount likedByMe replyToId
  author { id accountName displayName avatarUrl staffRole allowsTags }
  mentions { id accountName displayName }
  projectRefs { publicId title slug coverImage ownerAccountName }`;

const WALL_QUERY = /* GraphQL */ `
  query Wall($accountName: String!, $after: String, $limit: Int) {
    wall(accountName: $accountName, after: $after, limit: $limit) {
      enabled hasMore total subscribed
      comments {
        ${COMMENT_FIELDS}
        replies {
          ${COMMENT_FIELDS}
          replies { ${COMMENT_FIELDS} }
        }
      }
    }
  }
`;

/** The query stops at the deepest level, which has no `replies` field; give every comment an array. */
function withReplyArrays(comment: WallComment): WallComment {
  return { ...comment, replies: (comment.replies ?? []).map(withReplyArrays) };
}

export async function getWall(accountName: string, after?: string | null): Promise<Wall> {
  const data = await gqlRequest<{ wall: Wall }>(WALL_QUERY, { accountName, after: after ?? null });
  return { ...data.wall, comments: data.wall.comments.map(withReplyArrays) };
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

/** The server's error code (`rate_limited`, `wall_disabled`, ...) from a failed wall call, lower-cased. */
export function wallErrorCode(err: unknown): string {
  const code = (err as { graphqlErrors?: { extensions?: { code?: string } }[] })?.graphqlErrors?.[0]?.extensions?.code;
  return (code ?? 'failed').toLowerCase();
}
