import { gqlRequest } from '@/app/graphql.client';

export interface WallAuthor {
  id: string;
  accountName: string;
  displayName: string | null;
  avatarUrl: string | null;
  staffRole: string | null;
}

export interface WallComment {
  id: string;
  body: string;
  createdAt: string;
  /** 0 for a comment, 1 for a reply, 2 for a reply to a reply. */
  depth: number;
  author: WallAuthor;
  canDelete: boolean;
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

const COMMENT_FIELDS = `id body createdAt depth canDelete author { id accountName displayName avatarUrl staffRole }`;

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

export async function getWall(accountName: string, after?: string | null): Promise<Wall> {
  const data = await gqlRequest<{ wall: Wall }>(WALL_QUERY, { accountName, after: after ?? null });
  return data.wall;
}

export async function addWallComment(accountName: string, body: string, parentId?: string | null): Promise<WallComment> {
  const data = await gqlRequest<{ addWallComment: WallComment }>(/* GraphQL */ `
    mutation AddWallComment($accountName: String!, $body: String!, $parentId: ID) {
      addWallComment(accountName: $accountName, body: $body, parentId: $parentId) { ${COMMENT_FIELDS} }
    }
  `, { accountName, body, parentId: parentId ?? null });
  return { ...data.addWallComment, replies: [] };
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

/** The server's error code (`rate_limited`, `wall_disabled`, ...) from a failed wall call, lower-cased. */
export function wallErrorCode(err: unknown): string {
  const code = (err as { graphqlErrors?: { extensions?: { code?: string } }[] })?.graphqlErrors?.[0]?.extensions?.code;
  return (code ?? 'failed').toLowerCase();
}
