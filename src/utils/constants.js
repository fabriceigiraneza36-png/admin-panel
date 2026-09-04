export const APP_NAME    = 'Altuvera Safaris Admin'
export const APP_VERSION = '6.2'

export const API_BASE   = import.meta.env.VITE_API_URL   || 'https://backend-jd8f.onrender.com/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://backend-jd8f.onrender.com'

export const TOKEN_KEY   = 'altuvera_admin_token'
export const REFRESH_KEY = 'altuvera_refresh_token'
export const ADMIN_KEY   = 'altuvera_admin'

export const DEFAULT_PAGE_SIZE  = 20
export const PAGE_SIZE_OPTIONS  = [10, 20, 50, 100]

export const BOOKING_STATUSES = [
  { value: 'pending',   label: 'Pending'   },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const DESTINATION_STATUSES = [
  { value: 'draft',     label: 'Draft'     },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived'  },
]

export const CONTACT_STATUSES = [
  { value: 'new',      label: 'New'      },
  { value: 'read',     label: 'Read'     },
  { value: 'replied',  label: 'Replied'  },
  { value: 'archived', label: 'Archived' },
  { value: 'spam',     label: 'Spam'     },
]

export const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low'    },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High'   },
  { value: 'urgent', label: 'Urgent' },
]

export const REVIEW_STATUSES = [
  { value: 'pending',  label: 'Pending'  },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export const CONTINENTS = [
  'Africa', 'Asia', 'Europe', 'North America',
  'South America', 'Oceania', 'Antarctica',
]

export const DESTINATION_CATEGORIES = [
  'wildlife', 'beach', 'mountain', 'cultural',
  'adventure', 'city', 'historical', 'nature',
  'water', 'desert', 'forest', 'island',
]

export const DIFFICULTY_LEVELS = [
  { value: 'easy',     label: 'Easy'     },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard',     label: 'Hard'     },
  { value: 'expert',   label: 'Expert'   },
]

export const TRIP_PHASES = [
  { value: 'before', label: 'Before Trip' },
  { value: 'during', label: 'During Trip' },
  { value: 'after',  label: 'After Trip'  },
  { value: 'all',    label: 'All Phases'  },
]

export const ADMIN_ROLES = [
  { value: 'admin',     label: 'Admin'     },
  { value: 'moderator', label: 'Moderator' },
  { value: 'editor',    label: 'Editor'    },
  { value: 'viewer',    label: 'Viewer'    },
]

// ── NAV_ITEMS — updated v6.8 with Notifications ───────────────────────────────
export const NAV_ITEMS = [
  { path: '/dashboard',      label: 'Dashboard',      icon: 'LayoutDashboard' },
  { path: '/countries',      label: 'Countries',      icon: 'Globe2'          },
  { path: '/destinations',   label: 'Destinations',   icon: 'MapPin'          },
  { path: '/bookings',       label: 'Bookings',       icon: 'CalendarCheck'   },
  { path: '/packages',       label: 'Packages',       icon: 'Package'         },
  { path: '/users',          label: 'Users',          icon: 'Users'           },
  { path: '/posts',          label: 'Blog Posts',     icon: 'FileText'        },
  { path: '/faqs',           label: 'FAQs',           icon: 'HelpCircle'      },
  { path: '/tips',           label: 'Travel Tips',    icon: 'Lightbulb'       },
  { path: '/team',           label: 'Team',           icon: 'UserCircle'      },
  { path: '/testimonials',   label: 'Testimonials',   icon: 'Star'            },
  { path: '/gallery',        label: 'Gallery',        icon: 'Image'           },
  { path: '/contact',        label: 'Contact',        icon: 'MessageSquare'   },
  { path: '/subscribers',    label: 'Subscribers',    icon: 'Mail'            },
  { path: '/notifications',  label: 'Notifications',  icon: 'Bell'            }, // ← NEW
  { path: '/settings',       label: 'Settings',       icon: 'Settings'        },
]

export const NOTIFICATION_TYPES = {
  BOOKING: 'booking',
  MESSAGE: 'message',
  REVIEW:  'review',
  USER:    'user',
  CHAT:    'chat',
  SYSTEM:  'system',
}

export const NOTIFICATION_TYPE_OPTIONS = [
  { value: 'general',            label: 'General'            },
  { value: 'booking_created',    label: 'Booking Created'    },
  { value: 'booking_updated',    label: 'Booking Updated'    },
  { value: 'booking_confirmed',  label: 'Booking Confirmed'  },
  { value: 'booking_cancelled',  label: 'Booking Cancelled'  },
  { value: 'booking_deleted',    label: 'Booking Deleted'    },
  { value: 'new_destination',    label: 'New Destination'    },
  { value: 'new_country',        label: 'New Country'        },
  { value: 'new_post',           label: 'New Post'           },
  { value: 'new_package',        label: 'New Package'        },
  { value: 'promotion',          label: 'Promotion'          },
  { value: 'warning',            label: 'Warning'            },
  { value: 'alert',              label: 'Alert'              },
  { value: 'system',             label: 'System'             },
]

export const SOCKET_EVENTS = {
  CONNECT:              'connect',
  DISCONNECT:           'disconnect',
  CHAT_REGISTER:        'chat:register',
  CHAT_MESSAGE:         'chat:message',
  CHAT_TYPING:          'chat:typing',
  ADMIN_SEND:           'admin:send-message',
  ADMIN_JOIN:           'admin:join-session',
  NEW_CHAT:             'new-chat-message',
  NEW_BOOKING:          'new-booking',
  NEW_MESSAGE:          'new-contact-message',
  NEW_REVIEW:           'new-review',
  NOTIFICATION_NEW:     'notification:new',       // ← NEW
  NOTIFICATION_UPDATED: 'notification:updated',   // ← NEW
  NOTIFICATION_UNREAD:  'notification:unread-count', // ← NEW
}