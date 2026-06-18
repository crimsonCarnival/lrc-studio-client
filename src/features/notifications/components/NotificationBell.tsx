import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotificationsContext } from '../NotificationsContext';
import { NotificationPanel } from './NotificationPanel';
import { Tip } from '@ui/tip';

export function NotificationBell() {
  const { t } = useTranslation();
  const { unreadCount } = useNotificationsContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div ref={containerRef} className="relative">
      <Tip content={t('notifications.bell')} side="bottom">
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={t('notifications.bell')}
          className="relative p-2 rounded-lg hover:bg-zinc-800/60 transition-colors text-zinc-400 hover:text-zinc-200"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-zinc-950 leading-none">
              {displayCount}
            </span>
          )}
        </button>
      </Tip>
      {open && <NotificationPanel />}
    </div>
  );
}
