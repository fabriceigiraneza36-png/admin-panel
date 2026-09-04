export function getNotificationTarget(notification) {
  if (!notification) return null

  const metadata = typeof notification.metadata === 'string'
    ? (() => { try { return JSON.parse(notification.metadata) } catch { return {} } })()
    : notification.metadata || {}

  const type = String(notification.type || '').toLowerCase()
  const bookingId = metadata.bookingId || metadata.booking_id || notification.booking_id
  const conversationId = metadata.conversationId || metadata.conversation_id || notification.conversation_id
  const userId = metadata.userId || metadata.user_id || notification.user_id
  const commentId = metadata.commentId || metadata.comment_id || notification.comment_id

  const explicit = notification.action_url || notification.actionUrl || notification.link || notification.url
  if (explicit) {
    if (bookingId && /^\/bookings\/?$/.test(explicit)) return `/bookings?bookingId=${encodeURIComponent(bookingId)}`
    if (conversationId && /^\/messages\/?$/.test(explicit)) return `/messages?conversationId=${encodeURIComponent(conversationId)}`
    return explicit
  }

  if (type.startsWith('message') && conversationId) return `/messages?conversationId=${encodeURIComponent(conversationId)}`
  if (type.includes('booking') && bookingId) return `/bookings?bookingId=${encodeURIComponent(bookingId)}`
  if (type.includes('contact') && (notification.id || metadata.contactId)) return `/contact?messageId=${encodeURIComponent(metadata.contactId || notification.id)}`
  if (type.includes('review') || type.includes('comment')) {
    return commentId ? `/comments?commentId=${encodeURIComponent(commentId)}` : '/comments'
  }
  if (type.includes('like')) return '/likes'
  if (type.includes('user') && userId) return `/users?userId=${encodeURIComponent(userId)}`
  if (type.includes('team')) return '/team'
  if (type.includes('country')) return '/countries'
  if (type.includes('destination')) return '/destinations'
  if (type.includes('package')) return '/packages'
  return null
}
