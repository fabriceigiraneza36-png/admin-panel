// admin/src/pages/Messages.jsx
import React, {
  useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect,
} from 'react'
import {
  Send, Smile, X, ArrowLeft, CornerUpLeft, Check, CheckCheck,
  MessageSquare, RefreshCw, Search, Plus, User, ChevronDown, Circle,
} from 'lucide-react'
import { useAuth }   from '@context/AuthContext'
import { useSocket } from '@context/SocketContext'
import { API_BASE }  from '@utils/constants'
import { maintenanceAPI } from '@api/maintenance'
import ConfirmDialog from '@components/common/ConfirmDialog'
import { useToast } from '@hooks/useToast'

/* ══════════════════════════════════════════════════════════════════════════
   TOKEN / FETCH
══════════════════════════════════════════════════════════════════════════ */

const TOKEN_KEYS = ['altuvera_admin_token', 'auth_token', 'token']
const getToken = () => {
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

const fmtRelative = (d) => {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 60_000)      return 'Just now'
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604_800_000)
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short' })
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fmtShort = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

const isToday = (d) => {
  const n = new Date()
  return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear()
}
const isYesterday = (d) => {
  const y = new Date(); y.setDate(y.getDate()-1)
  return d.getDate()===y.getDate() && d.getMonth()===y.getMonth() && d.getFullYear()===y.getFullYear()
}

const groupMessages = (messages) => {
  const out = []; let last = null
  for (const m of messages) {
    const d = new Date(m.createdAt)
    const label = isToday(d) ? 'Today'
      : isYesterday(d) ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
    if (label !== last) { out.push({ type:'sep', label, key:`sep-${label}` }); last = label }
    out.push({ type:'msg', data:m, key:m.id })
  }
  return out
}

/* ══════════════════════════════════════════════════════════════════════════
   GLOBAL STYLES  (injected once, mirrors user-side layout exactly)
══════════════════════════════════════════════════════════════════════════ */

const ADMIN_MSG_STYLES = `
/* ── Layout shell ── */
.adm-msg-layout {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ── Sidebar ── */
.adm-sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  transition: transform .25s ease;
}
@media (min-width: 1024px) { .adm-sidebar { width: 320px; } }

.adm-sidebar-head {
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  z-index: 2;
}
.adm-sidebar-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}
.adm-sidebar-list::-webkit-scrollbar { width: 3px; }
.adm-sidebar-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
.adm-sidebar-list:hover::-webkit-scrollbar-thumb { background: #cbd5e1; }

/* ── Chat panel ── */
.adm-chat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #f8fafc;
}

.adm-chat-head {
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  z-index: 2;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.adm-chat-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 20px 16px;
}
.adm-chat-body::-webkit-scrollbar { width: 4px; }
.adm-chat-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
.adm-chat-body:hover::-webkit-scrollbar-thumb { background: #cbd5e1; }

.adm-chat-foot {
  flex-shrink: 0;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  z-index: 2;
  box-shadow: 0 -1px 8px rgba(0,0,0,0.04);
}

/* ── Mobile: full-screen chat overlays the sidebar ── */
@media (max-width: 767px) {
  .adm-sidebar { width: 100%; border-right: none; }
  .adm-chat {
    position: absolute;
    inset: 0;
    z-index: 20;
    background: #f8fafc;
  }
}

/* ── Typing dots ── */
@keyframes adm-tdot {
  0%,80%,100% { transform: translateY(0); opacity: .35; }
  40%         { transform: translateY(-5px); opacity: 1; }
}
.adm-tdot { animation: adm-tdot 1.2s ease-in-out infinite; }

/* ── Bubble hover reveals ── */
.adm-bubble-wrap { position: relative; }
.adm-bubble-actions {
  opacity: 0;
  transform: translateY(4px);
  transition: opacity .18s, transform .18s;
  pointer-events: none;
}
.adm-bubble-wrap:hover .adm-bubble-actions {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.adm-msg-meta {
  opacity: 0;
  transition: opacity .18s;
}
.adm-bubble-wrap:hover .adm-msg-meta { opacity: 1; }

/* ── Conversation row active indicator ── */
.adm-conv-row { border-left: 3px solid transparent; }
.adm-conv-row.active { border-left-color: #059669; background: #ecfdf5; }
.adm-conv-row:not(.active):hover { background: #f8fafc; }
`

let admStylesInjected = false
function injectAdminMsgStyles() {
  if (admStylesInjected || typeof document === 'undefined') return
  if (document.getElementById('adm-msg-styles')) { admStylesInjected = true; return }
  const el = document.createElement('style')
  el.id = 'adm-msg-styles'
  el.textContent = ADMIN_MSG_STYLES
  document.head.appendChild(el)
  admStylesInjected = true
}

