import apiClient, { createEndpoint } from './client'

const BASE = '/posts'
const base = createEndpoint(BASE)

export const postsAPI = {
  ...base,

  publish:   (id) => apiClient.post(`${BASE}/${id}/publish`),
  unpublish: (id) => apiClient.post(`${BASE}/${id}/unpublish`),
  getBySlug: (s)  => apiClient.get(`${BASE}/slug/${s}`),
}