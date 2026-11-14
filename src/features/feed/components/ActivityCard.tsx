import { profilePath } from '@/features/profile/profile-path';
import { StaffRing } from '@/shared/ui/StaffRing';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { relativeTime } from '../relative-time';
import { projectPath } from '@/features/projects/project-path';
import { useIntersectionLoader } from '../hooks/useIntersectionLoader';
import { ReactionBar } from '@features/reactions/components/ReactionBar';
import { useCardReactions } from '@features/reactions/hooks/useCardReactions';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { UserHoverCard } from '@ui/UserHoverCard';
import { Button } from '@ui/button';
import { useFollowToggle } from '@/features/explore/hooks/useFollowToggle';

const TYPE_ICON_NAMES: Record<string, string> = {
  PROJECT_PUBLISHED: 'language',
  PROJECT_STARRED: 'star',
  PROJECT_FORKED: 'call_split',
  PROJECT_SHARED: 'ios_share',
  PLAYLIST_CREATED: 'queue_music',
  USER_FOLLOWED: 'person_add',
};

const TYPE_I18N_KEY: Record<string, string> = {
  PROJECT_PUBLISHED: 'project_published',
  PROJECT_STARRED: 'project_starred',
  PROJECT_FORKED: 'project_forked',
  PROJECT_SHARED: 'project_shared',
  PLAYLIST_CREATED: 'playlist_created',
  USER_FOLLOWED: 'user_followed',
};

// Project-type activities that support reactions
const REACTABLE_TYPES = new Set(['PROJECT_PUBLISHED', 'PROJECT_STARRED', 'PROJECT_FORKED', 'PROJECT_SHARED']);

type ActivityUser = { accountName: string; avatarUrl?: string | null; staffRole?: string | null; displayName?: string | null; isFollowedByMe?: boolean | null };

export interface Activity {
  id: string;
  actor: ActivityUser;
  /** Who it was done to: the followed user, or the project's owner for a star, fork or share. */
  target?: ActivityUser | null;
  type: string;
  publicId?: string | null;
  projectTitle?: string | null;
  coverImage?: string | null;
  targetPath?: string | null;
  /** PROJECT_SHARED only: the sharer's note. */
  description?: string | null;
  tags?: string[] | null;
  createdAt: string;
}

function pick(arr: unknown, seed: string): string {
  if (!Array.isArray(arr)) return arr as string;
  const hash = [...String(seed)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return arr[hash % arr.length];
}


export function ActivityReactions({ publicId }: { publicId: string }) {
  const { user } = useAuthContext();
  const { reactions, myReaction, loaded, load, react } = useCardReactions(publicId);
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });

  // Fetch once the card is about to scroll into view, so the reactions are already there
  // instead of appearing only after the pointer reaches the card.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void loadRef.current();
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef}>
      <ReactionBar
        reactions={loaded ? reactions : []}
        myReaction={myReaction}
        onReact={user ? react : undefined}
        disabled={!user}
      />
    </div>
  );
}

