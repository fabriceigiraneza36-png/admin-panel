export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  COUNTRIES: '/countries',
  DESTINATIONS: '/destinations',
  BOOKINGS: '/bookings',
  POSTS: '/posts',
  CONTACT: '/contact',
  TEAM: '/team',
  GALLERY: '/gallery',
  SERVICES: '/services',
  FAQS: '/faqs',
  TIPS: '/tips',
  SUBSCRIBERS: '/subscribers',
  SETTINGS: '/settings',
  PROFILE: '/profile',
};

export const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on-hold',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
};

export const BOOKING_STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  'on-hold': 'info',
  completed: 'success',
  refunded: 'info',
};

export const MESSAGE_STATUSES = {
  NEW: 'new',
  READ: 'read',
  REPLIED: 'replied',
  ARCHIVED: 'archived',
  SPAM: 'spam',
};

export const MESSAGE_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const CONTINENTS = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Antarctica',
];

export const DESTINATION_CATEGORIES = [
  'National Park',
  'Beach',
  'Mountain',
  'City',
  'Island',
  'Desert',
  'Wildlife Reserve',
  'Cultural Site',
  'Adventure',
];

export const DESTINATION_DIFFICULTIES = [
  'Easy',
  'Moderate',
  'Challenging',
  'Difficult',
  'Expert',
];

export const POST_CATEGORIES = [
  'Travel Guide',
  'Destination',
  'Tips & Tricks',
  'Culture',
  'Wildlife',
  'Adventure',
  'Food & Cuisine',
  'Photography',
];

export const TEAM_DEPARTMENTS = [
  'Guides',
  'Management',
  'Operations',
  'Marketing',
  'Customer Service',
  'IT',
];

export const GALLERY_CATEGORIES = [
  'Wildlife',
  'Landscape',
  'Culture',
  'Adventure',
  'People',
  'Food',
  'Architecture',
];

export const TIP_CATEGORIES = [
  'Packing',
  'Health & Safety',
  'Money',
  'Culture',
  'Photography',
  'Transportation',
  'Accommodation',
];

export const PAGINATION_LIMITS = [10, 20, 50, 100];

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME: 'HH:mm',
};