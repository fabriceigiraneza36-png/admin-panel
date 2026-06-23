// admin/src/api/packages.js
import apiClient from '../utils/axios'

const BASE = '/packages'

export const packagesAPI = {
  // ── Listing ───────────────────────────────────────────────────────────────
  getAll: (params) =>
    apiClient.get(`${BASE}/admin/all`, { params }),

  getById: (id) =>
    apiClient.get(`${BASE}/${id}`),

  getStats: () =>
    apiClient.get(`${BASE}/stats`),

  // ── CRUD ──────────────────────────────────────────────────────────────────
  create: (data) =>
    apiClient.post(BASE, data),

  update: (id, data) =>
    apiClient.patch(`${BASE}/${id}`, data),

  remove: (id) =>
    apiClient.delete(`${BASE}/${id}`),

  // ── Publish ───────────────────────────────────────────────────────────────
  publish:   (id) => apiClient.post(`${BASE}/${id}/publish`),
  unpublish: (id) => apiClient.post(`${BASE}/${id}/unpublish`),

  // ── Messages ──────────────────────────────────────────────────────────────
  getMessages:   (id, params) =>
    apiClient.get(`${BASE}/${id}/messages`, { params }),

  adminReply:    (id, data) =>
    apiClient.post(`${BASE}/${id}/messages/admin-reply`, data),

  deleteMessage: (id, msgId) =>
    apiClient.delete(`${BASE}/${id}/messages/${msgId}`),

  markRead:      (id) =>
    apiClient.post(`${BASE}/${id}/messages/mark-read`),

  // ── Bookings ──────────────────────────────────────────────────────────────
  getBookings:    (id, params)    =>
    apiClient.get(`${BASE}/${id}/bookings`, { params }),

  getAllBookings:  (params)        =>
    apiClient.get(`${BASE}/bookings/all`, { params }),

  updateBooking:  (id, bId, data) =>
    apiClient.patch(`${BASE}/${id}/bookings/${bId}`, data),

  confirmBooking: (id, bId)       =>
    apiClient.post(`${BASE}/${id}/bookings/${bId}/confirm`),

  cancelBooking:  (id, bId, data) =>
    apiClient.post(`${BASE}/${id}/bookings/${bId}/cancel`, data),

  getBookingStats: () =>
    apiClient.get(`${BASE}/bookings/stats`),

  // ── Info Requests ─────────────────────────────────────────────────────────
  getInfoRequests:   (id)        =>
    apiClient.get(`${BASE}/${id}/info-requests`),

  createInfoRequest: (id, data)  =>
    apiClient.post(`${BASE}/${id}/info-requests`, data),

  updateInfoRequest: (id, rId, d) =>
    apiClient.patch(`${BASE}/${id}/info-requests/${rId}`, d),

  deleteInfoRequest: (id, rId)   =>
    apiClient.delete(`${BASE}/${id}/info-requests/${rId}`),
}

export default packagesAPI