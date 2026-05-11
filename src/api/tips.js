import apiClient, { createEndpoint } from './client'

const BASE = '/tips'
const base = createEndpoint(BASE)

export const tipsAPI = {
  ...base,

  getBySlug: (slug) => apiClient.get(`${BASE}/slug/${slug}`),
}