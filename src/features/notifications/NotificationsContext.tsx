import { createContext, use, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { request } from '@/app/api.client';
import { getSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { BADGE_REGISTRY } from '@/features/badges/badge-registry';

interface AppNotification {
  _id: string;
  read?: boolean;
  [key: string]: unknown;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;
    request('/notifications')
      .then(raw => {
        const data = raw as { notifications?: AppNotification[]; unreadCount?: number };
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
      setUnreadCount(0);
      fetchedRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    function onPush(notification: AppNotification) {
      setNotifications(prev => {
        const idx = prev.findIndex(n => n._id === notification._id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = notification;
          return next;
        }
        return [notification, ...prev];
      });
      if (!notification.read) setUnreadCount(c => c + 1);
    }

    function onDismissed({ id }: { id: string }) {
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    }

    function onBadgeAwarded({ badgeId }: { badgeId: string }) {
      const def = (BADGE_REGISTRY as Record<string, { label?: string } | undefined>)[badgeId];
      const label = def?.label ?? badgeId;
      toast(
        (item) => (
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => toast.dismiss(item.id)}
          >
            <div>
              <p className="text-xs font-bold text-foreground leading-tight">{t('notifications.badgeUnlocked')}</p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '1rem',
            padding: '12px 16px',
            color: 'var(--card-foreground)',
          },
        }
      );
    }

    socket.on('notification:push', onPush);
    socket.on('notification:dismissed', onDismissed);
    socket.on('badge:awarded', onBadgeAwarded);
    return () => {
      socket.off('notification:push', onPush);
      socket.off('notification:dismissed', onDismissed);
      socket.off('badge:awarded', onBadgeAwarded);
    };
  }, [user, t]);

  const markRead = useCallback((ids: string[]) => {
    setNotifications(prev => {
      const unreadInBatch = prev.filter(n => ids.includes(n._id) && !n.read).length;
      if (unreadInBatch > 0) setUnreadCount(c => Math.max(0, c - unreadInBatch));
      return prev.map(n => ids.includes(n._id) ? { ...n, read: true } : n);
    });
    request('/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    request('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => {
      const target = prev.find(n => n._id === id);
      if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n._id !== id);
    });
    request(`/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  }, []);

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
  }), [notifications, unreadCount, markRead, markAllRead, dismiss]);

  return (
    <NotificationsContext value={value}>
      {children}
    </NotificationsContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotificationsContext(): NotificationsContextValue {
  const ctx = use(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used inside NotificationsProvider');
  return ctx;
}
