import React from 'react'
import {
  CalendarCheck, MessageSquare, Star,
  User, MessageCircle, Bell, X,
} from 'lucide-react'
import { formatTimeAgo } from '@utils/formatters'
import { NOTIFICATION_TYPES } from '@utils/constants'

const TYPE_CONFIG = {
  [NOTIFICATION_TYPES.BOOKING]: {
    icon:  CalendarCheck,
    color: 'bg-blue-100 text-blue-600',
  },
  [NOTIFICATION_TYPES.MESSAGE]: {
    icon:  MessageSquare,
    color: 'bg-amber-100 text-amber-600',
  },
  [NOTIFICATION_TYPES.REVIEW]: {
    icon:  Star,
    color: 'bg-yellow-100 text-yellow-600',
  },
  [NOTIFICATION_TYPES.USER]: {
    icon:  User,
    color: 'bg-purple-100 text-purple-600',
  },
  [NOTIFICATION_TYPES.CHAT]: {
    icon:  MessageCircle,
    color: 'bg-green-100 text-green-600',
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    icon:  Bell,
    color: 'bg-slate-100 text-slate-600',
  },
}

export default function NotificationItem({ notification, onRead, onRemove }) {
  const cfg  = TYPE_CONFIG[notification.type] || TYPE_CONFIG[NOTIFICATION_TYPES.SYSTEM]
  const Icon = cfg.icon

  return (
    <div
      onClick={() => onRead(notification.id)}
      className={`
        flex items-start gap-3 px-4 py-3 cursor-pointer
        transition-colors duration-150 group relative
        ${notification.isRead
          ? 'hover:bg-surface-50'
          : 'bg-primary-50/40 hover:bg-primary-50'
        }
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center
                       justify-center ${cfg.color}`}>
        <Icon size={16} strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug
                       ${notification.isRead
                         ? 'text-slate-600 font-normal'
                         : 'text-slate-800 font-semibold'
                       }`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <span className="flex-shrink-0 w-2 h-2 mt-1 bg-primary-500 rounded-full" />
      )}

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(notification.id) }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100
                   text-slate-400 hover:text-slate-600
                   transition-all duration-150 p-0.5"
      >
        <X size={12} />
      </button>
    </div>
  )
}