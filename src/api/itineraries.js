import apiClient from './client'

const BASE = '/itineraries'

// Render's free service can take time to wake from idle. Give itinerary actions
// a longer request window while the backend also keeps publishing non-blocking.
const itineraryRequest = { timeout: 60_000 }

export const itinerariesAPI = {
  list: () => apiClient.get(BASE, itineraryRequest),
  get: (bookingId) => apiClient.get(`${BASE}/${bookingId}`, itineraryRequest),
  saveDraft: (bookingId, itinerary) => apiClient.post(`${BASE}/${bookingId}/draft`, { itinerary }, itineraryRequest),
  publish: (bookingId, itinerary) => apiClient.post(`${BASE}/${bookingId}/publish`, { itinerary }, itineraryRequest),
}
