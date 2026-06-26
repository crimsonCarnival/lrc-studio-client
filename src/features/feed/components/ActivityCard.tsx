import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Star, GitFork, Globe, Repeat2, ListMusic, UserPlus } from 'lucide-react';
import { useIntersectionLoader } from '../hooks/useIntersectionLoader';
import { ReactionBar } from '@features/reactions/components/ReactionBar';
import { useCardReactions } from '@features/reactions/hooks/useCardReactions';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { UserHoverCard } from '@ui/UserHoverCard';

const TYPE_ICONS: Record<string, typeof Star> = {
  PROJECT_PUBLISHED: Globe,
  PROJECT_STARRED:   Star,
  PROJECT_FORKED:    GitFork,
  PROJECT_BOOSTED:   Repeat2,
  PLAYLIST_CREATED:  ListMusic,
  USER_FOLLOWED:     UserPlus,
};

const TYPE_I18N_KEY: Record<string, string> = {
  PROJECT_PUBLISHED: 'project_published',
  PROJECT_STARRED:   'project_starred',
  PROJECT_FORKED:    'project_forked',
  PROJECT_BOOSTED:   'project_boosted',
  PLAYLIST_CREATED:  'playlist_created',
  USER_FOLLOWED:     'user_followed',
};

// Project-type activities that support reactions
const REACTABLE_TYPES = new Set(['PROJECT_PUBLISHED', 'PROJECT_STARRED', 'PROJECT_FORKED', 'PROJECT_BOOSTED']);

interface Activity {
  id: string;
  actor: { accountName: string; avatarUrl?: string | null; displayName?: string | null };
  type: string;
  publicId?: string | null;
  projectTitle?: string | null;
  coverImage?: string | null;
  targetPath?: string | null;
  createdAt: string;
}

function pick(arr: unknown, seed: string): string {
  if (!Array.isArray(arr)) return arr as string;
  const hash = [...String(seed)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return arr[hash % arr.length];
}

function relativeTime(isoString: string, t: TFunction): string {
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return t('library.justNow');
  if (mins  < 60) return t('library.minutesAgo', { count: mins });
  if (hours < 24) return t('library.hoursAgo',   { count: hours });
  return t('library.daysAgo', { count: days });
}

function ActivityReactions({ publicId }: { publicId: string }) {
  const { user } = useAuthContext();
  const { reactions, myReaction, loaded, load, react } = useCardReactions(publicId);

  return (
    <div
      onMouseEnter={load}
      onFocus={load}
      className="mt-1.5"
    >
      <ReactionBar
        reactions={loaded ? reactions : []}
        myReaction={myReaction}
        onReact={user ? react : undefined}
        disabled={!user}
      />
    </div>
  );
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  const tk = t as (key: string, options?: object) => unknown;
  const { id, actor, type, publicId, projectTitle, coverImage, targetPath, createdAt } = activity;
  const Icon       = TYPE_ICONS[type] ?? Star;
  const i18nKey    = TYPE_I18N_KEY[type] ?? 'project_starred';
  const actionText = pick(tk(`feed.action.${i18nKey}`, { returnObjects: true }), id);

  const targetLink = targetPath || (publicId ? `/project/${publicId}` : null);
  const isUserFollow = type === 'USER_FOLLOWED';
  const canReact = REACTABLE_TYPES.has(type) && !!publicId;

  const cardRef = useRef<HTMLDivElement>(null);
  useIntersectionLoader(cardRef, id, 'activity');

  return (
    <div ref={cardRef} className="flex gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors">
      <UserHoverCard accountName={actor.accountName}>
        <Link to={`/${actor.accountName}`} className="shrink-0 block">
          {actor.avatarUrl ? (
            <img src={actor.avatarUrl} alt={actor.displayName || actor.accountName} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-violet-500/50 flex items-center justify-center text-sm font-bold text-white">
              {(actor.displayName || actor.accountName || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </UserHoverCard>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 leading-snug">
          <UserHoverCard accountName={actor.accountName}>
            <Link to={`/${actor.accountName}`} className="font-semibold text-white hover:text-primary transition-colors">
              {actor.displayName || actor.accountName}
            </Link>
          </UserHoverCard>
          {' '}
          <span className="text-zinc-400">{actionText}</span>
          {isUserFollow && projectTitle && (
            <>
              {' '}
              {targetLink ? (
                <Link to={targetLink} className="font-semibold text-white hover:text-primary transition-colors">
                  {projectTitle}
                </Link>
              ) : (
                <span className="font-semibold text-white">{projectTitle}</span>
              )}
            </>
          )}
        </p>

        {!isUserFollow && targetLink && (
          <Link to={targetLink} className="mt-1.5 flex items-center gap-2 group">
            {coverImage && (
              <img src={coverImage} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
            )}
            <span className="text-sm font-medium text-zinc-200 group-hover:text-primary transition-colors truncate">
              {projectTitle || t('feed.untitled')}
            </span>
          </Link>
        )}

        {isUserFollow && coverImage && targetLink && (
          <Link to={targetLink} className="mt-1.5 flex items-center gap-2 group">
            <img src={coverImage} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          </Link>
        )}

        {canReact && <ActivityReactions publicId={publicId!} />}

        <p className="text-xs text-zinc-500 mt-1.5">
          {relativeTime(createdAt, t)}
        </p>
      </div>

      <Icon className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
    </div>
  );
}
