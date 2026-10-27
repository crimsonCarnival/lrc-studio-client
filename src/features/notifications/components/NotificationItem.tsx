import { profilePath, listPath } from '@/features/profile/profile-path';
import type { TFunction } from 'i18next';
import { useTranslation, Trans } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useNavigate } from 'react-router-dom';
import { LazyImage } from '@ui/LazyImage';
import { Button } from '@ui/button';
import { useNotificationsContext } from '../NotificationsContext';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projectPath, projectEditPath } from '@/features/projects/project-path';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '../time-ago';
import { BADGE_REGISTRY } from '@/features/badges/badge-registry';
import { EMOJI_MAP } from '@/features/reactions/components/reaction-constants';
import { UserHoverCard } from '@ui/UserHoverCard';

const REACTION_GLYPHS: Record<string, string> = EMOJI_MAP;

interface NotificationActor {
  accountName?: string;
  avatarUrl?: string;
}

export interface NotificationData {
  _id: string;
  type: string;
  actors?: NotificationActor[];
  actorCount?: number;
  projectTitle?: string;
  body?: string;
  publicId?: string;
  read?: boolean;
  createdAt?: string;
  updatedAt?: string;
  meta?: { delta?: number; before?: number; after?: number; from?: string; to?: string; current?: number; day?: string; forkPublicId?: string; forkOwner?: string; kind?: 'published' | 'updated'; level?: number; count?: number; playlistId?: string; wall?: string; reply?: boolean; commentId?: string; approved?: boolean } | null;
}

const TYPE_ICON_NAME: Record<string, string> = {
  star: 'star',
  fork: 'call_split',
  follow: 'person_add',
  reaction: 'sentiment_satisfied',
  admin_granted: 'verified_user',
  password_changed: 'lock',
  set_password: 'key',
  verify_email: 'key',
  ban: 'block',
  badge_awarded: 'military_tech',
  request_submitted: 'inbox',
  request_reviewed: 'done_all',
  xp_changed: 'bolt',
  role_changed: 'manage_accounts',
  unban: 'undo',
  streak_warning: 'local_fire_department',
  followed_project: 'queue_music',
  wall_comment: 'forum',
  mention: 'alternate_email',
  level_up: 'trending_up',
  playlist_saved: 'bookmark',
  star_milestone: 'star',
  new_device: 'devices',
  appeal_result: 'gavel',
};

