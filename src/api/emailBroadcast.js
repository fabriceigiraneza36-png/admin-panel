// admin/src/api/emailBroadcast.js
// ============================================================
// Admin global email broadcast with audience targeting
// ============================================================

import apiClient from './client'

const BASE = '/email-broadcast'

export const emailBroadcastAPI = {
  getPendingQueue: () => apiClient.get(`${BASE}/queue/pending`),
  updateQueuedTemplate: (id, template) => apiClient.put(`${BASE}/queue/${encodeURIComponent(id)}/template`, { template }),
  sendQueuedNow: (id, template) => apiClient.post(`${BASE}/queue/${encodeURIComponent(id)}/send-now`, { template }),

  // Persisted reusable email designs and recent delivery history
  getTemplates: () => apiClient.get(`${BASE}/templates`),
  saveTemplate: (payload) => apiClient.post(`${BASE}/templates`, payload),
  getHistory: () => apiClient.get(`${BASE}/history`),

  // Distinct nationalities (with counts) for the audience dropdown
  getNationalities: () => apiClient.get(`${BASE}/nationalities`),

  // Preview recipient count for an audience
  // audience: 'all' | 'subscribers' | 'bookers' | 'nationality'
  preview: (payload) => apiClient.post(`${BASE}/preview`, payload),

  // Send the broadcast
  send: (payload) => apiClient.post(`${BASE}/send`, payload),
}

export default emailBroadcastAPI
