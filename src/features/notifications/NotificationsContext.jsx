import { createContext, use, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { request } from '@/app/api.client';
import { getSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { BADGE_REGISTRY } from '@/features/badges/badge-registry';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;
    request('/notifications')
      .then(data => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      fetchedRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    function onPush(notification) {
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

    function onDismissed({ id }) {
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    }

    function onBadgeAwarded({ badgeId }) {
      const def = BADGE_REGISTRY[badgeId];
      const icon = def?.icon ?? '🏅';
      const label = def?.label ?? badgeId;
      toast(
        (t) => (
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => toast.dismiss(t.id)}
          >
            <span className="text-2xl leading-none">{icon}</span>
            <div>
              <p className="text-xs font-bold text-zinc-100 leading-tight">Badge unlocked!</p>
              <p className="text-xs text-zinc-400 leading-tight">{label}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          style: {
            background: 'rgb(24 24 27)',
            border: '1px solid rgb(63 63 70 / 0.8)',
            borderRadius: '1rem',
            padding: '12px 16px',
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
  }, [user]);

  const markRead = useCallback((ids) => {
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

  const dismiss = useCallback((id) => {
    setNotifications(prev => {
      const target = prev.find(n => n._id === id);
      if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n._id !== id);
    });
    request(`/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  }, []);

  return (
    <NotificationsContext value={{ notifications, unreadCount, markRead, markAllRead, dismiss }}>
      {children}
    </NotificationsContext>
  );
}

export function useNotificationsContext() {
  const ctx = use(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used inside NotificationsProvider');
  return ctx;
}
