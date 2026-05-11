import apiClient, { createEndpoint } from './client'

const BASE = '/faqs'
const base = createEndpoint(BASE)

export const faqsAPI = {
  ...base,

  toggle: (id) => apiClient.post(`${BASE}/${id}/toggle`),
}