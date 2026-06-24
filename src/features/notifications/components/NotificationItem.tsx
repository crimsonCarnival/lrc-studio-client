import type { TFunction } from 'i18next';
import { X, Star, GitFork, UserPlus, ShieldCheck, Lock, KeyRound, Ban, Smile, Award, Inbox, CheckCheck, Zap, UserCog, Undo2 } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LazyImage } from '@ui/LazyImage';
import { useNotificationsContext } from '../NotificationsContext';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '../timeAgo';
import { BADGE_REGISTRY } from '@/features/badges/badge-registry';

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
  meta?: { delta?: number; before?: number; after?: number; from?: string; to?: string } | null;
}

const TYPE_ICON: Record<string, typeof Star> = {
  star:             Star,
  fork:             GitFork,
  follow:           UserPlus,
  reaction:         Smile,
  admin_granted:    ShieldCheck,
  password_changed: Lock,
  set_password:     KeyRound,
  verify_email:     KeyRound,
  ban:              Ban,
  badge_awarded:    Award,
  request_submitted: Inbox,
  request_reviewed:  CheckCheck,
  xp_changed:        Zap,
  role_changed:      UserCog,
  unban:             Undo2,
};

// eslint-disable-next-line react-refresh/only-export-components
export function notificationDestination(notification: NotificationData): string | null {
  const { type, actors, publicId } = notification;
  if ((type === 'star' || type === 'fork' || type === 'reaction') && publicId) return `/project/${publicId}`;
  if (type === 'follow' && actors?.[0]?.accountName) return `/${actors[0].accountName}`;
  if (type === 'admin_granted' || type === 'role_changed') return '/admin';
  if (type === 'xp_changed') return '/settings/profile';
  if (type === 'password_changed' || type === 'set_password') return '/settings/security';
  if (type === 'verify_email') return '/settings/profile';
  if (type === 'badge_awarded') return '/settings/profile';
  if (type === 'request_submitted' || type === 'request_reviewed') return '/admin?tab=requests';
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
    const third  = actors?.[actors.length - 3]?.accountName ?? '';
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
    const emojiChar = body || '❤️';
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
    return first.avatarUrl
      ? <LazyImage src={first.avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
      : (
        <div className="w-8 h-8 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-xs text-zinc-400">
          {first.accountName?.[0]?.toUpperCase() ?? '?'}
        </div>
      );
  }

  const Icon = TYPE_ICON[type];
  if (!Icon) return null;
  const isBadge = type === 'badge_awarded';
  return (
    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${isBadge ? 'bg-amber-400/10' : 'bg-primary/10'}`}>
      <Icon size={14} className={isBadge ? 'text-amber-400' : 'text-primary'} aria-hidden="true" />
    </div>
  );
}

export function NotificationItem({ notification }: { notification: NotificationData }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { markRead, dismiss } = useNotificationsContext();
  const { settings } = useSettings();
  const { _id, read, createdAt, updatedAt } = notification;
  const displayTime = updatedAt ?? createdAt;

  const dest = notificationDestination(notification);

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
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors ${!read ? 'bg-zinc-800/30' : ''}`}
    >
      <NotificationAvatar notification={notification} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 leading-snug">
          <NotificationText notification={notification} t={t} />
        </p>
        {displayTime && (
          <p className="text-xs text-zinc-500 mt-1">{formatTimeAgo(displayTime, t, settings.advanced?.timezone, i18n.resolvedLanguage || i18n.language)}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!read && <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(_id); }}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors"
          aria-label={t('notifications.dismiss')}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
