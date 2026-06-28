import apiClient, { createEndpoint } from './client'

const BASE = '/notifications'

export const notificationsAPI = {
  // ── Admin endpoints ──────────────────────────────────────────────────────
  getAll:      (params)     => apiClient.get(`${BASE}/admin`, { params }),
  getStats:    ()           => apiClient.get(`${BASE}/admin/stats`),
  create:      (data)       => apiClient.post(BASE, data),
  adminReply:  (id, data)   => apiClient.post(`${BASE}/${id}/admin-reply`, data),
  adminDelete: (id)         => apiClient.delete(`${BASE}/${id}/admin`),

  // ── User endpoints (called from admin to test) ───────────────────────────
  getMyNotifs: (params)     => apiClient.get(`${BASE}/my`, { params }),
  getUnread:   ()           => apiClient.get(`${BASE}/my/unread-count`),
  markRead:    (id)         => apiClient.patch(`${BASE}/${id}/read`),
  markAllRead: ()           => apiClient.patch(`${BASE}/mark-all-read`),
  react:       (id, data)   => apiClient.patch(`${BASE}/${id}/react`, data),
  reply:       (id, data)   => apiClient.post(`${BASE}/${id}/reply`, data),
  deleteOne:   (id)         => apiClient.delete(`${BASE}/${id}`),
  clearAll:    ()           => apiClient.delete(`${BASE}/clear-all`),
}