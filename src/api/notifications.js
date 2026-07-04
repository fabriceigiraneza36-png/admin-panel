// admin/src/api/notifications.js
import client from './client';

const notificationsAPI = {
  // ── Fetch all notifications (admin view) ──────────────────────────────────
  getAll: (params = {}) =>
    client.get('/notifications/admin', { params }).then(r => r.data),

  // ── Stats ─────────────────────────────────────────────────────────────────
  getStats: () =>
    client.get('/notifications/admin/stats').then(r => r.data),

  // ── Create / broadcast ────────────────────────────────────────────────────
  create: (data) =>
    client.post('/notifications', data).then(r => r.data),

  broadcast: (data) =>
    client.post('/notifications', {
      ...data,
      targetScope: 'all',
    }).then(r => r.data),

  // ── Admin reply to user's reply ───────────────────────────────────────────
  adminReply: (id, adminReply) =>
    client.post(`/notifications/${id}/admin-reply`, { adminReply }).then(r => r.data),

  // ── Delete ────────────────────────────────────────────────────────────────
  adminDelete: (id) =>
    client.delete(`/notifications/${id}/admin`).then(r => r.data),

  // ── Checklist PDF delivery ────────────────────────────────────────────────
  sendChecklist: (data) =>
    client.post('/notifications/admin/send-checklist', data).then(r => r.data),

  // ── Payment actions ───────────────────────────────────────────────────────
  confirmPayment: (data) =>
    client.post('/notifications/admin/confirm-payment', data).then(r => r.data),

  requestPayment: (data) =>
    client.post('/notifications/admin/request-payment', data).then(r => r.data),
};

export default notificationsAPI;