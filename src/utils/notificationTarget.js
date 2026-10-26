export function getNotificationTarget(notification) {
  if (!notification) return null

  const metadata = typeof notification.metadata === 'string'
    ? (() => { try { return JSON.parse(notification.metadata) } catch { return {} } })()
    : notification.metadata || {}

  const type = String(notification.type || '').toLowerCase()
  const category = String(notification.category || '').toLowerCase()
  const bookingId = metadata.bookingId || metadata.booking_id || metadata.booking?.id || notification.booking_id
  const packageId = metadata.packageId || metadata.package_id || notification.package_id
  const requestId = metadata.requestId || metadata.request_id || metadata.bookingId || metadata.booking_id
  const conversationId = metadata.conversationId || metadata.conversation_id || notification.conversation_id
  const userId = metadata.userId || metadata.user_id || notification.user_id
  const commentId = metadata.commentId || metadata.comment_id || metadata.reviewId || metadata.review_id || notification.comment_id
  const destinationId = metadata.destinationId || metadata.destination_id || notification.destination_id
  const countryId = metadata.countryId || metadata.country_id || notification.country_id
  const postId = metadata.postId || metadata.post_id || notification.post_id
  const itineraryBookingId = metadata.itineraryBookingId || metadata.itinerary_booking_id || bookingId

  const explicit = notification.action_url || notification.actionUrl || notification.link || notification.url
  if (explicit) {
    if (bookingId && /^\/bookings\/?$/.test(explicit)) return `/bookings?bookingId=${encodeURIComponent(bookingId)}`
    if (packageId && /^\/packages\/?$/.test(explicit)) {
      const params = new URLSearchParams({ packageId: String(packageId) })
      if (requestId) params.set('requestId', String(requestId))
      return `/packages?${params.toString()}`
    }
    if (conversationId && /^\/messages\/?$/.test(explicit)) return `/messages?conversationId=${encodeURIComponent(conversationId)}`
    return explicit
  }

  if ((type.includes('itinerary') || category.includes('itinerary')) && itineraryBookingId) {
    return `/itineraries/${encodeURIComponent(itineraryBookingId)}`
  }
  if ((type.startsWith('message') || category.includes('message')) && conversationId) return `/messages?conversationId=${encodeURIComponent(conversationId)}`
  if ((type.includes('booking') || category.includes('booking')) && bookingId) return `/bookings?bookingId=${encodeURIComponent(bookingId)}`
  if ((type.includes('package') || category.includes('package')) && packageId) {
    const params = new URLSearchParams({ packageId: String(packageId) })
    if (requestId) params.set('requestId', String(requestId))
    return `/packages?${params.toString()}`
  }
  if (type.includes('contact') || category.includes('contact')) return `/contact${metadata.contactId || notification.id ? `?messageId=${encodeURIComponent(metadata.contactId || notification.id)}` : ''}`
  if (type.includes('review') || type.includes('comment') || category.includes('review')) {
    return commentId ? `/comments?commentId=${encodeURIComponent(commentId)}` : '/comments'
  }
  if (type.includes('rating') || category.includes('rating')) return '/destination-ratings'
  if (type.includes('like')) return '/likes'
  if ((type.includes('user') || type.includes('traveller') || type.includes('account')) && userId) return `/users?userId=${encodeURIComponent(userId)}`
  if (type.includes('team')) return '/team'
  if (type.includes('country') || category.includes('country')) return countryId ? `/countries?countryId=${encodeURIComponent(countryId)}` : '/countries'
  if (type.includes('destination') || category.includes('destination')) return destinationId ? `/destinations?destinationId=${encodeURIComponent(destinationId)}` : '/destinations'
  if (type.includes('post') || type.includes('blog')) return postId ? `/posts?postId=${encodeURIComponent(postId)}` : '/posts'
  if (type.includes('subscriber') || category.includes('subscriber')) return '/subscribers'
  if (type.includes('security') || type.includes('recovery') || type.includes('login')) return '/account-activity-review'
  if (type.includes('system') || type.includes('alert') || type.includes('error') || type.includes('fail') || type.includes('warning')) return '/dashboard'
  if (category.includes('system') || category.includes('general') || category.includes('alert')) return '/dashboard'

  // Every admin alert should lead somewhere useful instead of behaving like dead text.
  return '/notifications'
}
