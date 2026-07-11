import apiClient, { createEndpoint } from './client'

const BASE = '/bookings'
const base = createEndpoint(BASE)

export const bookingsAPI = {
  ...base,

  // ── Existing methods ──────────────────────────────────────────────────────
  track:        (num)       => apiClient.get(`${BASE}/track/${num}`),
  mostBooked:   ()          => apiClient.get(`${BASE}/most-booked`),
  byDestination:(id)        => apiClient.get(`${BASE}/by-destination/${id}`),
  byCountry:    (id)        => apiClient.get(`${BASE}/by-country/${id}`),
  myBookings:   ()          => apiClient.get(`${BASE}/my-bookings`),
  updateStatus: (id, data)  => apiClient.patch(`${BASE}/${id}/status`, data),
  confirm:      (id)        => apiClient.post(`${BASE}/${id}/confirm`),
  cancel:       (id)        => apiClient.post(`${BASE}/${id}/cancel`),
  addNotes:     (id, data)  => apiClient.post(`${BASE}/${id}/notes`, data),
  getStats:     ()          => apiClient.get(`${BASE}/stats`),
  getUpcoming:  ()          => apiClient.get(`${BASE}/upcoming`),
  getRecent:    ()          => apiClient.get(`${BASE}/recent`),
  exportAll:    (params)    => apiClient.get(`${BASE}/export`, { params, responseType: 'blob' }),
  bulkStatus:   (data)      => apiClient.post(`${BASE}/bulk-status`, data),

  // ── NEW v6.8: Admin creates booking on behalf of user ─────────────────────
  adminCreate:  (data)      => apiClient.post(`${BASE}/admin`, data),

  // ── NEW: Cancellation / refund requests ──────────────────────────────────
  getCancellationRequests: (params) =>
    apiClient.get(`${BASE}/cancellation-requests`, { params }),
  reviewCancellation: (id, data) =>
    apiClient.post(`${BASE}/${id}/review-cancellation`, data),
}