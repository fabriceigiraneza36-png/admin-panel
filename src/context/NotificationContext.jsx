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

const isIncomingUserMessageNotification = (notification) => {
  if (!notification) return false;
  const type = String(notification.type || "").toLowerCase();
  const category = String(notification.category || "").toLowerCase();
  const metadata = notification.metadata || {};
  const senderType = String(
    metadata.senderType || metadata.sender_type || notification.senderType || notification.sender_type || ""
  ).toLowerCase();
  const title = String(notification.title || "");
  const message = String(notification.message || "");
  const isMessageNotification =
    type.includes("message") || category.includes("message") ||
    metadata.messageId != null || metadata.message_id != null ||
    /^message-/.test(String(notification.id || ""));
  if (!isMessageNotification) return true;
  if (["admin", "support", "staff", "agent", "system", "guest", "traveller", "traveler", "anonymous"].includes(senderType)) return false;
  if (senderType && !["user", "customer"].includes(senderType)) return false;
  if (/(?:from|by|sent by)\s+(?:the\s+)?(?:admin|support|staff|agent|administrator)\b/i.test(title + " " + message)) return false;
  if (/^(?:support|admin|staff|agent)\s+(?:message|reply|response)\b/i.test(title.trim())) return false;
  return true;
};

const GENERIC_INCOMING_SENDER_NAMES = new Set([
  'super admin', 'admin', 'administrator', 'altuvera support',
  'guest', 'guest user', 'visitor', 'traveler', 'traveller',
  'end user', 'user', 'unknown member', 'deleted user',
])
const firstRealIncomingSenderName = (...names) => {
  for (const name of names) {
    const value = String(name || '').trim()
    const normalized = value.toLowerCase().replace(/\s+/g, ' ')
    if (value && !GENERIC_INCOMING_SENDER_NAMES.has(normalized)) return value
  }
  return ''
}
const safeIncomingSenderName = (...names) => firstRealIncomingSenderName(...names) || 'User'

const normalizeMessageNotification = (row) => {
  if (!row) return row
  const metadata = row.metadata || row.metadata_json || {}
  const isMessage = String(row.type || '').toLowerCase().includes('message')
    || String(row.category || '').toLowerCase().includes('message')
    || String(row.id || '').startsWith('message-')
  if (!isMessage) return row

  const senderUsername = firstRealIncomingSenderName(
    row.senderUsername, row.sender_username, row.username,
    metadata.senderUsername, metadata.sender_username, metadata.username,
    metadata.user?.username, row.user?.username,
  )
  const senderName = safeIncomingSenderName(
    row.senderFullName, row.sender_full_name, row.senderName, row.sender_name,
    metadata.senderFullName, metadata.sender_full_name, metadata.senderName, metadata.sender_name,
    metadata.user?.fullName, metadata.user?.full_name, metadata.user?.name,
    row.user?.fullName, row.user?.full_name, row.user?.name,
    senderUsername,
  )
  const senderAvatar = row.senderAvatar || row.sender_avatar || row.sender_avatar_url
    || metadata.senderAvatar || metadata.sender_avatar || metadata.senderAvatarUrl || metadata.sender_avatar_url
    || metadata.user?.avatarUrl || metadata.user?.avatar_url || metadata.user?.profilePictureUrl
    || metadata.user?.profile_picture_url || row.user?.avatarUrl || row.user?.avatar_url || ''
  let title = String(row.title || ('New message from ' + senderName))
    .replace(/\b(?:end user|guest(?: user)?|travell?er)\b/ig, senderName)
  if (senderUsername && /^new message from /i.test(title)
      && !title.toLowerCase().includes('@' + senderUsername.toLowerCase())) {
    title = title.replace(/^(New message from\s+[^·|]+?)(?=\s*(?:·|$))/i,
      heading => heading.trim() + ' (@' + senderUsername + ')')
  }
  return {
    ...row,
    senderName,
    senderUsername,
    senderAvatar,
    title,
    metadata: {
      ...metadata,
      senderName,
      ...(senderUsername ? { senderUsername } : {}),
      ...(senderAvatar ? { senderAvatar } : {}),
    },
  }
}

const messageIdOf = (notification) => {
  const id = notification?.metadata?.messageId ?? notification?.metadata?.message_id;
  if (id != null) return String(id);
  const ownId = String(notification?.id ?? "");
  return ownId.startsWith("message-") ? ownId.slice("message-".length) : null;
};

