import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LazyImage } from '@ui/LazyImage';
import { useNotificationsContext } from '../NotificationsContext';

function NotificationText({ notification, t }) {
  const { type, actors, actorCount, projectTitle, body } = notification;
  const first = actors?.[0];
  const firstName = first?.accountName ?? 'Someone';

  let actorStr;
  if (!actorCount || actorCount <= 1) actorStr = firstName;
  else if (actorCount === 2) actorStr = t('notifications.actorAndOther', { name: firstName });
  else actorStr = t('notifications.actorAndOthers', { name: firstName, count: actorCount - 1 });

  const actorNode = first?.accountName ? (
    <Link key="a" to={`/profile/${first.accountName}`} className="font-semibold hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
      {actorStr}
    </Link>
  ) : (
    <strong key="a">{actorStr}</strong>
  );

  if (type === 'star') {
    return projectTitle
      ? <span>{actorNode} starred <strong>{projectTitle}</strong></span>
      : <span>{actorNode} starred your project</span>;
  }
  if (type === 'fork') {
    return projectTitle
      ? <span>{actorNode} forked <strong>{projectTitle}</strong></span>
      : <span>{actorNode} forked your project</span>;
  }
  if (type === 'follow') return <span>{actorNode} {t('notifications.followed')}</span>;
  if (type === 'admin_granted') return <span>{t('notifications.adminGranted')}</span>;
  if (type === 'ban') return <span>{t('notifications.banned')}</span>;
  if (type === 'password_changed') return <span>{t('notifications.passwordChanged')}</span>;
  return <span>{body || ''}</span>;
}

export function NotificationItem({ notification }) {
  const { t } = useTranslation();
  const { markRead, dismiss } = useNotificationsContext();
  const { _id, read, actors, createdAt } = notification;
  const avatarUrl = actors?.[0]?.avatarUrl || null;
  const initial = actors?.[0]?.accountName?.[0]?.toUpperCase() || '?';

  return (
    <div
      onClick={() => { if (!read) markRead([_id]); }}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${!read ? 'bg-white/[0.03]' : ''}`}
    >
      {avatarUrl ? (
        <LazyImage src={avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 mt-0.5 flex items-center justify-center text-xs text-white/40">
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 leading-snug">
          <NotificationText notification={notification} t={t} />
        </p>
        {createdAt && (
          <p className="text-xs text-white/40 mt-1">{new Date(createdAt).toLocaleDateString()}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!read && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(_id); }}
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
          aria-label={t('notifications.dismiss')}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
