import apiClient from './client'

const BASE = '/maintenance'

export const maintenanceAPI = {
  listCategories: () => apiClient.get(`${BASE}/categories`),
  purgeCategory: (category, confirm = 'DELETE_ALL') =>
    apiClient.post(`${BASE}/purge/${category}`, { confirm }),
}
