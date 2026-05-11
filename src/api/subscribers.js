import apiClient, { createEndpoint } from './client'

const BASE = '/subscribers'
const base = createEndpoint(BASE)

export const subscribersAPI = {
  ...base,

  sendNewsletter: (data) => apiClient.post(`${BASE}/email`, data),
}