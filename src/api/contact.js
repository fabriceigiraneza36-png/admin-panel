import apiClient, { createEndpoint } from './client'

const BASE = '/contact'
const base = createEndpoint(BASE)

export const contactAPI = {
  ...base,

  getStats: () => apiClient.get(`${BASE}/stats`),
  reply:    (id, data) => apiClient.post(`${BASE}/${id}/reply`, data),
}