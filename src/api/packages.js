// admin/src/api/packages.js
// ─────────────────────────────────────────────────────────────────────────────
// Packages API — self-contained, no cross-module re-export
// Uses the same apiClient instance as all other admin API files
// getErrorMessage is defined here directly to avoid rolldown re-export failures
// ─────────────────────────────────────────────────────────────────────────────

import apiClient from './client'

const BASE = '/packages'

// ── Error message extractor ───────────────────────────────────────────────────

export const getErrorMessage = (error) => {
  if (!error) return 'An error occurred'

  if (error.response?.data) {
    const d = error.response.data
    if (typeof d.error   === 'string') return d.error
    if (typeof d.message === 'string') return d.message
    if (typeof d.msg     === 'string') return d.msg
    if (Array.isArray(d.errors) && typeof d.errors[0] === 'string') return d.errors[0]
    if (typeof d         === 'string') return d
  }

  const s = error.response?.status
  if (s === 400) return 'Bad request — check your input'
  if (s === 401) return 'Unauthorized — please log in again'
  if (s === 403) return 'Access denied'
  if (s === 404) return 'Resource not found'
  if (s === 409) return 'Conflict — this record already exists'
  if (s === 422) return 'Validation error — check your input'
  if (s === 429) return 'Too many requests — please wait a moment'
  if (s >= 500)  return 'Server error — please try again later'

  if (error.code === 'ECONNABORTED')     return 'Request timed out — please try again'
  if (error.message === 'Network Error') return 'Network error — check your connection'
  if (typeof error.message === 'string') return error.message
  if (typeof error         === 'string') return error

  return 'An unexpected error occurred'
}

// ── Packages API ──────────────────────────────────────────────────────────────

export const packagesAPI = {

  // Admin listing — returns ALL packages including unpublished drafts
  getAll:          (params)            => apiClient.get(`${BASE}/admin/all`, { params }),
  getById:         (id)                => apiClient.get(`${BASE}/${id}`),
  getStats:        ()                  => apiClient.get(`${BASE}/stats`),
  getBookingStats: ()                  => apiClient.get(`${BASE}/bookings/stats`),

  // CRUD
  create:          (data)              => apiClient.post(BASE, data),
  update:          (id, data)          => apiClient.patch(`${BASE}/${id}`, data),
  remove:          (id)                => apiClient.delete(`${BASE}/${id}`),

  // Publish
  publish:         (id)                => apiClient.post(`${BASE}/${id}/publish`),
  unpublish:       (id)                => apiClient.post(`${BASE}/${id}/unpublish`),

  // Messages
  getMessages:     (id, params)        => apiClient.get(`${BASE}/${id}/messages`, { params }),
  adminReply:      (id, data)          => apiClient.post(`${BASE}/${id}/messages/admin-reply`, data),
  deleteMessage:   (id, msgId)         => apiClient.delete(`${BASE}/${id}/messages/${msgId}`),
  markRead:        (id)                => apiClient.post(`${BASE}/${id}/messages/mark-read`),

  // Bookings
  getBookings:     (id, params)        => apiClient.get(`${BASE}/${id}/bookings`, { params }),
  getAllBookings:   (params)            => apiClient.get(`${BASE}/bookings/all`, { params }),
  updateBooking:   (id, bId, data)     => apiClient.patch(`${BASE}/${id}/bookings/${bId}`, data),
  confirmBooking:  (id, bId)           => apiClient.post(`${BASE}/${id}/bookings/${bId}/confirm`),
  cancelBooking:   (id, bId, data)     => apiClient.post(`${BASE}/${id}/bookings/${bId}/cancel`, data),

  // Info Requests
  getInfoRequests:    (id)             => apiClient.get(`${BASE}/${id}/info-requests`),
  createInfoRequest:  (id, data)       => apiClient.post(`${BASE}/${id}/info-requests`, data),
  updateInfoRequest:  (id, rId, data)  => apiClient.patch(`${BASE}/${id}/info-requests/${rId}`, data),
  deleteInfoRequest:  (id, rId)        => apiClient.delete(`${BASE}/${id}/info-requests/${rId}`),
}

export default packagesAPI