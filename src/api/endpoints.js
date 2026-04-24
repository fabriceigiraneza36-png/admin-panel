export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/admin/auth/login',
    REFRESH: '/api/admin/auth/refresh-token',
    ME: '/api/admin/auth/me',
    LOGOUT: '/api/admin/auth/logout',
    CHANGE_PASSWORD: '/api/admin/auth/change-password',
  },

  // Countries
  COUNTRIES: {
    LIST: '/api/countries',
    CREATE: '/api/countries',
    UPDATE: (id) => `/api/countries/${id}`,
    DELETE: (id) => `/api/countries/${id}`,
    DETAILS: (id) => `/api/countries/${id}`,
    STATS: '/api/countries/stats',
    AIRPORTS: {
      ADD: (id) => `/api/countries/${id}/airports`,
      DELETE: (id, airportId) => `/api/countries/${id}/airports/${airportId}`,
    },
    FESTIVALS: {
      ADD: (id) => `/api/countries/${id}/festivals`,
      DELETE: (id, festivalId) => `/api/countries/${id}/festivals/${festivalId}`,
    },
    UNESCO: {
      ADD: (id) => `/api/countries/${id}/unesco-sites`,
      DELETE: (id, siteId) => `/api/countries/${id}/unesco-sites/${siteId}`,
    },
  },

  // Destinations
  DESTINATIONS: {
    LIST: '/api/destinations',
    CREATE: '/api/destinations',
    UPDATE: (id) => `/api/destinations/${id}`,
    DELETE: (id) => `/api/destinations/${id}`,
    DETAILS: (id) => `/api/destinations/${id}`,
    STATS: '/api/destinations/stats',
    BULK_UPDATE: '/api/destinations/bulk',
    IMAGES: {
      ADD: (id) => `/api/destinations/${id}/images`,
      UPDATE: (id, imageId) => `/api/destinations/${id}/images/${imageId}`,
      DELETE: (id, imageId) => `/api/destinations/${id}/images/${imageId}`,
      REORDER: (id) => `/api/destinations/${id}/images/reorder`,
    },
    ITINERARY: {
      ADD: (id) => `/api/destinations/${id}/itinerary`,
      UPDATE: (id, dayId) => `/api/destinations/${id}/itinerary/${dayId}`,
      DELETE: (id, dayId) => `/api/destinations/${id}/itinerary/${dayId}`,
    },
    FAQS: {
      ADD: (id) => `/api/destinations/${id}/faqs`,
      UPDATE: (id, faqId) => `/api/destinations/${id}/faqs/${faqId}`,
      DELETE: (id, faqId) => `/api/destinations/${id}/faqs/${faqId}`,
    },
  },

  // Bookings
  BOOKINGS: {
    LIST: '/api/bookings',
    DETAILS: (id) => `/api/bookings/${id}`,
    UPDATE: (id) => `/api/bookings/${id}`,
    DELETE: (id) => `/api/bookings/${id}`,
    STATS: '/api/bookings/stats',
    UPDATE_STATUS: (id) => `/api/bookings/${id}/status`,
    CONFIRM: (id) => `/api/bookings/${id}/confirm`,
    CANCEL: (id) => `/api/bookings/${id}/cancel`,
    ADD_NOTES: (id) => `/api/bookings/${id}/notes`,
    EXPORT: '/api/bookings/export',
    BULK_STATUS: '/api/bookings/bulk-status',
  },

  // Posts
  POSTS: {
    LIST: '/api/posts/admin/all',
    CREATE: '/api/posts',
    UPDATE: (id) => `/api/posts/${id}`,
    DELETE: (id) => `/api/posts/${id}`,
    TOGGLE_PUBLISH: (id) => `/api/posts/${id}/toggle-publish`,
    TOGGLE_FEATURED: (id) => `/api/posts/${id}/toggle-featured`,
    BULK_DELETE: '/api/posts/bulk-delete',
    STATS: '/api/posts/stats',
  },

  // Contact
  CONTACT: {
    LIST: '/api/contact',
    DETAILS: (id) => `/api/contact/${id}`,
    UPDATE: (id) => `/api/contact/${id}`,
    DELETE: (id) => `/api/contact/${id}`,
    MARK_READ: (id) => `/api/contact/${id}/read`,
    STAR: (id) => `/api/contact/${id}/star`,
    ARCHIVE: (id) => `/api/contact/${id}/archive`,
    REPLY: (id) => `/api/contact/${id}/reply`,
    STATS: '/api/contact/stats',
    EXPORT: '/api/contact/export',
    BULK: '/api/contact/bulk',
  },

  // Team
  TEAM: {
    LIST: '/api/team/admin/all',
    CREATE: '/api/team',
    UPDATE: (id) => `/api/team/${id}`,
    DELETE: (id) => `/api/team/${id}`,
    BULK_DELETE: '/api/team/bulk-delete',
    REORDER: '/api/team/reorder',
    TOGGLE_STATUS: (id) => `/api/team/${id}/toggle-status`,
    STATS: '/api/team/stats',
  },

  // Gallery
  GALLERY: {
    LIST: '/api/gallery',
    CREATE: '/api/gallery',
    BULK_CREATE: '/api/gallery/bulk',
    UPDATE: (id) => `/api/gallery/${id}`,
    DELETE: (id) => `/api/gallery/${id}`,
  },

  // Services
  SERVICES: {
    LIST: '/api/services',
    CREATE: '/api/services',
    UPDATE: (id) => `/api/services/${id}`,
    DELETE: (id) => `/api/services/${id}`,
  },

  // FAQs
  FAQS: {
    LIST: '/api/faqs',
    CREATE: '/api/faqs',
    UPDATE: (id) => `/api/faqs/${id}`,
    DELETE: (id) => `/api/faqs/${id}`,
  },

  // Tips
  TIPS: {
    LIST: '/api/tips',
    CREATE: '/api/tips',
    UPDATE: (id) => `/api/tips/${id}`,
    DELETE: (id) => `/api/tips/${id}`,
  },

  // Subscribers
  SUBSCRIBERS: {
    LIST: '/api/subscribers',
    DELETE: (id) => `/api/subscribers/${id}`,
  },

  // Settings
  SETTINGS: {
    LIST: '/api/settings',
    UPDATE: (id) => `/api/settings/${id}`,
  },

  // Uploads
  UPLOADS: {
    IMAGE: '/api/uploads/image',
    IMAGES: '/api/uploads/images',
    DELETE: (publicId) => `/api/uploads/asset/${publicId}`,
  },
};