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

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The body to send: each inserted tag's text replaced by its token. A tag only counts while
 * its text is intact and not run into more name characters (`@sam` inside `@samuel` is not
 * the tag), so editing a tag by hand turns it back into plain text.
 */
export function serializeTags(text: string, entities: TagEntity[]): string {
  let out = text;
  const longestFirst = [...entities].sort((a, b) => b.display.length - a.display.length);
  for (const e of longestFirst) {
    out = out.replace(new RegExp(`${escapeRegex(e.display)}(?![${NAME_CHARS}/])`, 'g'), e.token);
  }
  return out;
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
