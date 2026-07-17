// admin/src/api/client.js
// ═══════════════════════════════════════════════════════════════════════════════
// Central Axios HTTP client v2.2
// ─ Named export:   apiClient   (used by all api/* files)
// ─ Default export: apiClient   (same instance)
// ─ Named export:   getErrorMessage
// ─ Named export:   createEndpoint
// ─ Named export:   notificationsAPI  (convenience re-export)
// ═══════════════════════════════════════════════════════════════════════════════

import axios from 'axios'
import { API_BASE, TOKEN_KEY, REFRESH_KEY, ADMIN_KEY } from '@utils/constants'

// ── Instance ──────────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
})

// ── Auth helpers ──────────────────────────────────────────────────────────────

const getToken   = () => localStorage.getItem(TOKEN_KEY)   || null
const getRefresh = () => localStorage.getItem(REFRESH_KEY) || null

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// ── Request interceptor — attach token ────────────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ── Refresh-token queue ───────────────────────────────────────────────────────

let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  )
  failedQueue = []
}

// ── Refresh token paths ───────────────────────────────────────────────────────

const REFRESH_PATHS = [
  '/admin/auth/refresh-token',
  '/adminAuth/refresh-token',
]

const attemptRefresh = async (refreshToken) => {
  for (const path of REFRESH_PATHS) {
    try {
      const { data } = await axios.post(`${API_BASE}${path}`, { refreshToken })
      const token = data?.token || data?.data?.token || null
      if (token) return token
    } catch (err) {
      if (err?.response?.status !== 404) throw err
    }
  }
  throw new Error('No token returned from any refresh endpoint')
}

// ── Response interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // 5xx — log and reject immediately
    if (error.response?.status >= 500) {
      console.error(
        '[API] Server error:',
        error.response.status,
        original?.url,
      )
      return Promise.reject(error)
    }

    // Skip refresh for auth endpoints
    const isAuthEndpoint =
      original?.url?.includes('/auth/') ||
      original?.url?.includes('/adminAuth/')

    // 401 — attempt silent token refresh
    if (
      error.response?.status === 401 &&
      !original?._retry &&
      !isAuthEndpoint
    ) {
      const refreshToken = getRefresh()

      if (!refreshToken) {
        clearAuth()
        redirectToLogin()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return apiClient(original)
        })
      }

      original._retry = true
      isRefreshing    = true

      try {
        const newToken = await attemptRefresh(refreshToken)

        localStorage.setItem(TOKEN_KEY, newToken)
        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`

        processQueue(null, newToken)

        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuth()
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR MESSAGE EXTRACTOR
// Always returns a plain string — never an object or undefined.
// ═══════════════════════════════════════════════════════════════════════════════

export const getErrorMessage = (error) => {
  if (!error) return 'An error occurred'

  if (error.response?.data) {
    const d = error.response.data
    if (typeof d.error   === 'string') return d.error
    if (typeof d.message === 'string') return d.message
    if (typeof d.msg     === 'string') return d.msg
    if (typeof d         === 'string') return d
  }

  switch (error.response?.status) {
    case 400: return 'Bad request — please check your input'
    case 401: return 'Unauthorized — please log in again'
    case 403: return 'Access denied'
    case 404: return 'Resource not found (404)'
    case 409: return 'Conflict — this record already exists'
    case 422: return 'Validation error — check your input'
    case 429: return 'Too many requests — please slow down'
    case 500: return 'Server error — please try again later'
    case 502: return 'Bad gateway — server is temporarily unavailable'
    case 503: return 'Service unavailable — please try again'
    default:  break
  }

  if (error.code === 'ECONNABORTED') return 'Request timed out — please try again'
  if (error.code === 'ERR_NETWORK')  return 'Network error — check your connection'

  if (typeof error.message === 'string') return error.message
  if (typeof error         === 'string') return error

  return 'An unexpected error occurred'
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD ENDPOINT FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const createEndpoint = (base) => ({
  getAll: (params)   => apiClient.get(`${base}`,        { params }),
  getOne: (id)       => apiClient.get(`${base}/${id}`),
  create: (data)     => apiClient.post(`${base}`,        data),
  update: (id, data) => apiClient.put(`${base}/${id}`,   data),
  patch:  (id, data) => apiClient.patch(`${base}/${id}`, data),
  remove: (id)       => apiClient.delete(`${base}/${id}`),
})

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ─ Both  import apiClient from '@api/client'          ← default
// ─ and   import { apiClient } from '@api/client'      ← named
// ─ work with this file.
// ═══════════════════════════════════════════════════════════════════════════════

export default apiClient