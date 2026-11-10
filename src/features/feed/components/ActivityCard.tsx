import { profilePath } from '@/features/profile/profile-path';
import { StaffRing } from '@/shared/ui/StaffRing';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { projectPath } from '@/features/projects/project-path';
import { useIntersectionLoader } from '../hooks/useIntersectionLoader';
import { ReactionBar } from '@features/reactions/components/ReactionBar';
import { useCardReactions } from '@features/reactions/hooks/useCardReactions';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { UserHoverCard } from '@ui/UserHoverCard';

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

type ActivityUser = { accountName: string; avatarUrl?: string | null; staffRole?: string | null; displayName?: string | null };

interface Activity {
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

function relativeTime(isoString: string, t: TFunction): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return t('library.justNow');
  if (mins < 60) return t('library.minutesAgo', { count: mins });
  if (hours < 24) return t('library.hoursAgo', { count: hours });
  return t('library.daysAgo', { count: days });
}

function ActivityReactions({ publicId }: { publicId: string }) {
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
    <div ref={wrapRef} className="mt-1.5">
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

  const cardRef = useRef<HTMLDivElement>(null);
  useIntersectionLoader(cardRef, id, 'activity');

  return (
    <div ref={cardRef} className="flex gap-3 rounded-[var(--radius-card)] bg-background p-4 inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint">
      <UserHoverCard accountName={actor.accountName}>
        <Link to={profilePath(actor.accountName)} className="shrink-0 block">
          <StaffRing role={actor.staffRole}>
            {actor.avatarUrl ? (
              <img src={actor.avatarUrl} alt={actor.displayName || actor.accountName} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <InitialsAvatar name={(actor.displayName || actor.accountName || '?')} handle={actor.accountName} className="w-9 h-9 rounded-full text-sm" />
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
          <Link to={targetLink} className="mt-1.5 flex items-center gap-2 group">
            {coverImage && (
              <img src={coverImage} alt="" className="w-8 h-8 rounded-xs object-cover shrink-0" />
            )}
            <span className="text-sm font-medium text-foreground group-hover:text-primary-ink transition-colors truncate">
              {projectTitle || t('feed.untitled')}
            </span>
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

        {canReact && <ActivityReactions publicId={publicId!} />}

        <p className="text-xs text-subtle mt-1.5">
          {relativeTime(createdAt, t)}
        </p>
      </div>

      <Icon name={iconName} size={16} className="text-faint shrink-0 mt-0.5" />
    </div>
  );
}
