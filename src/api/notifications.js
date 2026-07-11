// admin/src/api/notifications.js
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return (
    localStorage.getItem('adminToken') ||
    localStorage.getItem('token')      ||
    sessionStorage.getItem('adminToken') ||
    ''
  );
}

async function req(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${getToken()}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

const notificationsAPI = {
  // Admin
  getAll:          (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/notifications/admin?${qs}`);
  },
  getStats:        ()                  => req('GET',    '/notifications/admin/stats'),
  getTargetGroups: ()                  => req('GET',    '/notifications/admin/target-groups'),
  create:          (body)              => req('POST',   '/notifications',               body),
  adminReply:      (id, adminReply)    => req('POST',   `/notifications/${id}/admin-reply`, { adminReply }),
  adminDelete:     (id)               => req('DELETE',  `/notifications/${id}/admin`),
  sendChecklist:   (body)              => req('POST',   '/notifications/admin/send-checklist',  body),
  confirmPayment:  (body)              => req('POST',   '/notifications/admin/confirm-payment', body),
  requestPayment:  (body)              => req('POST',   '/notifications/admin/request-payment', body),
};

export default notificationsAPI;