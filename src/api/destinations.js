import client from "./client";

const BASE = "/destinations";

// ── Public ────────────────────────────────────────────────────
export const getAll = (params = {}) =>
  client.get(BASE, { params }).then((r) => r.data);

export const getOne = (idOrSlug, include = "all") =>
  client.get(`${BASE}/${idOrSlug}`, { params: { include } }).then((r) => r.data);

export const getFeatured = (params = {}) =>
  client.get(`${BASE}/featured`, { params }).then((r) => r.data);

export const getPopular = (params = {}) =>
  client.get(`${BASE}/popular`, { params }).then((r) => r.data);

export const getStats = () =>
  client.get(`${BASE}/stats`).then((r) => r.data);

export const getCategories = () =>
  client.get(`${BASE}/categories`).then((r) => r.data);

export const getDifficulties = () =>
  client.get(`${BASE}/difficulties`).then((r) => r.data);

export const getByCountry = (countrySlug, params = {}) =>
  client.get(`${BASE}/country/${countrySlug}`, { params }).then((r) => r.data);

export const search = (q, params = {}) =>
  client.get(`${BASE}/search`, { params: { q, ...params } }).then((r) => r.data);

// ── Admin CRUD ────────────────────────────────────────────────
export const create = (formData) =>
  client.post(BASE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

export const update = (id, formData) =>
  client.put(`${BASE}/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

export const updateJson = (id, data) =>
  client.put(`${BASE}/${id}`, data).then((r) => r.data);

export const remove = (id, permanent = false) =>
  client.delete(`${BASE}/${id}`, { params: { permanent } }).then((r) => r.data);

export const restore = (id) =>
  client.post(`${BASE}/${id}/restore`).then((r) => r.data);

export const bulkUpdate = (ids, updates) =>
  client.patch(`${BASE}/bulk`, { ids, updates }).then((r) => r.data);

// ── Images ────────────────────────────────────────────────────
export const getImages = (id) =>
  client.get(`${BASE}/${id}/images`).then((r) => r.data);

export const addImages = (id, formData) =>
  client.post(`${BASE}/${id}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

export const addImagesByUrl = (id, imageUrls) =>
  client.post(`${BASE}/${id}/images`, { image_urls: imageUrls }).then((r) => r.data);

export const updateImage = (id, imageId, data) =>
  client.put(`${BASE}/${id}/images/${imageId}`, data).then((r) => r.data);

export const removeImage = (id, imageId) =>
  client.delete(`${BASE}/${id}/images/${imageId}`).then((r) => r.data);

export const reorderImages = (id, imageIds) =>
  client.put(`${BASE}/${id}/images/reorder`, { imageIds }).then((r) => r.data);

// ── Gallery (hero/cover/thumbnail) ───────────────────────────
export const updateGalleryUrls = (id, data) =>
  client.put(`${BASE}/${id}`, data).then((r) => r.data);

// ── Itinerary ─────────────────────────────────────────────────
export const getItinerary = (id) =>
  client.get(`${BASE}/${id}/itinerary`).then((r) => r.data);

export const addItineraryDay = (id, data) =>
  client.post(`${BASE}/${id}/itinerary`, data).then((r) => r.data);

export const updateItineraryDay = (id, dayId, data) =>
  client.put(`${BASE}/${id}/itinerary/${dayId}`, data).then((r) => r.data);

export const removeItineraryDay = (id, dayId) =>
  client.delete(`${BASE}/${id}/itinerary/${dayId}`).then((r) => r.data);

// ── FAQs ──────────────────────────────────────────────────────
export const getFaqs = (id) =>
  client.get(`${BASE}/${id}/faqs`).then((r) => r.data);

export const addFaq = (id, data) =>
  client.post(`${BASE}/${id}/faqs`, data).then((r) => r.data);

export const updateFaq = (id, faqId, data) =>
  client.put(`${BASE}/${id}/faqs/${faqId}`, data).then((r) => r.data);

export const removeFaq = (id, faqId) =>
  client.delete(`${BASE}/${id}/faqs/${faqId}`).then((r) => r.data);

// ── Tags ──────────────────────────────────────────────────────
export const getDestinationTags = (id) =>
  client.get(`${BASE}/${id}/tags`).then((r) => r.data);

export const addDestinationTag = (id, data) =>
  client.post(`${BASE}/${id}/tags`, data).then((r) => r.data);

export const removeDestinationTag = (id, tagId) =>
  client.delete(`${BASE}/${id}/tags/${tagId}`).then((r) => r.data);

// ── Reviews ───────────────────────────────────────────────────
export const getReviews = (id, params = {}) =>
  client.get(`${BASE}/${id}/reviews`, { params }).then((r) => r.data);

export const updateReview = (id, reviewId, data) =>
  client.put(`${BASE}/${id}/reviews/${reviewId}`, data).then((r) => r.data);

export const removeReview = (id, reviewId) =>
  client.delete(`${BASE}/${id}/reviews/${reviewId}`).then((r) => r.data);

// ── Practical Info ────────────────────────────────────────────
export const getPracticalInfo = (id) =>
  client.get(`${BASE}/${id}/practical-info`).then((r) => r.data);

export const upsertPracticalInfo = (id, data) =>
  client.put(`${BASE}/${id}/practical-info`, data).then((r) => r.data);

// ── Tips ──────────────────────────────────────────────────────
export const getDestinationTips = (id) =>
  client.get(`${BASE}/${id}/tips`).then((r) => r.data);

export const linkTip = (id, data) =>
  client.post(`${BASE}/${id}/tips`, data).then((r) => r.data);

export const unlinkTip = (id, tipId) =>
  client.delete(`${BASE}/${id}/tips/${tipId}`).then((r) => r.data);

export const destinationsAPI = {
  getAll, getOne, getFeatured, getPopular, getStats, getCategories,
  getDifficulties, getByCountry, search,
  create, update, updateJson, remove, restore, bulkUpdate,
  getImages, addImages, addImagesByUrl, updateImage, removeImage,
  reorderImages, updateGalleryUrls,
  getItinerary, addItineraryDay, updateItineraryDay, removeItineraryDay,
  getFaqs, addFaq, updateFaq, removeFaq,
  getDestinationTags, addDestinationTag, removeDestinationTag,
  getReviews, updateReview, removeReview,
  getPracticalInfo, upsertPracticalInfo,
  getDestinationTips, linkTip, unlinkTip,
};