import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

/* ── Date formatting ── */
export const formatDate = (date, pattern = 'MMM dd, yyyy') => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date)
    return isValid(d) ? format(d, pattern) : '—'
  } catch { return '—' }
}

export const formatDateTime = (date) =>
  formatDate(date, 'MMM dd, yyyy • HH:mm')

export const formatTimeAgo = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date)
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—'
  } catch { return '—' }
}

export const formatTime = (date) => formatDate(date, 'HH:mm')

/* ── Numbers ── */
export const formatNumber = (n) => {
  if (n == null) return '0'
  return new Intl.NumberFormat('en-US').format(n)
}

export const formatCompact = (n) => {
  if (n == null) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export const formatPercent = (n, decimals = 1) => {
  if (n == null) return '0%'
  return `${Number(n).toFixed(decimals)}%`
}

/* ── Text ── */
export const truncate = (str, len = 50) => {
  if (!str) return ''
  return str.length > len ? `${str.slice(0, len)}…` : str
}

export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const titleCase = (str) => {
  if (!str) return ''
  return str.split(/[\s_-]+/).map(capitalize).join(' ')
}

export const slugify = (str) => {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/* ── Avatar helpers — exported from BOTH formatters & helpers ── */
const AVATAR_COLORS = [
  'bg-green-500',   'bg-emerald-500', 'bg-teal-500',
  'bg-blue-500',    'bg-indigo-500',  'bg-violet-500',
  'bg-orange-500',  'bg-rose-500',    'bg-cyan-500',
]

export const getAvatarColor = (str) => {
  if (!str) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

/* ── Rating ── */
export const formatRating = (rating) => {
  if (!rating) return '0.0'
  return Number(rating).toFixed(1)
}

/* ── File size ── */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k     = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i     = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/* ── Booking number ── */
export const formatBookingNumber = (num) =>
  num ? `#${num}` : '—'

/* ── Array to comma string ── */
export const arrayToString = (arr, limit = 3) => {
  if (!Array.isArray(arr) || arr.length === 0) return '—'
  const shown = arr.slice(0, limit)
  const rest  = arr.length - limit
  return rest > 0 ? `${shown.join(', ')} +${rest}` : shown.join(', ')
}