const isSameNotification = (left, right) => {
  const leftId = left?.id;
  const rightId = right?.id;
  if (leftId != null && rightId != null && String(leftId) === String(rightId)) return true;
  const leftMessageId = messageIdOf(left);
  const rightMessageId = messageIdOf(right);
  return Boolean(leftMessageId && rightMessageId && leftMessageId === rightMessageId);
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
  const notificationsRef = useRef([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [total,         setTotal]         = useState(0);

  /* ── Socket — always read from the provider unconditionally ── */
  const { on: socketOn, off: socketOff } = useSocket();

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

      const rows = (data.data || [])
        .filter(isIncomingUserMessageNotification)
        .map(normalizeMessageNotification);
      notificationsRef.current = pageNum === 1
        ? rows
        : [...notificationsRef.current, ...rows.filter(row => !notificationsRef.current.some(existing => isSameNotification(existing, row)))];
      setNotifications(notificationsRef.current);
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
    () => {
      failsRef.current = 0;
      return fetchNotifications(1);
    },
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
      if (!mountedRef.current || !notif || !isIncomingUserMessageNotification(notif)) return;
      const normalizedNotif = normalizeMessageNotification(notif)
      const existingIndex = notificationsRef.current.findIndex(existing => isSameNotification(existing, normalizedNotif));
      if (existingIndex >= 0) {
        // A real-time message alert may already have created a temporary inbox row.
        // Replace it with the durable API notification without counting it twice.
        const next = [...notificationsRef.current];
        next[existingIndex] = { ...next[existingIndex], ...normalizedNotif };
        notificationsRef.current = next;
        setNotifications(next);
        return;
      }
      notificationsRef.current = [normalizedNotif, ...notificationsRef.current];
      setNotifications(notificationsRef.current);
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

    const onMessage = (payload = {}) => {
      if (String(payload.senderType || payload.sender_type || "").toLowerCase() !== "user") return;
      const message = payload.message || {};
      if (String(message.senderType || message.sender_type || "").toLowerCase() !== "user") return;
      const conversationId = payload.conversationId || message.conversationId;
      if (!conversationId || !mountedRef.current) return;
      const messageId = message.id || payload.messageId || null;
      const senderUsername = firstRealIncomingSenderName(
        payload.senderUsername, payload.sender_username, payload.username, payload.user?.username,
        message.senderUsername, message.sender_username, message.username, message.user?.username,
        message.metadata?.senderUsername, message.metadata?.sender_username, message.metadata?.username,
        message.metadata?.user?.username,
      );
      const senderName = safeIncomingSenderName(
        payload.senderFullName, payload.sender_full_name, payload.senderName, payload.sender_name,
        payload.user?.fullName, payload.user?.full_name, payload.user?.name,
        message.senderFullName, message.sender_full_name, message.senderName, message.sender_name,
        message.user?.fullName, message.user?.full_name, message.user?.name,
        message.metadata?.senderFullName, message.metadata?.sender_full_name, message.metadata?.senderName,
        message.metadata?.sender_name, message.metadata?.user?.fullName, message.metadata?.user?.full_name,
        senderUsername,
      );
      const senderAvatar =
        payload.senderAvatar || payload.sender_avatar || payload.senderAvatarUrl ||
        payload.sender_avatar_url || payload.user?.avatarUrl || payload.user?.avatar_url ||
        payload.user?.profilePictureUrl || payload.user?.profile_picture_url ||
        message.senderAvatar || message.sender_avatar || message.sender_avatar_url ||
        message.avatarUrl || message.avatar_url || message.profilePictureUrl ||
        message.profile_picture_url || message.user?.avatarUrl || message.user?.avatar_url ||
        message.metadata?.senderAvatar || message.metadata?.sender_avatar ||
        message.metadata?.user?.avatarUrl || message.metadata?.user?.avatar_url || "";
      const conversationLabel = String(
        payload.conversationName || payload.conversation_name || payload.groupName ||
        payload.group_name || message.conversationName || message.conversation_name ||
        message.groupName || message.group_name ||
        ((payload.groupId || payload.group_id || message.groupId || message.group_id) ? "Group conversation" : `Conversation #${conversationId}`)
      ).trim();
      const notification = {
        id: `message-${messageId || conversationId}`,
        type: "message_new",
        category: "message",
        title: 'New message from ' + senderName + (senderUsername ? ' (@' + senderUsername + ')' : '') + ' · ' + conversationLabel,
        message: message.body || "A new conversation message arrived.",
        action_url: `/messages?conversationId=${encodeURIComponent(conversationId)}`,
        senderName,
        senderUsername,
        senderAvatar,
        conversationLabel,
        metadata: {
          conversationId: String(conversationId),
          conversationLabel,
          senderName,
          senderUsername,
          senderAvatar,
          ...(messageId ? { messageId: String(messageId) } : {}),
          senderType: "user",
        },
        is_read: false,
        created_at: new Date().toISOString(),
      };
      if (notificationsRef.current.some(existing => isSameNotification(existing, notification))) return;
      notificationsRef.current = [notification, ...notificationsRef.current];
      setNotifications(notificationsRef.current);
      setUnreadCount((count) => count + 1);
      setTotal((count) => count + 1);
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
    socketOn("msg:new-from-user", onMessage);

    return () => {
      socketOff("notification:new",          onNew);
      socketOff("notification:updated",      onUpdated);
      socketOff("notification:unread-count", onUnreadCount);
      socketOff("notification:user-replied", onUserReplied);
      socketOff("msg:new-from-user", onMessage);
    };
  }, [socketOn, socketOff]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

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