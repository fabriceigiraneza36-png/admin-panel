import React, { createContext, useContext, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  addNotification, markRead, markAllRead,
  removeNotification, clearAll, togglePanel, closePanel,
  selectNotifications, selectUnreadCount, selectPanelOpen,
} from '@store/notificationsSlice'
import { NOTIFICATION_TYPES } from '@utils/constants'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const dispatch    = useDispatch()
  const items       = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const panelOpen   = useSelector(selectPanelOpen)

  const notify = useCallback(
    (type, title, message, data) => {
      dispatch(addNotification({ type, title, message, data }))
    },
    [dispatch],
  )

  const notifyBooking  = useCallback((msg, data) =>
    notify(NOTIFICATION_TYPES.BOOKING, 'New Booking', msg, data),
    [notify],
  )

  const notifyMessage  = useCallback((msg, data) =>
    notify(NOTIFICATION_TYPES.MESSAGE, 'New Message', msg, data),
    [notify],
  )

  const notifyChat     = useCallback((msg, data) =>
    notify(NOTIFICATION_TYPES.CHAT, 'Live Chat', msg, data),
    [notify],
  )

  return (
    <NotificationContext.Provider value={{
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
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotificationContext must be inside NotificationProvider')
  return ctx
}