import React from 'react'
import { MessageCircle, Search, Circle } from 'lucide-react'
import Avatar from '@components/common/Avatar'
import { formatTimeAgo } from '@utils/formatters'

export default function ChatSidebar({ sessions, activeId, onSelect, search, onSearch }) {
  const filtered = sessions.filter((s) =>
    (s.full_name || s.email || s.session_id || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r border-surface-200 bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle size={16} className="text-primary-600" /> Chat Sessions
        </h3>
        <div className="relative mt-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Search chats…" className="input py-1.5 pl-8 text-xs" />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-50">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-10">No chat sessions</p>
        ) : (
          filtered.map((s) => (
            <button key={s.session_id || s.id} onClick={() => onSelect(s.session_id || s.id)}
              className={`w-full text-left px-4 py-3 hover:bg-primary-50/40 transition-colors
                ${(s.session_id || s.id) === activeId ? 'bg-primary-50 border-l-2 border-primary-500' : ''}`}>
              <div className="flex items-center gap-3">
                <Avatar name={s.full_name || s.email || 'Guest'} size="sm" rounded="full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.full_name || s.email || 'Guest'}</p>
                  <p className="text-xs text-slate-400 truncate">{s.lastMessage || s.email || s.source || '…'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-slate-400">{formatTimeAgo(s.last_active || s.lastActivity)}</span>
                  {(s.unreadCount > 0 || s.unread_count > 0) && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {s.unreadCount || s.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}