// admin/src/api/notifications.js
// ============================================================
// Frontend HTTP client for Notifications
// Uses the default export (apiClient) from ./client
// ============================================================

import apiClient from './client'

const N = '/notifications'
const A = '/notifications/admin'

// ── User-facing ───────────────────────────────────────────────
export const getMyNotifications = (params = {}) =>
  apiClient.get(`${N}/my`, { params })

export const getMyUnreadCount = () =>
  apiClient.get(`${N}/my/unread-count`)

export const markAsRead = (id) =>
  apiClient.patch(`${N}/${id}/read`)

export const markAllRead = () =>
  apiClient.patch(`${N}/mark-all-read`)

export const reactToNotification = (id, reaction) =>
  apiClient.patch(`${N}/${id}/react`, { reaction })

export const replyToNotification = (id, replyText) =>
  apiClient.post(`${N}/${id}/reply`, { replyText })

export const dismissNotification = (id) =>
  apiClient.delete(`${N}/${id}`)

export const clearAllNotifications = () =>
  apiClient.delete(`${N}/clear-all`)

// ── Admin ─────────────────────────────────────────────────────
export const getAdminNotifications = (params = {}) =>
  apiClient.get(A, { params })

export const getAdminUnreadCount = () =>
  apiClient.get(`${A}/unread-count`)

export const createNotification = (payload) =>
  apiClient.post(N, payload)

export const broadcastNotification = (payload) =>
  apiClient.post(N, { target_scope: 'all', ...payload })

export const deleteNotification = (id) =>
  apiClient.delete(`${N}/${id}`)

export const adminReplyToNotification = (id, reply) =>
  apiClient.post(`${N}/${id}/reply`, { reply })

// ── Named object export (used in Bookings.jsx) ────────────────
export const notificationsAPI = {
  getMy:          getMyNotifications,
  getMyUnread:    getMyUnreadCount,
  markAsRead,
  markAllRead,
  react:          reactToNotification,
  reply:          replyToNotification,
  dismiss:        dismissNotification,
  clearAll:       clearAllNotifications,
  getAdmin:       getAdminNotifications,
  getAdminUnread: getAdminUnreadCount,
  create:         createNotification,
  broadcast:      broadcastNotification,
  delete:         deleteNotification,
  adminReply:     adminReplyToNotification,
}

export default notificationsAPI