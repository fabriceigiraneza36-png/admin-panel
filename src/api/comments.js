// src/api/comments.js
// ═══════════════════════════════════════════════════════════════════════════
// Destination Comments API (admin)
// Backend routes:
//   GET    /api/destination-comments/admin/all           → adminGetAllComments
//   DELETE /api/destination-comments/admin/:commentId    → adminDeleteComment
//   PATCH  /api/destination-comments/admin/:commentId/approve → adminApproveComment
// ═══════════════════════════════════════════════════════════════════════════

import apiClient, { getErrorMessage } from "./client";

const BASE = "/destination-comments";

export const commentsAPI = {
  // Full list across every destination (paginated, searchable)
  adminGetAll: (params) => apiClient.get(`${BASE}/admin/all`, { params }),

  // Delete any comment by id
  remove: (id) => apiClient.delete(`${BASE}/admin/${id}`),

  // Approve / unapprove a comment
  approve: (id, isApproved) =>
    apiClient.patch(`${BASE}/admin/${id}/approve`, { isApproved }),
};

export { getErrorMessage };
export default commentsAPI;
