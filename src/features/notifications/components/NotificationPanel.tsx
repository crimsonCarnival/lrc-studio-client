import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@ui/button';
import { useNotificationsContext } from '../NotificationsContext';
import { NotificationStickySection } from './NotificationStickySection';
import { NotificationItem } from './NotificationItem';
import type { AppNotification } from '@/features/notifications/notifications.types';

const PANEL_CAP = 8;

const SOCIAL_TYPES  = new Set(['star', 'fork', 'follow', 'reaction', 'followed_project', 'wall_comment', 'mention', 'comment_like', 'playlist_saved', 'star_milestone']);
const BADGE_TYPES   = new Set(['badge_awarded']);
const REQUEST_TYPES = new Set(['request_submitted', 'request_reviewed']);
const SYSTEM_TYPES  = new Set(['system', 'admin', 'ban', 'unban', 'password_changed', 'admin_granted', 'xp_changed', 'role_changed', 'streak_warning', 'level_up', 'new_device', 'appeal_result', 'wall_report', 'wall_report_reviewed', 'wall_restricted', 'report', 'report_reviewed']);
const STICKY_TYPES  = new Set(['verify_email', 'set_password']);

function SectionLabel({ label, variant = 'default' }: { label: string; variant?: 'default' | 'action' | 'badge' }) {
  const color =
    variant === 'action' ? 'text-primary-ink' :
    variant === 'badge'  ? 'text-gold-ink' :
    'text-subtle';
  return (
    <p className={`px-2.5 pt-3 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${color}`}>
      {label}
    </p>
  );
}

export function NotificationPanel() {
  const { t } = useTranslation();
  const { notifications, markAllRead } = useNotificationsContext() as unknown as {
    notifications: AppNotification[];
    markAllRead: () => void;
  };

  const sticky  = notifications.filter(n => STICKY_TYPES.has(n.type));
  const badges  = notifications.filter(n => BADGE_TYPES.has(n.type));
  const requests = notifications.filter(n => REQUEST_TYPES.has(n.type));
  const social  = notifications.filter(n => SOCIAL_TYPES.has(n.type));
  const system  = notifications.filter(n => SYSTEM_TYPES.has(n.type));
  const total   = sticky.length + badges.length + requests.length + social.length + system.length;
  const hasAny  = total > 0;

  // Cap each section proportionally — simpler: just slice the rendered list
  let remaining = PANEL_CAP;
  const stickySlice  = sticky.slice(0, remaining); remaining -= stickySlice.length;
  const requestsSlice = requests.slice(0, remaining); remaining -= requestsSlice.length;
  const badgesSlice  = badges.slice(0, remaining);  remaining -= badgesSlice.length;
  const socialSlice  = social.slice(0, remaining);  remaining -= socialSlice.length;
  const systemSlice  = system.slice(0, remaining);

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[18px] bg-background shadow-elevated inset-ring inset-ring-hl">
      <div className="flex items-center justify-between px-[18px] pt-4 pb-2">
        <span className="font-heading text-xl font-bold tracking-[-0.02em] text-foreground">{t('notifications.bell')}</span>
        <Button variant="link" size={null} onClick={markAllRead} className="text-sm">
          {t('notifications.markAllRead')}
        </Button>
      </div>

      <div className="settings-scroll max-h-[560px] overflow-y-auto px-2 pb-2">
        {!hasAny && (
          <p className="px-4 py-8 text-center text-[15px] text-subtle">{t('notifications.empty')}</p>
        )}

        {stickySlice.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionActionRequired')} variant="action" />
            <NotificationStickySection notifications={stickySlice} />
          </>
        )}

        {requestsSlice.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionRequests')} variant="action" />
            {requestsSlice.map(n => <NotificationItem key={n._id} notification={n} />)}
          </>
        )}

        {badgesSlice.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionBadges')} variant="badge" />
            {badgesSlice.map(n => <NotificationItem key={n._id} notification={n} />)}
          </>
        )}

        {socialSlice.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionSocial')} />
            {socialSlice.map(n => <NotificationItem key={n._id} notification={n} />)}
          </>
        )}

        {systemSlice.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionSystem')} />
            {systemSlice.map(n => <NotificationItem key={n._id} notification={n} />)}
          </>
        )}
      </div>

      <Link to="/notifications"
        className="block w-full border-t border-hl px-4 py-3 text-center text-[15px] font-semibold text-primary-ink transition-colors duration-[var(--duration-state)] hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
      >
        {t('notifications.viewAll')}
      </Link>
    </div>
  );
}
