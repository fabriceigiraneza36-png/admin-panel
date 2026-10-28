// src/api/comments.js
// ═══════════════════════════════════════════════════════════════════════════
// Unified destination and country comments moderation API (admin)
// Backend routes:
//   GET    /api/destination-comments/admin/all           → merged comment feed
//   Country mutations use /api/country-comments/admin/* based on resourceType
// ═══════════════════════════════════════════════════════════════════════════

import apiClient, { getErrorMessage } from "./client";

const BASE = "/destination-comments";

export const commentsAPI = {
  // Full list across destinations and countries (paginated, searchable)
  adminGetAll: (params) => apiClient.get(`${BASE}/admin/all`, { params }),

  // Country and destination tables have separate IDs/endpoints, so route by resourceType.
  remove: (id, comment) => comment?.resourceType === "country"
    ? apiClient.delete(`/country-comments/admin/${id}`)
    : apiClient.delete(`${BASE}/admin/${id}`),

  // Approve / unapprove a comment.
  approve: (id, isApproved, comment) => comment?.resourceType === "country"
    ? apiClient.patch(`/country-comments/admin/${id}/approve`, { isApproved })
    : apiClient.patch(`${BASE}/admin/${id}/approve`, { isApproved }),
};

export { getErrorMessage };
export default commentsAPI;
