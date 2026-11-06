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

// ── Fast shared GET cache ─────────────────────────────────────────────────────
// Keeps successful GET responses warm while navigating between admin pages.
// Mutations clear the cache so edits are reflected immediately. Notifications
// stay uncached because their context already manages real-time state.
const GET_CACHE_TTL = 30_000
const getCache = new Map()

const isCacheableGet = (config) => {
  const method = String(config?.method || 'get').toLowerCase()
  const url = String(config?.url || '')
  // Admin counters must reflect current database rows, not the short-lived GET cache.
  const liveCounter = /\/packages\/(?:stats|bookings\/stats)(?:\?|$)/i.test(url)
  return method === 'get' && !url.includes('/notifications') && !liveCounter
}

const cacheKeyFor = (config) => {
  const params = config?.params ? JSON.stringify(config.params) : ''
  return `${String(config?.baseURL || '')}${String(config?.url || '')}?${params}`
}

const clearGetCache = () => getCache.clear()

const originalAdapter = axios.getAdapter(apiClient.defaults.adapter)
apiClient.defaults.adapter = async (config) => {
  if (isCacheableGet(config)) {
    const key = cacheKeyFor(config)
    const cached = getCache.get(key)
    if (cached && Date.now() - cached.timestamp < GET_CACHE_TTL) {
      // Stale-while-revalidate: navigation gets cached data immediately while
      // the same request refreshes the shared cache in the background.
      void originalAdapter(config)
        .then((freshResponse) => {
          getCache.set(key, { timestamp: Date.now(), response: freshResponse })
          window.dispatchEvent(new CustomEvent('altuvera:api-updated', {
            detail: { key, url: config.url },
          }))
        })
        .catch(() => {})

      return {
        ...cached.response,
        data: cached.response.data,
        config,
      }
    }

    const response = await originalAdapter(config)
    getCache.set(key, { timestamp: Date.now(), response })
    return response
  }

  clearGetCache()
  return originalAdapter(config)
}

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

// ── Request interceptor — attach token + invalidate cache on writes ───────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    if (String(config.method || 'get').toLowerCase() !== 'get') clearGetCache()
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


/* ── Admin audit notification for successful deletions ─────────────────────
   Centralize deletion alerts so successful deletes across admin pages receive
   consistent, persisted notifications without duplicating page-level code.
*/
const deletionResources = [
  { pattern: /\/destinations\/[^/]+\/images(?:\/[^/]+)?$/i, key: "destination_image", singular: "destination image", plural: "destination images", actionUrl: "/gallery" },
  { pattern: /\/destinations\/[^/]+\/reviews(?:\/[^/]+)?$/i, key: "destination_review", singular: "destination review", plural: "destination reviews", actionUrl: "/testimonials" },
  { pattern: /\/destinations\/[^/]+\/comments(?:\/[^/]+)?$/i, key: "destination_comment", singular: "destination comment", plural: "destination comments", actionUrl: "/comments" },
  { pattern: /\/packages\/[^/]+\/bookings(?:\/[^/]+)?$/i, key: "package_booking", singular: "package booking", plural: "package bookings", actionUrl: "/bookings" },
  { pattern: /\/package_bookings(?:\/|$)|\/package-bookings(?:\/|$)/i, key: "package_booking", singular: "package booking", plural: "package bookings", actionUrl: "/bookings" },
  { pattern: /\/bookings(?:\/|$)/i, key: "booking", singular: "booking", plural: "bookings", actionUrl: "/bookings" },
  { pattern: /\/destinations(?:\/|$)/i, key: "destination", singular: "destination", plural: "destinations", actionUrl: "/destinations" },
  { pattern: /\/countries(?:\/|$)/i, key: "country", singular: "country", plural: "countries", actionUrl: "/countries" },
  { pattern: /\/packages(?:\/|$)/i, key: "package", singular: "package", plural: "packages", actionUrl: "/packages" },
  { pattern: /\/testimonials(?:\/|$)/i, key: "testimonial", singular: "testimonial", plural: "testimonials", actionUrl: "/testimonials" },
  { pattern: /\/reviews(?:\/|$)/i, key: "review", singular: "review", plural: "reviews", actionUrl: "/testimonials" },
  { pattern: /\/posts(?:\/|$)/i, key: "post", singular: "post", plural: "posts", actionUrl: "/posts" },
  { pattern: /\/comments(?:\/|$)/i, key: "comment", singular: "comment", plural: "comments", actionUrl: "/comments" },
  { pattern: /\/gallery(?:\/|$)/i, key: "gallery_image", singular: "gallery image", plural: "gallery images", actionUrl: "/gallery" },
  { pattern: /\/faqs?(?:\/|$)/i, key: "faq", singular: "FAQ", plural: "FAQs", actionUrl: "/faqs" },
  { pattern: /\/pages(?:\/|$)/i, key: "page", singular: "page", plural: "pages", actionUrl: "/pages" },
  { pattern: /\/tips(?:\/|$)/i, key: "tip", singular: "tip", plural: "tips", actionUrl: "/tips" },
  { pattern: /\/team(?:_members)?(?:\/|$)/i, key: "team_member", singular: "team member", plural: "team members", actionUrl: "/team" },
  { pattern: /\/subscribers?(?:\/|$)/i, key: "subscriber", singular: "subscriber", plural: "subscribers", actionUrl: "/subscribers" },
  { pattern: /\/users?(?:\/|$)/i, key: "user", singular: "user", plural: "users", actionUrl: "/users" },
  { pattern: /\/(?:messages|conversations)(?:\/|$)/i, key: "message", singular: "message or conversation", plural: "messages and conversations", actionUrl: "/messages" },
  { pattern: /\/contact(?:_messages)?(?:\/|$)/i, key: "contact_message", singular: "contact message", plural: "contact messages", actionUrl: "/contact" },
  { pattern: /\/services(?:\/|$)/i, key: "service", singular: "service", plural: "services", actionUrl: "/services" },
];

