import { createContext, use, useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { request } from '@/app/api.client';
import { getSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { BADGE_REGISTRY } from '@/features/badges/badge-registry';
import { NotificationText, NotificationAvatar, notificationDestination, type NotificationData } from './components/NotificationItem';
import { appNavigate } from '@/app/navigation';

// Push events that warrant an on-screen toast. Sticky/system notifications
// (verify_email, set_password, etc.) arrive on the same channel but should not
// toast — they live only in the panel.
const TOAST_TYPES = new Set(['star', 'fork', 'follow', 'reaction', 'admin_granted', 'ban', 'unban', 'request_submitted', 'request_reviewed', 'xp_changed', 'role_changed', 'badge_awarded']);

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
  // Lets the socket effect's toast call the latest markRead without re-subscribing
  // on every render (markRead is defined below, after this effect).
  const markReadRef = useRef<(ids: string[]) => void>(() => {});
  // Live mirror of the list so handlers can read the current read-state of a
  // notification WITHOUT calling setUnreadCount inside the setNotifications
  // updater. That nesting was the off-by-two bug: React StrictMode double-invokes
  // updater functions, so the nested setUnreadCount fired twice per dismiss.
  const notificationsRef = useRef<AppNotification[]>([]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;
    request('/notifications')
      .then(raw => {
        const data = raw as { notifications?: AppNotification[]; unreadCount?: number };
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(data.unreadCount || 0);

        // Show toasts for unread badge_awarded notifications that were missed
        // because the socket wasn't connected yet (e.g. awarded during registration).
        for (const n of notifs) {
          const notif = n as unknown as NotificationData;
          if (notif.type !== 'badge_awarded' || notif.read || !notif.body) continue;
          const badgeId = notif.body;
          const def = (BADGE_REGISTRY as Record<string, { label?: string } | undefined>)[badgeId];
          const label = def?.label ?? badgeId;
          toast(
            (item) => (
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => toast.dismiss(item.id)}
              >
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">🏅</div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-tight">{t('notifications.badgeUnlocked')}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                </div>
              </div>
            ),
            {
              duration: 6000,
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
      })
      .catch(() => {});
  }, [user, t]);

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

      // Surface social actions (star/fork/follow/reaction) as a transient toast,
      // mirroring the panel row. Without this, real-time pushes only bumped the
      // bell count silently — nothing drew the user's attention.
      const data = notification as unknown as NotificationData;
      if (TOAST_TYPES.has(data.type)) {
        toast(
          (item) => (
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => {
                toast.dismiss(item.id);
                if (!data.read) markReadRef.current([data._id]);
                const dest = notificationDestination(data);
                if (dest) appNavigate(dest);
              }}
            >
              <NotificationAvatar notification={data} />
              <p className="text-xs text-foreground leading-snug min-w-0">
                <NotificationText notification={data} t={t} />
              </p>
            </div>
          ),
          {
            id: `notif:${data._id}`,
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
    }

    function onDismissed({ id }: { id: string }) {
      const target = notificationsRef.current.find(n => n._id === id);
      if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
      setNotifications(prev => prev.filter(n => n._id !== id));
    }

    function onBadgeAwarded({ badgeId }: { badgeId: string }) {
      const def = (BADGE_REGISTRY as Record<string, { label?: string } | undefined>)[badgeId];
      // Localized label (badges.<id>.label), English registry label as fallback.
      const label = t(`badges.${badgeId}.label`, { defaultValue: def?.label ?? badgeId });
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
    const unreadInBatch = notificationsRef.current.filter(n => ids.includes(n._id) && !n.read).length;
    if (unreadInBatch > 0) setUnreadCount(c => Math.max(0, c - unreadInBatch));
    setNotifications(prev => prev.map(n => ids.includes(n._id) ? { ...n, read: true } : n));
    request('/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) }).catch(() => {});
  }, []);
  useLayoutEffect(() => { markReadRef.current = markRead; }, [markRead]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    request('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  const dismiss = useCallback((id: string) => {
    const target = notificationsRef.current.find(n => n._id === id);
    if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
    setNotifications(prev => prev.filter(n => n._id !== id));
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
