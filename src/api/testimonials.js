// src/api/testimonials.js
// ═══════════════════════════════════════════════════════════════════════════
// Testimonials API — matches backend route structure exactly
// Backend routes:
//   GET    /api/testimonials              → getAll (public, paginated)
//   GET    /api/testimonials/featured     → getFeatured
//   GET    /api/testimonials/stats        → getStats
//   GET    /api/testimonials/admin/all    → adminGetAll (auth required)
//   POST   /api/testimonials/submit       → submitPublic (auth required)
//   POST   /api/testimonials              → create (admin)
//   PATCH  /api/testimonials/reorder      → reorder (admin)
//   PATCH  /api/testimonials/:id/toggle-featured → toggleFeatured (admin)
//   PATCH  /api/testimonials/:id/toggle-active   → toggleActive (admin)
//   PATCH  /api/testimonials/:id          → update (admin)
//   DELETE /api/testimonials              → bulkDelete (admin)
//   DELETE /api/testimonials/:id          → remove (admin)
//   GET    /api/testimonials/:id          → getOne
// ═══════════════════════════════════════════════════════════════════════════

import apiClient, { createEndpoint, getErrorMessage } from "./client";

const BASE = "/testimonials";

// ── Base CRUD (maps to admin endpoints) ───────────────────────────────────
const base = createEndpoint(BASE);

export const testimonialsAPI = {
  // ── Inherited from createEndpoint ────────────────────────────────────────
  // getAll:  (params) => apiClient.get(BASE, { params })
  // getOne:  (id)     => apiClient.get(`${BASE}/${id}`)
  // create:  (data)   => apiClient.post(BASE, data)
  // update:  (id, data) => apiClient.put(`${BASE}/${id}`, data)
  // patch:   (id, data) => apiClient.patch(`${BASE}/${id}`, data)
  // remove:  (id)     => apiClient.delete(`${BASE}/${id}`)
  ...base,

  // ── Admin: full list with all filters (pending + active + inactive) ──────
  // Use this in the admin panel instead of getAll so you see pending reviews
  adminGetAll: (params) =>
    apiClient.get(`${BASE}/admin/all`, { params }),

  // ── Public endpoints ─────────────────────────────────────────────────────
  getFeatured: (params) =>
    apiClient.get(`${BASE}/featured`, { params }),

  getStats: () =>
    apiClient.get(`${BASE}/stats`),

  // ── Public submit (authenticated user submits own review) ─────────────────
  submitPublic: (data) =>
    apiClient.post(`${BASE}/submit`, data),

  // ── Admin toggle actions ──────────────────────────────────────────────────
  toggleFeatured: (id) =>
    apiClient.patch(`${BASE}/${id}/toggle-featured`),

  toggleActive: (id) =>
    apiClient.patch(`${BASE}/${id}/toggle-active`),

  // ── Admin bulk + reorder ──────────────────────────────────────────────────
  reorder: (items) =>
    apiClient.patch(`${BASE}/reorder`, { items }),

  bulkDelete: (ids) =>
    apiClient.delete(BASE, { data: { ids } }),

  // ── Legacy alias (was: feature) ───────────────────────────────────────────
  feature: (id) =>
    apiClient.patch(`${BASE}/${id}/toggle-featured`),
};

export { getErrorMessage };
export default testimonialsAPI;