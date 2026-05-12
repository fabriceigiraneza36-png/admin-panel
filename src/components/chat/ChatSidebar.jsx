import React from 'react'
import { MessageCircle, Search, Circle, Clock, Check, CheckCheck } from 'lucide-react'
import Avatar from '@components/common/Avatar'
import { formatTimeAgo } from '@utils/formatters'

export default function ChatSidebar({ sessions, activeId, onSelect, search, onSearch }) {
  const filtered = sessions.filter((s) =>
    (s.full_name || s.email || s.session_id || '').toLowerCase().includes(search.toLowerCase())
  )

  const getStatusIcon = (session) => {
    if (session.status === 'closed') return null
    const unread = Number(session.unreadCount || session.unreadAdmin || 0)
    if (unread > 0) {
      return <CheckCheck size={10} className="text-emerald-600" />
    }
    return <Clock size={10} className="text-gray-400" />
  }

  return (
    <div className="flex flex-col h-full border-r border-surface-200 bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle size={16} className="text-primary-600" />
          <span>Chat Sessions</span>
          <span className="bg-primary-100 text-primary-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            {sessions.length}
          </span>
        </h3>
        <div className="relative mt-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search chats…"
            className="input py-1.5 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-50">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageCircle size={40} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No sessions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try a different search term' : 'Start by creating a new conversation'}
            </p>
          </div>
        ) : (
          filtered.map((s) => {
            const sessId = s.sessionId ?? s.id ?? s._id
            const isSelected = String(sessId) === String(activeId)
            const unread = Number(s.unreadCount || s.unreadAdmin || 0)
            const status = s.status || 'open'
            const isOnline = status === 'open' && unread === 0

            return (
              <button
                key={String(sessId)}
                onClick={() => onSelect(s)}
                className={`w-full text-left px-4 py-3 transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-r from-primary-50 to-emerald-50 border-l-4 border-l-primary-500'
                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with online indicator */}
                  <div className="relative flex-shrink-0">
                    <Avatar
                      name={s.full_name || s.email || 'Guest'}
                      size="sm"
                      rounded="full"
                      className="ring-2 ring-white shadow-sm"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
                        ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}
                      title={isOnline ? 'Online' : status === 'closed' ? 'Closed' : 'Away'}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        {s.full_name || s.email || 'Guest'}
                      </p>
                      {s.last_active && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap flex items-center gap-1">
                          {getStatusIcon(s)}
                          {formatTimeAgo(s.last_active)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 truncate">
                        {s.lastMessage || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 bg-primary-500
                          text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                      {status === 'closed' && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Priority bar for featured/unread */}
                {(isSelected || unread > 0) && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r" />
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-surface-100 bg-surface-50 flex-shrink-0">
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
          <Circle size={8} className="text-emerald-500 fill-emerald-500" />
          Real-time updates enabled
        </p>
      </div>
    </div>
  )
}