/* ══════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

function Avatar({ name = '', src, size = 'md', online = false }) {
  const sz = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base',
  }
  const dot = {
    xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3', xl: 'w-3.5 h-3.5',
  }
  const cls = sz[size] || sz.md
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="relative flex-shrink-0">
      {src ? (
        <img src={src} alt={name}
          onError={e => { e.target.style.display = 'none' }}
          className={`${cls} rounded-full object-cover border-2 border-white shadow-sm`} />
      ) : (
        <div className={`${cls} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600
                         text-white font-bold flex items-center justify-center shadow-sm`}>
          {ini}
        </div>
      )}
      {online && (
        <span className={`absolute bottom-0 right-0 ${dot[size]||dot.md}
                         bg-emerald-500 border-2 border-white rounded-full`} />
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    open:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed:  'bg-slate-100  text-slate-500   border-slate-200',
    pending: 'bg-amber-50   text-amber-700   border-amber-200',
  }
  const dot = {
    open: 'bg-emerald-500', closed: 'bg-slate-400', pending: 'bg-amber-500',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5
                      rounded-full border capitalize flex-shrink-0 ${map[status]||map.pending}`}>
      <span className={`w-1 h-1 rounded-full ${dot[status]||dot.pending}`} />
      {status || 'open'}
    </span>
  )
}

function DateSep({ label }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-slate-200/80" />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest
                       bg-slate-50 px-3 py-1 rounded-full border border-slate-200 select-none whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200/80" />
    </div>
  )
}

function TypingDots({ name = 'User' }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600
                      text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {name[0]?.toUpperCase() || 'U'}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm
                      px-4 py-2.5 shadow-sm flex items-center gap-2 max-w-fit">
        <span className="text-[11px] text-slate-400">{name} is typing</span>
        <span className="flex items-center gap-0.5 ml-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="adm-tdot w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
              style={{ animationDelay: `${i * .2}s` }} />
          ))}
        </span>
      </div>
    </div>
  )
}

function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} role="dialog" aria-label="Emoji picker"
      className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200
                 rounded-2xl shadow-2xl p-2.5 grid grid-cols-6 gap-1 z-50 w-56">
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => onPick(e)} aria-label={e}
          className="text-xl p-1.5 rounded-xl hover:bg-slate-100 transition-colors leading-none">
          {e}
        </button>
      ))}
    </div>
  )
}

function ScrollBtn({ visible, onClick }) {
  return (
    <button onClick={onClick} aria-label="Scroll to latest messages"
      style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity .25s, transform .25s',
      }}
      className="w-9 h-9 rounded-full bg-emerald-600 text-white shadow-lg
                 flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800">
      <ChevronDown size={18} />
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CONVERSATION ROW
══════════════════════════════════════════════════════════════════════════ */

