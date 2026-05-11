import apiClient from './client'

const BASE = '/settings'

export const settingsAPI = {
  getAll:    ()     => apiClient.get(BASE),
  update:    (data) => apiClient.put(BASE, data),
  testEmail: ()     => apiClient.post(`${BASE}/email-test`),
}