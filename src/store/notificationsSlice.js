import { createSlice } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'

const MAX_NOTIFICATIONS = 50

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items:      [],
    unreadCount: 0,
    panelOpen:  false,
  },
  reducers: {
    addNotification: (state, { payload }) => {
      const notif = {
        id:        uuidv4(),
        type:      payload.type || 'system',
        title:     payload.title || 'Notification',
        message:   payload.message || '',
        data:      payload.data   || null,
        isRead:    false,
        createdAt: new Date().toISOString(),
      }
      state.items.unshift(notif)
      if (state.items.length > MAX_NOTIFICATIONS) {
        state.items = state.items.slice(0, MAX_NOTIFICATIONS)
      }
      state.unreadCount++
    },

    markRead: (state, { payload }) => {
      const notif = state.items.find((n) => n.id === payload)
      if (notif && !notif.isRead) {
        notif.isRead = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },

    markAllRead: (state) => {
      state.items.forEach((n) => (n.isRead = true))
      state.unreadCount = 0
    },

    removeNotification: (state, { payload }) => {
      const idx = state.items.findIndex((n) => n.id === payload)
      if (idx !== -1) {
        if (!state.items[idx].isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
        state.items.splice(idx, 1)
      }
    },

    clearAll: (state) => {
      state.items      = []
      state.unreadCount = 0
    },

    togglePanel: (state) => {
      state.panelOpen = !state.panelOpen
    },

    closePanel: (state) => {
      state.panelOpen = false
    },
  },
})

export const {
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  clearAll,
  togglePanel,
  closePanel,
} = notificationsSlice.actions

/* ── Selectors ── */
export const selectNotifications  = (s) => s.notifications.items
export const selectUnreadCount    = (s) => s.notifications.unreadCount
export const selectPanelOpen      = (s) => s.notifications.panelOpen

export default notificationsSlice.reducer