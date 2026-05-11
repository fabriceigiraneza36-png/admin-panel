import apiClient, { createEndpoint } from './client'

const BASE = '/destinations'
const base = createEndpoint(BASE)

export const destinationsAPI = {
  ...base,

  getFeatured:   ()         => apiClient.get(`${BASE}/featured`),
  getPopular:    ()         => apiClient.get(`${BASE}/popular`),
  getNew:        ()         => apiClient.get(`${BASE}/new`),
  search:        (q)        => apiClient.get(`${BASE}/search`, { params: { q } }),
  getCategories: ()         => apiClient.get(`${BASE}/categories`),
  getStats:      ()         => apiClient.get(`${BASE}/stats`),
  getMap:        ()         => apiClient.get(`${BASE}/map`),
  getByCountry:  (slug)     => apiClient.get(`${BASE}/country/${slug}`),
  getRelated:    (idOrSlug) => apiClient.get(`${BASE}/${idOrSlug}/related`),
  restore:       (id)       => apiClient.post(`${BASE}/${id}/restore`),
  bulkUpdate:    (data)     => apiClient.patch(`${BASE}/bulk`, data),

  // Images
  getImages:      (id)         => apiClient.get(`${BASE}/${id}/images`),
  addImages:      (id, data)   => apiClient.post(`${BASE}/${id}/images`, data),
  updateImage:    (id, imgId, data) => apiClient.put(`${BASE}/${id}/images/${imgId}`, data),
  removeImage:    (id, imgId)  => apiClient.delete(`${BASE}/${id}/images/${imgId}`),
  reorderImages:  (id, data)   => apiClient.put(`${BASE}/${id}/images/reorder`, data),

  // Itinerary
  getItinerary:   (id)         => apiClient.get(`${BASE}/${id}/itinerary`),
  addItinerary:   (id, data)   => apiClient.post(`${BASE}/${id}/itinerary`, data),
  updateItinerary:(id, dayId, data) => apiClient.put(`${BASE}/${id}/itinerary/${dayId}`, data),
  removeItinerary:(id, dayId)  => apiClient.delete(`${BASE}/${id}/itinerary/${dayId}`),

  // FAQs
  getFAQs:       (id)          => apiClient.get(`${BASE}/${id}/faqs`),
  addFAQ:        (id, data)    => apiClient.post(`${BASE}/${id}/faqs`, data),
  updateFAQ:     (id, fId, d)  => apiClient.put(`${BASE}/${id}/faqs/${fId}`, d),
  removeFAQ:     (id, fId)     => apiClient.delete(`${BASE}/${id}/faqs/${fId}`),

  // Reviews
  getReviews:    (id, params)  => apiClient.get(`${BASE}/${id}/reviews`, { params }),
  updateReview:  (id, rId, d)  => apiClient.put(`${BASE}/${id}/reviews/${rId}`, d),
  removeReview:  (id, rId)     => apiClient.delete(`${BASE}/${id}/reviews/${rId}`),

  // Tags
  getTags:       (id)          => apiClient.get(`${BASE}/${id}/tags`),
  addTag:        (id, data)    => apiClient.post(`${BASE}/${id}/tags`, data),
  removeTag:     (id, tId)     => apiClient.delete(`${BASE}/${id}/tags/${tId}`),
}