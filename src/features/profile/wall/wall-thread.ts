import { createContext, use } from 'react';
import type { WallComment } from './wall.service';

/**
 * A lit stretch of thread line: from `parent`'s avatar down to its reply `child` (or just
 * `parent`'s own line when `child` is null). Only that stretch lights up — later replies of
 * the same parent stay dim.
 */
export interface ThreadPath {
  parent: string;
  child: string | null;
}

/** What every comment in a wall's tree reads and calls; provided by WallSection. */
export interface WallThread {
  signedIn: boolean;
  viewerId: string | undefined;
  /** The viewer owns the wall (may pin). */
  isOwner: boolean;
  busy: boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  /** Posts a reply to `answered`; it is listed under `insertUnder` (its parent, at the deepest level). */
  reply: (answered: WallComment, insertUnder: string, body: string) => Promise<boolean>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  edit: (comment: WallComment, body: string) => Promise<boolean>;
  remove: (id: string) => void;
  toggleLike: (comment: WallComment) => void;
  togglePin: (comment: WallComment) => void;
  /** Loads the next batch of `comment`'s replies. */
  loadMoreReplies: (comment: WallComment) => Promise<void>;
  loadingRepliesFor: string | null;
  highlightedId: string | null;
  /** The hovered path and the clicked one. */
  paths: ThreadPath[];
  setHoverPath: (path: ThreadPath | null) => void;
  /** Clicking a reply highlights its parent and the line down to it; a top-level comment highlights itself. */
  select: (comment: WallComment, parentId: string | null) => void;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  /** The comment opened from a link, while it flashes. */
  flash: { id: string; fading: boolean } | null;
}

export const WallThreadContext = createContext<WallThread | null>(null);
export const useWallThread = () => use(WallThreadContext)!;

/** Applies `fn` to the comment `id`, wherever it sits in the tree. */
export function mapComment(comments: WallComment[], id: string, fn: (c: WallComment) => WallComment): WallComment[] {
  return comments.map(c => c.id === id ? fn(c) : { ...c, replies: mapComment(c.replies, id, fn) });
}

export function findComment(comments: WallComment[], id: string): WallComment | null {
  for (const c of comments) {
    if (c.id === id) return c;
    const found = findComment(c.replies, id);
    if (found) return found;
  }
  return null;
}

/** The ids of the comments above `id` (outermost first), or null when it isn't loaded. */
export function ancestorsOf(comments: WallComment[], id: string, above: string[] = []): string[] | null {
  for (const c of comments) {
    if (c.id === id) return above;
    const found = ancestorsOf(c.replies, id, [...above, c.id]);
    if (found) return found;
  }
  return null;
}

/**
 * Removes the comment `id` (and what's under it), correcting the reply counts of the
 * comments above it. Returns the tree and how many comments went.
 */
export function withoutComment(comments: WallComment[], id: string): { comments: WallComment[]; removed: number } {
  let removed = 0;
  const walk = (list: WallComment[]): WallComment[] => list.flatMap((c) => {
    if (c.id === id) {
      removed = 1 + c.descendantCount;
      return [];
    }
    const before = removed;
    const replies = walk(c.replies);
    if (removed === before) return [{ ...c, replies }];
    const direct = c.replies.some(r => r.id === id) ? 1 : 0;
    return [{ ...c, replies, replyCount: c.replyCount - direct, descendantCount: c.descendantCount - removed }];
  });
  return { comments: walk(comments), removed };
}

/** Adds `reply` under `parentId` in sibling order, counting it into every comment above. */
export function withReply(comments: WallComment[], parentId: string, reply: WallComment, order: (s: WallComment[]) => WallComment[]): WallComment[] {
  const above = ancestorsOf(comments, parentId);
  if (!above) return comments;
  const chain = new Set([...above, parentId]);
  const walk = (list: WallComment[]): WallComment[] => list.map((c) => {
    if (!chain.has(c.id)) return c;
    const isParent = c.id === parentId;
    if (isParent && c.replies.some(r => r.id === reply.id)) return c; // already here (live echo of our own)
    return {
      ...c,
      replies: isParent ? order([...c.replies, reply]) : walk(c.replies),
      replyCount: c.replyCount + (isParent ? 1 : 0),
      descendantCount: c.descendantCount + 1,
    };
  });
  return walk(comments);
}