/**
 * Where a notification row navigates to.
 *
 * `recipientAccountName` is the signed-in user's account name. Every
 * project-bearing notification type is addressed to the project's owner
 * (star/fork/reaction are sent to the owner; streak_warning points at the
 * recipient's own most recently edited project), so the recipient IS the owner
 * and supplies the account name the owner-scoped URL needs. Without it there is
 * no canonical URL, and the row is left non-navigable rather than pointing at a
 * path that would 404. No slug is available here; `publicId` alone resolves.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function notificationDestination(
  notification: NotificationData,
  recipientAccountName?: string | null,
): string | null {
  const { type, actors, publicId } = notification;
  // A fork opens the fork itself, which belongs to the forker. Older notifications carry no
  // fork id and still open the source project.
  if (type === 'fork' && notification.meta?.forkPublicId && notification.meta.forkOwner) {
    return projectPath({ publicId: notification.meta.forkPublicId }, notification.meta.forkOwner);
  }
  if ((type === 'star' || type === 'fork' || type === 'reaction') && publicId) {
    return projectPath({ publicId }, recipientAccountName);
  }
  if (type === 'follow' && actors?.[0]?.accountName) return profilePath(actors[0].accountName);
  if (type === 'admin_granted' || type === 'role_changed') return '/admin';
  if (type === 'xp_changed') return '/settings/profile';
  if (type === 'password_changed' || type === 'set_password') return '/settings/security';
  if (type === 'verify_email') return '/settings/profile';
  if (type === 'badge_awarded') return '/settings/badges';
  // The author is the project's owner, so the actor supplies the account name the URL needs.
  if (type === 'followed_project' && publicId && actors?.[0]?.accountName) return projectPath({ publicId }, actors[0].accountName);
  // Straight to the comment when the notification knows it (older ones only know the wall).
  if ((type === 'wall_comment' || type === 'mention') && notification.meta?.wall) {
    return `${profilePath(notification.meta.wall)}#${notification.meta.commentId ? `comment-${notification.meta.commentId}` : 'wall'}`;
  }
  if (type === 'level_up' && recipientAccountName) return profilePath(recipientAccountName);
  if (type === 'playlist_saved' && notification.meta?.playlistId && recipientAccountName) return listPath(recipientAccountName, notification.meta.playlistId);
  if (type === 'star_milestone' && publicId) return projectPath({ publicId }, recipientAccountName);
  if (type === 'new_device') return '/settings/security';
  if (type === 'request_submitted' || type === 'request_reviewed') return '/admin/requests';
  // "Continue working": the user's most recently updated project, else home.
  if (type === 'streak_warning') return (publicId && projectEditPath({ publicId }, recipientAccountName)) || '/home';
  return null;
}

export function NotificationText({ notification, t }: { notification: NotificationData; t: TFunction }) {
  // badge label keys are composed from a registry; bypass strict key checking.
  const tk = t as (key: string, defaultValue?: string) => string;
  const { type, actors, actorCount, projectTitle, body } = notification;
  const first = actors?.[0];
  const firstName = first?.accountName ?? 'Someone';

  let actorStr;
  if (!actorCount || actorCount <= 1) {
    actorStr = firstName;
  } else if (actorCount === 2) {
    const second = actors?.[actors.length - 2]?.accountName ?? '';
    actorStr = second ? t('notifications.actorAndOne', { name: firstName, other: second }) : t('notifications.actorAndOther', { name: firstName });
  } else if (actorCount === 3) {
    const second = actors?.[actors.length - 2]?.accountName ?? '';
    const third = actors?.[actors.length - 3]?.accountName ?? '';
    actorStr = second && third
      ? t('notifications.actorAndTwo', { name: firstName, second, third })
      : t('notifications.actorAndOthers', { name: firstName, count: 2 });
  } else {
    actorStr = t('notifications.actorAndOthers', { name: firstName, count: actorCount - 1 });
  }

  if (type === 'star') {
    return projectTitle
      ? <span><Trans i18nKey="notifications.starredProject" values={{ actors: actorStr, title: projectTitle }} components={[<strong key="0" />, <strong key="1" />]} /></span>
      : <span><Trans i18nKey="notifications.starred" values={{ actors: actorStr }} components={[<strong key="0" />]} /></span>;
  }
  if (type === 'fork') {
    return projectTitle
      ? <span><Trans i18nKey="notifications.forkedProject" values={{ actors: actorStr, title: projectTitle }} components={[<strong key="0" />, <strong key="1" />]} /></span>
      : <span><Trans i18nKey="notifications.forked" values={{ actors: actorStr }} components={[<strong key="0" />]} /></span>;
  }
  if (type === 'reaction') {
    // The body is a quick-reaction code ('heart') or, for a custom reaction, the emoji itself.
    const emojiChar = (body && (REACTION_GLYPHS[body] ?? body)) || '❤️';
    return projectTitle
      ? <span><Trans i18nKey="notifications.reactedProject" values={{ actors: actorStr, emoji: emojiChar, title: projectTitle }} components={[<strong key="0" />, <strong key="1" />]} /></span>
      : <span><Trans i18nKey="notifications.reacted" values={{ actors: actorStr, emoji: emojiChar }} components={[<strong key="0" />]} /></span>;
  }
  if (type === 'follow') return <span><strong>{actorStr}</strong> {t('notifications.followed')}</span>;
  if (type === 'admin_granted') return <span>{t('notifications.adminGranted')}</span>;
  if (type === 'ban') return <span>{t('notifications.banned')}</span>;
  if (type === 'unban') return <span>{t('notifications.unbanned')}</span>;
  if (type === 'xp_changed') {
    const delta = notification.meta?.delta ?? 0;
    const signed = `${delta >= 0 ? '+' : ''}${delta}`;
    return (
      <span>
        <Trans
          i18nKey={delta >= 0 ? 'notifications.xpGranted' : 'notifications.xpRevoked'}
          values={{ amount: signed, before: notification.meta?.before ?? 0, after: notification.meta?.after ?? 0 }}
          components={[<strong key="0" />, <strong key="1" />]}
        />
      </span>
    );
  }
  if (type === 'role_changed') {
    return (
      <span>
        <Trans
          i18nKey="notifications.roleChanged"
          values={{ from: notification.meta?.from ?? '?', to: notification.meta?.to ?? '?' }}
          components={[<strong key="0" />, <strong key="1" />]}
        />
      </span>
    );
  }
  if (type === 'password_changed') return <span>{t('notifications.passwordChanged')}</span>;
  if (type === 'streak_warning') {
    return (
      <span>
        <Trans
          i18nKey={projectTitle ? 'notifications.streakWarningProject' : 'notifications.streakWarning'}
          count={notification.meta?.current ?? 0}
          values={{ title: projectTitle ?? '' }}
          components={[<strong key="0" />, <strong key="1" />]}
        />
      </span>
    );
  }
  if (type === 'followed_project') {
    return (
      <span>
        <Trans
          i18nKey={notification.meta?.kind === 'updated' ? 'notifications.followedUpdated' : 'notifications.followedPublished'}
          values={{ actors: actorStr, title: projectTitle ?? '' }}
          components={[<strong key="0" />, <strong key="1" />]}
        />
      </span>
    );
  }
  if (type === 'wall_comment') {
    return (
      <span>
        <Trans
          i18nKey={notification.meta?.reply ? 'notifications.wallReply' : 'notifications.wallComment'}
          values={{ actors: actorStr, wall: notification.meta?.wall ?? '' }}
          components={[<strong key="0" />, <strong key="1" />]}
        />
      </span>
    );
  }
  if (type === 'mention') {
    return (
      <span>
        <Trans
          i18nKey="notifications.mention"
          values={{ actors: actorStr, wall: notification.meta?.wall ?? '' }}
          components={[<strong key="0" />, <strong key="1" />]}
        />
      </span>
    );
  }
  if (type === 'level_up') {
    return <span><Trans i18nKey="notifications.levelUp" values={{ level: notification.meta?.level ?? 0 }} components={[<strong key="0" />]} /></span>;
  }
  if (type === 'playlist_saved') {
    return <span><Trans i18nKey="notifications.playlistSaved" values={{ actors: actorStr, title: projectTitle ?? '' }} components={[<strong key="0" />, <strong key="1" />]} /></span>;
  }
  if (type === 'star_milestone') {
    return <span><Trans i18nKey="notifications.starMilestone" values={{ count: notification.meta?.count ?? 0, title: projectTitle ?? '' }} components={[<strong key="0" />, <strong key="1" />]} /></span>;
  }
  if (type === 'new_device') return <span>{t('notifications.newDevice')}</span>;
  if (type === 'appeal_result') return <span>{t('notifications.appealRejected')}</span>;
  if (type === 'badge_awarded') {
    const def = body ? BADGE_REGISTRY[body] : null;
    const label = def ? tk(`badges.${body}.label`, def.label) : (body ?? '');
    return <span>{t('notifications.badgeUnlocked')} <strong>{label}</strong></span>;
  }
  if (type === 'request_submitted') return <span><strong>{t('notifications.requestSubmitted')}</strong> {body}</span>;
  if (type === 'request_reviewed') return <span><strong>{t('notifications.requestReviewed')}</strong> {body}</span>;
  return <span>{body || ''}</span>;
}

export function NotificationAvatar({ notification }: { notification: NotificationData }) {
  const { type, actors } = notification;
  const first = actors?.[0];
  const hasActor = !!first;

  if (hasActor) {
    const avatar = first.avatarUrl
      ? <LazyImage src={first.avatarUrl} alt="" className="size-[34px] rounded-full shrink-0 object-cover" />
      : (
        <div className="grid size-[34px] shrink-0 place-items-center rounded-full bg-primary-soft font-heading text-sm font-bold text-primary-ink">
          {first.accountName?.[0]?.toUpperCase() ?? '?'}
        </div>
      );
    return first.accountName
      ? <UserHoverCard accountName={first.accountName}>{avatar}</UserHoverCard>
      : avatar;
  }

  const iconName = TYPE_ICON_NAME[type];
  if (!iconName) return null;
  const isBadge = type === 'badge_awarded';
  // No person behind it: a square tile, so system and badge notices are told apart from people.
  return (
    <div className={`grid size-[34px] shrink-0 place-items-center rounded-[10px] ${isBadge ? 'bg-gold-soft text-gold-ink' : 'bg-primary-soft text-primary-ink'}`}>
      <Icon name={iconName} size={18} aria-hidden="true" />
    </div>
  );
}

export function NotificationItem({ notification }: { notification: NotificationData }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { markRead, dismiss } = useNotificationsContext();
  const { settings } = useSettings();
  const { user } = useAuthContext();
  const { _id, read, createdAt, updatedAt } = notification;
  const displayTime = updatedAt ?? createdAt;

  const dest = notificationDestination(notification, user?.accountName);

  const handleClick = () => {
    if (!read) markRead([_id]);
    if (dest) navigate(dest);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      // Read and unread differ by the dot and by how bright the text is, not by a tinted row
      // (redesign sheet 15).
      className="group/notification flex items-start gap-3 rounded-[10px] p-2.5 cursor-pointer transition-colors duration-[var(--duration-state)] hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
    >
      <NotificationAvatar notification={notification} />
      <div className="flex-1 min-w-0">
        <p className={`text-base leading-snug ${read ? 'text-subtle' : 'text-foreground'}`}>
          <NotificationText notification={notification} t={t} />
        </p>
        {displayTime && (
          <p className="mt-0.5 font-mono text-xs text-subtle">{formatTimeAgo(displayTime, t, settings.advanced?.timezone, i18n.resolvedLanguage || i18n.language)}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 self-center">
        {!read && <span className="size-2 rounded-full bg-iris" aria-hidden="true" />}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); dismiss(_id); }}
          aria-label={t('notifications.dismiss')}
        >
          <Icon name="close" size={14} />
        </Button>
      </div>
    </div>
  );
}
