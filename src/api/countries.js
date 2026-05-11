import apiClient, { createEndpoint } from './client'

const BASE = '/countries'
const base = createEndpoint(BASE)

export const countriesAPI = {
  ...base,

  getFeatured:    ()           => apiClient.get(`${BASE}/featured`),
  search:         (q)          => apiClient.get(`${BASE}/search`, { params: { q } }),
  getContinents:  ()           => apiClient.get(`${BASE}/continents`),
  getByContinent: (continent)  => apiClient.get(`${BASE}/continent/${continent}`),
  getStats:       ()           => apiClient.get(`${BASE}/stats`),
  getDestinations:(idOrSlug)   => apiClient.get(`${BASE}/${idOrSlug}/destinations`),

  // Airports
  addAirport:     (id, data)   => apiClient.post(`${BASE}/${id}/airports`, data),
  removeAirport:  (id, aId)    => apiClient.delete(`${BASE}/${id}/airports/${aId}`),

  // Festivals
  addFestival:    (id, data)   => apiClient.post(`${BASE}/${id}/festivals`, data),
  removeFestival: (id, fId)    => apiClient.delete(`${BASE}/${id}/festivals/${fId}`),

  // UNESCO Sites
  addUnescoSite:     (id, data)=> apiClient.post(`${BASE}/${id}/unesco-sites`, data),
  removeUnescoSite:  (id, sId) => apiClient.delete(`${BASE}/${id}/unesco-sites/${sId}`),

  // Historical events
  addHistorical:     (id, data)=> apiClient.post(`${BASE}/${id}/historical-events`, data),
  removeHistorical:  (id, eId) => apiClient.delete(`${BASE}/${id}/historical-events/${eId}`),
}