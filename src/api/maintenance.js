import apiClient from './client'

const BASE = '/maintenance'
// Purges are queued immediately and then polled through short, bounded requests.
const LIST_TIMEOUT_MS = 30_000
const REQUEST_TIMEOUT_MS = 15_000

export const maintenanceAPI = {
  listCategories: () => apiClient.get(`${BASE}/categories`, { timeout: LIST_TIMEOUT_MS }),
  purgeCategory: (category, confirm = 'DELETE_ALL') =>
    apiClient.post(`${BASE}/purge/${encodeURIComponent(category)}`, { confirm }, { timeout: REQUEST_TIMEOUT_MS }),
  getPurgeJob: (jobId) =>
    apiClient.get(`${BASE}/jobs/${encodeURIComponent(jobId)}`, { timeout: REQUEST_TIMEOUT_MS }),
}
