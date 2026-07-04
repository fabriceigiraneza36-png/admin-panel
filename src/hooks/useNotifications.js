// admin/src/hooks/useNotifications.js

/**
 * useNotifications
 *
 * Single source of truth for the admin notification system.
 *
 * Returns EVERYTHING from NotificationContext so every
 * consumer (Header bell, Notifications page, BookingCard, etc.)
 * only needs to import ONE hook.
 *
 * ─── What it exposes ──────────────────────────────────────────
 *
 * UI Toasts (Redux-backed):
 *   items, unreadCount, panelOpen
 *   notify, notifyBooking, notifyMessage, notifyChat
 *   markRead, markAllRead, remove, clearAll
 *   togglePanel, closePanel
 *
 * Server Notifications (REST + Socket):
 *   serverNotifs      — full paginated list from backend
 *   serverStats       — { total, unread, checklist_requests, … }
 *   serverLoading     — boolean
 *   serverTotal       — total count
 *   serverPage        — current page
 *   serverPages       — total pages
 *   panelItems        — first 8 server notifs (for the bell panel)
 *   checklistRequests — notifs where type === 'admin_checklist_request'
 *   awaitingReply     — notifs with reply_text but no admin_reply
 *
 * Server Actions:
 *   fetchServerNotifs(page?, silent?)
 *   loadMoreServer()
 *   sendNotification(payload)       — targeted / broadcast
 *   broadcastNotification(payload)  — all users
 *   sendAdminReply(id, text)        — reply to user
 *   deleteServerNotif(id)
 *   sendChecklist(payload)          — PDF → user
 *   confirmPayment(payload)         — mark paid + notify user
 *   requestPayment(payload)         — request payment from user
 */

import { useNotificationContext } from '@context/NotificationContext'

export const useNotifications = () => useNotificationContext()

export default useNotifications