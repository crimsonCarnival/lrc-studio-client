import { createContext, use, useState, useEffect, useCallback, useRef } from 'react';
import { request } from '@/app/api.client';
import { getSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';

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
      setNotifications(prev => prev.filter(n => n._id !== id));
    }

    socket.on('notification:push', onPush);
    socket.on('notification:dismissed', onDismissed);
    return () => {
      socket.off('notification:push', onPush);
      socket.off('notification:dismissed', onDismissed);
    };
  }, [user]);

  const markRead = useCallback((ids) => {
    setNotifications(prev => prev.map(n => ids.includes(n._id) ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - ids.length));
    request('/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    request('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
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
