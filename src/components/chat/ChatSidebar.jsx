/**
 * ChatSidebar.jsx
 * Responsive session list — green/white, no overflow, animated selection
 */

import React, { memo, useMemo } from 'react'
import { MessageSquare, Loader2, Search } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'

const safeArr = (v) => (Array.isArray(v) ? v : [])

// ── Helpers ───────────────────────────────────────────────────────────────────
const avatarUrl = (name, email, url) => {
  if (url) return url
  const label = encodeURIComponent(name || email || 'U')
  return `https://ui-avatars.com/api/?name=${label}&background=16a34a&color=fff&bold=true`
}

const relativeTime = (ts) => {
  if (!ts) return ''
  try {
    return formatDistanceToNowStrict(new Date(ts), { addSuffix: false })
      .replace(' seconds', 's')
      .replace(' second', 's')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd')
  } catch {
    return ''
  }
}

// ── Session card ──────────────────────────────────────────────────────────────
const SessionCard = memo(({ session, isActive, onSelect, search }) => {
  const name = session.full_name || session.email || 'Guest'
  const email = session.email || ''
  const lastMsg = session.lastMessage || ''
  const unread = session.unreadCount || session.unread_admin || 0
  const isClosed = session.status === 'closed'
  const ts = session.lastMessageAt || session.last_active || session.created_at

  const highlightText = (text, query) => {
    if (!query || !text) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-green-200 text-green-900 not-italic">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <button
      onClick={() => onSelect(session)}
      type="button"
      className={`group relative flex w-full min-w-0 items-start gap-3 px-3 py-3 text-left transition-all duration-150 sm:px-4 ${
        isActive
          ? 'bg-green-50 before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-green-600'
          : 'hover:bg-green-50/70'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <img
          src={avatarUrl(name, email, session.avatar_url)}
          alt=""
          className={`h-10 w-10 rounded-full object-cover transition-all duration-200 ${
            isActive
              ? 'ring-2 ring-green-400 ring-offset-1'
              : 'ring-1 ring-green-100 group-hover:ring-green-200'
          }`}
          onError={(e) => {
            e.currentTarget.src = avatarUrl(name, email)
          }}
        />
        {!isClosed && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`truncate text-sm font-semibold leading-tight transition-colors ${
              isActive ? 'text-green-800' : 'text-gray-800'
            }`}
          >
            {highlightText(name, search)}
          </p>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {ts && (
              <span className="whitespace-nowrap text-[10px] text-green-300">
                {relativeTime(ts)}
              </span>
            )}
            {unread > 0 && (
              <span className="inline-flex h-4.5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-bold leading-none text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>

        {email && (
          <p className="mt-0.5 truncate text-[11px] text-green-400">
            {highlightText(email, search)}
          </p>
        )}

        {lastMsg && (
          <p className="mt-1 line-clamp-1 text-xs text-gray-400">
            {highlightText(lastMsg, search)}
          </p>
        )}

        {isClosed && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            Closed
          </span>
        )}
      </div>
    </button>
  )
})
SessionCard.displayName = 'SessionCard'

// ── Skeleton loader ───────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-green-100" />
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex justify-between gap-4">
        <div className="h-3 w-28 animate-pulse rounded-full bg-green-100" />
        <div className="h-3 w-10 animate-pulse rounded-full bg-green-100" />
      </div>
      <div className="h-2.5 w-36 animate-pulse rounded-full bg-green-50" />
      <div className="h-2.5 w-24 animate-pulse rounded-full bg-green-50" />
    </div>
  </div>
)

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatSidebar({
  sessions,
  activeId,
  onSelect,
  loading,
  search,
}) {
  const list = safeArr(sessions)

  if (loading) {
    return (
      <div className="divide-y divide-green-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        {search ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
              <Search size={22} className="text-green-300" />
            </div>
            <p className="text-sm font-semibold text-green-400">No results found</p>
            <p className="text-xs text-green-300">
              Try a different name or email address
            </p>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
              <MessageSquare size={22} className="text-green-300" />
            </div>
            <p className="text-sm font-semibold text-green-400">No conversations yet</p>
            <p className="text-xs text-green-300">
              Start one using the New button above
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="divide-y divide-green-50/80">
      {list.map((session) => (
        <SessionCard
          key={session.sessionId || session.session_id || session.id}
          session={session}
          isActive={
            (session.sessionId || session.session_id) === activeId
          }
          onSelect={onSelect}
          search={search}
        />
      ))}
    </div>
  )
}