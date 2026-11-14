import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { UserAvatar } from '@ui/UserAvatar';
import { UserHoverCard } from '@ui/UserHoverCard';
import { profilePath } from '@/features/profile/profile-path';
import { useAuthContext } from '@/features/auth/useAuthContext';
import type { Activity } from './ActivityCard';
import { relativeTime } from '../relative-time';

const TYPE_ICON: Record<string, string> = {
  PROJECT_PUBLISHED: 'language',
  PROJECT_STARRED: 'star',
  PROJECT_FORKED: 'call_split',
  PLAYLIST_CREATED: 'queue_music',
  USER_FOLLOWED: 'person_add',
};

type GroupKey = 'project_published' | 'project_starred' | 'project_forked' | 'project_shared' | 'playlist_created' | 'user_followed';

const STACK_MAX = 4;
const lower = (s?: string | null) => (s ?? '').toLowerCase();

/** "a", "a and b", "a, b and c". */
function joinNames(names: string[], t: (k: string, o?: Record<string, unknown>) => string): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return t('feed.names.two', { a: names[0], b: names[1] });
  return t('feed.names.many', { list: names.slice(0, -1).join(', '), last: names[names.length - 1] });
}

/** One person doing the same thing several times in a row: "Ana followed 4 people", "Bo forked 2 of your projects". */
export function ActivityGroupCard({ activities }: { activities: Activity[] }) {
  const { t } = useTranslation();
  const tk = t as unknown as (k: string, o?: Record<string, unknown>) => string;
  const { user } = useAuthContext();
  const [expanded, setExpanded] = useState(false);
  const [first] = activities;
  const { actor, type } = first;
  const key = type.toLowerCase() as GroupKey;
  const actorIsViewer = lower(actor.accountName) === lower(user?.accountName);
  const targetIsViewer = lower(first.target?.accountName) === lower(user?.accountName);
  const phrasing = actorIsViewer ? 'self' : targetIsViewer ? 'mine' : 'other';
  const isFollows = type === 'USER_FOLLOWED';
  const listId = `${first.id}-items`;

  const followedNames = activities.map((a) => a.target?.displayName || a.target?.accountName || a.projectTitle || '');

  return (
    <article className="flex gap-3.5 rounded-[var(--radius-card)] bg-raised px-[18px] py-4 inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint">
      <UserHoverCard accountName={actor.accountName}>
        <Link to={profilePath(actor.accountName)} className="block shrink-0">
          <UserAvatar {...actor} className="size-10 text-[15px]" />
        </Link>
      </UserHoverCard>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground">
          {actorIsViewer ? (
            <span className="font-semibold">{t('feed.you')}</span>
          ) : (
            <Link to={profilePath(actor.accountName)} className="font-semibold text-foreground transition-colors hover:text-primary-ink">
              {actor.displayName || actor.accountName}
            </Link>
          )}{' '}
          <span className="text-subtle">{tk(`feed.group.${key}.${phrasing}`, { count: activities.length })}</span>
        </p>

        {isFollows ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="flex" aria-hidden="true">
              {activities.slice(0, STACK_MAX).map((a, i) => (
                <span key={a.id} className={i > 0 ? '-ml-2' : ''}>
                  <span className="block rounded-full ring-2 ring-raised">
                    <UserAvatar
                      accountName={a.target?.accountName ?? a.projectTitle}
                      displayName={a.target?.displayName}
                      avatarUrl={a.coverImage}
                      className="size-8 text-xs"
                    />
                  </span>
                </span>
              ))}
            </span>
            <span className="min-w-[200px] flex-1 text-[13px] text-subtle">{joinNames(followedNames, tk)}</span>
          </div>
        ) : null}

        {(!isFollows || expanded) && (
          <ul id={listId} className="mt-3 flex flex-col gap-1.5">
            {activities.map((a) => {
              const name = isFollows ? (a.target?.displayName || a.target?.accountName || a.projectTitle) : (a.projectTitle || t('feed.untitled'));
              const body = (
                <>
                  {isFollows ? (
                    <UserAvatar accountName={a.target?.accountName ?? a.projectTitle} displayName={a.target?.displayName} avatarUrl={a.coverImage} className="size-7 text-[11px]" />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[calc(var(--radius)*0.8)] bg-primary-soft">
                      {a.coverImage
                        ? <img src={a.coverImage} alt="" className="size-full object-cover" />
                        : <Icon name={type === 'PLAYLIST_CREATED' ? 'queue_music' : 'music_note'} size={18} className="text-primary-ink/70" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</span>
                  <time dateTime={a.createdAt} className="shrink-0 text-xs text-subtle">{relativeTime(a.createdAt, t)}</time>
                </>
              );
              const cls = 'flex items-center gap-2.5 rounded-[var(--radius-control)] bg-background/60 px-2.5 py-2';
              return (
                <li key={a.id}>
                  {a.targetPath
                    ? <Link to={a.targetPath} className={`${cls} transition-shadow hover:inset-ring hover:inset-ring-hl`}>{body}</Link>
                    : <div className={cls}>{body}</div>}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs text-subtle">
            <span className="inline-flex h-[22px] items-center gap-1 rounded-[calc(var(--radius)*0.8)] bg-hl px-2 text-[11px] font-semibold">
              <Icon name={TYPE_ICON[type] ?? 'star'} size={12} />
              {tk(`feed.type.${key}`)} · {activities.length}
            </span>
            <time dateTime={first.createdAt}>{relativeTime(first.createdAt, t)}</time>
          </p>
          {isFollows && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? listId : undefined}
              onClick={() => setExpanded((v) => !v)}
              className="min-h-8 text-[13px] font-semibold text-primary-ink transition-colors hover:text-foreground"
            >
              {expanded ? t('feed.showLess') : t('feed.showAll', { count: activities.length })}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
