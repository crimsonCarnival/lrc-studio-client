import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotificationsContext } from '../NotificationsContext';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
  const { t } = useTranslation();
  const { unreadCount } = useNotificationsContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('notifications.bell')}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white leading-none">
            {displayCount}
          </span>
        )}
      </button>
      {open && <NotificationPanel />}
    </div>
  );
}
