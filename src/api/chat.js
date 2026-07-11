// api/chat.js  — Unified: all endpoints now go to /messages/*
import apiClient from "./client";

const BASE = "/messages";

export const chatAPI = {
  /* ── Conversations (was /chat/sessions) ── */
  getConversations: (params)   => apiClient.get(`${BASE}/conversations`, { params }),
  getConversation:  (id)       => apiClient.get(`${BASE}/conversations/${id}`),
  getMessages:      (id, p)    => apiClient.get(`${BASE}/conversations/${id}/messages`, { params: p }),
  adminReply:       (id, d)    => apiClient.post(`${BASE}/conversations/${id}/admin-reply`, d),
  markRead:         (id)       => apiClient.post(`${BASE}/conversations/${id}/admin-read`),
  updateStatus:     (id, d)    => apiClient.patch(`${BASE}/conversations/${id}/status`, d),
  deleteConvo:      (id)       => apiClient.delete(`${BASE}/conversations/${id}`),
  getStats:         ()         => apiClient.get(`${BASE}/stats`),

  /* ── Users ── */
  getUsers:         (params)   => apiClient.get(`${BASE}/users`, { params }),

  /* ── Start conversation ── */
  startWithUser:    (data)     => apiClient.post(`${BASE}/start-with-user`, data),
  getUserConvo:     (userId)   => apiClient.get(`${BASE}/user/${userId}/conversation`),

  /* ── Legacy aliases (keep old code working) ── */
  getSessions:      (params)   => apiClient.get(`${BASE}/conversations`, { params }),
  getSession:       (sid)      => apiClient.get(`${BASE}/conversations/${sid}`),
};