import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Textarea } from '@ui/textarea';
import { LogoLoader } from '@ui/LogoLoader';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { cn } from '@/shared/utils/utils';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { WALL_MAX_LENGTH, getTaggablePeople, getTaggableProjects } from './wall.service';
import type { TagPerson, TagProject } from './wall.service';
import { findTrigger, serializeTags, tagRanges, userToken, projectToken } from './wall-tags';
import { ProjectTagCard } from './CommentBody';
import type { TagEntity } from './wall-tags';

const MAX_SUGGESTIONS = 6;
// Readable text can run longer than the tokens it becomes; the real limit is checked on the
// serialized body. This only stops a runaway paste.
const MAX_INPUT = WALL_MAX_LENGTH * 2;

// Fetched once per page load and shared by every composer on it. Following someone new
// shows up in the popup after a reload.
const peopleCache = new Map<string, Promise<TagPerson[]>>();
const projectCache = new Map<string, Promise<TagProject[] | null>>();

function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  let hit = cache.get(key);
  if (!hit) {
    hit = load();
    hit.catch(() => cache.delete(key)); // a failed load is retried next time
    cache.set(key, hit);
  }
  return hit;
}

interface Suggestion {
  key: string;
  kind: 'user' | 'project';
  label: string;
  sub: string;
  image: string | null;
  entity: TagEntity;
}

interface WallComposerProps {
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  busy: boolean;
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
  /** Tags to start with: a reply opens already tagging the author it answers. */
  initialTags?: TagEntity[];
}

/**
 * The wall's comment box. `@` suggests people you follow; `@owner/` suggests that owner's
 * projects. Picking one inserts readable text, and the body sent to the server carries the
 * matching id tokens instead (wall-tags.ts).
 */
