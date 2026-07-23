// admin/src/pages/Messages.jsx — COMPLETE REWRITE with real-time typing
import React, {
  useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect,
} from 'react'
import {
  Send, Smile, X, ArrowLeft, CornerUpLeft, Check, CheckCheck,
  MessageSquare, RefreshCw, Search, Plus, User, ChevronDown,
  Circle, Inbox, Archive,
} from 'lucide-react'
import { useAuth }   from '@context/AuthContext'
import { useSocket } from '@context/SocketContext'
import { API_BASE }  from '@utils/constants'

/* ══════════════════════════════════════════════════════════════════════════
   TOKEN / FETCH
══════════════════════════════════════════════════════════════════════════ */

const TOKEN_KEYS = ['altuvera_admin_token', 'auth_token', 'token']
const getToken   = () => {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k)
      if (v) return v
    }
  } catch { /* ignore */ }
  return null
}
const authFetch = (url, opts = {}) => {
  const token = getToken()
  return fetch(url, {
    credentials: 'include',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════════════════════════════════ */

const QUICK_EMOJIS         = ['👍','❤️','😂','🎉','👏','😮','👎','🔥','🙏','✨','😊','😢']
const INLINE_REACTION_EMOJIS = ['👍','❤️','😂','🎉']

const STATUS_STYLE = {
  open:    { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', label: 'Open'    },
  closed:  { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200',  label: 'Closed'  },
  pending: { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',  label: 'Pending' },
}

const fmtTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const diff = Date.now() - date.getTime()
  if (diff < 60_000)      return 'Just now'
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604_800_000) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const fmtFull = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

const isToday = (d) => {
  const n = new Date()
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}
const isYesterday = (d) => {
  const y = new Date(); y.setDate(y.getDate() - 1)
  return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear()
}
const groupByDate = (messages) => {
  const groups = []; let lastDate = null
  messages.forEach(m => {
    const d = new Date(m.createdAt)
    const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (label !== lastDate) { groups.push({ type: 'sep', label, key: `sep-${label}` }); lastDate = label }
    groups.push({ type: 'msg', data: m, key: m.id })
  })
  return groups
}

/* ══════════════════════════════════════════════════════════════════════════
   TYPING INDICATOR
══════════════════════════════════════════════════════════════════════════ */

function TypingIndicator({ name = 'User' }) {
  return (
    <div className="flex items-end gap-2 mb-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600
                      text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {name[0]?.toUpperCase() || 'U'}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm
                      px-4 py-2.5 shadow-sm flex items-center gap-2">
        <span className="text-[10px] text-slate-400">{name} is typing</span>
        <span className="flex items-center gap-0.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"
              style={{ animation: 'typing-dot 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
          ))}
        </span>
      </div>
      <style>{`
        @keyframes typing-dot {
          0%,80%,100%{transform:translateY(0);opacity:.4}
          40%{transform:translateY(-4px);opacity:1}
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   AVATAR
══════════════════════════════════════════════════════════════════════════ */

function Avatar({ name = '', src, size = 'md', online = false }) {
  const sizeMap = { xs: 'w-6 h-6 text-[9px]', sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm', xl: 'w-14 h-14 text-base' }
  const dotMap  = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5' }
  const cls     = sizeMap[size] || sizeMap.md
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="relative flex-shrink-0">
      {src ? (
        <img src={src} alt={name} onError={e => { e.target.style.display = 'none' }}
          className={`${cls} rounded-full object-cover border-2 border-white shadow-sm`} />
      ) : (
        <div className={`${cls} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600
                         text-white font-bold flex items-center justify-center shadow-sm`}>
          {initials}
        </div>
      )}
      {online && (
        <span className={`absolute bottom-0 right-0 ${dotMap[size] || dotMap.md}
                         bg-emerald-500 border-2 border-white rounded-full`} />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STATUS BADGE
══════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }) {
  const tone = STATUS_STYLE[status] || STATUS_STYLE.pending
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5
                      rounded-full border ${tone.text} ${tone.bg} ${tone.border}`}>
      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${tone.dot}`} />
      {tone.label}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   DATE SEPARATOR
══════════════════════════════════════════════════════════════════════════ */

function DateSep({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest
                       bg-white px-2 py-0.5 rounded-full border border-slate-200 select-none">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CONVERSATION ROW
══════════════════════════════════════════════════════════════════════════ */

const ConversationRow = React.memo(function ConversationRow({ conv, active, onSelect, typingName }) {
  const title    = conv.subject || conv.guestName || conv.guestEmail || 'Conversation'
  const hasUnread = (conv.unreadAdmin || 0) > 0

  return (
    <button onClick={() => onSelect(conv.id)} aria-pressed={active}
      className={`
        w-full text-left px-3 py-3 transition-all duration-150 relative
        border-b border-slate-100/80 hover:bg-slate-50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500
        ${active
          ? 'bg-emerald-50 border-l-[3px] !border-l-emerald-600'
          : 'border-l-[3px] border-l-transparent'
        }
      `}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={conv.guestName || conv.guestEmail || '?'} src={conv.guestAvatar} size="md" online={conv.isOnline} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <span className={`text-sm truncate flex-1 ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
              {title}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {hasUnread && (
                <span className="bg-emerald-600 text-white rounded-full text-[10px] font-bold
                                 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center shadow-sm">
                  {conv.unreadAdmin > 9 ? '9+' : conv.unreadAdmin}
                </span>
              )}
              <span className={`text-[10px] whitespace-nowrap ${hasUnread ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                {fmtTime(conv.lastMessageAt)}
              </span>
            </div>
          </div>
          {typingName ? (
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="flex gap-0.5">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-emerald-500 inline-block"
                  style={{ animation: 'typing-dot 1.2s ease-in-out infinite', animationDelay: `${i*0.2}s` }} />)}
              </span>
              typing…
            </p>
          ) : (
            <p className={`text-xs truncate mb-1 ${hasUnread ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
              {conv.lastMessage || 'No messages yet'}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <StatusBadge status={conv.status} />
            {conv.bookingNumber && (
              <span className="text-[10px] text-slate-400 font-mono">#{conv.bookingNumber}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
})

/* ══════════════════════════════════════════════════════════════════════════
   EMOJI PICKER
══════════════════════════════════════════════════════════════════════════ */

function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} role="dialog" aria-label="Emoji picker"
      className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200
                 rounded-2xl shadow-2xl p-2.5 grid grid-cols-6 gap-1 z-50 w-56">
      {QUICK_EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => onPick(emoji)} aria-label={emoji}
          className="text-xl p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
          {emoji}
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MESSAGE BUBBLE
══════════════════════════════════════════════════════════════════════════ */

const MessageBubble = React.memo(function MessageBubble({
  message, mine, replyTo, onReact, onReply,
}) {
  const reactions  = useMemo(() => {
    const r = message.reactions || {}
    return Object.entries(r).filter(([, ids]) => ids?.length > 0)
  }, [message.reactions])
  const isPending  = String(message.id).startsWith('tmp-')

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} group mb-0.5`}>
      {!mine && (
        <div className="flex-shrink-0 self-end mr-2 mb-1">
          <Avatar name={message.senderName || 'User'} size="sm" />
        </div>
      )}

      <div className={`max-w-[78%] sm:max-w-[65%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && (
          <span className="text-[10px] font-bold text-emerald-700 mb-1 ml-1">
            {message.senderName || 'User'}
          </span>
        )}

        {/* Reply ref */}
        {replyTo && (
          <div className={`flex items-start gap-1.5 text-[11px] mb-1 max-w-full ${mine ? 'flex-row-reverse' : ''}`}>
            <div className={`border-l-2 pl-2 py-0.5 pr-3 rounded-lg max-w-[90%] truncate
                             ${mine
                               ? 'border-emerald-300 bg-emerald-700/20 text-emerald-100'
                               : 'border-slate-300 bg-slate-100 text-slate-500'
                             }`}>
              <span className="font-semibold block text-[10px] mb-0.5">{replyTo.senderName || 'Message'}</span>
              <span className="truncate block">{(replyTo.body || '').slice(0, 60)}</span>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className={`
          relative px-3.5 py-2.5 text-sm leading-relaxed break-words
          whitespace-pre-wrap rounded-2xl shadow-sm transition-opacity duration-300
          ${mine
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm'
          }
          ${isPending ? 'opacity-60' : 'opacity-100'}
        `} style={{ wordBreak: 'break-word' }}>
          {message.body}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : ''}`}>
            {reactions.map(([emoji, ids]) => (
              <button key={emoji} onClick={() => onReact(message.id, emoji)}
                className="bg-white border border-slate-200 rounded-full px-2 py-0.5
                           text-xs hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                {emoji} <span className="text-slate-500 font-medium">{ids.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className={`flex items-center gap-1 mt-1 transition-opacity duration-200
                         opacity-0 group-hover:opacity-100 ${mine ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-slate-400">{fmtFull(message.createdAt)}</span>
          {mine && !isPending && (
            message.isRead
              ? <CheckCheck size={11} className="text-emerald-500" />
              : <Check size={11} className="text-slate-400" />
          )}
          {isPending && <Circle size={9} className="text-slate-300 animate-pulse" />}
        </div>

        {/* Quick actions */}
        <div className={`flex items-center gap-0.5 mt-1
                         opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
                         transition-all duration-200 ${mine ? 'flex-row-reverse' : ''}`}>
          {INLINE_REACTION_EMOJIS.map(emoji => (
            <button key={emoji}
              onMouseDown={e => { e.preventDefault(); onReact(message.id, emoji) }}
              className="text-base p-1 rounded-lg hover:bg-white hover:shadow-sm transition-all">
              {emoji}
            </button>
          ))}
          <button
            onMouseDown={e => { e.preventDefault(); onReply(message.id) }}
            className="inline-flex items-center gap-1 text-[10px] text-slate-500
                       hover:text-emerald-700 px-1.5 py-1 rounded-lg
                       hover:bg-white hover:shadow-sm transition-all">
            <CornerUpLeft size={11} /> Reply
          </button>
        </div>
      </div>
    </div>
  )
})

/* ══════════════════════════════════════════════════════════════════════════
   SCROLL-TO-BOTTOM
══════════════════════════════════════════════════════════════════════════ */

function ScrollBtn({ visible, onClick }) {
  return (
    <button onClick={onClick} aria-label="Scroll to latest"
      className={`absolute bottom-4 right-4 z-20 w-9 h-9 rounded-full bg-emerald-600
                  text-white shadow-lg flex items-center justify-center
                  hover:bg-emerald-700 transition-all duration-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                  ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <ChevronDown size={18} />
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   NEW CHAT MODAL
══════════════════════════════════════════════════════════════════════════ */

function NewChatModal({ onClose, onCreated }) {
  const [search,       setSearch]       = useState('')
  const [users,        setUsers]        = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [subject,      setSubject]      = useState('')
  const [firstMsg,     setFirstMsg]     = useState('')
  const [creating,     setCreating]     = useState(false)
  const [error,        setError]        = useState('')
  const searchRef = useRef(null)

  useEffect(() => { searchRef.current?.focus() }, [])
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true)
      try {
        const res  = await authFetch(`${API_BASE}/messages/users-list?search=${encodeURIComponent(search)}&limit=30`)
        const data = await res.json()
        setUsers(data.data || [])
      } catch { setUsers([]) }
      finally  { setLoadingUsers(false) }
    }
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  const handleCreate = async () => {
    if (!selected)        { setError('Please select a user.'); return }
    if (!firstMsg.trim()) { setError('Please enter a message.'); return }
    setError(''); setCreating(true)
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations`, {
        method: 'POST',
        body:   JSON.stringify({
          targetUserId: selected.id,
          subject:      subject.trim() || `Chat with ${selected.fullName || selected.email}`,
          body:         firstMsg.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      onCreated(data.data)
    } catch (err) { setError(err.message) }
    finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl
                      flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Plus size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">New Conversation</h3>
              <p className="text-[10px] text-slate-400">{selected ? 'Compose your message' : 'Select a traveller'}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-500 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="p-4">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                             bg-slate-50 focus:bg-white transition" />
              </div>
              <div className="space-y-0.5 max-h-72 overflow-y-auto rounded-xl border border-slate-100">
                {loadingUsers ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-2/3 bg-slate-200 rounded" />
                        <div className="h-2 w-1/2 bg-slate-200 rounded" />
                      </div>
                    </div>
                  ))
                ) : users.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <User size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No users found</p>
                  </div>
                ) : users.map(u => (
                  <button key={u.id} onClick={() => setSelected(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 transition text-left">
                    <Avatar name={u.fullName || u.email} src={u.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{u.fullName || '(no name)'}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <ChevronDown size={13} className="text-slate-300 -rotate-90" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <Avatar name={selected.fullName || selected.email} src={selected.avatar} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{selected.fullName || '(no name)'}</p>
                  <p className="text-xs text-slate-500">{selected.email}</p>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Deselect"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition">
                  <X size={14} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Subject <span className="text-slate-300 normal-case font-normal">(optional)</span>
                </label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder={`Chat with ${selected.fullName || selected.email}`}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  First Message <span className="text-red-400">*</span>
                </label>
                <textarea value={firstMsg} onChange={e => setFirstMsg(e.target.value)}
                  rows={4} autoFocus placeholder="Hi! I'm reaching out about your booking…"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition resize-none" />
              </div>
              {error && (
                <p role="alert"
                   className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition">
            Cancel
          </button>
          {selected && (
            <button onClick={handleCreate} disabled={creating || !firstMsg.trim()}
              className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl
                         hover:bg-emerald-700 disabled:opacity-40 transition flex items-center gap-2">
              {creating
                ? <><RefreshCw size={14} className="animate-spin" /> Creating…</>
                : <><Send size={14} /> Start Conversation</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function Messages() {
  const { user }                     = useAuth()
  const { connected, on, off, emit } = useSocket()

  /* ── State ── */
  const [conversations,  setConversations]  = useState([])
  const [activeId,       setActiveId]       = useState(null)
  const [activeConv,     setActiveConv]     = useState(null)
  const [messages,       setMessages]       = useState([])
  const [loadingList,    setLoadingList]    = useState(true)
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [sending,        setSending]        = useState(false)
  const [draft,          setDraft]          = useState('')
  const [filter,         setFilter]         = useState('open')
  const [search,         setSearch]         = useState('')
  const [replyToId,      setReplyToId]      = useState(null)
  const [showEmoji,      setShowEmoji]      = useState(false)
  const [showNewChat,    setShowNewChat]    = useState(false)
  const [showScrollBtn,  setShowScrollBtn]  = useState(false)
  const [composerH,      setComposerH]      = useState(0)
  const [isAtBottom,     setIsAtBottom]     = useState(true)

  // { convId, name } — user is typing (shown in admin chat)
  const [userTyping,     setUserTyping]     = useState(null)
  // Track which convIds have a user typing (shown in sidebar)
  const [typingConvIds,  setTypingConvIds]  = useState(new Set())

  /* ── Refs ── */
  const scrollRef       = useRef(null)
  const textareaRef     = useRef(null)
  const composerRef     = useRef(null)
  const chatHeaderRef   = useRef(null)
  const notifRef        = useRef(new Set())
  const typingTimers    = useRef({})   // per-conv timeout IDs
  const isAdminTyping   = useRef(false)
  const adminTypingTimer = useRef(null)

  /* ── Composer resize ── */
  useLayoutEffect(() => {
    if (!composerRef.current) return
    const obs = new ResizeObserver(([e]) => setComposerH(e.contentRect.height + 1))
    obs.observe(composerRef.current)
    return () => obs.disconnect()
  }, [activeConv])

  /* ── Scroll tracking ── */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setIsAtBottom(atBottom)
    setShowScrollBtn(!atBottom)
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  /* ── Desktop notifications ── */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const showDesktopNotif = useCallback((title, body, convId) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (!document.hidden) return
    const key = `${convId}-${Math.floor(Date.now() / 5000)}`
    if (notifRef.current.has(key)) return
    notifRef.current.add(key)
    try {
      const n = new Notification(`Altuvera — ${title}`, { body, icon: '/favicon.ico', tag: `conv-${convId}` })
      n.onclick = () => { window.focus(); n.close() }
      setTimeout(() => notifRef.current.delete(key), 30_000)
    } catch { /* non-fatal */ }
  }, [])

  /* ── Load conversations ── */
  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const p = new URLSearchParams({ limit: '100' })
      if (filter !== 'all') p.set('status', filter)
      if (search.trim())    p.set('search', search.trim())
      const res  = await authFetch(`${API_BASE}/messages/conversations?${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setConversations(data.data || [])
    } catch (err) {
      console.error('[Messages] load:', err.message)
    } finally {
      setLoadingList(false)
    }
  }, [filter, search])

  useEffect(() => { loadConversations() }, [loadConversations])

  /* ── Open conversation ── */
  const openConversation = useCallback(async (id) => {
    setActiveId(id)
    setReplyToId(null)
    setDraft('')
    setLoadingMsgs(true)
    setMessages([])
    setUserTyping(null)
    try {
      const res  = await authFetch(`${API_BASE}/messages/conversations/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActiveConv(data.data)
      setMessages(data.data?.messages || [])
      authFetch(`${API_BASE}/messages/conversations/${id}/read`, { method: 'PATCH' }).catch(() => {})
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadAdmin: 0 } : c))
    } catch (err) {
      console.error('[Messages] open:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // Scroll on load
  useEffect(() => {
    if (!loadingMsgs && messages.length > 0)
      requestAnimationFrame(() => scrollToBottom(false))
  }, [loadingMsgs, scrollToBottom])

  // Scroll on new messages if at bottom
  useEffect(() => {
    if (isAtBottom) requestAnimationFrame(() => scrollToBottom(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const closeMobile = useCallback(() => {
    setActiveId(null)
    setActiveConv(null)
    setMessages([])
    setReplyToId(null)
    setShowEmoji(false)
    setUserTyping(null)
  }, [])

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
    el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden'
  }, [draft])

  /* ── Emit admin typing to the user ── */
  const emitAdminTyping = useCallback((convId, typing) => {
    if (!emit || !convId) return
    emit('msg:typing', {
      conversationId: convId,
      isTyping:       typing,
      senderType:     'admin',
      senderName:     user?.full_name || 'Altuvera',
    })
  }, [emit, user])

  const handleDraftChange = useCallback((val) => {
    setDraft(val)
    if (!activeId) return
    const typing = val.length > 0
    if (typing !== isAdminTyping.current) {
      isAdminTyping.current = typing
      emitAdminTyping(activeId, typing)
    }
    // Auto-stop after 3 s of no keystrokes
    clearTimeout(adminTypingTimer.current)
    if (typing) {
      adminTypingTimer.current = setTimeout(() => {
        isAdminTyping.current = false
        emitAdminTyping(activeId, false)
      }, 3000)
    }
  }, [activeId, emitAdminTyping])

  /* ── Send message ── */
  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!activeId || !text || sending) return

    // Stop typing signal
    clearTimeout(adminTypingTimer.current)
    isAdminTyping.current = false
    emitAdminTyping(activeId, false)

    setSending(true)
    const optimistic = {
      id:             `tmp-${Date.now()}`,
      conversationId: activeId,
      senderType:     'admin',
      senderName:     user?.full_name || 'Admin',
      body:           text,
      isRead:         false,
      reactions:      {},
      createdAt:      new Date().toISOString(),
      replyToId:      replyToId || undefined,
    }
    setMessages(prev => [...prev, optimistic])
    const outDraft = draft, outReply = replyToId
    setDraft('')
    setReplyToId(null)
    setIsAtBottom(true)

    // Socket path
    if (connected && emit) {
      emit(
        'msg:admin-send',
        { conversationId: activeId, body: outDraft, replyToId: outReply || undefined },
        (ack) => {
          if (ack?.success && ack.message) {
            setMessages(prev => prev.map(m => m.id === optimistic.id ? ack.message : m))
          } else if (ack?.error) {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
          }
          setSending(false)
          loadConversations()
        }
      )
      // Don't wait — setSending(false) handled in ack
      return
    }

    // REST fallback
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages`,
        { method: 'POST', body: JSON.stringify({ body: outDraft, ...(outReply ? { replyToId: outReply } : {}) }) }
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.data) setMessages(prev => prev.map(m => m.id === optimistic.id ? data.data : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
      loadConversations()
    }
  }, [activeId, draft, sending, connected, emit, user, loadConversations, replyToId, emitAdminTyping])

  /* ── Reactions ── */
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!activeId) return
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages/${messageId}/react`,
        { method: 'PATCH', body: JSON.stringify({ emoji }) }
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(prev =>
          prev.map(m => String(m.id) === String(messageId)
            ? { ...m, reactions: data.data?.reactions || {} } : m)
        )
      }
    } catch { /* silent */ }
  }, [activeId])

  /* ── Status change ── */
  const changeStatus = useCallback(async (status) => {
    if (!activeId) return
    try {
      await authFetch(`${API_BASE}/messages/conversations/${activeId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      })
      setActiveConv(p => p ? { ...p, status } : p)
      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, status } : c))
    } catch { /* silent */ }
  }, [activeId])

  /* ── New chat ── */
  const handleNewConvCreated = useCallback((conv) => {
    setShowNewChat(false)
    loadConversations()
    if (conv?.id) openConversation(conv.id)
  }, [loadConversations, openConversation])

  /* ══════════════════════════════════════════════════════════════════════
     SOCKET LISTENERS — the core of real-time
  ══════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!on || !off) return

    /* ── Incoming message ── */
    const onMsg = (payload) => {
      // Clear typing indicator when actual message arrives
      if (payload.senderType === 'user') {
        const cid = String(payload.conversationId)
        clearTimeout(typingTimers.current[cid])
        delete typingTimers.current[cid]
        setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
        if (cid === String(activeId)) setUserTyping(null)
      }

      // Deduplicate
      setMessages(prev => {
        if (String(payload.conversationId) !== String(activeId)) return prev
        if (prev.some(m => m.id === payload.id)) return prev
        return [...prev, payload]
      })

      // Update conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === payload.conversationId
            ? {
                ...c,
                lastMessage:   payload.body,
                lastMessageAt: payload.createdAt,
                unreadAdmin: payload.senderType !== 'admin'
                  ? (String(c.id) !== String(activeId) ? (c.unreadAdmin || 0) + 1 : 0)
                  : c.unreadAdmin,
              }
            : c
        )
      )

      if (document.hidden) {
        showDesktopNotif('New message', payload.body?.slice(0, 120), payload.conversationId)
      }
    }

    /* ── Typing event from user ── */
    const onTyping = (payload) => {
      // Admin only cares about user typing
      if (payload.senderType !== 'user') return

      const cid = String(payload.conversationId)

      if (payload.isTyping) {
        // Show in sidebar for all convs
        setTypingConvIds(prev => { const s = new Set(prev); s.add(cid); return s })

        // Show inline indicator only for active conv
        if (cid === String(activeId)) {
          setUserTyping({ convId: cid, name: payload.senderName || 'User' })
        }

        // Auto-clear after 4 s
        clearTimeout(typingTimers.current[cid])
        typingTimers.current[cid] = setTimeout(() => {
          setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
          setUserTyping(prev => (prev && String(prev.convId) === cid ? null : prev))
        }, 4000)
      } else {
        clearTimeout(typingTimers.current[cid])
        delete typingTimers.current[cid]
        setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
        setUserTyping(prev => (prev && String(prev.convId) === cid ? null : prev))
      }
    }

    const onNewUser = (p) => {
      loadConversations()
      if (document.hidden) {
        showDesktopNotif(
          'New message from traveller',
          p.message?.body?.slice(0, 120) || 'New message',
          p.conversationId
        )
      }
    }

    const onUpdated = (conv) => {
      setActiveConv(p => p?.id === conv.id ? { ...p, ...conv } : p)
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, ...conv } : c))
    }

    const onReaction = ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m => String(m.id) === String(messageId) ? { ...m, reactions: reactions || {} } : m)
      )
    }

    on('msg:message',              onMsg)
    on('msg:new-from-user',        onNewUser)
    on('msg:conversation-updated', onUpdated)
    on('msg:reaction',             onReaction)
    on('msg:typing',               onTyping)

    return () => {
      off('msg:message',              onMsg)
      off('msg:new-from-user',        onNewUser)
      off('msg:conversation-updated', onUpdated)
      off('msg:reaction',             onReaction)
      off('msg:typing',               onTyping)
    }
  }, [on, off, activeId, loadConversations, showDesktopNotif])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        if (showEmoji) { setShowEmoji(false); return }
        if (replyToId) { setReplyToId(null);  return }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [showEmoji, replyToId])

  /* ── Derived ── */
  const replyMap     = useMemo(() => new Map(messages.map(m => [String(m.id), m])), [messages])
  const msgGroups    = useMemo(() => groupByDate(messages), [messages])
  const replyMsg     = replyToId ? replyMap.get(String(replyToId)) : null
  const totalUnread  = conversations.reduce((s, c) => s + (c.unreadAdmin || 0), 0)

  const convTitle = activeConv?.subject
    || (activeConv?.bookingNumber ? `Booking ${activeConv.bookingNumber}` : null)
    || activeConv?.guestName
    || 'Conversation'

  const showMobileChat = !!activeId

  /* ─── Render ─── */
  return (
    <>
      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onCreated={handleNewConvCreated} />
      )}

      <div className="flex flex-col h-full min-h-0 overflow-hidden">

        {/* ── Page Header ── */}
        <header className={`
          flex-shrink-0 flex items-center justify-between
          px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-200
          ${showMobileChat ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight flex items-center gap-2">
                Messages
                {totalUnread > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold rounded-full
                                   px-1.5 py-px min-w-[18px] text-center">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5 flex items-center gap-1.5">
                Live conversations with travellers
                {connected
                  ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                    </span>
                  : <span className="text-amber-600 font-semibold">· Reconnecting…</span>
                }
              </p>
            </div>
          </div>
          <button onClick={() => setShowNewChat(true)}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white
                       text-sm font-bold rounded-xl hover:bg-emerald-700 active:bg-emerald-800
                       transition shadow-sm shadow-emerald-200/60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <Plus size={16} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </header>

        {/* ── Two-panel body ── */}
        <div className="flex-1 min-h-0 flex md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr] overflow-hidden">

          {/* ════ SIDEBAR ════ */}
          <aside className={`
            flex flex-col border-r border-slate-200 bg-white overflow-hidden
            ${showMobileChat ? 'hidden md:flex' : 'flex w-full md:w-auto'}
          `} aria-label="Conversations">

            {/* Top controls */}
            <div className="flex-shrink-0 p-3 border-b border-slate-100 space-y-2 bg-white z-10">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…" aria-label="Search conversations"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200
                             rounded-xl outline-none focus:border-emerald-500 focus:bg-white
                             focus:ring-2 focus:ring-emerald-500/20 transition" />
              </div>
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-xl" role="tablist">
                {[
                  { key: 'open',   label: 'Open'   },
                  { key: 'closed', label: 'Closed' },
                  { key: 'all',    label: 'All'    },
                ].map(f => (
                  <button key={f.key} role="tab" aria-selected={filter === f.key}
                    onClick={() => setFilter(f.key)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200
                                flex items-center justify-center gap-1
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                                ${filter === f.key
                                  ? 'bg-white text-emerald-700 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-700'
                                }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count + refresh */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5
                            border-b border-slate-100 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
              </span>
              <button onClick={loadConversations} disabled={loadingList} aria-label="Refresh"
                className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 disabled:opacity-40">
                <RefreshCw size={12} className={loadingList ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto overscroll-contain" role="list">
              {loadingList && conversations.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-3 border-b border-slate-100 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <div className="h-2.5 w-2/3 bg-slate-200 rounded" />
                        <div className="h-2 w-1/5 bg-slate-200 rounded" />
                      </div>
                      <div className="h-2 w-4/5 bg-slate-200 rounded" />
                      <div className="h-2 w-1/3 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <MessageSquare size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">
                    No {filter !== 'all' ? filter : ''} conversations
                  </p>
                  <button onClick={() => setShowNewChat(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600
                               hover:text-emerald-700 underline underline-offset-2">
                    <Plus size={12} /> New conversation
                  </button>
                </div>
              ) : (
                conversations.map(c => (
                  <div role="listitem" key={c.id}>
                    <ConversationRow
                      conv={c}
                      active={c.id === activeId}
                      onSelect={openConversation}
                      typingName={typingConvIds.has(String(c.id))
                        ? (userTyping?.convId === String(c.id) ? userTyping.name : 'User')
                        : null
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ════ CHAT PANEL ════ */}
          <main className={`
            flex flex-col min-h-0 overflow-hidden bg-slate-50/40 relative
            ${showMobileChat ? 'flex w-full' : 'hidden md:flex'}
          `} aria-label="Chat panel">

            {!activeConv ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-4 shadow-inner">
                  <MessageSquare size={36} className="text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-600 mb-1">No conversation selected</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-xs">
                  Choose a conversation from the list or start a new one.
                </p>
                <button onClick={() => setShowNewChat(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white
                             text-sm font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm">
                  <Plus size={16} /> New Conversation
                </button>
              </div>
            ) : (
              <>
                {/* ── Chat Header ── */}
                <div ref={chatHeaderRef}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-3
                             bg-white border-b border-slate-200 z-10 shadow-sm">
                  <button onClick={closeMobile} aria-label="Back"
                    className="md:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 transition text-slate-600">
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar
                    name={activeConv.guestName || activeConv.guestEmail || '?'}
                    src={activeConv.guestAvatar}
                    size="md"
                    online={activeConv.isOnline}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate leading-tight">{convTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-slate-400 truncate leading-tight">
                        {activeConv.guestEmail || activeConv.guestName || 'Guest'}
                        {activeConv.bookingNumber && <span className="font-mono ml-1">#{activeConv.bookingNumber}</span>}
                      </p>
                      {/* User typing shown in header on mobile */}
                      {userTyping && String(userTyping.convId) === String(activeId) && (
                        <span className="text-[10px] text-emerald-600 font-semibold animate-pulse flex-shrink-0 hidden sm:inline">
                          typing…
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={activeConv.status} />
                    {activeConv.status !== 'closed' ? (
                      <button onClick={() => changeStatus('closed')}
                        className="hidden sm:flex text-[11px] border border-slate-200 rounded-xl
                                   px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition font-semibold">
                        Close
                      </button>
                    ) : (
                      <button onClick={() => changeStatus('open')}
                        className="hidden sm:flex text-[11px] border border-emerald-300 rounded-xl
                                   px-3 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                                   transition font-semibold">
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Messages ── */}
                <div ref={scrollRef} onScroll={handleScroll}
                  className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                  style={{ paddingBottom: `${composerH + 8}px` }}
                  role="log" aria-live="polite" aria-label="Messages">
                  {loadingMsgs ? (
                    <div className="flex flex-col gap-3 pt-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
                          <div className={`rounded-2xl px-4 py-3 ${i % 2 === 0
                            ? 'bg-slate-200 w-48 sm:w-64' : 'bg-emerald-200/60 w-36 sm:w-52'}`}
                            style={{ height: 38 + i * 6 }} />
                        </div>
                      ))}
                    </div>
                  ) : msgGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                      <Send size={22} className="text-slate-200 mb-3" />
                      <p className="text-sm text-slate-400">No messages yet — send the first one!</p>
                    </div>
                  ) : (
                    <>
                      {msgGroups.map(item =>
                        item.type === 'sep' ? (
                          <DateSep key={item.key} label={item.label} />
                        ) : (
                          <MessageBubble
                            key={item.key}
                            message={item.data}
                            mine={item.data.senderType === 'admin'}
                            replyTo={item.data.replyToId ? replyMap.get(String(item.data.replyToId)) : null}
                            onReact={toggleReaction}
                            onReply={setReplyToId}
                          />
                        )
                      )}
                      {/* User typing indicator */}
                      {userTyping && String(userTyping.convId) === String(activeId) && (
                        <TypingIndicator name={userTyping.name} />
                      )}
                    </>
                  )}
                </div>

                {/* Scroll-to-bottom */}
                <ScrollBtn visible={showScrollBtn} onClick={() => scrollToBottom(true)} />

                {/* ── Composer (fixed bottom) ── */}
                <div ref={composerRef}
                  className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200
                             z-10 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.06)]">

                  {/* Mobile status */}
                  <div className="sm:hidden flex gap-2 px-3 pt-2">
                    {activeConv.status !== 'closed' ? (
                      <button onClick={() => changeStatus('closed')}
                        className="flex-1 text-[11px] border border-slate-200 rounded-xl py-1.5
                                   text-slate-600 hover:bg-slate-50 transition font-semibold">
                        Close conversation
                      </button>
                    ) : (
                      <button onClick={() => changeStatus('open')}
                        className="flex-1 text-[11px] border border-emerald-300 rounded-xl py-1.5
                                   text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition font-semibold">
                        Reopen conversation
                      </button>
                    )}
                  </div>

                  {/* Reply preview */}
                  {replyMsg && (
                    <div className="flex items-center gap-2 mx-3 mt-2.5 px-3 py-2
                                    bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CornerUpLeft size={13} className="text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-emerald-700 block">
                          {replyMsg.senderName || 'Message'}
                        </span>
                        <span className="text-xs text-emerald-600 truncate block">
                          {(replyMsg.body || '').slice(0, 80)}
                        </span>
                      </div>
                      <button onClick={() => setReplyToId(null)} aria-label="Cancel reply"
                        className="text-emerald-400 hover:text-emerald-600 p-0.5 rounded transition flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Input row */}
                  <div className="flex items-end gap-2 px-3 py-3">
                    {/* Emoji */}
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setShowEmoji(p => !p)}
                        aria-label="Emoji picker" aria-expanded={showEmoji}
                        className={`w-9 h-9 rounded-xl border transition flex items-center justify-center
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                                    ${showEmoji
                                      ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                                    }`}>
                        <Smile size={18} />
                      </button>
                      {showEmoji && (
                        <EmojiPicker
                          onPick={emoji => {
                            handleDraftChange(draft + emoji)
                            setShowEmoji(false)
                            textareaRef.current?.focus()
                          }}
                          onClose={() => setShowEmoji(false)}
                        />
                      )}
                    </div>

                    {/* Textarea */}
                    <textarea ref={textareaRef} value={draft}
                      onChange={e => handleDraftChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                      }}
                      onBlur={() => {
                        clearTimeout(adminTypingTimer.current)
                        if (isAdminTyping.current) {
                          isAdminTyping.current = false
                          emitAdminTyping(activeId, false)
                        }
                      }}
                      rows={1}
                      placeholder="Type a reply… (Enter ↵ send · Shift+Enter newline)"
                      aria-label="Message input"
                      className="flex-1 resize-none text-sm px-3.5 py-2.5 rounded-xl border
                                 border-slate-200 outline-none leading-relaxed
                                 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                                 transition bg-slate-50 focus:bg-white placeholder:text-slate-400"
                      style={{ minHeight: 40, maxHeight: 140 }}
                    />

                    {/* Send */}
                    <button onClick={sendMessage} disabled={!draft.trim() || sending}
                      aria-label="Send message"
                      className="h-9 w-9 sm:w-auto sm:px-4 rounded-xl flex-shrink-0
                                 flex items-center justify-center sm:gap-1.5
                                 bg-emerald-600 text-white font-bold text-sm
                                 hover:bg-emerald-700 active:bg-emerald-800
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 transition shadow-sm shadow-emerald-200/60
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                      {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                      <span className="hidden sm:inline">{sending ? 'Sending' : 'Send'}</span>
                    </button>
                  </div>

                  <p className="text-center text-[10px] text-slate-300 pb-2 -mt-1 select-none">
                    Enter ↵ send · Shift+Enter newline · Esc cancel reply
                  </p>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes typing-dot {
          0%,80%,100%{transform:translateY(0);opacity:.4}
          40%{transform:translateY(-4px);opacity:1}
        }
      `}</style>
    </>
  )
}