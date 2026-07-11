// src/context/NotificationContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext(null);

const API_BASE  = import.meta.env.VITE_API_URL || "https://backend-jd8f.onrender.com/api";
const TOKEN_KEY = "altuvera_admin_token";
const POLL_MS   = 60_000;

const getToken = () => {
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
};

const authFetch = (url, opts = {}) => {
  const token = getToken();
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
};

export function NotificationProvider({ children }) {
  const { on, off }   = useSocket();
  const mountedRef    = useRef(true);
  const pollRef       = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [total,         setTotal]         = useState(0);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE}/notifications/admin?page=${pageNum}&limit=20`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!mountedRef.current) return;

      const rows = data.data || [];
      setNotifications((prev) =>
        pageNum === 1 ? rows : [...prev, ...rows],
      );
      setUnreadCount(data.unread_count ?? 0);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.total_pages ?? 1);
      setPage(pageNum);
    } catch (err) {
      console.warn("[NotificationContext] fetch failed:", err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await authFetch(
        `${API_BASE}/notifications/admin/unread-count`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (mountedRef.current) setUnreadCount(data.count ?? 0);
    } catch { /* silent */ }
  }, []);

  const refresh  = useCallback(() => fetchNotifications(1), [fetchNotifications]);
  const loadMore = useCallback(() => {
    if (page < totalPages && !loading) fetchNotifications(page + 1);
  }, [fetchNotifications, loading, page, totalPages]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await authFetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch { /* optimistic */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    try {
      await authFetch(`${API_BASE}/notifications/mark-all-read`, {
        method: "PATCH",
      });
    } catch { /* optimistic */ }
  }, []);

  const deleteOne = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((c) => Math.max(0, c - 1));
    try {
      await authFetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
      });
    } catch { /* optimistic */ }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    setTotal(0);
    try {
      await authFetch(`${API_BASE}/notifications/clear-all`, {
        method: "DELETE",
      });
    } catch { /* optimistic */ }
  }, []);

  const sendNotification = useCallback(async (payload) => {
    const res = await authFetch(`${API_BASE}/notifications`, {
      method: "POST",
      body:   JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to send notification (${res.status})`);
    const data = await res.json();
    await refresh();
    return data;
  }, [refresh]);

  // ── Real-time socket events ────────────────────────────────────────────────

  useEffect(() => {
    const onNew = (notif) => {
      if (!mountedRef.current) return;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((c) => c + 1);
      setTotal((c) => c + 1);
    };

    const onUpdated = (notif) => {
      if (!mountedRef.current) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, ...notif } : n)),
      );
    };

    const onUnreadCount = ({ count }) => {
      if (mountedRef.current) setUnreadCount(count ?? 0);
    };

    on("notification:new",          onNew);
    on("notification:updated",      onUpdated);
    on("notification:unread-count", onUnreadCount);

    return () => {
      off("notification:new",          onNew);
      off("notification:updated",      onUpdated);
      off("notification:unread-count", onUnreadCount);
    };
  }, [on, off]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications(1);
    pollRef.current = setInterval(fetchUnreadCount, POLL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(pollRef.current);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const grouped = useMemo(() => ({
    all:     notifications,
    unread:  notifications.filter((n) => !n.is_read),
    read:    notifications.filter((n) =>  n.is_read),
    booking: notifications.filter(
      (n) => n.type?.startsWith("booking") || n.category === "booking",
    ),
    system:  notifications.filter(
      (n) => !n.type?.startsWith("booking") && n.category !== "booking",
    ),
  }), [notifications]);

  const value = {
    notifications,
    grouped,
    unreadCount,
    loading,
    page,
    totalPages,
    total,
    hasMore: page < totalPages,
    fetchNotifications,
    refresh,
    loadMore,
    markRead,
    markAllRead,
    deleteOne,
    clearAll,
    sendNotification,
    fetchUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  return ctx;
}

export default NotificationContext;