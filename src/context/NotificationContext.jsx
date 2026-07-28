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
import { useSocket } from "@context/SocketContext";

const NotificationContext = createContext(null);

/* ─────────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────────────*/
const API_BASE  = import.meta.env.VITE_API_URL || "https://backend-jd8f.onrender.com/api";
const TOKEN_KEY = "altuvera_admin_token";
const POLL_MS   = 60_000;          // unread-count poll interval
const MAX_FAILS = 3;               // stop polling after N consecutive errors

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────*/
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
    credentials: "include",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
};

/* ─────────────────────────────────────────────────────────────
   PROVIDER
───────────────────────────────────────────────────────────────*/
export function NotificationProvider({ children }) {
  const mountedRef  = useRef(true);
  const pollRef     = useRef(null);
  const failsRef    = useRef(0);          // consecutive fetch failures
  const abortRef    = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [total,         setTotal]         = useState(0);

  /* ── Socket (optional — graceful if SocketContext absent) ── */
  let socketOn  = null;
  let socketOff = null;
  try {
    const ctx = useSocket();
    socketOn  = ctx.on;
    socketOff = ctx.off;
  } catch { /* SocketContext not available */ }

  /* ══════════════════════════════════════════════════════════
     FETCH — list
     GET /api/notifications/admin?page=&limit=
  ══════════════════════════════════════════════════════════*/
  const fetchNotifications = useCallback(async (pageNum = 1) => {
    if (failsRef.current >= MAX_FAILS) return;   // stop hammering
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(
        `${API_BASE}/notifications/admin?page=${pageNum}&limit=20`,
        { signal: abortRef.current.signal },
      );

      // 401/403 → not logged in as admin; stop polling
      if (res.status === 401 || res.status === 403) {
        failsRef.current = MAX_FAILS;
        if (mountedRef.current) {
          setNotifications([]);
          setUnreadCount(0);
        }
        return;
      }

      // 404 → route not registered yet; back off silently
      if (res.status === 404) {
        failsRef.current += 1;
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!mountedRef.current) return;

      failsRef.current = 0;   // reset on success

      const rows = data.data || [];
      setNotifications((prev) =>
        pageNum === 1 ? rows : [...prev, ...rows],
      );
      setUnreadCount(data.unread_count ?? data.unreadCount ?? 0);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.total_pages ?? 1);
      setPage(pageNum);
    } catch (err) {
      if (err.name === "AbortError") return;
      failsRef.current += 1;
      if (mountedRef.current) setError(err.message);
      console.warn("[NotificationContext] fetch error:", err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  /* ══════════════════════════════════════════════════════════
     FETCH — unread count only (lightweight poll)
     GET /api/notifications/admin/unread-count
  ══════════════════════════════════════════════════════════*/
  const fetchUnreadCount = useCallback(async () => {
    if (failsRef.current >= MAX_FAILS) return;
    try {
      const res = await authFetch(
        `${API_BASE}/notifications/admin/unread-count`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (mountedRef.current) {
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* silent */ }
  }, []);

  /* ── Convenience ── */
  const refresh = useCallback(
    () => { failsRef.current = 0; fetchNotifications(1); },
    [fetchNotifications],
  );

  const loadMore = useCallback(() => {
    if (page < totalPages && !loading) fetchNotifications(page + 1);
  }, [fetchNotifications, loading, page, totalPages]);

  /* ══════════════════════════════════════════════════════════
     ACTIONS
  ══════════════════════════════════════════════════════════*/

  /* PATCH /api/notifications/:id/read */
  const markRead = useCallback(async (id) => {
    // Optimistic
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
    } catch (err) {
      console.warn("[NotificationContext] markRead error:", err.message);
    }
  }, []);

  /* PATCH /api/notifications/mark-all-read */
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
    } catch (err) {
      console.warn("[NotificationContext] markAllRead error:", err.message);
    }
  }, []);

  /* DELETE /api/notifications/:id */
  const deleteOne = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((c) => Math.max(0, c - 1));

    try {
      await authFetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[NotificationContext] deleteOne error:", err.message);
    }
  }, []);

  /* DELETE /api/notifications/clear-all */
  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    setTotal(0);

    try {
      await authFetch(`${API_BASE}/notifications/clear-all`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[NotificationContext] clearAll error:", err.message);
    }
  }, []);

  /* POST /api/notifications  — admin broadcast/send */
  const sendNotification = useCallback(
    async (payload) => {
      const res = await authFetch(`${API_BASE}/notifications`, {
        method: "POST",
        body:   JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed (${res.status})`);
      }
      const data = await res.json();
      // Prepend to local list if it's an individual notification
      if (data.data) {
        setNotifications((prev) => [data.data, ...prev]);
        setTotal((c) => c + 1);
      }
      return data;
    },
    [],
  );

  /* POST /api/notifications/:id/reply  — admin replies to user notification */
  const replyToNotification = useCallback(async (id, reply) => {
    if (!reply?.trim()) throw new Error("Reply text required");
    const res = await authFetch(`${API_BASE}/notifications/${id}/reply`, {
      method: "POST",
      body:   JSON.stringify({ reply: reply.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed (${res.status})`);
    }
    const data = await res.json();
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              admin_reply:      data.data?.admin_reply ?? reply.trim(),
              admin_replied_at: data.data?.admin_replied_at ?? new Date().toISOString(),
            }
          : n,
      ),
    );
    return data;
  }, []);

  /* ══════════════════════════════════════════════════════════
     REAL-TIME  — Socket.io events
  ══════════════════════════════════════════════════════════*/
  useEffect(() => {
    if (!socketOn || !socketOff) return;

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

    const onUserReplied = ({ notificationId, replyText }) => {
      if (!mountedRef.current) return;
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, reply_text: replyText } : n,
        ),
      );
    };

    socketOn("notification:new",          onNew);
    socketOn("notification:updated",      onUpdated);
    socketOn("notification:unread-count", onUnreadCount);
    socketOn("notification:user-replied", onUserReplied);

    return () => {
      socketOff("notification:new",          onNew);
      socketOff("notification:updated",      onUpdated);
      socketOff("notification:unread-count", onUnreadCount);
      socketOff("notification:user-replied", onUserReplied);
    };
  }, [socketOn, socketOff]);

  /* ══════════════════════════════════════════════════════════
     LIFECYCLE
  ══════════════════════════════════════════════════════════*/
  useEffect(() => {
    mountedRef.current = true;
    failsRef.current   = 0;

    fetchNotifications(1);
    pollRef.current = setInterval(fetchUnreadCount, POLL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(pollRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchNotifications, fetchUnreadCount]);

  /* ══════════════════════════════════════════════════════════
     DERIVED
  ══════════════════════════════════════════════════════════*/
  const grouped = useMemo(
    () => ({
      all:    notifications,
      unread: notifications.filter((n) => !n.is_read),
      read:   notifications.filter((n) =>  n.is_read),
      booking: notifications.filter(
        (n) => n.type?.startsWith("booking") || n.category === "booking",
      ),
      system: notifications.filter(
        (n) => !n.type?.startsWith("booking") && n.category !== "booking",
      ),
    }),
    [notifications],
  );

  /* ══════════════════════════════════════════════════════════
     CONTEXT VALUE
  ══════════════════════════════════════════════════════════*/
  const value = useMemo(
    () => ({
      /* State */
      notifications,
      grouped,
      unreadCount,
      loading,
      error,
      page,
      totalPages,
      total,
      hasMore: page < totalPages,

      /* Actions */
      fetchNotifications,
      refresh,
      loadMore,
      markRead,
      markAllRead,
      deleteOne,
      clearAll,
      sendNotification,
      replyToNotification,
      fetchUnreadCount,
    }),
    [
      notifications, grouped, unreadCount, loading, error,
      page, totalPages, total,
      fetchNotifications, refresh, loadMore,
      markRead, markAllRead, deleteOne, clearAll,
      sendNotification, replyToNotification, fetchUnreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────
   HOOK
───────────────────────────────────────────────────────────────*/
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used inside <NotificationProvider>",
    );
  }
  return ctx;
}

export default NotificationContext;