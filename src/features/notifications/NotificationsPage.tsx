import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { useNotificationsContext } from './NotificationsContext';
import { NotificationStickySection } from './components/NotificationStickySection';
import { NotificationItem } from './components/NotificationItem';
import type { AppNotification } from '@/features/notifications/notifications.types';

const SOCIAL_TYPES  = new Set(['star', 'fork', 'follow', 'reaction', 'followed_project', 'wall_comment', 'mention', 'comment_like', 'playlist_saved', 'star_milestone']);
const BADGE_TYPES   = new Set(['badge_awarded', 'xp_changed']);
const SYSTEM_TYPES  = new Set(['system', 'admin', 'ban', 'unban', 'password_changed', 'admin_granted', 'role_changed', 'streak_warning', 'level_up', 'new_device', 'appeal_result']);
const STICKY_TYPES  = new Set(['verify_email', 'set_password']);

function SectionLabel({ label, variant = 'default' }: { label: string; variant?: 'default' | 'action' | 'badge' }) {
  const color =
    variant === 'action' ? 'text-primary' :
    variant === 'badge'  ? 'text-amber-400' :
    'text-zinc-500';
  return (
    <p className={`pt-6 pb-2 text-[10px] font-semibold uppercase tracking-widest ${color}`}>
      {label}
    </p>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, markAllRead } = useNotificationsContext() as unknown as {
    notifications: AppNotification[];
    markAllRead: () => void;
  };

  const sticky = notifications.filter(n => STICKY_TYPES.has(n.type));
  const badges = notifications.filter(n => BADGE_TYPES.has(n.type));
  const social = notifications.filter(n => SOCIAL_TYPES.has(n.type));
  const system = notifications.filter(n => SYSTEM_TYPES.has(n.type));
  const hasAny = sticky.length + badges.length + social.length + system.length > 0;

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-100">{t('notifications.bell')}</h1>
        {hasAny && (
          <Button variant="link" size={null} onClick={markAllRead} className="text-xs">
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {!hasAny && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500">{t('notifications.empty')}</p>
        </div>
      )}

      {sticky.length > 0 && (
        <>
          <SectionLabel label={t('notifications.sectionActionRequired')} variant="action" />
          <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
            <NotificationStickySection notifications={sticky} />
          </div>
        </>
      )}

      {badges.length > 0 && (
        <>
          <SectionLabel label={t('notifications.sectionBadges')} variant="badge" />
          <div className="rounded-xl border border-zinc-800/60 overflow-hidden divide-y divide-zinc-800/40">
            {badges.map(n => <NotificationItem key={n._id} notification={n} />)}
          </div>
        </>
      )}

      {social.length > 0 && (
        <>
          <SectionLabel label={t('notifications.sectionSocial')} />
          <div className="rounded-xl border border-zinc-800/60 overflow-hidden divide-y divide-zinc-800/40">
            {social.map(n => <NotificationItem key={n._id} notification={n} />)}
          </div>
        </>
      )}

      {system.length > 0 && (
        <>
          <SectionLabel label={t('notifications.sectionSystem')} />
          <div className="rounded-xl border border-zinc-800/60 overflow-hidden divide-y divide-zinc-800/40">
            {system.map(n => <NotificationItem key={n._id} notification={n} />)}
          </div>
        </>
      )}
    </div>
    </div>
  );
}
