// src/hooks/useAdminNotifications.js
// ============================================================
// Real-time admin notification hook with polling + WebSocket support
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const NOTIF_TYPES = {
  booking_new:       { icon: '📋', color: '#059669', bg: '#ecfdf5', label: 'New Booking'      },
  booking_confirmed: { icon: '✅', color: '#0891b2', bg: '#f0f9ff', label: 'Booking Confirmed' },
  booking_cancelled: { icon: '❌', color: '#dc2626', bg: '#fef2f2', label: 'Cancelled'         },
  payment_received:  { icon: '💰', color: '#d97706', bg: '#fffbeb', label: 'Payment'           },
  user_registered:   { icon: '👤', color: '#7c3aed', bg: '#faf5ff', label: 'New User'          },
  contact_message:   { icon: '💬', color: '#0891b2', bg: '#f0f9ff', label: 'Message'           },
  review_posted:     { icon: '⭐', color: '#d97706', bg: '#fffbeb', label: 'Review'            },
  checklist_request: { icon: '📝', color: '#059669', bg: '#ecfdf5', label: 'Checklist Req'    },
  system:            { icon: '🔧', color: '#64748b', bg: '#f8fafc', label: 'System'            },
};

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [connected,     setConnected]     = useState(false);
  const pollRef   = useRef(null);
  const wsRef     = useRef(null);
  const mountedRef = useRef(true);

  // ── Fetch from API ──────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken') ||
                    localStorage.getItem('token') ||
                    sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/notifications?limit=50`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!mountedRef.current) return;
      const list = json.data || json.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.is_read && !n.read_at).length);
      setConnected(true);
    } catch (err) {
      console.warn('[AdminNotifications] Poll error:', err.message);
      if (mountedRef.current) setConnected(false);
      // Inject mock data so UI is never empty during dev
      if (mountedRef.current && notifications.length === 0) {
        injectMockNotifications();
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mock fallback ───────────────────────────────────────────
  const injectMockNotifications = useCallback(() => {
    const now = Date.now();
    setNotifications([
      {
        id: 'mock-1', type: 'booking_new', is_read: false,
        title: 'New booking received',
        message: 'John Doe booked Serengeti Safari for 3 people',
        created_at: new Date(now - 2 * 60000).toISOString(),
        metadata: { booking_id: 'BK-001', amount: 1200 },
      },
      {
        id: 'mock-2', type: 'payment_received', is_read: false,
        title: 'Payment confirmed',
        message: '$1,200 received for Kilimanjaro Climb booking',
        created_at: new Date(now - 15 * 60000).toISOString(),
        metadata: { amount: 1200, currency: 'USD' },
      },
      {
        id: 'mock-3', type: 'user_registered', is_read: false,
        title: 'New user registered',
        message: 'Sarah K. created an account',
        created_at: new Date(now - 35 * 60000).toISOString(),
        metadata: { user_email: 'sarah@example.com' },
      },
      {
        id: 'mock-4', type: 'contact_message', is_read: true,
        title: 'Contact form message',
        message: 'Inquiry about Zanzibar beach packages',
        created_at: new Date(now - 2 * 3600000).toISOString(),
      },
      {
        id: 'mock-5', type: 'review_posted', is_read: true,
        title: 'New review posted',
        message: '5-star review for Nyungwe Forest tour',
        created_at: new Date(now - 5 * 3600000).toISOString(),
      },
    ]);
    setUnreadCount(3);
  }, []);

  // ── Mark single as read ─────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      const token = localStorage.getItem('adminToken') ||
                    localStorage.getItem('token');
      await fetch(`${API_BASE}/admin/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
    } catch { /* silent — optimistic update already applied */ }
  }, []);

  // ── Mark all as read ────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      const token = localStorage.getItem('adminToken') ||
                    localStorage.getItem('token');
      await fetch(`${API_BASE}/admin/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
    } catch { /* silent */ }
  }, []);

  // ── Delete notification ─────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    const prev = notifications.find(n => n.id === id);
    setNotifications(p => p.filter(n => n.id !== id));
    if (prev && !prev.is_read) setUnreadCount(c => Math.max(0, c - 1));
    try {
      const token = localStorage.getItem('adminToken') ||
                    localStorage.getItem('token');
      await fetch(`${API_BASE}/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
    } catch { /* silent */ }
  }, [notifications]);

  // ── Add real-time notification (called from WS) ─────────────
  const addNotification = useCallback((notif) => {
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(c => c + 1);
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const meta = NOTIF_TYPES[notif.type] || NOTIF_TYPES.system;
      new Notification(`${meta.icon} ${notif.title}`, {
        body: notif.message,
        icon: '/logo.png',
        badge: '/badge.png',
        tag: `admin-notif-${notif.id}`,
      });
    }
  }, []);

  // ── WebSocket (optional, graceful fallback) ─────────────────
  const connectWS = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) return;
    try {
      const token = localStorage.getItem('adminToken') ||
                    localStorage.getItem('token');
      const ws = new WebSocket(`${wsUrl}?token=${token}`);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'notification') addNotification(data.payload);
        } catch { /* ignore malformed */ }
      };
      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 5s
        setTimeout(connectWS, 5000);
      };
      ws.onerror = () => { ws.close(); };
    } catch { /* WS not available */ }
  }, [addNotification]);

  // ── Request browser permission ──────────────────────────────
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // ── Lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    requestPermission();
    fetchNotifications();
    connectWS();
    // Poll every 30 seconds
    pollRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(pollRef.current);
      wsRef.current?.close();
    };
  }, [fetchNotifications, connectWS, requestPermission]);

  return {
    notifications,
    unreadCount,
    loading,
    connected,
    NOTIF_TYPES,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    refresh: fetchNotifications,
  };
}