const ConvRow = React.memo(function ConvRow({ conv, active, onSelect, isTyping }) {
  const title    = conv.subject || conv.guestName || conv.guestEmail || 'Conversation'
  const hasUnread = (conv.unreadAdmin || 0) > 0

  return (
    <button
      onClick={() => onSelect(conv.id)}
      aria-pressed={active}
      aria-label={`Open conversation: ${title}`}
      className={`adm-conv-row w-full text-left px-3 py-3 transition-all duration-150
                  border-b border-slate-100/80 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500
                  ${active ? 'active' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <Avatar
          name={conv.guestName || conv.guestEmail || '?'}
          src={conv.guestAvatar}
          size="md"
          online={conv.isOnline}
        />
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <span className={`text-sm leading-tight truncate flex-1
                              ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
              {title}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
              {hasUnread && (
                <span className="bg-emerald-600 text-white rounded-full text-[10px] font-bold
                                 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center shadow-sm">
                  {conv.unreadAdmin > 9 ? '9+' : conv.unreadAdmin}
                </span>
              )}
              <span className={`text-[10px] whitespace-nowrap
                                ${hasUnread ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                {fmtRelative(conv.lastMessageAt)}
              </span>
            </div>
          </div>

          {/* Subtitle / typing */}
          {isTyping ? (
            <div className="flex items-center gap-1 mb-1">
              <span className="flex gap-0.5 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="adm-tdot w-1 h-1 rounded-full bg-emerald-500 inline-block"
                    style={{ animationDelay: `${i * .15}s` }} />
                ))}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">typing…</span>
            </div>
          ) : (
            <p className={`text-[11px] truncate mb-1 leading-snug
                           ${hasUnread ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
              {conv.lastMessage || 'No messages yet'}
            </p>
          )}

          {/* Status + booking */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
   MESSAGE BUBBLE
══════════════════════════════════════════════════════════════════════════ */

const MsgBubble = React.memo(function MsgBubble({ message, mine, replyTo, onReact, onReply }) {
  const reactions = useMemo(() => {
    const r = message.reactions || {}
    return Object.entries(r).filter(([, ids]) => ids?.length > 0)
  }, [message.reactions])

  const isPending = String(message.id).startsWith('tmp-')

  return (
    <div className={`adm-bubble-wrap flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
      {/* Avatar (other side) */}
      {!mine && (
        <div className="flex-shrink-0 self-end mr-2 mb-6">
          <Avatar name={message.senderName || 'User'} size="sm" />
        </div>
      )}

      <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}
                       max-w-[78%] sm:max-w-[65%]`}>
        {/* Sender name (others) */}
        {!mine && (
          <span className="text-[10px] font-bold text-emerald-700 mb-1 ml-1 uppercase tracking-wider">
            {message.senderName || 'User'}
          </span>
        )}

        {/* Reply reference */}
        {replyTo && (
          <div className={`text-[11px] mb-1.5 max-w-full ${mine ? 'self-end' : 'self-start'}`}>
            <div className={`border-l-2 pl-2 py-0.5 pr-3 rounded-lg truncate max-w-[280px]
                             ${mine
                               ? 'border-emerald-300 bg-emerald-700/15 text-emerald-100'
                               : 'border-slate-300 bg-slate-100/80 text-slate-500'
                             }`}>
              <span className="font-semibold block text-[10px] mb-0.5 opacity-70">
                ↩ {replyTo.senderName || 'Message'}
              </span>
              <span className="block truncate">{(replyTo.body || '').slice(0, 60)}</span>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className={`
          px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap
          rounded-2xl shadow-sm select-text
          ${mine
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm'
          }
          ${isPending ? 'opacity-60' : 'opacity-100'}
          transition-opacity duration-300
        `} style={{ wordBreak: 'break-word', maxWidth: '100%' }}>
          {message.body}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${mine ? 'justify-end' : ''}`}>
            {reactions.map(([emoji, ids]) => (
              <button key={emoji} onClick={() => onReact(message.id, emoji)}
                className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs
                           hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                {emoji} <span className="text-slate-500 font-medium">{ids.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Meta — revealed on hover via CSS */}
        <div className={`adm-msg-meta flex items-center gap-1 mt-1 text-[10px] text-slate-400
                         ${mine ? 'justify-end' : ''}`}>
          <span>{fmtShort(message.createdAt)}</span>
          {mine && !isPending && (
            message.isRead
              ? <CheckCheck size={11} className="text-emerald-500" />
              : <Check size={11} className="text-slate-400" />
          )}
          {isPending && <Circle size={9} className="text-slate-300 animate-pulse" />}
        </div>

        {/* Hover quick actions — revealed on hover via CSS */}
        <div className={`adm-bubble-actions flex items-center gap-0.5 mt-0.5
                         ${mine ? 'flex-row-reverse self-end' : 'self-start'}`}>
          {INLINE_REACTION_EMOJIS.map(e => (
            <button key={e}
              onMouseDown={ev => { ev.preventDefault(); onReact(message.id, e) }}
              className="text-base p-1 rounded-lg hover:bg-white hover:shadow-sm transition-all">
              {e}
            </button>
          ))}
          <button
            onMouseDown={ev => { ev.preventDefault(); onReply(message.id) }}
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
  const [subjectFocused, setSubjectFocused] = useState(false)
  const searchRef = useRef(null)
  const taRef     = useRef(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  useEffect(() => {
    if (selected) setTimeout(() => taRef.current?.focus(), 50)
  }, [selected])

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
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
      finally   { setLoadingUsers(false) }
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
        body: JSON.stringify({
          targetUserId: selected.id,
          subject:      subject.trim() || `Chat with ${selected.fullName || selected.email}`,
          body:         firstMsg.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      onCreated(data.data)
    } catch (err) { setError(err.message) }
    finally       { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         role="dialog" aria-modal="true" aria-label="New conversation">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl
                      flex flex-col overflow-hidden" style={{ maxHeight: '88dvh' }}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4
                        border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Plus size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">New Conversation</h3>
              <p className="text-[10px] text-slate-400">
                {selected ? 'Compose your message' : 'Select a traveller'}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       hover:bg-slate-100 text-slate-500 transition">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selected ? (
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2
                                             text-slate-400 pointer-events-none" />
                <input ref={searchRef} value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-2
                             focus:ring-emerald-500/20 bg-slate-50 focus:bg-white transition" />
              </div>

              {/* User list */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                {loadingUsers ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-100
                                            last:border-0 animate-pulse">
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
                ) : (
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {users.map(u => (
                      <button key={u.id} onClick={() => setSelected(u)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 border-b
                                   border-slate-100 last:border-0 hover:bg-emerald-50
                                   transition text-left group">
                        <Avatar name={u.fullName || u.email} src={u.avatarUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">
                            {u.fullName || '(no name)'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                        <ChevronDown size={13}
                          className="text-slate-300 group-hover:text-emerald-500
                                     transition -rotate-90 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Selected user card */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl
                              border border-emerald-200">
                <Avatar name={selected.fullName || selected.email}
                  src={selected.avatarUrl} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">
                    {selected.fullName || '(no name)'}
                  </p>
                  <p className="text-xs text-slate-500">{selected.email}</p>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Deselect user"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600
                             hover:bg-white transition">
                  <X size={14} />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase
                                  tracking-wider mb-1.5">
                  Subject <span className="text-slate-300 normal-case font-normal">(optional)</span>
                </label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder={`Chat with ${selected.fullName || selected.email}`}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-2
                             focus:ring-emerald-500/20 transition" />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase
                                  tracking-wider mb-1.5">
                  First Message <span className="text-red-400">*</span>
                </label>
                <textarea ref={taRef} value={firstMsg}
                  onChange={e => setFirstMsg(e.target.value)}
                  rows={4} placeholder="Hi! I'm reaching out about your booking…"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-2
                             focus:ring-emerald-500/20 transition resize-none" />
              </div>

              {error && (
                <p role="alert"
                   className="text-sm text-red-600 bg-red-50 border border-red-200
                              rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100
                        flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition">
            Cancel
          </button>
          {selected && (
            <button onClick={handleCreate} disabled={creating || !firstMsg.trim()}
              className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl
                         hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed
                         transition flex items-center gap-2">
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
  const toast = useToast()

  useEffect(() => { injectAdminMsgStyles() }, [])

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
  const [atBottom,       setAtBottom]       = useState(true)
  const [showScrollBtn,  setShowScrollBtn]  = useState(false)

  // user typing shown in admin chat panel
  const [userTyping,     setUserTyping]     = useState(null)  // { convId, name }
  // set of convIds where user is typing (for sidebar dots)
  const [typingConvIds,  setTypingConvIds]  = useState(new Set())

  // Maintenance / purge
  const [clearing,        setClearing]       = useState(false)
  const [clearConfirm,    setClearConfirm]   = useState({ open: false })

  /* ── Refs ── */
  const scrollRef        = useRef(null)
  const textareaRef      = useRef(null)
  const notifRef         = useRef(new Set())
  const typingTimers     = useRef({})       // per-conv timeout IDs
  const isAdminTypingRef = useRef(false)
  const adminTypingTimer = useRef(null)
  const activeIdRef      = useRef(null)     // always current without stale closure

  // Keep activeIdRef in sync
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

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
      const n = new Notification(`Altuvera — ${title}`, {
        body, icon: '/favicon.ico', tag: `conv-${convId}`,
      })
      n.onclick = () => { window.focus(); n.close() }
      setTimeout(() => notifRef.current.delete(key), 30_000)
    } catch { /* non-fatal */ }
  }, [])

  /* ── Load conversations ── */
  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const p = new URLSearchParams({ limit: '100', active: 'all' })
      if (filter !== 'all') p.set('status', filter)
      if (search.trim())    p.set('search', search.trim())
      const res  = await authFetch(`${API_BASE}/messages/conversations?${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setConversations(data.data || [])
    } catch (err) {
      console.error('[AdminMessages] load:', err.message)
    } finally {
      setLoadingList(false)
    }
  }, [filter, search])

  useEffect(() => { loadConversations() }, [loadConversations])

  /* ── Open conversation ── */
  const openConversation = useCallback(async (id) => {
    if (!id) {
      setActiveId(null); setActiveConv(null)
      setMessages([]); setReplyToId(null)
      setUserTyping(null); return
    }
    setActiveId(id)
    setReplyToId(null); setDraft('')
    setLoadingMsgs(true); setMessages([])
    setUserTyping(null); setAtBottom(true)
    setShowScrollBtn(false)

    try {
      const res  = await authFetch(`${API_BASE}/messages/conversations/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActiveConv(data.data)
      setMessages(data.data?.messages || [])

      // Mark as read (fire and forget)
      authFetch(`${API_BASE}/messages/conversations/${id}/read`, { method: 'PATCH' })
        .catch(() => {})

      // Clear unread in list
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, unreadAdmin: 0 } : c)
      )
    } catch (err) {
      console.error('[AdminMessages] open:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  /* ── Scroll helpers ── */
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAtBottom(bottom)
    setShowScrollBtn(!bottom)
  }, [])

  // Auto-scroll when messages load
  useEffect(() => {
    if (!loadingMsgs && messages.length > 0)
      requestAnimationFrame(() => scrollToBottom(false))
  }, [loadingMsgs, scrollToBottom])

  // Auto-scroll on new message if already at bottom
  useEffect(() => {
    if (atBottom) requestAnimationFrame(() => scrollToBottom(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  /* ── Reset on conversation change ── */
  useEffect(() => {
    setDraft(''); setReplyToId(null); setShowEmoji(false)
    clearTimeout(adminTypingTimer.current)
    isAdminTypingRef.current = false
  }, [activeId])

  /* ── Textarea auto-resize ── */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    el.style.overflowY = el.scrollHeight > 128 ? 'auto' : 'hidden'
  }, [draft])

  /* ── Emit admin typing → user ── */
  const emitAdminTyping = useCallback((convId, isTyping) => {
    if (!emit || !convId) return
    emit('msg:typing', {
      conversationId: convId,
      isTyping,
      senderType:     'admin',
      senderName:     user?.full_name || user?.username || 'Altuvera',
    })
  }, [emit, user])

  const handleDraftChange = useCallback((val) => {
    setDraft(val)
    const convId = activeIdRef.current
    if (!convId) return
    const typing = val.length > 0
    if (typing !== isAdminTypingRef.current) {
      isAdminTypingRef.current = typing
      emitAdminTyping(convId, typing)
    }
    // Auto-stop after 3 s of no keystrokes
    clearTimeout(adminTypingTimer.current)
    if (typing) {
      adminTypingTimer.current = setTimeout(() => {
        isAdminTypingRef.current = false
        emitAdminTyping(convId, false)
      }, 3000)
    }
  }, [emitAdminTyping])

  /* ── Send message ── */
  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    const convId = activeIdRef.current
    if (!convId || !text || sending) return

    // Stop typing signal
    clearTimeout(adminTypingTimer.current)
    isAdminTypingRef.current = false
    emitAdminTyping(convId, false)

    setSending(true)
    const optimistic = {
      id:             `tmp-${Date.now()}`,
      conversationId: convId,
      senderType:     'admin',
      senderName:     user?.full_name || user?.username || 'Admin',
      body:           text,
      isRead:         false,
      reactions:      {},
      createdAt:      new Date().toISOString(),
      replyToId:      replyToId || undefined,
    }

    setMessages(prev => [...prev, optimistic])
    setAtBottom(true)
    const outDraft = draft, outReply = replyToId
    setDraft(''); setReplyToId(null)

    /* ── Socket path (preferred) ── */
    if (connected && emit) {
      emit(
        'msg:admin-send',
        { conversationId: convId, body: outDraft, replyToId: outReply || undefined },
        (ack) => {
          if (ack?.success && ack.message) {
            setMessages(prev =>
              prev.map(m => m.id === optimistic.id ? ack.message : m)
            )
          } else if (ack?.error) {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
          }
          setSending(false)
          loadConversations()
        }
      )
      return  // setSending(false) handled in ack callback
    }

    /* ── REST fallback ── */
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${convId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: outDraft,
            ...(outReply ? { replyToId: outReply } : {}),
          }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.data) {
          setMessages(prev =>
            prev.map(m => m.id === optimistic.id ? data.data : m)
          )
        }
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
      loadConversations()
    }
  }, [draft, sending, connected, emit, user, loadConversations, replyToId, emitAdminTyping])

  /* ── Reactions ── */
  const toggleReaction = useCallback(async (messageId, emoji) => {
    const convId = activeIdRef.current
    if (!convId) return
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${convId}/messages/${messageId}/react`,
        { method: 'PATCH', body: JSON.stringify({ emoji }) }
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(prev =>
          prev.map(m =>
            String(m.id) === String(messageId)
              ? { ...m, reactions: data.data?.reactions || {} }
              : m
          )
        )
        // Broadcast reaction via socket
        if (connected && emit) {
          emit('msg:reaction-broadcast', {
            conversationId: convId,
            messageId,
            reactions: data.data?.reactions || {},
          })
        }
      }
    } catch { /* silent */ }
  }, [connected, emit])

  /* ── Status change ── */
  const changeStatus = useCallback(async (status) => {
    const convId = activeIdRef.current
    if (!convId) return
    try {
      await authFetch(`${API_BASE}/messages/conversations/${convId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      })
      setActiveConv(p => p ? { ...p, status } : p)
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, status } : c)
      )
      // Notify the user's socket room
      if (emit) {
        emit('msg:conversation-updated', { id: convId, status })
      }
    } catch { /* silent */ }
  }, [emit])

  /* ── New chat ── */
  const handleNewConvCreated = useCallback((conv) => {
    setShowNewChat(false)
    loadConversations()
    if (conv?.id) openConversation(conv.id)
  }, [loadConversations, openConversation])

  /* ── Purge all messages ── */
  const handleClearAll = useCallback(async () => {
    setClearing(true)
    try {
      const { data } = await maintenanceAPI.purgeCategory('messaging', 'DELETE_ALL')
      toast.success(data.message || 'All messages cleared')
      setConversations([])
      setMessages([])
      setActiveId(null)
      setActiveConv(null)
      setUserTyping(null)
      await loadConversations()
    } catch (e) {
      toast.error(e.message || 'Failed to clear messages')
    } finally {
      setClearing(false)
      setClearConfirm({ open: false })
    }
  }, [loadConversations, toast])

  /* ══════════════════════════════════════════════════════════════════════
     SOCKET LISTENERS  ← the real-time core
  ══════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!on || !off) return

    /* ── Incoming message from user ── */
    const onMessage = (payload) => {
      if (!payload) return
      const cid = String(payload.conversationId)

      // Clear typing indicator when real message arrives
      if (payload.senderType === 'user') {
        clearTimeout(typingTimers.current[cid])
        delete typingTimers.current[cid]
        setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
        if (cid === String(activeIdRef.current)) setUserTyping(null)
      }

      // Append to active conversation (deduplicate)
      if (cid === String(activeIdRef.current)) {
        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(payload.id))) return prev
          return [...prev, payload]
        })
      }

      // Update sidebar: last message + unread
      setConversations(prev =>
        prev.map(c => {
          if (String(c.id) !== cid) return c
          return {
            ...c,
            lastMessage:   payload.body,
            lastMessageAt: payload.createdAt,
            unreadAdmin: payload.senderType !== 'admin'
              ? (cid !== String(activeIdRef.current)
                  ? (c.unreadAdmin || 0) + 1
                  : 0)
              : c.unreadAdmin,
          }
        })
      )

      // Move conversation to top in list (re-sort)
      setConversations(prev => {
        const idx = prev.findIndex(c => String(c.id) === cid)
        if (idx <= 0) return prev
        const updated = [...prev]
        const [item]  = updated.splice(idx, 1)
        return [item, ...updated]
      })

      // Desktop notification
      if (payload.senderType !== 'admin' && document.hidden) {
        showDesktopNotif(
          `New message from ${payload.senderName || 'traveller'}`,
          payload.body?.slice(0, 120),
          payload.conversationId
        )
      }
    }

    /* ── User typing ── */
    const onTyping = (payload) => {
      // Only process user → admin direction
      if (payload.senderType !== 'user') return
      const cid = String(payload.conversationId)

      if (payload.isTyping) {
        setTypingConvIds(prev => { const s = new Set(prev); s.add(cid); return s })
        if (cid === String(activeIdRef.current)) {
          setUserTyping({ convId: cid, name: payload.senderName || 'User' })
        }
        clearTimeout(typingTimers.current[cid])
        typingTimers.current[cid] = setTimeout(() => {
          setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
          setUserTyping(prev =>
            prev && String(prev.convId) === cid ? null : prev
          )
        }, 4000)
      } else {
        clearTimeout(typingTimers.current[cid])
        delete typingTimers.current[cid]
        setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
        setUserTyping(prev =>
          prev && String(prev.convId) === cid ? null : prev
        )
      }
    }

    /* ── New conversation started by user ── */
    const onNewFromUser = (payload) => {
      loadConversations()
      if (document.hidden) {
        showDesktopNotif(
          'New message from traveller',
          payload.message?.body?.slice(0, 120) || 'New message',
          payload.conversationId
        )
      }
    }

    /* ── Conversation updated (status change, etc.) ── */
    const onConvUpdated = (conv) => {
      if (!conv) return
      setActiveConv(p => p?.id === conv.id ? { ...p, ...conv } : p)
      setConversations(prev =>
        prev.map(c => String(c.id) === String(conv.id) ? { ...c, ...conv } : c)
      )
    }

    /* ── Reaction update ── */
    const onReaction = ({ messageId, reactions }) => {
      if (!messageId) return
      setMessages(prev =>
        prev.map(m =>
          String(m.id) === String(messageId)
            ? { ...m, reactions: reactions || {} }
            : m
        )
      )
    }

    /* ── Admin joins admin room so they get all user events ── */
    if (emit) emit('join:admin')

    on('msg:message',              onMessage)
    on('msg:new-from-user',        onNewFromUser)
    on('msg:conversation-updated', onConvUpdated)
    on('msg:reaction',             onReaction)
    on('msg:typing',               onTyping)

    return () => {
      off('msg:message',              onMessage)
      off('msg:new-from-user',        onNewFromUser)
      off('msg:conversation-updated', onConvUpdated)
      off('msg:reaction',             onReaction)
      off('msg:typing',               onTyping)
    }
  }, [on, off, emit, loadConversations, showDesktopNotif])

  /* ── Join conversation socket room when activeId changes ── */
  useEffect(() => {
    if (!emit || !activeId) return
    emit('join:conversation', { conversationId: activeId })
    return () => {
      if (emit) emit('leave:conversation', { conversationId: activeId })
    }
  }, [emit, activeId])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') {
        if (showEmoji) { setShowEmoji(false); return }
        if (replyToId) { setReplyToId(null) }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [showEmoji, replyToId])

  /* ── Derived ── */
  const replyMap    = useMemo(() => new Map(messages.map(m => [String(m.id), m])), [messages])
  const msgGroups   = useMemo(() => groupMessages(messages), [messages])
  const replyMsg    = replyToId ? replyMap.get(String(replyToId)) : null
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadAdmin || 0), 0)

  const convTitle = activeConv?.subject
    || (activeConv?.bookingNumber ? `Booking #${activeConv.bookingNumber}` : null)
    || activeConv?.guestName
    || 'Conversation'

  const showMobileChat = !!activeId

  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleNewConvCreated}
        />
      )}

      {/*
        ┌──────────────────────────────────────────────────────────────┐
        │  Outer shell — must fill the admin content area exactly.     │
        │  We use a fixed height derived from the viewport.            │
        │  The admin layout's main area provides this automatically    │
        │  if you pass the right class/style from the parent.          │
        └──────────────────────────────────────────────────────────────┘
      */}
      <div className="flex flex-col overflow-hidden"
           style={{ height: '100%', minHeight: 0 }}>

        {/* ── Page header (fixed, never scrolls) ── */}
        <div className={`
          flex-shrink-0 flex items-center justify-between
          px-4 sm:px-6 py-3 bg-white border-b border-slate-200
          ${showMobileChat ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center
                            justify-center flex-shrink-0">
              <MessageSquare size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight
                             flex items-center gap-2">
                Messages
                {totalUnread > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold rounded-full
                                   px-1.5 py-px min-w-[18px] text-center leading-tight">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                Live conversations with travellers
                {connected
                  ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  : <span className="text-amber-600 font-semibold">· Reconnecting…</span>
                }
              </p>
            </div>
          </div>

          <button onClick={() => setShowNewChat(true)}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600
                       text-white text-sm font-bold rounded-xl hover:bg-emerald-700
                       active:bg-emerald-800 transition shadow-sm shadow-emerald-200/60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <Plus size={16} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <button
            onClick={() => setClearConfirm({ open: true })}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-red-50
                       text-red-700 border border-red-200 text-xs font-bold
                       rounded-xl hover:bg-red-100 transition"
            aria-label="Clear all messages"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>

        {/*
          ┌──────────────────────────────────────────────────────────────┐
          │  Two-panel body — flex:1 + min-height:0 so it fills         │
          │  remaining height without growing past it.                  │
          └──────────────────────────────────────────────────────────────┘
        */}
        <div className="adm-msg-layout flex-1 min-h-0">

          {/* ════════════════ SIDEBAR ════════════════ */}
          <div className={`adm-sidebar ${showMobileChat ? 'hidden md:flex' : 'flex'} flex-col`}>

            {/* Fixed sidebar header */}
            <div className="adm-sidebar-head px-3 pt-3 pb-2.5 space-y-2">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2
                                             text-slate-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…" aria-label="Search"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200
                             rounded-xl outline-none focus:border-emerald-500 focus:bg-white
                             focus:ring-2 focus:ring-emerald-500/20 transition" />
              </div>

              {/* Filter tabs */}
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-xl" role="tablist">
                {[
                  { key: 'open',   label: 'Open'   },
                  { key: 'closed', label: 'Closed' },
                  { key: 'all',    label: 'All'    },
                ].map(f => (
                  <button key={f.key} role="tab" aria-selected={filter === f.key}
                    onClick={() => setFilter(f.key)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200
                                flex items-center justify-center
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                                ${filter === f.key
                                  ? 'bg-white text-emerald-700 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-700'
                                }`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Count + refresh */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
                </span>
                <button onClick={loadConversations} disabled={loadingList}
                  aria-label="Refresh" title="Refresh conversations"
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400
                             disabled:opacity-40">
                  <RefreshCw size={12} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Scrollable conversation list */}
            <div className="adm-sidebar-list" role="list">
              {loadingList && conversations.length === 0 ? (
                /* Skeleton rows */
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i}
                    className="flex items-start gap-2.5 px-3 py-3 border-b
                               border-slate-100 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="flex justify-between gap-2">
                        <div className="h-2.5 flex-1 bg-slate-200 rounded" />
                        <div className="h-2 w-10 bg-slate-200 rounded" />
                      </div>
                      <div className="h-2 w-4/5 bg-slate-200 rounded" />
                      <div className="h-2 w-1/3 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center
                                  justify-center mb-3">
                    <MessageSquare size={22} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">
                    No {filter !== 'all' ? filter : ''} conversations
                  </p>
                  <button onClick={() => setShowNewChat(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold
                               text-emerald-600 hover:text-emerald-700
                               underline underline-offset-2">
                    <Plus size={12} /> Start a conversation
                  </button>
                </div>
              ) : (
                conversations.map(c => (
                  <div role="listitem" key={c.id}>
                    <ConvRow
                      conv={c}
                      active={c.id === activeId}
                      onSelect={openConversation}
                      isTyping={typingConvIds.has(String(c.id))}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ════════════════ CHAT PANEL ════════════════ */}
          <div className={`adm-chat ${showMobileChat ? 'flex' : 'hidden md:flex'} flex-col`}>

            {!activeConv ? (
              /* ── Empty state ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50
                                to-emerald-100 flex items-center justify-center mb-5 shadow-inner">
                  <MessageSquare size={34} className="text-emerald-300" />
                </div>
                <h3 className="text-base font-bold text-slate-600 mb-1.5">
                  No conversation selected
                </h3>
                <p className="text-sm text-slate-400 mb-6 max-w-[200px] leading-relaxed">
                  Choose from the list or start a new conversation with a traveller.
                </p>
                <button onClick={() => setShowNewChat(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600
                             text-white text-sm font-bold rounded-xl hover:bg-emerald-700
                             transition shadow-sm">
                  <Plus size={15} /> New Conversation
                </button>
              </div>
            ) : (
              <>
                {/* ── FIXED CHAT HEADER ── */}
                <div className="adm-chat-head px-4 py-3 flex items-center gap-3">
                  {/* Back — mobile */}
                  <button onClick={() => openConversation(null)} aria-label="Back"
                    className="md:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 transition
                               text-slate-600 flex-shrink-0">
                    <ArrowLeft size={18} />
                  </button>

                  <Avatar
                    name={activeConv.guestName || activeConv.guestEmail || '?'}
                    src={activeConv.guestAvatar}
                    size="md"
                    online={activeConv.isOnline}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate leading-tight">
                      {convTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-slate-400 truncate">
                        {activeConv.guestEmail || activeConv.guestName || 'Guest'}
                        {activeConv.bookingNumber && (
                          <span className="font-mono ml-1">#{activeConv.bookingNumber}</span>
                        )}
                      </p>
                      {/* User typing shown in header subtitle */}
                      {userTyping && String(userTyping.convId) === String(activeId) && (
                        <span className="text-[10px] text-emerald-600 font-semibold
                                         animate-pulse flex-shrink-0">
                          typing…
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={activeConv.status} />
                    {activeConv.status !== 'closed' ? (
                      <button onClick={() => changeStatus('closed')}
                        className="hidden sm:flex text-[11px] border border-slate-200 rounded-xl
                                   px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition
                                   font-semibold">
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

                {/* ── SCROLLABLE MESSAGE BODY ── */}
                {/*
                  flex:1 + min-height:0 → never pushes the footer down.
                  overflow-y:auto       → scrolls internally.
                  The CSS class .adm-chat-body handles all of this.
                */}
                <div
                  ref={scrollRef}
                  onScroll={onScroll}
                  className="adm-chat-body"
                  role="log"
                  aria-live="polite"
                  aria-label="Conversation messages"
                >
                  {loadingMsgs && messages.length === 0 ? (
                    /* Loading skeletons */
                    <div className="space-y-3 pt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i}
                          className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}
                                      animate-pulse`}>
                          {i % 2 === 0 && (
                            <div className="w-7 h-7 rounded-full bg-slate-200 mr-2
                                            flex-shrink-0 self-end" />
                          )}
                          <div className={`rounded-2xl ${
                            i % 2 === 0
                              ? 'bg-slate-200'
                              : 'bg-emerald-200/50'
                          }`} style={{ width: 120 + i * 28, height: 36 + i * 6 }} />
                        </div>
                      ))}
                    </div>
                  ) : msgGroups.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200
                                      flex items-center justify-center mb-3 shadow-sm">
                        <Send size={20} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">No messages yet</p>
                      <p className="text-xs text-slate-300 mt-1">
                        Send the first message to get started!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {msgGroups.map(item =>
                        item.type === 'sep' ? (
                          <DateSep key={item.key} label={item.label} />
                        ) : (
                          <MsgBubble
                            key={item.key}
                            message={item.data}
                            mine={item.data.senderType === 'admin'}
                            replyTo={item.data.replyToId
                              ? replyMap.get(String(item.data.replyToId))
                              : null
                            }
                            onReact={toggleReaction}
                            onReply={setReplyToId}
                          />
                        )
                      )}

                      {/* User typing indicator */}
                      {userTyping && String(userTyping.convId) === String(activeId) && (
                        <div className="mt-2">
                          <TypingDots name={userTyping.name} />
                        </div>
                      )}

                      {/* Scroll anchor */}
                      <div className="h-1" />
                    </div>
                  )}
                </div>

                {/* Scroll-to-bottom button (sits on top of body, absolute) */}
                <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
                  <ScrollBtn visible={showScrollBtn} onClick={() => scrollToBottom(true)} />
                </div>

                {/* ── FIXED COMPOSER (flex-shrink:0 via .adm-chat-foot) ── */}
                <div className="adm-chat-foot px-3 pt-2.5 pb-3">

                  {/* Mobile status bar */}
                  <div className="sm:hidden flex gap-2 mb-2">
                    {activeConv.status !== 'closed' ? (
                      <button onClick={() => changeStatus('closed')}
                        className="flex-1 text-[11px] border border-slate-200 rounded-xl
                                   py-1.5 text-slate-600 hover:bg-slate-50 transition font-semibold">
                        Close conversation
                      </button>
                    ) : (
                      <button onClick={() => changeStatus('open')}
                        className="flex-1 text-[11px] border border-emerald-300 rounded-xl
                                   py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                                   transition font-semibold">
                        Reopen conversation
                      </button>
                    )}
                  </div>

                  {/* Reply preview */}
                  {replyMsg && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-emerald-50
                                    border border-emerald-200 rounded-xl">
                      <CornerUpLeft size={12} className="text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-emerald-700 block">
                          {replyMsg.senderName || 'Message'}
                        </span>
                        <span className="text-xs text-emerald-600 truncate block">
                          {(replyMsg.body || '').slice(0, 80)}
                        </span>
                      </div>
                      <button onClick={() => setReplyToId(null)} aria-label="Cancel reply"
                        className="text-emerald-400 hover:text-emerald-600 transition flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Input row */}
                  <div className="flex items-end gap-2">
                    {/* Emoji picker */}
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setShowEmoji(p => !p)}
                        aria-label="Open emoji picker" aria-expanded={showEmoji}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center
                                    transition focus-visible:outline-none focus-visible:ring-2
                                    focus-visible:ring-emerald-500
                                    ${showEmoji
                                      ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                                    }`}>
                        <Smile size={17} />
                      </button>
                      {showEmoji && (
                        <EmojiPicker
                          onPick={emoji => {
                            const val = draft + emoji
                            handleDraftChange(val)
                            setShowEmoji(false)
                            textareaRef.current?.focus()
                          }}
                          onClose={() => setShowEmoji(false)}
                        />
                      )}
                    </div>

                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={e => handleDraftChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault(); sendMessage()
                        }
                      }}
                      onBlur={() => {
                        clearTimeout(adminTypingTimer.current)
                        if (isAdminTypingRef.current) {
                          isAdminTypingRef.current = false
                          emitAdminTyping(activeIdRef.current, false)
                        }
                      }}
                      rows={1}
                      placeholder="Type a reply… (Enter ↵ send · Shift+Enter newline)"
                      aria-label="Message input"
                      className="flex-1 resize-none text-sm px-3.5 py-2.5 rounded-xl border
                                 border-slate-200 bg-slate-50 outline-none leading-relaxed
                                 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                                 focus:bg-white transition placeholder:text-slate-400"
                      style={{ minHeight: 40, maxHeight: 128 }}
                    />

                    {/* Send button */}
                    <button onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      aria-label="Send message"
                      className="h-9 w-9 sm:w-auto sm:px-4 rounded-xl flex-shrink-0
                                 flex items-center justify-center sm:gap-1.5
                                 bg-emerald-600 text-white font-bold text-sm
                                 hover:bg-emerald-700 active:bg-emerald-800
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 transition shadow-sm shadow-emerald-200/60
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-emerald-500">
                      {sending
                        ? <RefreshCw size={15} className="animate-spin" />
                        : <Send size={15} />
                      }
                      <span className="hidden sm:inline">
                        {sending ? 'Sending' : 'Send'}
                      </span>
                    </button>
                  </div>

                  {/* Keyboard hint */}
                  <p className="text-center text-[10px] text-slate-300 mt-1.5 select-none">
                    Enter ↵ send · Shift+Enter newline · Esc cancel reply
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={clearConfirm.open}
        onClose={() => setClearConfirm({ open: false })}
        onConfirm={handleClearAll}
        type="delete"
        title="Clear all messages?"
        description="This will permanently delete all conversations and messages. This cannot be undone."
        confirmLabel="Clear All"
        loading={clearing}
      />
    </>
  )
}