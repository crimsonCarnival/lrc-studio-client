import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotificationsContext } from '../NotificationsContext';
import { NotificationStickySection } from './NotificationStickySection';
import { NotificationItem } from './NotificationItem';

interface AppNotification {
  _id: string;
  type: string;
  createdAt?: string;
  [key: string]: unknown;
}

const PANEL_CAP = 8;

const SOCIAL_TYPES  = new Set(['star', 'fork', 'follow', 'reaction']);
const BADGE_TYPES   = new Set(['badge_awarded']);
const SYSTEM_TYPES  = new Set(['system', 'admin', 'ban', 'password_changed', 'admin_granted']);
const STICKY_TYPES  = new Set(['verify_email', 'set_password']);

function SectionLabel({ label, variant = 'default' }: { label: string; variant?: 'default' | 'action' | 'badge' }) {
  const color =
    variant === 'action' ? 'text-primary' :
    variant === 'badge'  ? 'text-amber-400' :
    'text-zinc-500';
  return (
    <p className={`px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest ${color}`}>
      {label}
    </p>
  );
}

export function NotificationPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, markAllRead } = useNotificationsContext() as unknown as {
    notifications: AppNotification[];
    markAllRead: () => void;
  };

  const sticky  = notifications.filter(n => STICKY_TYPES.has(n.type));
  const badges  = notifications.filter(n => BADGE_TYPES.has(n.type));
  const social  = notifications.filter(n => SOCIAL_TYPES.has(n.type));
  const system  = notifications.filter(n => SYSTEM_TYPES.has(n.type));
  const total   = sticky.length + badges.length + social.length + system.length;
  const hasAny  = total > 0;

  // Cap each section proportionally — simpler: just slice the rendered list
  let remaining = PANEL_CAP;
  const stickySlice  = sticky.slice(0, remaining); remaining -= stickySlice.length;
  const badgesSlice  = badges.slice(0, remaining);  remaining -= badgesSlice.length;
  const socialSlice  = social.slice(0, remaining);  remaining -= socialSlice.length;
  const systemSlice  = system.slice(0, remaining);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-zinc-800/60 bg-zinc-900 shadow-2xl z-50">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-100">{t('notifications.bell')}</span>
        <button
          onClick={markAllRead}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {t('notifications.markAllRead')}
        </button>
      </div>

      <div className="max-h-[560px] overflow-y-auto">
        {!hasAny && (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">{t('notifications.empty')}</p>
        )}

        {stickySlice.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionActionRequired')} variant="action" />
            <NotificationStickySection notifications={stickySlice} />
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

      <button
        onClick={() => navigate('/notifications')}
        className="w-full px-4 py-2.5 border-t border-zinc-800/60 text-xs font-medium text-primary hover:text-primary/80 hover:bg-zinc-800/40 transition-colors text-center rounded-b-xl"
      >
        {t('notifications.viewAll')}
      </button>
    </div>
  );
}
