// admin/src/context/NotificationContext.jsx
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  clearAll,
  togglePanel,
  closePanel,
  selectNotifications,
  selectUnreadCount,
  selectPanelOpen,
} from '@store/notificationsSlice'
import { NOTIFICATION_TYPES } from '@utils/constants'
import notificationsAPI        from '@api/notifications'
import { useSocket }           from '@hooks/useSocket'

// ─── Context ──────────────────────────────────────────────────────────────────
const NotificationContext = createContext(null)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const POLL_MS        = 60_000   // fallback poll every 60 s
const MAX_PANEL_ITEMS = 8       // items shown in the slide-down panel

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }) {
  const dispatch = useDispatch()
  const socket   = useSocket?.()

  // ── Redux state ─────────────────────────────────────────────────────────────
  const items       = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const panelOpen   = useSelector(selectPanelOpen)

  // ── Remote API state (server notifications, not just UI toasts) ──────────────
  const [serverNotifs,   setServerNotifs]   = React.useState([])
  const [serverStats,    setServerStats]    = React.useState({})
  const [serverLoading,  setServerLoading]  = React.useState(false)
  const [serverPage,     setServerPage]     = React.useState(1)
  const [serverTotal,    setServerTotal]    = React.useState(0)
  const [serverPages,    setServerPages]    = React.useState(1)

  const pollRef    = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchServerNotifs = useCallback(async (pageNum = 1, silent = false) => {
    if (!silent) setServerLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        notificationsAPI.getAll({ page: pageNum, limit: 30 }),
        notificationsAPI.getStats(),
      ])
      if (!mountedRef.current) return

      setServerNotifs((prev) =>
        pageNum === 1 ? (data.data || []) : [...prev, ...(data.data || [])],
      )
      setServerStats(statsData.data || {})
      setServerTotal(data.pagination?.total       || 0)
      setServerPages(data.pagination?.total_pages || 1)
      setServerPage(pageNum)

      // Sync unread badge with server reality
      const serverUnread = parseInt(statsData.data?.unread || 0, 10)
      if (serverUnread > 0) {
        // Push a synthetic "sync" action so the Redux badge stays accurate.
        // We don't want to blow away existing toast items, so we just
        // ensure the count matches via a lightweight dispatch.
        dispatch({ type: 'notifications/syncUnread', payload: serverUnread })
      }
    } catch (err) {
      console.warn('[NotificationContext] fetch failed:', err.message)
    } finally {
      if (mountedRef.current) setServerLoading(false)
    }
  }, [dispatch])

  // Initial load
  useEffect(() => { fetchServerNotifs(1) }, [fetchServerNotifs])

  // Poll fallback (when socket unavailable)
  useEffect(() => {
    pollRef.current = setInterval(
      () => fetchServerNotifs(1, true),
      POLL_MS,
    )
    return () => clearInterval(pollRef.current)
  }, [fetchServerNotifs])

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCKET — live delivery
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!socket) return

    // New notification arrives from user action (checklist request, reply, etc.)
    const onNew = (notif) => {
      if (!mountedRef.current) return

      // 1. Push into server list (for the full Notifications page)
      setServerNotifs((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev
        return [notif, ...prev]
      })
      setServerTotal((t) => t + 1)

      // 2. Also push a UI toast into Redux (bell badge + panel)
      dispatch(addNotification({
        type:    mapTypeToRedux(notif.type),
        title:   notif.title,
        message: notif.message,
        data:    notif,
      }))
    }

    // A user replied to a notification — refresh list
    const onUserReplied = () => fetchServerNotifs(1, true)

    // Server pushed updated notification (admin replied, etc.)
    const onUpdated = (notif) => {
      if (!mountedRef.current) return
      setServerNotifs((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, ...notif } : n)),
      )
    }

    socket.on('notification:new',          onNew)
    socket.on('notification:updated',      onUpdated)
    socket.on('notification:user-replied', onUserReplied)

    return () => {
      socket.off('notification:new',          onNew)
      socket.off('notification:updated',      onUpdated)
      socket.off('notification:user-replied', onUserReplied)
    }
  }, [socket, dispatch, fetchServerNotifs])

  // ═══════════════════════════════════════════════════════════════════════════
  // UI TOAST HELPERS  (these stay exactly as before — dispatch to Redux)
  // ═══════════════════════════════════════════════════════════════════════════

  const notify = useCallback(
    (type, title, message, data) =>
      dispatch(addNotification({ type, title, message, data })),
    [dispatch],
  )

  const notifyBooking = useCallback(
    (msg, data) => notify(NOTIFICATION_TYPES.BOOKING, 'New Booking', msg, data),
    [notify],
  )

  const notifyMessage = useCallback(
    (msg, data) => notify(NOTIFICATION_TYPES.MESSAGE, 'New Message', msg, data),
    [notify],
  )

  const notifyChat = useCallback(
    (msg, data) => notify(NOTIFICATION_TYPES.CHAT, 'Live Chat', msg, data),
    [notify],
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER-SIDE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const sendNotification = useCallback(async (payload) => {
    const result = await notificationsAPI.create(payload)
    fetchServerNotifs(1, true)
    return result
  }, [fetchServerNotifs])

  const broadcastNotification = useCallback(async (payload) => {
    const result = await notificationsAPI.broadcast(payload)
    fetchServerNotifs(1, true)
    return result
  }, [fetchServerNotifs])

  const sendAdminReply = useCallback(async (notifId, adminReply) => {
    const result = await notificationsAPI.adminReply(notifId, adminReply)
    setServerNotifs((prev) =>
      prev.map((n) =>
        n.id === notifId ? { ...n, admin_reply: adminReply } : n,
      ),
    )
    return result
  }, [])

  const deleteServerNotif = useCallback(async (notifId) => {
    await notificationsAPI.adminDelete(notifId)
    setServerNotifs((prev) => prev.filter((n) => n.id !== notifId))
    setServerTotal((t) => Math.max(0, t - 1))
  }, [])

  const sendChecklist = useCallback(async (payload) => {
    const result = await notificationsAPI.sendChecklist(payload)
    fetchServerNotifs(1, true)
    return result
  }, [fetchServerNotifs])

  const confirmPayment = useCallback(async (payload) => {
    const result = await notificationsAPI.confirmPayment(payload)
    fetchServerNotifs(1, true)
    return result
  }, [fetchServerNotifs])

  const requestPayment = useCallback(async (payload) => {
    const result = await notificationsAPI.requestPayment(payload)
    fetchServerNotifs(1, true)
    return result
  }, [fetchServerNotifs])

  const loadMoreServer = useCallback(() => {
    if (serverPage < serverPages && !serverLoading) {
      fetchServerNotifs(serverPage + 1)
    }
  }, [fetchServerNotifs, serverLoading, serverPage, serverPages])

  // ─── Derived ────────────────────────────────────────────────────────────────
  const checklistRequests = serverNotifs.filter(
    (n) => n.type === 'admin_checklist_request',
  )
  const awaitingReply = serverNotifs.filter(
    (n) => n.reply_text && !n.admin_reply,
  )
  const panelItems = serverNotifs.slice(0, MAX_PANEL_ITEMS)

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  const value = {
    // ── UI toast (Redux) ────────────────────────────────────────────────────
    items,
    unreadCount,
    panelOpen,
    notify,
    notifyBooking,
    notifyMessage,
    notifyChat,
    markRead:    (id) => dispatch(markRead(id)),
    markAllRead: ()   => dispatch(markAllRead()),
    remove:      (id) => dispatch(removeNotification(id)),
    clearAll:    ()   => dispatch(clearAll()),
    togglePanel: ()   => dispatch(togglePanel()),
    closePanel:  ()   => dispatch(closePanel()),

    // ── Server notifications ────────────────────────────────────────────────
    serverNotifs,
    serverStats,
    serverLoading,
    serverTotal,
    serverPage,
    serverPages,
    panelItems,
    checklistRequests,
    awaitingReply,

    // ── Server actions ──────────────────────────────────────────────────────
    fetchServerNotifs,
    loadMoreServer,
    sendNotification,
    broadcastNotification,
    sendAdminReply,
    deleteServerNotif,
    sendChecklist,
    confirmPayment,
    requestPayment,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error(
      'useNotificationContext must be used inside NotificationProvider',
    )
  }
  return ctx
}

export default NotificationContext

// ─── Internal helper ──────────────────────────────────────────────────────────
function mapTypeToRedux(serverType = '') {
  if (serverType.includes('booking')) return NOTIFICATION_TYPES.BOOKING
  if (serverType.includes('chat')  ) return NOTIFICATION_TYPES.CHAT
  if (serverType.includes('message')) return NOTIFICATION_TYPES.MESSAGE
  return NOTIFICATION_TYPES.INFO || 'info'
}