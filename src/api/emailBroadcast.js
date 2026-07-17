// admin/src/api/emailBroadcast.js
// ============================================================
// Admin global email broadcast with audience targeting
// ============================================================

import apiClient from './client'

const BASE = '/email-broadcast'

export const emailBroadcastAPI = {
  // Distinct nationalities (with counts) for the audience dropdown
  getNationalities: () => apiClient.get(`${BASE}/nationalities`),

  // Preview recipient count for an audience
  // audience: 'all' | 'subscribers' | 'bookers' | 'nationality'
  preview: (payload) => apiClient.post(`${BASE}/preview`, payload),

  // Send the broadcast
  send: (payload) => apiClient.post(`${BASE}/send`, payload),
}

export default emailBroadcastAPI
