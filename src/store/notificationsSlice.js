// src/store/notificationsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

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

// ── Thunks ─────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        `${API_BASE}/notifications/admin?page=${page}&limit=${limit}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        `${API_BASE}/notifications/admin/unread-count`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.count ?? 0;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id, { rejectWithValue }) => {
    try {
      const res = await authFetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        `${API_BASE}/notifications/mark-all-read`,
        { method: "PATCH" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const deleteNotification = createAsyncThunk(
  "notifications/deleteOne",
  async (id, { rejectWithValue }) => {
    try {
      const res = await authFetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const clearAllNotifications = createAsyncThunk(
  "notifications/clearAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch(
        `${API_BASE}/notifications/clear-all`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const sendNotification = createAsyncThunk(
  "notifications/send",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await authFetch(`${API_BASE}/notifications`, {
        method: "POST",
        body:   JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// ── Initial State ──────────────────────────────────────────────────────────

const initialState = {
  items:       [],
  unreadCount: 0,
  loading:     false,
  error:       null,
  page:        1,
  totalPages:  1,
  total:       0,
};

// ── Slice ──────────────────────────────────────────────────────────────────

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,

  reducers: {
    // Real-time push from socket
    addNotification(state, action) {
      const notif = action.payload;
      if (state.items.some((n) => n.id === notif.id)) return;
      state.items.unshift(notif);
      state.unreadCount += 1;
      state.total       += 1;
    },

    updateNotification(state, action) {
      const notif = action.payload;
      const idx   = state.items.findIndex((n) => n.id === notif.id);
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...notif };
      }
    },

    setUnreadCount(state, action) {
      state.unreadCount = action.payload ?? 0;
    },

    resetNotifications() {
      return initialState;
    },
  },

  extraReducers: (builder) => {
    // fetchNotifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const { data, unread_count, pagination } = action.payload;
        const page = action.meta.arg?.page ?? 1;

        state.items       = page === 1 ? (data || []) : [...state.items, ...(data || [])];
        state.unreadCount = unread_count ?? state.unreadCount;
        state.total       = pagination?.total       ?? state.total;
        state.totalPages  = pagination?.total_pages ?? state.totalPages;
        state.page        = page;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // fetchUnreadCount
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    // markRead (optimistic)
    builder.addCase(markNotificationRead.pending, (state, action) => {
      const id  = action.meta.arg;
      const idx = state.items.findIndex((n) => n.id === id);
      if (idx !== -1 && !state.items[idx].is_read) {
        state.items[idx].is_read  = true;
        state.items[idx].read_at  = new Date().toISOString();
        state.unreadCount         = Math.max(0, state.unreadCount - 1);
      }
    });

    // markAllRead (optimistic)
    builder.addCase(markAllNotificationsRead.pending, (state) => {
      const now = new Date().toISOString();
      state.items       = state.items.map((n) => ({ ...n, is_read: true, read_at: now }));
      state.unreadCount = 0;
    });

    // deleteOne (optimistic)
    builder.addCase(deleteNotification.pending, (state, action) => {
      const id = action.meta.arg;
      state.items = state.items.filter((n) => n.id !== id);
      state.total = Math.max(0, state.total - 1);
    });

    // clearAll (optimistic)
    builder.addCase(clearAllNotifications.pending, (state) => {
      state.items       = [];
      state.unreadCount = 0;
      state.total       = 0;
    });

    // sendNotification
    builder.addCase(sendNotification.fulfilled, (state, action) => {
      const notif = action.payload?.data || action.payload;
      if (notif?.id && !state.items.some((n) => n.id === notif.id)) {
        state.items.unshift(notif);
        state.total += 1;
      }
    });
  },
});

export const {
  addNotification,
  updateNotification,
  setUnreadCount,
  resetNotifications,
} = notificationsSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────

export const selectAllNotifications  = (state) => state.notifications.items;
export const selectUnreadCount       = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) => state.notifications.loading;
export const selectNotificationsError   = (state) => state.notifications.error;
export const selectUnreadNotifications  = (state) =>
  state.notifications.items.filter((n) => !n.is_read);

export default notificationsSlice.reducer;