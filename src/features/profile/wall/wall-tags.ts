/**
 * Tags in wall comments. The composer shows readable text (`@sam`, `@sam/Song title`); the
 * stored body carries id tokens (`@[u:<userId>]`, `@[p:<publicId>]`), which the server
 * resolves per viewer into `mentions` / `projectRefs`. See server wall-mentions.ts.
 */
import type { WallMention, WallProjectRef } from './wall.service';

/** One tag inserted from the popup: the text the user sees and the token it stands for. */
export interface TagEntity {
  display: string;
  token: string;
  /** For a project tag: what the composer's preview card shows. */
  preview?: { title: string; coverImage: string | null };
}

export interface TagRange {
  start: number;
  end: number;
  kind: 'user' | 'project';
  entity: TagEntity;
}

export type TagTrigger =
  | { kind: 'user'; query: string; start: number }
  | { kind: 'project'; owner: string; query: string; start: number };

// The hyphen is escaped so appending more characters to the class never turns it into a range.
const NAME_CHARS = 'a-z0-9_.:\\-';
// '/' is the one character account names can't contain, so `@owner/` always means projects.
const PROJECT_TRIGGER = new RegExp(`(?:^|\\s)@([${NAME_CHARS}]{3,30})/([^\\n@/]{0,60})$`, 'i');
const USER_TRIGGER = new RegExp(`(?:^|\\s)@([${NAME_CHARS}]{0,30})$`, 'i');
const TOKEN = /@\[(u|p):([A-Za-z0-9_-]{1,40})\]/g;

export const userToken = (id: string) => `@[u:${id}]`;
export const projectToken = (publicId: string) => `@[p:${publicId}]`;

/** The tag being typed right before the caret, if any; `start` is the index of its '@'. */
export function findTrigger(beforeCaret: string): TagTrigger | null {
  const project = PROJECT_TRIGGER.exec(beforeCaret);
  if (project) {
    return { kind: 'project', owner: project[1].toLowerCase(), query: project[2], start: beforeCaret.length - project[0].trimStart().length };
  }
  const user = USER_TRIGGER.exec(beforeCaret);
  if (user) return { kind: 'user', query: user[1].toLowerCase(), start: beforeCaret.length - user[0].trimStart().length };
  return null;
}

/**
 * The tag being typed at `caret`, unless it is one already picked from the list (so typing
 * after `@sam/Song title` doesn't reopen it). A picked person tag only counts as finished
 * while the caret is still on it: `@sam` + `/` must open sam's projects.
 */
export function activeTrigger(text: string, caret: number, entities: TagEntity[], dismissedAt: number | null): TagTrigger | null {
  const found = findTrigger(text.slice(0, caret));
  if (!found || found.start === dismissedAt) return null;
  const finished = entities.some((e) =>
    text.startsWith(e.display, found.start)
    && (e.token.startsWith('@[p:') || found.start + e.display.length >= caret));
  return finished ? null : found;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Where the inserted tags sit in `text`, in order. A tag only counts while its text is intact
 * and not run into more name characters (`@sam` inside `@samuel` is not the tag), so editing
 * a tag by hand turns it back into plain text. Longer tags win where two overlap.
 */
export function tagRanges(text: string, entities: TagEntity[]): TagRange[] {
  const ranges: TagRange[] = [];
  const longestFirst = [...entities].sort((a, b) => b.display.length - a.display.length);
  for (const entity of longestFirst) {
    for (const m of text.matchAll(new RegExp(`${escapeRegex(entity.display)}(?![${NAME_CHARS}/])`, 'g'))) {
      const start = m.index ?? 0;
      const end = start + entity.display.length;
      if (ranges.some((r) => start < r.end && end > r.start)) continue;
      ranges.push({ start, end, kind: entity.token.startsWith('@[p:') ? 'project' : 'user', entity });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

/** The body to send: each inserted tag's text replaced by its token. */
export function serializeTags(text: string, entities: TagEntity[]): string {
  let out = '';
  let last = 0;
  for (const r of tagRanges(text, entities)) {
    out += text.slice(last, r.start) + r.entity.token;
    last = r.end;
  }
  return out + text.slice(last);
}

/**
 * A stored body turned back into composer text and the tags in it (for editing): each token
 * becomes its readable text again. A tag that no longer resolves is dropped from the text.
 */
export function deserializeBody(body: string, mentions: WallMention[], projectRefs: WallProjectRef[]): { text: string; entities: TagEntity[] } {
  const entities = new Map<string, TagEntity>();
  let text = '';
  for (const s of bodySegments(body, mentions, projectRefs)) {
    if (s.kind === 'text') text += s.text;
    else if (s.kind === 'user') {
      const e = { display: `@${s.mention.accountName}`, token: userToken(s.mention.id) };
      entities.set(e.token, e);
      text += e.display;
    } else if (s.kind === 'project') {
      const e = {
        display: `@${s.ref.ownerAccountName}/${s.ref.title}`,
        token: projectToken(s.ref.publicId),
        preview: { title: s.ref.title, coverImage: s.ref.coverImage },
      };
      entities.set(e.token, e);
      text += e.display;
    }
  }
  return { text, entities: [...entities.values()] };
}

export type BodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'user'; mention: WallMention }
  | { kind: 'project'; ref: WallProjectRef }
  /** A tag that no longer resolves for this viewer: a deleted user, or a now-private project. */
  | { kind: 'unresolved'; tag: 'user' | 'project' };

export function bodySegments(body: string, mentions: WallMention[], projectRefs: WallProjectRef[]): BodySegment[] {
  const users = new Map(mentions.map((m) => [m.id, m]));
  const projects = new Map(projectRefs.map((p) => [p.publicId, p]));
  const out: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: body.slice(last, at) });
    const [, kind, id] = match;
    const mention = kind === 'u' ? users.get(id) : undefined;
    const ref = kind === 'p' ? projects.get(id) : undefined;
    if (mention) out.push({ kind: 'user', mention });
    else if (ref) out.push({ kind: 'project', ref });
    else out.push({ kind: 'unresolved', tag: kind === 'u' ? 'user' : 'project' });
    last = at + match[0].length;
  }
  if (last < body.length) out.push({ kind: 'text', text: body.slice(last) });
  return out;
}
