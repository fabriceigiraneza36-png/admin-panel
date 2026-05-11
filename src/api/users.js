import apiClient, { createEndpoint } from './client'

const BASE = '/users'
const base = createEndpoint(BASE)

export const usersAPI = {
  ...base,

  deactivate:   (id)   => apiClient.post(`${BASE}/${id}/deactivate`),
  activate:     (id)   => apiClient.post(`${BASE}/${id}/activate`),
  getBookings:  (id)   => apiClient.get(`${BASE}/${id}/bookings`),
  getReviews:   (id)   => apiClient.get(`${BASE}/${id}/reviews`),
  exportAll:    ()     => apiClient.get(`${BASE}/export`, { responseType: 'blob' }),
}