const parseDeletionBody = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try { return JSON.parse(value) || {}; } catch { return {}; }
  }
  return {};
};

const notifyAdminOfDeletion = (response) => {
  const config = response?.config;
  if (String(config?.method || "").toLowerCase() !== "delete") return;
  if (config?.skipAdminDeletionNotification) return;

  const rawUrl = String(config?.url || "");
  const path = rawUrl
    .replace(/^https?:\/\/[^/]+/i, "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .replace(/^\/api(?=\/)/i, "");
  // Individual notification dismissals must not generate an infinite stream
  // of new alerts. Clearing the whole notification centre is a bulk deletion
  // and receives one final audit entry instead.
  const clearingNotifications = /\/notifications\/clear-all$/i.test(path);
  if (!path || (/\/notifications(?:\/|$)/i.test(path) && !clearingNotifications)) return;

  const descriptor = deletionResources.find((item) => item.pattern.test(path));
  const segments = path.split("/").filter(Boolean);
  const routeName = segments[0] || "records";
  const fallbackLabel = routeName
    .replace(/[_-]+/g, " ")
    .replace(/s$/i, "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const resource = clearingNotifications
    ? { key: "notification", singular: "notification", plural: "notifications", actionUrl: "/notifications" }
    : descriptor || {
      key: routeName,
      singular: fallbackLabel || "record",
      plural: routeName.replace(/[_-]+/g, " "),
      actionUrl: "/" + routeName,
    };

  const requestBody = parseDeletionBody(config?.data);
  const responseBody = response?.data && typeof response.data === "object" ? response.data : {};
  const nestedBody = responseBody.data && typeof responseBody.data === "object" ? responseBody.data : {};
  const ids = [
    requestBody.ids,
    requestBody.record_ids,
    requestBody.selected_ids,
    requestBody.selectedIds,
  ].find(Array.isArray) || [];
  const reportedCount = responseBody.deletedCount ?? responseBody.deleted_count
    ?? nestedBody.deletedCount ?? nestedBody.deleted_count
    ?? responseBody.count ?? nestedBody.count
    ?? responseBody.deleted ?? nestedBody.deleted;
  if (clearingNotifications && reportedCount != null && Number(reportedCount) === 0) return;
  const count = ids.length > 1
    ? ids.length
    : (reportedCount != null && Number.isFinite(Number(reportedCount)) && Number(reportedCount) > 1
      ? Math.floor(Number(reportedCount))
      : 1);
  const returnedRecord = Array.isArray(nestedBody) ? nestedBody[0]
    : nestedBody.record || nestedBody.item || nestedBody;
  const name = returnedRecord && typeof returnedRecord === "object"
    ? (returnedRecord.name || returnedRecord.title || returnedRecord.full_name
      || returnedRecord.fullName || returnedRecord.email || returnedRecord.booking_number
      || returnedRecord.package_name || returnedRecord.destination_name || "")
    : "";
  const recordId = ids.length === 1
    ? ids[0]
    : [...segments].reverse().find((part) => /^\d+$/.test(part) || /^[a-f0-9-]{16,}$/i.test(part)) || null;
  const isBulk = count > 1;
  const quotedName = name ? " “" + String(name).slice(0, 120) + "”" : "";
  const title = clearingNotifications
    ? "Notification centre cleared"
    : isBulk
      ? count + " " + resource.plural + " deleted"
      : resource.singular + (name ? " deleted: " + String(name).slice(0, 100) : " deleted");
  const message = clearingNotifications
    ? count + " existing admin notification" + (count === 1 ? " was" : "s were")
      + " cleared from the notification centre. This audit entry was retained for your records."
    : isBulk
      ? "A bulk deletion completed successfully. " + count + " selected " + resource.plural + " were removed from the " + resource.plural + " workspace."
      : resource.singular + (quotedName || (recordId ? " #" + recordId : "")) + " was successfully removed from the " + resource.plural + " workspace.";

  void apiClient.post("/notifications", {
    type: isBulk ? "warning" : "system",
    category: "admin_activity",
    priority: isBulk ? "high" : "normal",
    target_scope: "admin",
    title,
    message,
    action_url: resource.actionUrl,
    action_label: "Open " + resource.plural,
    metadata: {
      action: clearingNotifications ? "clear_all" : isBulk ? "bulk_delete" : "delete",
      resource: resource.key,
      count,
      record_id: recordId,
      record_ids: ids,
      record_name: name || null,
      request_path: path,
      deleted_at: new Date().toISOString(),
    },
    send_email: false,
  }).catch((error) => {
    console.warn("[Admin audit] Could not create deletion notification:", error?.message || error);
  });
};

// ── Response interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => {
    notifyAdminOfDeletion(response);
    return response;
  },
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
  remove: (id, config = {}) => apiClient.delete(`${base}/${id}`, config),
})

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ─ Both  import apiClient from '@api/client'          ← default
// ─ and   import { apiClient } from '@api/client'      ← named
// ─ work with this file.
// ═══════════════════════════════════════════════════════════════════════════════

export default apiClient