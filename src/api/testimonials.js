import apiClient, { createEndpoint } from './client'

const BASE = '/testimonials'
const base = createEndpoint(BASE)

export const testimonialsAPI = {
  ...base,

  feature: (id) => apiClient.post(`${BASE}/${id}/feature`),
}