// admin/src/api/destinations.js
// ═══════════════════════════════════════════════════════════════════════════════
// Destinations API Client
// ═══════════════════════════════════════════════════════════════════════════════

import apiClient, { createEndpoint } from './client'

const BASE = '/destinations'
const base = createEndpoint(BASE)

export const destinationsAPI = {
  ...base,

  // ── Metadata ────────────────────────────────────────────────────────────────
  getFeatured:    (params = {}) => apiClient.get(`${BASE}/featured`,    { params }),
  getPopular:     (params = {}) => apiClient.get(`${BASE}/popular`,     { params }),
  getNew:         (params = {}) => apiClient.get(`${BASE}/new`,         { params }),
  getCategories:  ()            => apiClient.get(`${BASE}/categories`),
  getDifficulties:()            => apiClient.get(`${BASE}/difficulties`),
  getTags:        ()            => apiClient.get(`${BASE}/tags`),
  getStats:       ()            => apiClient.get(`${BASE}/stats`),
  getMapData:     ()            => apiClient.get(`${BASE}/map`),
  search:         (q, params = {}) => apiClient.get(`${BASE}/search`, { params: { q, ...params } }),
  getSuggestions: (params = {}) => apiClient.get(`${BASE}/suggestions`, { params }),
  getByCountry:   (countrySlug, params = {}) => apiClient.get(`${BASE}/country/${countrySlug}`, { params }),

  // ── Single destination ──────────────────────────────────────────────────────
  getOne:         (idOrSlug, include = 'all') => apiClient.get(`${BASE}/${idOrSlug}`, { params: { include } }),
  getRelated:     (idOrSlug) => apiClient.get(`${BASE}/${idOrSlug}/related`),

  // ── Admin mutations ─────────────────────────────────────────────────────────
  restore:        (id) => apiClient.post(`${BASE}/${id}/restore`),
  bulkUpdate:     (ids, updates) => apiClient.patch(`${BASE}/bulk`, { ids, updates }),
  bulkDelete:     (ids, permanent = false) =>
    apiClient.delete(BASE, { data: { ids, permanent } }),

  toggleActive:   (id) => apiClient.patch(`${BASE}/${id}/toggle-active`),
  toggleFeatured: (id) => apiClient.patch(`${BASE}/${id}/toggle-featured`),

  // ── Images ──────────────────────────────────────────────────────────────────
  getImages:      (id) => apiClient.get(`${BASE}/${id}/images`),
  addImages:      (id, formData) => apiClient.post(`${BASE}/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateImage:    (id, imageId, data) => apiClient.put(`${BASE}/${id}/images/${imageId}`, data),
  removeImage:    (id, imageId) => apiClient.delete(`${BASE}/${id}/images/${imageId}`),
  reorderImages:  (id, imageIds) => apiClient.put(`${BASE}/${id}/images/reorder`, { imageIds }),

  // ── Itinerary ───────────────────────────────────────────────────────────────
  getItinerary:           (id) => apiClient.get(`${BASE}/${id}/itinerary`),
  addItineraryDay:        (id, data) => apiClient.post(`${BASE}/${id}/itinerary`, data),
  updateItineraryDay:     (id, dayId, data) => apiClient.put(`${BASE}/${id}/itinerary/${dayId}`, data),
  removeItineraryDay:     (id, dayId) => apiClient.delete(`${BASE}/${id}/itinerary/${dayId}`),

  // ── Practical Info ──────────────────────────────────────────────────────────
  getPracticalInfo:       (id) => apiClient.get(`${BASE}/${id}/practical-info`),
  upsertPracticalInfo:    (id, data) => apiClient.put(`${BASE}/${id}/practical-info`, data),

  // ── FAQs ───────────────────────────────────────────────────────────────────
  getFaqs:        (id) => apiClient.get(`${BASE}/${id}/faqs`),
  addFaq:         (id, data) => apiClient.post(`${BASE}/${id}/faqs`, data),
  updateFaq:      (id, faqId, data) => apiClient.put(`${BASE}/${id}/faqs/${faqId}`, data),
  removeFaq:      (id, faqId) => apiClient.delete(`${BASE}/${id}/faqs/${faqId}`),

  // ── Tags ───────────────────────────────────────────────────────────────────
  getDestinationTags:     (id) => apiClient.get(`${BASE}/${id}/tags`),
  addDestinationTag:      (id, data) => apiClient.post(`${BASE}/${id}/tags`, data),
  removeDestinationTag:   (id, tagId) => apiClient.delete(`${BASE}/${id}/tags/${tagId}`),

  // ── Reviews ────────────────────────────────────────────────────────────────
  getReviews:     (id, params = {}) => apiClient.get(`${BASE}/${id}/reviews`, { params }),
  addReview:      (id, formData) => apiClient.post(`${BASE}/${id}/reviews`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  markReviewHelpful: (id, reviewId) => apiClient.post(`${BASE}/${id}/reviews/${reviewId}/helpful`),

  // ── Tips ───────────────────────────────────────────────────────────────────
  getDestinationTipsLinked: (id) => apiClient.get(`${BASE}/${id}/tips`),
  linkTip:        (id, data) => apiClient.post(`${BASE}/${id}/tips`, data),
  unlinkTip:      (id, tipId) => apiClient.delete(`${BASE}/${id}/tips/${tipId}`),

  // ── Engagement ─────────────────────────────────────────────────────────────
  incrementView:  (id) => apiClient.post(`${BASE}/${id}/view`),
  incrementWishlist: (id) => apiClient.post(`${BASE}/${id}/wishlist`),
  incrementShare: (id) => apiClient.post(`${BASE}/${id}/share`),
}
