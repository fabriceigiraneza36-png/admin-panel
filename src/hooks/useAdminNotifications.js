// src/hooks/useAdminNotifications.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../context/SocketContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const NOTIF_TYPES = {
  booking_new:              { icon: '📋', color: '#059669', bg: '#ecfdf5', label: 'New Booking'      },
  booking_confirmed:        { icon: '✅', color: '#0891b2', bg: '#f0f9ff', label: 'Confirmed'         },
  booking_cancelled:        { icon: '❌', color: '#dc2626', bg: '#fef2f2', label: 'Cancelled'         },
  payment_received:         { icon: '💰', color: '#d97706', bg: '#fffbeb', label: 'Payment'           },
  payment_confirmed:        { icon: '💳', color: '#059669', bg: '#ecfdf5', label: 'Payment Confirmed' },
  payment_request:          { icon: '💰', color: '#d97706', bg: '#fffbeb', label: 'Payment Request'   },
  user_registered:          { icon: '👤', color: '#7c3aed', bg: '#faf5ff', label: 'New User'          },
  contact_message:          { icon: '💬', color: '#0891b2', bg: '#f0f9ff', label: 'Message'           },
  review_posted:            { icon: '⭐', color: '#d97706', bg: '#fffbeb', label: 'Review'            },
  checklist_request:        { icon: '📝', color: '#059669', bg: '#ecfdf5', label: 'Checklist'         },
  admin_checklist_request:  { icon: '📋', color: '#7c3aed', bg: '#faf5ff', label: 'Checklist Req'    },
  checklist_ready:          { icon: '✅', color: '#059669', bg: '#ecfdf5', label: 'Checklist Ready'   },
  system:                   { icon: '🔧', color: '#64748b', bg: '#f8fafc', label: 'System'            },
  general:                  { icon: '💬', color: '#059669', bg: '#ecfdf5', label: 'General'           },
};

function getToken() {
  return (
    localStorage.getItem('adminToken')      ||
    localStorage.getItem('token')           ||
    sessionStorage.getItem('adminToken')    ||
    ''
  );
}

export function useAdminNotifications() {
  const [notifications,  setNotifications]  = useState([]);
  const [unreadCount,    setUnreadCount]     = useState(0);
  const [loading,        setLoading]         = useState(true);
  const [connected,      setConnected]       = useState(false);
  const [targetGroups,   setTargetGroups]    = useState([]);
  const [awaitingReply,  setAwaitingReply]   = useState([]);
  const [stats,          setStats]           = useState({});

  const pollRef    = useRef(null);
  const mountedRef = useRef(true);

  const { socket, isConnected: socketConnected } = useSocketContext?.() || {};

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [notifRes, statsRes, groupsRes] = await Promise.all([
        fetch(`${API_BASE}/notifications/admin?limit=50`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_BASE}/notifications/admin/stats`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_BASE}/notifications/admin/target-groups`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      if (!notifRes.ok) throw new Error(`HTTP ${notifRes.status}`);
      const notifJson  = await notifRes.json();
      const statsJson  = statsRes.ok  ? await statsRes.json()  : { data: {} };
      const groupsJson = groupsRes.ok ? await groupsRes.json() : { groups: [] };

      if (!mountedRef.current) return;

      const list = notifJson.data || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.is_read).length);
      setStats(statsJson.data || {});
      setTargetGroups(groupsJson.groups || []);
      setAwaitingReply(list.filter(n => n.reply_text && !n.admin_reply));
      setConnected(true);
    } catch (err) {
      console.warn('[useAdminNotifications] fetch error:', err.message);
      if (mountedRef.current) setConnected(false);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ── Socket listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onNew = (notif) => {
      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      if (!notif.is_read) setUnreadCount(c => c + 1);

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const meta = NOTIF_TYPES[notif.type] || NOTIF_TYPES.system;
        new Notification(`${meta.icon} ${notif.title}`, {
          body: notif.message, icon: '/logo.png',
          tag: `admin-notif-${notif.id}`,
        });
      }
    };

    const onUpdated = (notif) => {
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, ...notif } : n),
      );
    };

    const onUserReplied = ({ notificationId, userId, replyText, userName }) => {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, reply_text: replyText, replyText, replierName: userName }
            : n,
        ),
      );
      setAwaitingReply(prev => {
        const exists = prev.some(n => n.id === notificationId);
        if (exists) return prev;
        return [...prev, { id: notificationId, reply_text: replyText }];
      });
    };

    const onBroadcastSent = ({ count, title, targetGroup }) => {
      console.log(`[AdminNotifications] Broadcast sent: ${count} users — "${title}" (${targetGroup})`);
      fetchNotifications(true);
    };

    socket.on('notification:new',            onNew);
    socket.on('notification:updated',        onUpdated);
    socket.on('notification:user-replied',   onUserReplied);
    socket.on('notification:broadcast-sent', onBroadcastSent);

    return () => {
      socket.off('notification:new',            onNew);
      socket.off('notification:updated',        onUpdated);
      socket.off('notification:user-replied',   onUserReplied);
      socket.off('notification:broadcast-sent', onBroadcastSent);
    };
  }, [socket, fetchNotifications]);

  // ── Polling ───────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    fetchNotifications();
    pollRef.current = setInterval(() => fetchNotifications(true), 30_000);

    return () => {
      mountedRef.current = false;
      clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* optimistic */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* optimistic */ }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    setNotifications(prev => {
      const item = prev.find(n => n.id === id);
      if (item && !item.is_read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== id);
    });
    try {
      await fetch(`${API_BASE}/notifications/${id}/admin`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* optimistic */ }
  }, []);

  /**
   * Send admin reply to a user's notification reply
   */
  const sendAdminReply = useCallback(async (notifId, adminReply) => {
    const res = await fetch(`${API_BASE}/notifications/${notifId}/admin-reply`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminReply }),
    });
    if (!res.ok) throw new Error('Failed to send reply');
    const data = await res.json();
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, admin_reply: adminReply } : n),
    );
    setAwaitingReply(prev => prev.filter(n => n.id !== notifId));
    return data;
  }, []);

  /**
   * Broadcast / send notification with targeting
   */
  const sendNotification = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/notifications`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to send notification');
    }
    const data = await res.json();
    fetchNotifications(true);
    return data;
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    connected: connected || socketConnected,
    NOTIF_TYPES,
    targetGroups,
    awaitingReply,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendAdminReply,
    sendNotification,
    refresh: fetchNotifications,
  };
}

export default useAdminNotifications;