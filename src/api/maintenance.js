import apiClient from './client'

const BASE = '/maintenance'
// Maintenance operations can scan many tables. Use bounded, longer timeouts for
// these endpoints rather than the shorter default used by normal CRUD requests.
const LIST_TIMEOUT_MS = 120_000
// Large categories can span many tables; give server-side purge enough time.
const PURGE_TIMEOUT_MS = 300_000

export const maintenanceAPI = {
  listCategories: () => apiClient.get(`${BASE}/categories`, { timeout: LIST_TIMEOUT_MS }),
  purgeCategory: (category, confirm = 'DELETE_ALL') =>
    apiClient.post(`${BASE}/purge/${encodeURIComponent(category)}`, { confirm }, { timeout: PURGE_TIMEOUT_MS }),
}
