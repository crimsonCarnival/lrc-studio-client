import { X, Star, GitFork, UserPlus, ShieldCheck, Lock, KeyRound, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LazyImage } from '@ui/LazyImage';
import { useNotificationsContext } from '../NotificationsContext';
import { formatTimeAgo } from '../timeAgo';

const TYPE_ICON = {
  star: Star,
  fork: GitFork,
  follow: UserPlus,
  admin_granted: ShieldCheck,
  password_changed: Lock,
  set_password: KeyRound,
  verify_email: KeyRound,
  ban: Ban,
};

function notificationDestination(notification) {
  const { type, actors, projectId } = notification;
  if ((type === 'star' || type === 'fork') && projectId) return `/projects/${projectId}`;
  if (type === 'follow' && actors?.[0]?.accountName) return `/profile/${actors[0].accountName}`;
  if (type === 'admin_granted') return '/admin';
  if (type === 'password_changed' || type === 'set_password') return '/settings/security';
  if (type === 'verify_email') return '/settings/profile';
  return null;
}

function NotificationText({ notification, t }) {
  const { type, actors, actorCount, projectTitle, body } = notification;
  const first = actors?.[0];
  const firstName = first?.accountName ?? 'Someone';

  let actorStr;
  if (!actorCount || actorCount <= 1) actorStr = firstName;
  else if (actorCount === 2) actorStr = t('notifications.actorAndOther', { name: firstName });
  else actorStr = t('notifications.actorAndOthers', { name: firstName, count: actorCount - 1 });

  if (type === 'star') {
    return projectTitle
      ? <span><strong>{actorStr}</strong> starred <strong>{projectTitle}</strong></span>
      : <span><strong>{actorStr}</strong> starred your project</span>;
  }
  if (type === 'fork') {
    return projectTitle
      ? <span><strong>{actorStr}</strong> forked <strong>{projectTitle}</strong></span>
      : <span><strong>{actorStr}</strong> forked your project</span>;
  }
  if (type === 'follow') return <span><strong>{actorStr}</strong> {t('notifications.followed')}</span>;
  if (type === 'admin_granted') return <span>{t('notifications.adminGranted')}</span>;
  if (type === 'ban') return <span>{t('notifications.banned')}</span>;
  if (type === 'password_changed') return <span>{t('notifications.passwordChanged')}</span>;
  return <span>{body || ''}</span>;
}

function NotificationAvatar({ notification }) {
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
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">
      <Icon size={14} className="text-primary" aria-hidden="true" />
    </div>
  );
}

export function NotificationItem({ notification }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { markRead, dismiss } = useNotificationsContext();
  const { _id, read, createdAt } = notification;

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
        {createdAt && (
          <p className="text-xs text-zinc-500 mt-1">{formatTimeAgo(createdAt, t)}</p>
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