const sameUser = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** "Follow back" on a "followed you" card; gone once the viewer already follows them. */
function FollowBack({ actor }: { actor: ActivityUser }) {
  const { t } = useTranslation();
  const follow = useFollowToggle();
  const following = follow.isFollowing(actor.accountName, actor.isFollowedByMe);
  if (actor.isFollowedByMe) return null;
  return (
    <Button
      type="button"
      size="sm"
      variant={following ? 'outline' : 'default'}
      aria-pressed={following}
      disabled={follow.isPending(actor.accountName)}
      onClick={() => void follow.toggle(actor.accountName, following)}
    >
      {following ? t('explore.suggested.following') : t('feed.followBack')}
    </Button>
  );
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const tk = t as (key: string, options?: object) => unknown;
  const { id, actor, target, type, publicId, projectTitle, coverImage, targetPath, description, tags, createdAt } = activity;
  const iconName = TYPE_ICON_NAMES[type] ?? 'star';
  const i18nKey = TYPE_I18N_KEY[type] ?? 'project_starred';

  // Who is who: the reader may be the one who did it ("You starred ...") or the one it was done
  // to ("... starred your project", "... followed you"). Anyone else gets the names.
  const actorIsViewer = sameUser(actor.accountName, user?.accountName);
  const targetIsViewer = sameUser(target?.accountName, user?.accountName);
  const targetIsActor = sameUser(target?.accountName, actor.accountName);
  const isUserFollow = type === 'USER_FOLLOWED';
  const isProjectTarget = type === 'PROJECT_STARRED' || type === 'PROJECT_FORKED' || type === 'PROJECT_SHARED';
  const followsViewer = isUserFollow && targetIsViewer;

  const group = actorIsViewer ? 'selfAction' : followsViewer ? 'toYouAction' : 'action';
  const actionText = pick(tk(`feed.${group}.${i18nKey}`, { returnObjects: true }), id);
  const targetName = target ? (target.displayName || target.accountName) : null;

  // The server builds `targetPath`; prefer it. The helper can only stand in for
  // PROJECT_PUBLISHED, where the actor IS the project owner — for a star, fork
  // or share the actor is someone else, and an Activity carries no owner
  // account name, so those stay unlinked rather than pointing at a 404.
  const targetLink = targetPath
    || (type === 'PROJECT_PUBLISHED' && publicId ? projectPath({ publicId }, actor.accountName) : null);
  const canReact = REACTABLE_TYPES.has(type) && !!publicId;

  const cardRef = useRef<HTMLElement>(null);
  useIntersectionLoader(cardRef, id, 'activity');

  return (
    <article ref={cardRef} className="flex gap-3.5 rounded-[var(--radius-card)] bg-raised px-[18px] py-4 inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint">
      <UserHoverCard accountName={actor.accountName}>
        <Link to={profilePath(actor.accountName)} className="shrink-0 block">
          <StaffRing role={actor.staffRole}>
            {actor.avatarUrl ? (
              <img src={actor.avatarUrl} alt={actor.displayName || actor.accountName} referrerPolicy="no-referrer" className="size-10 rounded-full object-cover" />
            ) : (
              <InitialsAvatar name={(actor.displayName || actor.accountName || '?')} handle={actor.accountName} className="size-10 rounded-full text-[15px]" />
            )}
          </StaffRing>
        </Link>
      </UserHoverCard>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          {actorIsViewer ? (
            <span className="font-semibold text-foreground">{t('feed.you')}</span>
          ) : (
            <UserHoverCard accountName={actor.accountName}>
              <Link to={profilePath(actor.accountName)} className="font-semibold text-foreground hover:text-primary-ink transition-colors">
                {actor.displayName || actor.accountName}
              </Link>
            </UserHoverCard>
          )}
          {' '}
          <span className="text-subtle">{actionText}</span>
          {isUserFollow && !followsViewer && (projectTitle || targetName) && (
            <>
              {' '}
              {targetLink ? (
                <Link to={targetLink} className="font-semibold text-foreground hover:text-primary-ink transition-colors">
                  {targetName || projectTitle}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">{targetName || projectTitle}</span>
              )}
            </>
          )}
          {isProjectTarget && target && (
            <>
              {' '}
              {targetIsViewer ? (
                <span className="text-subtle">{t(actorIsViewer ? 'feed.target.ownMine' : 'feed.target.mine')}</span>
              ) : targetIsActor ? (
                <span className="text-subtle">{t('feed.target.own')}</span>
              ) : (
                <span className="text-subtle">
                  {t('feed.target.ofPrefix')}
                  <Link to={profilePath(target.accountName)} className="font-semibold text-foreground hover:text-primary-ink transition-colors">{targetName}</Link>
                  {t('feed.target.ofSuffix')}
                </span>
              )}
            </>
          )}
        </p>

        {!isUserFollow && targetLink && (
          <Link to={targetLink} className="group mt-3 flex items-center gap-3 rounded-[var(--radius-control)] bg-background/60 p-2.5 inset-ring inset-ring-transparent transition-shadow hover:inset-ring-hl">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[calc(var(--radius)*0.8)] bg-primary-soft">
              {coverImage
                ? <img src={coverImage} alt="" className="size-full object-cover" />
                : <Icon name={type === 'PLAYLIST_CREATED' ? 'queue_music' : 'music_note'} size={24} className="text-primary-ink/70" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground group-hover:text-primary-ink transition-colors">
              {projectTitle || t('feed.untitled')}
            </span>
            {type !== 'PLAYLIST_CREATED' && (
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <Icon name="play_arrow" size={18} filled />
              </span>
            )}
          </Link>
        )}

        {/* A share's note is the sharer's own words: plain text, escaped by React. */}
        {description && (
          <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap break-words">{description}</p>
        )}
        {tags && tags.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={t('projectView.shareTagsLabel')}>
            {tags.map((tag) => (
              <li key={tag} className="rounded-pill bg-primary-soft px-2 py-0.5 text-xs text-primary-ink">#{tag}</li>
            ))}
          </ul>
        )}

        {isUserFollow && !followsViewer && coverImage && targetLink && (
          <Link to={targetLink} className="mt-1.5 flex items-center gap-2 group">
            <img src={coverImage} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          </Link>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs text-subtle">
            <span className="inline-flex h-[22px] items-center gap-1 rounded-[calc(var(--radius)*0.8)] bg-hl px-2 text-[11px] font-semibold">
              <Icon name={iconName} size={12} />
              {t(followsViewer ? 'feed.type.followedYou' : (`feed.type.${i18nKey}` as 'feed.type.project_published'))}
            </span>
            <time dateTime={createdAt}>{relativeTime(createdAt, t)}</time>
          </p>
          {canReact && <ActivityReactions publicId={publicId!} />}
          {followsViewer && !actorIsViewer && actor.accountName !== '[deleted]' && <FollowBack actor={actor} />}
        </div>
      </div>
    </article>
  );
}
