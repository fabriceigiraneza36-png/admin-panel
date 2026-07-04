// admin/src/store/notificationsSlice.js
import { createSlice, nanoid } from '@reduxjs/toolkit'

// ─── Initial state ────────────────────────────────────────────────────────────
const initialState = {
  items:      [],   // UI toast notifications (local)
  panelOpen:  false,
  // Note: unreadCount is derived via selector (see below)
}

// ─── Slice ────────────────────────────────────────────────────────────────────
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add a UI toast notification
    addNotification: {
      reducer(state, action) {
        // Dedupe: don't add the same server id twice
        if (action.payload.serverId) {
          const exists = state.items.some(
            (n) => n.serverId === action.payload.serverId,
          )
          if (exists) return
        }
        state.items.unshift(action.payload)
        // Cap at 50 to avoid memory growth
        if (state.items.length > 50) state.items.length = 50
      },
      prepare(payload) {
        return {
          payload: {
            id:        nanoid(),
            serverId:  payload.data?.id   || null,
            type:      payload.type       || 'info',
            title:     payload.title      || '',
            message:   payload.message    || '',
            data:      payload.data       || null,
            read:      false,
            createdAt: new Date().toISOString(),
          },
        }
      },
    },

    // Mark a single toast as read
    markRead(state, action) {
      const item = state.items.find((n) => n.id === action.payload)
      if (item) item.read = true
    },

    // Mark ALL toasts as read
    markAllRead(state) {
      state.items.forEach((n) => { n.read = true })
    },

    // Remove a single toast
    removeNotification(state, action) {
      state.items = state.items.filter((n) => n.id !== action.payload)
    },

    // Clear all toasts
    clearAll(state) {
      state.items = []
    },

    // Panel open/close
    togglePanel(state) {
      state.panelOpen = !state.panelOpen
    },
    closePanel(state) {
      state.panelOpen = false
    },
    openPanel(state) {
      state.panelOpen = true
    },

    /**
     * syncUnread — called by NotificationContext when it fetches the
     * real unread count from the server.  Instead of replacing all
     * items (which would blow away existing toasts), we just add
     * placeholder "unread" markers so the badge number is correct.
     *
     * If the server says there are 3 unread but Redux only has 1,
     * we add 2 synthetic read=false items so the selector returns 3.
     *
     * In practice this keeps the bell badge in sync without
     * touching visible toast items.
     */
    syncUnread(state, action) {
      const serverCount = parseInt(action.payload || 0, 10)
      const localUnread = state.items.filter((n) => !n.read).length
      if (serverCount > localUnread) {
        const diff = serverCount - localUnread
        for (let i = 0; i < diff; i++) {
          state.items.unshift({
            id:        nanoid(),
            serverId:  null,
            type:      'info',
            title:     '',
            message:   '',
            data:      null,
            read:      false,
            synthetic: true,   // flagged so UI can skip rendering
            createdAt: new Date().toISOString(),
          })
        }
        if (state.items.length > 50) state.items.length = 50
      }
    },
  },
})

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  clearAll,
  togglePanel,
  closePanel,
  openPanel,
  syncUnread,
} = notificationsSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────

/** All toast items (excluding synthetic placeholders for rendering) */
export const selectNotifications = (state) =>
  state.notifications.items.filter((n) => !n.synthetic)

/** True unread count — includes synthetic placeholders */
export const selectUnreadCount = (state) =>
  state.notifications.items.filter((n) => !n.read).length

/** Panel open state */
export const selectPanelOpen = (state) =>
  state.notifications.panelOpen

export default notificationsSlice.reducer