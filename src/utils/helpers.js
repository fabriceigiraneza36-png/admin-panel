export {
  getAvatarColor,
  getInitials,
} from './formatters'

import { TOKEN_KEY, REFRESH_KEY, ADMIN_KEY } from './constants'

/* ── Token helpers ── */
export const getToken        = () => localStorage.getItem(TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY)
export const getStoredAdmin  = () => {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null') }
  catch { return null }
}

export const setTokens = ({ token, refreshToken, admin }) => {
  if (token)        localStorage.setItem(TOKEN_KEY,   token)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  if (admin)        localStorage.setItem(ADMIN_KEY,   JSON.stringify(admin))
}

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

/* ── Query string builder ── */
export const buildQuery = (params = {}) => {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  return new URLSearchParams(filtered).toString()
}

/* ── Deep clone ── */
export const deepClone = (obj) => {
  try { return JSON.parse(JSON.stringify(obj)) }
  catch { return obj }
}

/* ── Download blob ── */
export const downloadBlob = (data, filename, mimeType = 'text/csv') => {
  const blob   = new Blob([data], { type: mimeType })
  const url    = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/* ── Debounce ── */
export const debounce = (fn, delay = 300) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/* ── Sleep ── */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ── Is empty ── */
export const isEmpty = (val) => {
  if (val == null) return true
  if (typeof val === 'string') return val.trim() === ''
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'object') return Object.keys(val).length === 0
  return false
}

/* ── Safe JSON parse ── */
export const safeParseJSON = (str, fallback = null) => {
  try { return JSON.parse(str) }
  catch { return fallback }
}

/* ── Valid email ── */
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)