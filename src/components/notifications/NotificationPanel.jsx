import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion }  from 'framer-motion'
import { Bell, BellOff, Check, Trash2, X } from 'lucide-react'
import {
  selectNotifications, selectUnreadCount, selectPanelOpen,
  markRead, markAllRead, removeNotification, clearAll, closePanel,
} from '@store/notificationsSlice'
import NotificationItem from './NotificationItem'
import EmptyState       from '@components/common/EmptyState'
import { createPortal } from 'react-dom'

export default function NotificationPanel() {
  const dispatch    = useDispatch()
  const items       = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const isOpen      = useSelector(selectPanelOpen)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(closePanel())}
            className="fixed inset-0 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit={{   opacity: 0, x: 20, scale: 0.97  }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed top-16 right-4 z-50 w-[360px] max-h-[calc(100vh-80px)]
                       bg-white rounded-2xl shadow-2xl border border-surface-200
                       flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3
                            border-b border-surface-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-100 rounded-xl
                                flex items-center justify-center">
                  <Bell size={15} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-primary-600 font-semibold">
                      {unreadCount} unread
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => dispatch(markAllRead())}
                    title="Mark all read"
                    className="btn-icon text-slate-400 hover:text-primary-600
                               hover:bg-primary-50 text-xs"
                  >
                    <Check size={15} />
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={() => dispatch(clearAll())}
                    title="Clear all"
                    className="btn-icon text-slate-400 hover:text-red-500
                               hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={() => dispatch(closePanel())}
                  className="btn-icon text-slate-400 hover:text-slate-600
                             hover:bg-surface-100"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-50">
              {items.length === 0 ? (
                <EmptyState
                  compact
                  icon={BellOff}
                  title="No notifications"
                  description="You're all caught up!"
                />
              ) : (
                items.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onRead={(id) => dispatch(markRead(id))}
                    onRemove={(id) => dispatch(removeNotification(id))}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}