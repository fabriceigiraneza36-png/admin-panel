import apiClient from './client'

const BASE = '/chat'

export const chatAPI = {
  getSessions:  (params) => apiClient.get(`${BASE}/sessions`, { params }),
  getSession:   (sid)    => apiClient.get(`${BASE}/sessions/${sid}`),
  getMessages:  (sid, p) => apiClient.get(`${BASE}/sessions/${sid}/messages`, { params: p }),
  closeSession: (sid)    => apiClient.post(`${BASE}/sessions/${sid}/close`),
  deleteSession:(sid)    => apiClient.delete(`${BASE}/sessions/${sid}`),
}   