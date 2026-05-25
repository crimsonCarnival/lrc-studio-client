import { useTranslation } from 'react-i18next';
import { useNotificationsContext } from '../NotificationsContext';
import { NotificationStickySection } from './NotificationStickySection';
import { NotificationItem } from './NotificationItem';

const SOCIAL_TYPES = new Set(['star', 'fork']);
const SYSTEM_TYPES = new Set(['system', 'admin', 'ban', 'password_changed']);
const STICKY_TYPES = new Set(['verify_email', 'set_password']);

function SectionLabel({ label }) {
  return (
    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
      {label}
    </p>
  );
}

export function NotificationPanel() {
  const { t } = useTranslation();
  const { notifications, markAllRead } = useNotificationsContext();

  const sticky = notifications.filter(n => STICKY_TYPES.has(n.type));
  const social  = notifications.filter(n => SOCIAL_TYPES.has(n.type));
  const system  = notifications.filter(n => SYSTEM_TYPES.has(n.type));
  const hasAny  = sticky.length + social.length + system.length > 0;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-[#18181b] shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold text-white">{t('notifications.bell')}</span>
        <button
          onClick={markAllRead}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          {t('notifications.markAllRead')}
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {!hasAny && (
          <p className="px-4 py-8 text-center text-sm text-white/30">{t('notifications.empty')}</p>
        )}

        {sticky.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionActionRequired')} />
            <NotificationStickySection notifications={sticky} />
          </>
        )}

        {social.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionSocial')} />
            {social.map(n => <NotificationItem key={n._id} notification={n} />)}
          </>
        )}

        {system.length > 0 && (
          <>
            <SectionLabel label={t('notifications.sectionSystem')} />
            {system.map(n => <NotificationItem key={n._id} notification={n} />)}
          </>
        )}
      </div>
    </div>
  );
}
