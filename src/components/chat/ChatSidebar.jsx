// admin/src/components/chat/ChatSidebar.jsx
import React, { useMemo } from 'react'
import { MessageCircle, Search, Circle, Clock, CheckCheck } from 'lucide-react'
import Avatar from '@components/common/Avatar'
import { formatTimeAgo } from '@utils/formatters'

const safeArray = (val) => (Array.isArray(val) ? val : [])

export default function ChatSidebar({
  sessions = [],
  activeId,
  onSelect,
  search = '',
  onSearch,
  loading = false,
}) {
  const safeSessions = safeArray(sessions)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return safeSessions
    return safeSessions.filter((s) =>
      (s.full_name || s.userFullName || s.email || s.userEmail || s.session_id || s.sessionId || '')
        .toLowerCase()
        .includes(q)
    )
  }, [safeSessions, search])

  const getStatusIcon = (session) => {
    if (session.status === 'closed') return null
    const unread = Number(session.unreadCount || session.unreadAdmin || 0)
    if (unread > 0) {
      return <CheckCheck size={10} className="text-emerald-600" />
    }
    return <Clock size={10} className="text-gray-400" />
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-100 shrink-0">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle size={16} className="text-primary-600" />
          <span>Chat Sessions</span>
          <span className="bg-primary-100 text-primary-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            {safeSessions.length}
          </span>
        </h3>

        <div className="relative mt-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Search chats…"
            className="input py-1.5 pl-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-50">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-500 mb-3" />
            <p className="text-sm font-medium text-gray-500">Loading sessions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageCircle size={40} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No sessions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try a different search term' : 'No chat sessions yet'}
            </p>
          </div>
        ) : (
          filtered.map((s) => {
            const sessId     = s.sessionId ?? s.session_id ?? s.id ?? s._id
            const isSelected = String(sessId) === String(activeId)
            const unread     = Number(s.unreadCount || s.unreadAdmin || 0)
            const status     = s.status || 'open'
            const isOnline   = status === 'open' && unread === 0
            const displayName = s.full_name || s.userFullName || s.email || s.userEmail || 'Guest'
            const displayEmail = s.email || s.userEmail || ''
            const lastActive = s.last_active || s.updatedAt || s.updated_at
            const lastMessage = s.lastMessage || s.last_message || 'No messages yet'

            return (
              <button
                key={String(sessId)}
                onClick={() => onSelect?.(s)}
                className={`relative w-full text-left px-4 py-3 transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-primary-50 to-emerald-50 border-l-4 border-l-primary-500'
                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar
                      src={s.avatar_url || s.userAvatar}
                      name={displayName}
                      size="sm"
                      rounded="full"
                      className="ring-2 ring-white shadow-sm"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                      title={isOnline ? 'Online' : status === 'closed' ? 'Closed' : 'Away'}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${
                        unread > 0 ? 'text-slate-900' : 'text-slate-700'
                      }`}>
                        {displayName}
                      </p>

                      {lastActive && (
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap flex items-center gap-1">
                          {getStatusIcon(s)}
                          {formatTimeAgo(lastActive)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 truncate">
                        {lastMessage || displayEmail || 'No messages yet'}
                      </p>

                      {unread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shrink-0">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}

                      {status === 'closed' && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-surface-100 bg-surface-50 shrink-0">
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
          <Circle size={8} className="text-emerald-500 fill-emerald-500" />
          Real-time updates enabled
        </p>
      </div>
    </div>
  )
}