export default function WallComposer({ placeholder, submitLabel, autoFocus, busy, onSubmit, onCancel, initialTags }: WallComposerProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const listId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  const startText = initialTags?.length ? `${initialTags.map((e) => e.display).join(' ')} ` : '';
  const [text, setText] = useState(startText);
  const [entities, setEntities] = useState<TagEntity[]>(initialTags ?? []);
  const [caret, setCaret] = useState(startText.length);
  const [activeIndex, setActiveIndex] = useState(0);
  // Escape closes the popup for the tag being typed; a new '@' opens it again.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [people, setPeople] = useState<TagPerson[] | null>(null);
  const [projects, setProjects] = useState<{ owner: string; list: TagProject[] | null } | null>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  // Where to put the caret after the next render: right after inserted text and its space.
  // Without it, autoFocus leaves a reply's caret before its pre-filled `@author `, and a
  // controlled value change can move it to the end.
  const pendingCaret = useRef<number | null>(autoFocus && startText ? startText.length : null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (pendingCaret.current === null || !el) return;
    el.focus();
    el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [text]);

  const ranges = tagRanges(text, entities);
  // The project tags still in the text, once each, for the preview cards under the box.
  const taggedProjects = ranges
    .filter((r) => r.kind === 'project')
    .filter((r, i, all) => all.findIndex((o) => o.entity.token === r.entity.token) === i);

  const found = findTrigger(text.slice(0, caret));
  // A tag already picked is finished: typing after `@sam/Song title` must not reopen the list.
  const trigger = found && found.start !== dismissedAt && !entities.some((e) => text.startsWith(e.display, found.start)) ? found : null;
  const projectOwner = trigger?.kind === 'project' ? trigger.owner : null;
  const wantsPeople = trigger?.kind === 'user';

  useEffect(() => {
    if (!wantsPeople || people || !user?.accountName) return;
    let live = true;
    cached(peopleCache, user.accountName, () => getTaggablePeople(user.accountName!))
      .then((list) => { if (live) setPeople(list); })
      .catch(() => { if (live) setPeople([]); });
    return () => { live = false; };
  }, [wantsPeople, people, user?.accountName]);

  useEffect(() => {
    if (!projectOwner || projects?.owner === projectOwner) return;
    let live = true;
    cached(projectCache, projectOwner, () => getTaggableProjects(projectOwner))
      .then((list) => { if (live) setProjects({ owner: projectOwner, list }); })
      .catch(() => { if (live) setProjects({ owner: projectOwner, list: null }); });
    return () => { live = false; };
  }, [projectOwner, projects?.owner]);

  const loading = (trigger?.kind === 'user' && people === null) || (!!projectOwner && projects?.owner !== projectOwner);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!trigger) return [];
    if (trigger.kind === 'user') {
      const q = trigger.query;
      return (people ?? [])
        .filter((p) => p.accountName.toLowerCase().includes(q) || (p.displayName ?? '').toLowerCase().includes(q))
        .slice(0, MAX_SUGGESTIONS)
        .map((p) => ({
          key: p.id,
          kind: 'user',
          label: p.displayName || p.accountName,
          sub: `@${p.accountName}`,
          image: p.avatarUrl,
          entity: { display: `@${p.accountName}`, token: userToken(p.id) },
        }));
    }
    const list = projects?.owner === trigger.owner ? projects.list ?? [] : [];
    const q = trigger.query.trim().toLowerCase();
    return list
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS)
      .map((p) => {
        const title = p.title || t('library.untitled');
        return {
          key: p.publicId,
          kind: 'project',
          label: title,
          sub: `@${trigger.owner}`,
          image: p.coverImage,
          entity: { display: `@${trigger.owner}/${title}`, token: projectToken(p.publicId), preview: { title, coverImage: p.coverImage } },
        };
      });
  }, [trigger, people, projects, t]);

  const open = !!trigger && (loading || suggestions.length > 0 || trigger.query.length > 0);
  const active = Math.min(activeIndex, Math.max(0, suggestions.length - 1));

  const body = serializeTags(text.trim(), entities);
  const tooLong = body.length > WALL_MAX_LENGTH;

  const pick = (s: Suggestion) => {
    if (!trigger) return;
    const before = text.slice(0, trigger.start);
    const inserted = `${s.entity.display} `;
    const next = before + inserted + text.slice(caret);
    const pos = before.length + inserted.length;
    pendingCaret.current = pos;
    setText(next);
    setEntities((prev) => [...prev.filter((e) => e.display !== s.entity.display), s.entity]);
    setCaret(pos);
    setActiveIndex(0);
  };

  const submit = async () => {
    if (!body || tooLong || busy) return;
    if (await onSubmit(body)) {
      setText('');
      setEntities([]);
      setCaret(0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && suggestions.length > 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((active + step + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pick(suggestions[active]);
        return;
      }
    }
    if (open && e.key === 'Escape' && trigger) {
      e.preventDefault();
      setDismissedAt(trigger.start);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void submit();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-[var(--radius-control)] bg-card">
        {/* The styled copy of the text, drawn under a transparent-text textarea. It must wrap
            exactly like the textarea — same padding, font, size and line height — so tags never
            change the width of what they style: colour and a background only, no images. */}
        <div
          ref={mirrorRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 pb-7 text-base font-medium leading-snug text-foreground"
        >
          {ranges.map((r, i) => {
            const before = text.slice(i === 0 ? 0 : ranges[i - 1].end, r.start);
            const tag = text.slice(r.start, r.end);
            return (
              <span key={r.start}>
                {before}
                <span className={r.kind === 'user' ? 'text-primary' : 'rounded bg-zinc-700/70 text-zinc-100 shadow-[0_0_0_1px_var(--color-zinc-600)]'}>{tag}</span>
              </span>
            );
          })}
          {text.slice(ranges.length ? ranges[ranges.length - 1].end : 0)}
          {/* A trailing newline only takes up a line once something follows it. */}
          {'​'}
        </div>
        <Textarea
          ref={ref}
          value={text}
          autoFocus={autoFocus}
          onScroll={(e) => { if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop; }}
          onChange={(e) => {
            setText(e.target.value.slice(0, MAX_INPUT));
            setCaret(e.target.selectionStart);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
          onBlur={() => setDismissedAt(trigger?.start ?? null)}
          onFocus={() => setDismissedAt(null)}
          placeholder={placeholder}
          rows={2}
          aria-label={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && suggestions.length > 0 ? `${listId}-${active}` : undefined}
          // pb-7 keeps the text clear of the counter drawn in the bottom-left corner. The text
          // itself is transparent: the mirror above draws it, with the tags styled.
          className="relative min-h-[72px] resize-y bg-transparent pb-7 text-transparent caret-foreground selection:bg-primary/30"
        />
        <span
          aria-live="polite"
          className={cn('pointer-events-none absolute bottom-2 left-3 font-mono text-xs', tooLong ? 'text-destructive' : 'text-subtle')}
        >
          {body.length}/{WALL_MAX_LENGTH}
        </span>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={trigger?.kind === 'project' ? t('profile.wall.tagProjectsOf', { owner: projectOwner }) : t('profile.wall.tagPeople')}
            className="absolute left-0 top-full z-30 mt-1 w-full max-w-sm overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
          >
            {loading && suggestions.length === 0 && (
              <li className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500"><LogoLoader size={12} /></li>
            )}
            {!loading && suggestions.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-zinc-500">
                {trigger?.kind === 'project' ? t('profile.wall.tagNoProjects', { owner: projectOwner }) : t('profile.wall.tagNoPeople')}
              </li>
            )}
            {suggestions.map((s, i) => (
              <li
                key={s.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: picking must not blur the textarea first.
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                  i === active ? 'bg-primary/15 text-zinc-100' : 'text-zinc-300',
                )}
              >
                {s.kind === 'user' ? (
                  s.image
                    ? <img src={s.image} alt="" referrerPolicy="no-referrer" className="size-6 shrink-0 rounded-full object-cover" />
                    : <InitialsAvatar name={s.label} handle={s.sub.slice(1)} className="size-6 shrink-0 rounded-full text-[10px]" />
                ) : (
                  s.image && <img src={s.image} alt="" referrerPolicy="no-referrer" className="size-6 shrink-0 rounded object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="shrink-0 text-xs text-zinc-500">{s.sub}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {/* How the tagged projects will show once posted. */}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {taggedProjects.map((r) => (
            <ProjectTagCard key={r.entity.token} title={r.entity.preview?.title ?? ''} coverImage={r.entity.preview?.coverImage ?? null} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>}
          <Button type="button" size="sm" disabled={busy || !body || tooLong} onClick={submit}>
            {busy ? <LogoLoader size={12} /> : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
