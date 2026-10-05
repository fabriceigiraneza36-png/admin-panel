import apiClient from './client'

const BASE = '/itineraries'

export const itinerariesAPI = {
  get: (bookingId) => apiClient.get(`${BASE}/${bookingId}`),
  saveDraft: (bookingId, itinerary) => apiClient.post(`${BASE}/${bookingId}/draft`, { itinerary }),
  publish: (bookingId, itinerary) => apiClient.post(`${BASE}/${bookingId}/publish`, { itinerary }),
}
