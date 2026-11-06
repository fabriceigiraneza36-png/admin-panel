const readMetadata = (notification) => {
  const raw = notification?.metadata ?? notification?.metadata_json ?? {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return raw && typeof raw === 'object' ? raw : {};
};

const firstValue = (...values) => values.find((value) =>
  value !== undefined && value !== null && String(value).trim() !== ''
);

const queryTarget = (path, values = {}) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });
  const suffix = params.toString();
  return suffix ? path + '?' + suffix : path;
};

const normalizeAdminPath = (explicit, bookingId) => {
  if (!explicit) return null;
  const raw = String(explicit).trim();
  let parsed;
  try {
    parsed = new URL(raw, 'https://altuverapanel.vercel.app');
  } catch {
    return raw;
  }

  const isKnownAdminHost = [
    'altuverapanel.vercel.app',
    'admin.altuverasafaris.com',
  ].includes(parsed.hostname.toLowerCase());
  if (/^https?:/i.test(raw) && !isKnownAdminHost) return raw;

  const pathname = parsed.pathname.replace(/^\/admin(?=\/)/, '');
  const bookingPath = pathname.match(/^\/bookings\/([^/]+)\/?$/i);
  if (bookingPath) return queryTarget('/bookings', { bookingId: decodeURIComponent(bookingPath[1]) });

  if (/^\/bookings\/?$/i.test(pathname)) {
    const id = firstValue(bookingId, parsed.searchParams.get('bookingId'));
    return id
      ? queryTarget('/bookings', {
          bookingId: id,
          ...(parsed.searchParams.get('bookingType') ? { bookingType: parsed.searchParams.get('bookingType') } : {}),
          ...(parsed.searchParams.get('packageId') ? { packageId: parsed.searchParams.get('packageId') } : {}),
          ...(parsed.searchParams.get('bookingSource') ? { bookingSource: parsed.searchParams.get('bookingSource') } : {}),
        })
      : queryTarget('/bookings', Object.fromEntries(parsed.searchParams.entries()));
  }

  // System-generated legacy links sometimes used the dashboard as a generic
  // destination. Keep those alerts in the notification centre instead.
  if (/^\/dashboard\/?$/i.test(pathname)) return null;

  return parsed.pathname + parsed.search;
};

export function getNotificationTarget(notification) {
  if (!notification) return null;

  const metadata = readMetadata(notification);
  const type = String(notification.type || '').toLowerCase();
  const category = String(notification.category || '').toLowerCase();

  const bookingId = firstValue(
    metadata.bookingId, metadata.booking_id, metadata.booking?.id,
    notification.booking_id,
  );
  const packageId = firstValue(metadata.packageId, metadata.package_id, notification.package_id);
  const bookingType = firstValue(metadata.bookingType, metadata.booking_type, notification.booking_type);
  const bookingSource = firstValue(metadata.bookingSource, metadata.booking_source, metadata.source_table, notification.source_table);
  const requestId = firstValue(
    metadata.requestId, metadata.request_id,
    metadata.bookingId, metadata.booking_id, notification.request_id,
  );
  const conversationId = firstValue(
    metadata.conversationId, metadata.conversation_id, notification.conversation_id,
  );
  const userId = firstValue(metadata.userId, metadata.user_id, notification.user_id);
  const commentId = firstValue(
    metadata.commentId, metadata.comment_id, metadata.reviewId, metadata.review_id,
    notification.comment_id,
  );
  const destinationId = firstValue(metadata.destinationId, metadata.destination_id, notification.destination_id);
  const countryId = firstValue(metadata.countryId, metadata.country_id, notification.country_id);
  const postId = firstValue(metadata.postId, metadata.post_id, notification.post_id);
  const contactId = firstValue(metadata.contactId, metadata.contact_id, notification.contact_id);
  const testimonialId = firstValue(metadata.testimonialId, metadata.testimonial_id);
  const authReference = firstValue(
    metadata.referenceId, metadata.reference_id, metadata.incidentReference,
    notification.reference_id,
  );
  const itineraryBookingId = firstValue(metadata.itineraryBookingId, metadata.itinerary_booking_id, bookingId);

  // Authentication defects must open the exact incident in Auth Diagnostics.
  if ((type.includes('auth') || category.includes('auth') || authReference) && authReference) {
    return queryTarget('/auth-diagnostics', { referenceId: authReference });
  }
  if (type.includes('auth') || category.includes('auth')) return '/auth-diagnostics';

  // Portrait/identity alerts are booking work items. Convert legacy
  // /bookings/:id URLs to the query format that opens the booking detail modal.
  if (
    type.includes('portrait') || type.includes('identity') ||
    (category.includes('booking') && bookingId)
  ) {
    const explicitBooking = normalizeAdminPath(
      notification.action_url || notification.actionUrl || notification.link || notification.url,
      bookingId,
    );
    if (explicitBooking && /^\/bookings(?:\?|$)/.test(explicitBooking)) return explicitBooking;
    if (bookingId) return queryTarget('/bookings', {
      bookingId,
      ...(bookingType ? { bookingType } : {}),
      ...(packageId ? { packageId } : {}),
      ...(bookingSource ? { bookingSource } : {}),
    });
  }

  const explicit = firstValue(notification.action_url, notification.actionUrl, notification.link, notification.url);
  if (explicit) {
    const normalized = normalizeAdminPath(explicit, bookingId);
    if (normalized) return normalized;
  }

  if ((type.includes('itinerary') || category.includes('itinerary')) && itineraryBookingId) {
    return '/itineraries/' + encodeURIComponent(itineraryBookingId);
  }
  if ((type.includes('message') || category.includes('message')) && conversationId) {
    return queryTarget('/messages', { conversationId });
  }
  if ((type.includes('booking') || category.includes('booking')) && bookingId) {
    return queryTarget('/bookings', {
      bookingId,
      ...(bookingType ? { bookingType } : {}),
      ...(packageId ? { packageId } : {}),
      ...(bookingSource ? { bookingSource } : {}),
    });
  }
  if ((type.includes('package') || category.includes('package')) && packageId) {
    return queryTarget('/packages', { packageId, requestId });
  }
  if (type.includes('contact') || category.includes('contact')) {
    return queryTarget('/contact', { messageId: contactId || notification.id });
  }
  if (type.includes('testimonial')) {
    return queryTarget('/testimonials', { testimonialId });
  }
  if (type.includes('review') || type.includes('comment') || category.includes('review')) {
    return queryTarget('/comments', { commentId });
  }
  if (type.includes('rating') || category.includes('rating')) {
    return queryTarget('/destination-ratings', { destinationId });
  }
  if (type.includes('like')) return '/likes';
  if ((type.includes('user') || type.includes('traveller') || type.includes('account')) && userId) {
    return queryTarget('/users', { userId });
  }
  if (type.includes('team')) return '/team';
  if (type.includes('country') || category.includes('country')) {
    return queryTarget('/countries', { countryId });
  }
  if (type.includes('destination') || category.includes('destination')) {
    return queryTarget('/destinations', { destinationId });
  }
  if (type.includes('post') || type.includes('blog')) {
    return queryTarget('/posts', { postId });
  }
  if (type.includes('subscriber') || category.includes('subscriber')) return '/subscribers';
  if (type.includes('deletion') || type.includes('account_activity')) return '/account-activity-review';
  if (type.includes('security') || type.includes('recovery') || type.includes('login')) {
    return '/account-activity-review';
  }
  if (type.includes('maintenance')) return '/maintenance';

  // Generic errors, alerts, warnings and system events belong in the inbox.
  // Never route an unrelated notification to the dashboard.
  return '/notifications';
}
