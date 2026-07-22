// src/api/countries.js
import apiClient, { createEndpoint } from './client'

const BASE = '/countries'
const base = createEndpoint(BASE)

export const countriesAPI = {
  ...base,

  // ── Core CRUD ──────────────────────────────────────────────────────────────
  getAll:  (params = {}) => apiClient.get(BASE, { params }),
  getOne:  (idOrSlug)    => apiClient.get(`${BASE}/${idOrSlug}`),
  create:  (data)        => apiClient.post(BASE, data),
  update:  (id, data)    => apiClient.put(`${BASE}/${id}`, data),

  /**
   * Delete a country.
   * Pass { force: true } to cascade-delete linked destinations + bookings.
   * The backend reads ?force=true from the query string.
   */
  remove: (id, { force = false } = {}) =>
    apiClient.delete(`${BASE}/${id}`, {
      params: force ? { force: 'true' } : {},
    }),

  /** Bulk delete — body: { ids: number[], force?: boolean } */
  bulkDelete: (ids, force = false) =>
    apiClient.delete(BASE, { data: { ids, force } }),

  // ── Named endpoints ────────────────────────────────────────────────────────
  getFeatured:    ()            => apiClient.get(`${BASE}/featured`),
  getStats:       ()            => apiClient.get(`${BASE}/stats`),
  search:         (q)           => apiClient.get(`${BASE}/search`, { params: { q } }),
  getContinents:  ()            => apiClient.get(`${BASE}/continents`),
  getByContinent: (continent)   => apiClient.get(`${BASE}/continent/${continent}`),
  getDestinations:(idOrSlug)    => apiClient.get(`${BASE}/${idOrSlug}/destinations`),

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  toggleActive:   (id)          => apiClient.patch(`${BASE}/${id}/toggle-active`),
  toggleFeatured: (id)          => apiClient.patch(`${BASE}/${id}/toggle-featured`),

  // ── Sub-resources ──────────────────────────────────────────────────────────
  addAirport:        (id, data) => apiClient.post(`${BASE}/${id}/airports`, data),
  removeAirport:     (id, aId)  => apiClient.delete(`${BASE}/${id}/airports/${aId}`),
  addFestival:       (id, data) => apiClient.post(`${BASE}/${id}/festivals`, data),
  removeFestival:    (id, fId)  => apiClient.delete(`${BASE}/${id}/festivals/${fId}`),
  addUnescoSite:     (id, data) => apiClient.post(`${BASE}/${id}/unesco-sites`, data),
  removeUnescoSite:  (id, sId)  => apiClient.delete(`${BASE}/${id}/unesco-sites/${sId}`),
  addHistorical:     (id, data) => apiClient.post(`${BASE}/${id}/historical-events`, data),
  removeHistorical:  (id, eId)  => apiClient.delete(`${BASE}/${id}/historical-events/${eId}`),
}