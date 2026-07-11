// src/api/notifications.js
const API_BASE  = import.meta.env.VITE_API_URL || "https://backend-jd8f.onrender.com/api";
const TOKEN_KEY = "altuvera_admin_token";

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

const request = async (endpoint, opts = {}) => {
  const token = getToken();
  const url   = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const isForm = opts.body instanceof FormData;

  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  if (res.status === 204) return {};

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    const err  = new Error(msg);
    err.status = res.status;
    err.data   = data;
    throw err;
  }

  return data;
};

// ── API ────────────────────────────────────────────────────────────────────

export const notificationsAPI = {
  /**
   * Get admin notifications (paginated)
   */
  getAll: ({ page = 1, limit = 20 } = {}) =>
    request(`/notifications/admin?page=${page}&limit=${limit}`),

  /**
   * Get unread count
   */
  getUnreadCount: () =>
    request("/notifications/admin/unread-count"),

  /**
   * Get a single notification by ID
   */
  getById: (id) =>
    request(`/notifications/${id}`),

  /**
   * Send / create a notification
   */
  send: (payload) =>
    request("/notifications", {
      method: "POST",
      body:   JSON.stringify(payload),
    }),

  /**
   * Broadcast to all users
   */
  broadcast: (payload) =>
    request("/notifications/broadcast", {
      method: "POST",
      body:   JSON.stringify(payload),
    }),

  /**
   * Mark one notification as read
   */
  markRead: (id) =>
    request(`/notifications/${id}/read`, { method: "PATCH" }),

  /**
   * Mark all notifications as read
   */
  markAllRead: () =>
    request("/notifications/mark-all-read", { method: "PATCH" }),

  /**
   * Delete one notification
   */
  deleteOne: (id) =>
    request(`/notifications/${id}`, { method: "DELETE" }),

  /**
   * Clear all notifications
   */
  clearAll: () =>
    request("/notifications/clear-all", { method: "DELETE" }),

  /**
   * Reply to a notification (admin → user)
   */
  reply: (id, replyText) =>
    request(`/notifications/${id}/reply`, {
      method: "POST",
      body:   JSON.stringify({ replyText }),
    }),

  /**
   * Get notifications for a specific user
   */
  getForUser: (userId, { page = 1, limit = 20 } = {}) =>
    request(`/notifications/user/${userId}?page=${page}&limit=${limit}`),
};

export default notificationsAPI;