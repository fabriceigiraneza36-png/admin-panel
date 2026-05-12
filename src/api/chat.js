import apiClient from './client'

const BASE = '/messages'

export const chatAPI = {
  // Legacy chat routes
  getSessions:  (params)   => apiClient.get('/chat/sessions', { params }),
  getSession:   (sid)      => apiClient.get(`/chat/sessions/${sid}`),

  // New messaging system
  getConversations: (params) => apiClient.get(`${BASE}/conversations`, { params }),
  getConversation:  (id)     => apiClient.get(`${BASE}/conversations/${id}`),
  getMessages:      (id, p)  => apiClient.get(`${BASE}/conversations/${id}/messages`, { params: p }),
  adminReply:       (id, d)  => apiClient.post(`${BASE}/conversations/${id}/admin-reply`, d),
  updateStatus:     (id, d)  => apiClient.patch(`${BASE}/conversations/${id}/status`, d),
  markRead:         (id)     => apiClient.post(`${BASE}/conversations/${id}/admin-read`),
  deleteConvo:      (id)     => apiClient.delete(`${BASE}/conversations/${id}`),
  getStats:         ()       => apiClient.get(`${BASE}/stats`),

  // User listing for chat
  getUsers:         (params) => apiClient.get(`${BASE}/users`, { params }),

  // Start conversation with specific user
  startWithUser:    (data)   => apiClient.post(`${BASE}/start-with-user`, data),

  // Get conversation with specific user
  getUserConvo:     (userId) => apiClient.get(`${BASE}/user/${userId}/conversation`),
}