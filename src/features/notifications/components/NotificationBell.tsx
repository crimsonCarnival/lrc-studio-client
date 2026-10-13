import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { useTranslation } from 'react-i18next';
import { useNotificationsContext } from '../NotificationsContext';
import { NotificationPanel } from './NotificationPanel';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { CountDot } from '@ui/count-dot';

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

  return (
    <div ref={containerRef} className="relative">
      <Tip content={t('notifications.bell')} side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={unreadCount > 0 ? t('notifications.bellUnread', { count: unreadCount }) : t('notifications.bell')}
          className="relative size-10 lg:size-10 coarse:size-11"
        >
          <Icon name="notifications" size={20} />
          <CountDot count={unreadCount} />
        </Button>
      </Tip>
      {open && <NotificationPanel />}
    </div>
  );
}
