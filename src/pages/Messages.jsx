// admin/src/pages/Messages.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES v3.0 — Professional Green-White Theme & Fluid Scroll Mechanics
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react'
import {
  Send, Smile, X, ArrowLeft, CornerUpLeft, Check, CheckCheck,
  MessageSquare, RefreshCw, Search, Plus, User, ChevronDown, Circle, Trash2,
  AlertTriangle, ShieldCheck, Clock
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth }   from '@context/AuthContext'
import { useSocket } from '@context/SocketContext'
import { API_BASE }  from '@utils/constants'
import { maintenanceAPI } from '@api/maintenance'
import ConfirmDialog from '@components/common/ConfirmDialog'
import { useToast } from '@hooks/useToast'

/* ─── Token Retrieval / Fetch Helpers ──────────────────────────────────────── */

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

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const QUICK_EMOJIS = ['👍','❤️','😂','🎉','👏','😮','👎','🔥','🙏','✨','😊','😢']
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
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

const isYesterday = (d) => {
  const y = new Date(); y.setDate(y.getDate() - 1)
  return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear()
}

const groupMessages = (messages) => {
  const out = []; let last = null
  for (const m of messages) {
    const d = new Date(m.createdAt)
    const label = isToday(d) ? 'Today'
      : isYesterday(d) ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (label !== last) { out.push({ type: 'sep', label, key: `sep-${label}` }); last = label }
    out.push({ type: 'msg', data: m, key: m.id })
  }
  return out
}

/* ─── UI Components ────────────────────────────────────────────────────────── */

function Avatar({ name = '', src, size = 'md', online = false }) {
  const sz = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-14 h-14 text-base',
  }
  const cls = sz[size] || sz.md
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="relative flex-shrink-0 select-none">
      {src ? (
        <img src={src} alt={name}
          onError={e => { e.target.style.display = 'none' }}
          className={`${cls} rounded-full object-cover border-2 border-white ring-1 ring-slate-100 shadow-sm`} />
      ) : (
        <div className={`${cls} rounded-full bg-gradient-to-br from-emerald-500 to-teal-600
                         text-white font-bold flex items-center justify-center border-2 border-white ring-1 ring-slate-100 shadow-sm`}>
          {ini}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    open:    'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    closed:  'bg-slate-100 text-slate-500 border-slate-200/60',
    pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
  }
  const dot = {
    open: 'bg-emerald-500', closed: 'bg-slate-400', pending: 'bg-amber-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5
                      rounded-full border capitalize flex-shrink-0 ${map[status] || map.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] || dot.pending}`} />
      {status || 'open'}
    </span>
  )
}

function DateSep({ label }) {
  return (
    <div className="flex items-center gap-3 my-6 select-none">
      <div className="flex-1 h-[1px] bg-slate-200/60" />
      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase
                       bg-white px-3 py-1 rounded-full border border-slate-200/60">
        {label}
      </span>
      <div className="flex-1 h-[1px] bg-slate-200/60" />
    </div>
  )
}

function TypingDots({ name = 'User' }) {
  return (
    <div className="flex items-end gap-2.5 mb-4 animate-fade-in">
      <Avatar name={name} size="sm" />
      <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-sm
                      px-4 py-2.5 shadow-sm flex items-center gap-2 max-w-fit">
        <span className="text-xs text-slate-500 font-medium">{name} is typing</span>
        <span className="flex items-center gap-1 ml-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
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
      className="absolute bottom-full left-0 mb-3 bg-white border border-slate-200/80
                 rounded-2xl shadow-xl p-3 grid grid-cols-6 gap-1.5 z-50 w-64 animate-fade-in-up">
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => onPick(e)} aria-label={e}
          className="text-xl p-2 rounded-xl hover:bg-emerald-55/40 hover:scale-110 active:scale-95 transition-all leading-none">
          {e}
        </button>
      ))}
    </div>
  )
}

function ScrollBtn({ visible, onClick }) {
  return (
    <button onClick={onClick} aria-label="Scroll to latest messages"
      className={`absolute bottom-20 right-6 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700
                 text-white shadow-lg flex items-center justify-center transition-all duration-300 z-30
                 hover:scale-105 active:scale-95 border border-emerald-500/30
                 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-75 pointer-events-none'}`}>
      <ChevronDown size={20} className="animate-bounce" />
    </button>
  )
}

/* ─── Conversation Row ─────────────────────────────────────────────────────── */

const ConvRow = React.memo(function ConvRow({ conv, active, onSelect, isTyping }) {
  const title = conv.subject || conv.guestName || conv.guestEmail || 'Conversation'
  const hasUnread = (conv.unreadAdmin || 0) > 0

  return (
    <button
      onClick={() => onSelect(conv.id)}
      aria-pressed={active}
      className={`w-full text-left px-4 py-3.5 transition-all duration-200 border-b border-slate-100
                  outline-none flex flex-col gap-1.5
                  ${active 
                    ? 'bg-emerald-50/55 border-l-4 border-l-emerald-600' 
                    : 'border-l-4 border-l-transparent hover:bg-slate-50/70'}`}
    >
      <div className="flex items-start gap-3 w-full">
        <Avatar
          name={conv.guestName || conv.guestEmail || '?'}
          src={conv.guestAvatar}
          size="md"
          online={conv.isOnline}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <span className={`text-sm leading-tight truncate flex-1
                              ${hasUnread ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
              {title}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1.5">
              {hasUnread && (
                <span className="bg-emerald-600 text-white rounded-full text-[10px] font-bold
                                 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center shadow-sm">
                  {conv.unreadAdmin > 9 ? '9+' : conv.unreadAdmin}
                </span>
              )}
              <span className={`text-[10px] font-medium whitespace-nowrap
                                ${hasUnread ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                {fmtRelative(conv.lastMessageAt)}
              </span>
            </div>
          </div>

          {isTyping ? (
            <div className="flex items-center gap-1 mb-1 animate-pulse">
              <span className="flex gap-0.5 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
              <span className="text-xs text-emerald-600 font-bold">typing…</span>
            </div>
          ) : (
            <p className={`text-xs truncate mb-1 leading-snug
                           ${hasUnread ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
              {conv.lastMessage || 'No messages yet'}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={conv.status} />
            {conv.bookingNumber && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                #{conv.bookingNumber}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
})

/* ─── Message Bubble ───────────────────────────────────────────────────────── */

const MsgBubble = React.memo(function MsgBubble({ message, mine, replyTo, onReact, onReply }) {
  const reactions = useMemo(() => {
    const r = message.reactions || {}
    return Object.entries(r).filter(([, ids]) => ids?.length > 0)
  }, [message.reactions])

  const isPending = String(message.id).startsWith('tmp-')

  return (
    <div className={`group/bubble flex ${mine ? 'justify-end' : 'justify-start'} mb-3 w-full`}>
      {!mine && (
        <div className="flex-shrink-0 self-end mr-2 mb-5">
          <Avatar name={message.senderName || 'User'} size="xs" />
        </div>
      )}

      <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[70%]`}>
        {!mine && (
          <span className="text-[10px] font-bold text-emerald-800 mb-1 ml-1.5 uppercase tracking-widest">
            {message.senderName || 'User'}
          </span>
        )}

        {/* Reply target content */}
        {replyTo && (
          <div className={`text-xs mb-1 max-w-full ${mine ? 'self-end' : 'self-start'}`}>
            <div className={`border-l-2 pl-2.5 py-1 pr-3 rounded-lg truncate max-w-[280px]
                             ${mine
                               ? 'border-emerald-300 bg-emerald-50 text-emerald-800/80'
                               : 'border-slate-300 bg-slate-100 text-slate-600'
                             }`}>
              <span className="font-bold block text-[9px] uppercase tracking-wide opacity-80">
                ↩ {replyTo.senderName || 'Message'}
              </span>
              <span className="block truncate text-[11px] mt-0.5">{(replyTo.body || '')}</span>
            </div>
          </div>
        )}

        {/* Bubble container with hover overlay actions */}
        <div className="relative flex items-center gap-2 max-w-full">
          {/* Bubble wrapper */}
          <div className={`
            px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl shadow-sm
            ${mine
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-br-sm'
              : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm'
            }
            ${isPending ? 'opacity-60' : 'opacity-100'}
            transition-all duration-200
          `} style={{ wordBreak: 'break-word', maxWidth: '100%' }}>
            {message.body}
          </div>

          {/* Quick reactions menu wrapper (fades on hover) */}
          <div className={`opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200
                           absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 bg-white
                           border border-slate-200 shadow-lg rounded-full px-2 py-1
                           ${mine ? 'right-full mr-2 flex-row' : 'left-full ml-2 flex-row-reverse'}`}>
            {INLINE_REACTION_EMOJIS.map(e => (
              <button key={e}
                onMouseDown={ev => { ev.preventDefault(); onReact(message.id, e) }}
                className="text-sm p-1 rounded-lg hover:bg-slate-100 transition-colors transform active:scale-125 duration-100">
                {e}
              </button>
            ))}
            <button
              onMouseDown={ev => { ev.preventDefault(); onReply(message.id) }}
              className="p-1 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition-colors">
              <CornerUpLeft size={13} />
            </button>
          </div>
        </div>

        {/* Reacted pills container */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${mine ? 'justify-end' : ''}`}>
            {reactions.map(([emoji, ids]) => (
              <button key={emoji} onClick={() => onReact(message.id, emoji)}
                className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs
                           hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-1">
                <span>{emoji}</span>
                <span className="text-slate-500 font-semibold text-[10px]">{ids.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-slate-400
                         ${mine ? 'justify-end' : ''}`}>
          <span>{fmtShort(message.createdAt)}</span>
          {mine && !isPending && (
            message.isRead
              ? <CheckCheck size={12} className="text-emerald-500" />
              : <Check size={12} className="text-slate-400" />
          )}
          {isPending && <Circle size={8} className="text-slate-300 animate-pulse fill-slate-300" />}
        </div>

      </div>
    </div>
  )
})

/* ─── New Chat Modal ───────────────────────────────────────────────────────── */

function NewChatModal({ onClose, onCreated }) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selected, setSelected] = useState(null)
  const [subject, setSubject] = useState('')
  const [firstMsg, setFirstMsg] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef(null)
  const taRef = useRef(null)

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
        const res = await authFetch(`${API_BASE}/messages/users-list?search=${encodeURIComponent(search)}&limit=30`)
        const data = await res.json()
        setUsers(data.data || [])
      } catch { setUsers([]) }
      finally { setLoadingUsers(false) }
    }
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  const handleCreate = async () => {
    if (!selected) { setError('Please select a user.'); return }
    if (!firstMsg.trim()) { setError('Please enter a message.'); return }
    setError(''); setCreating(true)
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations`, {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: selected.id,
          subject: subject.trim() || `Chat with ${selected.fullName || selected.email}`,
          body: firstMsg.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      onCreated(data.data)
    } catch (err) { setError(err.message) }
    finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
         role="dialog" aria-modal="true" aria-label="New conversation">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl
                      flex flex-col overflow-hidden animate-scale-up" style={{ maxHeight: '88dvh' }}>

        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4.5
                        border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Plus size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-850 text-sm">New Conversation</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {selected ? 'Compose message' : 'Select target traveler'}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center
                       hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selected ? (
            <div className="p-5 space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2
                                             text-slate-400 pointer-events-none" />
                <input ref={searchRef} value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-4
                             focus:ring-emerald-500/10 bg-slate-50 focus:bg-white transition" />
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                {loadingUsers ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 border-b border-slate-100
                                            last:border-0 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 bg-slate-200 rounded" />
                        <div className="h-2 w-1/2 bg-slate-200 rounded" />
                      </div>
                    </div>
                  ))
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50/50">
                    <User size={32} className="mx-auto mb-2 opacity-30 text-emerald-600" />
                    <p className="text-sm font-semibold">No travelers found</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: 280, overflowY: 'auto' }} className="divide-y divide-slate-150">
                    {users.map(u => (
                      <button key={u.id} onClick={() => setSelected(u)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b
                                   border-slate-100 last:border-0 hover:bg-emerald-50/60
                                   transition text-left group">
                        <Avatar name={u.fullName || u.email} src={u.avatarUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">
                            {u.fullName || '(No name)'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                        <ChevronDown size={14}
                          className="text-slate-400 group-hover:text-emerald-600
                                     transition -rotate-90 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 p-4 bg-emerald-50/70 rounded-2xl
                              border border-emerald-100">
                <Avatar name={selected.fullName || selected.email}
                  src={selected.avatarUrl} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-slate-800">
                    {selected.fullName || '(No name)'}
                  </p>
                  <p className="text-xs text-slate-500">{selected.email}</p>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Deselect traveler"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600
                             hover:bg-white transition shadow-sm">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Subject
                </label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder={`Chat with ${selected.fullName || selected.email}`}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-4
                             focus:ring-emerald-500/10 transition bg-slate-50 focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  First Message <span className="text-red-500">*</span>
                </label>
                <textarea ref={taRef} value={firstMsg}
                  onChange={e => setFirstMsg(e.target.value)}
                  rows={4} placeholder="Hi! I'm reaching out regarding your upcoming itinerary…"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-4
                             focus:ring-emerald-500/10 transition resize-none bg-slate-50 focus:bg-white" />
              </div>

              {error && (
                <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100
                        flex justify-end gap-2.5 bg-slate-50">
          <button onClick={onClose}
            className="px-4.5 py-2.5 text-xs font-bold text-slate-600 border border-slate-200
                       rounded-xl hover:bg-white bg-transparent transition shadow-sm">
            Cancel
          </button>
          {selected && (
            <button onClick={handleCreate} disabled={creating || !firstMsg.trim()}
              className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl
                         hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed
                         transition flex items-center gap-2">
              {creating
                ? <><RefreshCw size={14} className="animate-spin" /> Creating…</>
                : <><Send size={14} /> Start Chat</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Messages Component ──────────────────────────────────────────────── */

export default function Messages() {
    const [searchParams] = useSearchParams()
    const requestedConversationId = searchParams.get('conversationId')
  const { user } = useAuth()
  const { connected, on, off, emit } = useSocket()
  const toast = useToast()

  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [replyToId, setReplyToId] = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const [userTyping, setUserTyping] = useState(null)
  const [typingConvIds, setTypingConvIds] = useState(new Set())

  const [clearing, setClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState({ open: false })

  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const notifRef = useRef(new Set())
  const typingTimers = useRef({})
  const isAdminTypingRef = useRef(false)
  const adminTypingTimer = useRef(null)
  const activeIdRef = useRef(null)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])

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
      setTimeout(() => notifRef.current.delete(key), 30000)
    } catch { /* non-fatal */ }
  }, [])

  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const p = new URLSearchParams({ limit: '100', active: 'all' })
      if (filter !== 'all') p.set('status', filter)
      if (search.trim()) p.set('search', search.trim())
      const res = await authFetch(`${API_BASE}/messages/conversations?${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setConversations(data.data || [])
    } catch (err) {
      console.error('[AdminMessages] load error:', err.message)
    } finally {
      setLoadingList(false)
    }
  }, [filter, search])

  useEffect(() => { loadConversations() }, [loadConversations])

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
      const res = await authFetch(`${API_BASE}/messages/conversations/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActiveConv(data.data)
      setMessages(data.data?.messages || [])

      authFetch(`${API_BASE}/messages/conversations/${id}/read`, { method: 'PATCH' })
        .catch(() => {})

      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, unreadAdmin: 0 } : c)
      )
    } catch (err) {
      console.error('[AdminMessages] open error:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => {
    if (requestedConversationId && conversations.some(c => String(c.id) === String(requestedConversationId))) {
      openConversation(requestedConversationId)
    }
  }, [requestedConversationId, conversations, openConversation])

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setAtBottom(bottom)
    setShowScrollBtn(!bottom)
  }, [])

  useEffect(() => {
    if (!loadingMsgs && messages.length > 0)
      requestAnimationFrame(() => scrollToBottom(false))
  }, [loadingMsgs, scrollToBottom])

  useEffect(() => {
    if (atBottom) requestAnimationFrame(() => scrollToBottom(true))
  }, [messages.length, atBottom, scrollToBottom])

  useEffect(() => {
    setDraft(''); setReplyToId(null); setShowEmoji(false)
    clearTimeout(adminTypingTimer.current)
    isAdminTypingRef.current = false
  }, [activeId])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    el.style.overflowY = el.scrollHeight > 128 ? 'auto' : 'hidden'
  }, [draft])

  const emitAdminTyping = useCallback((convId, isTyping) => {
    if (!emit || !convId) return
    emit('msg:typing', {
      conversationId: convId,
      isTyping,
      senderType: 'admin',
      senderName: user?.full_name || user?.username || 'Altuvera Support',
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
    clearTimeout(adminTypingTimer.current)
    if (typing) {
      adminTypingTimer.current = setTimeout(() => {
        isAdminTypingRef.current = false
        emitAdminTyping(convId, false)
      }, 3000)
    }
  }, [emitAdminTyping])

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    const convId = activeIdRef.current
    if (!convId || !text || sending) return

    clearTimeout(adminTypingTimer.current)
    isAdminTypingRef.current = false
    emitAdminTyping(convId, false)

    setSending(true)
    const optimistic = {
      id: `tmp-${Date.now()}`,
      conversationId: convId,
      senderType: 'admin',
      senderName: user?.full_name || user?.username || 'Admin',
      body: text,
      isRead: false,
      reactions: {},
      createdAt: new Date().toISOString(),
      replyToId: replyToId || undefined,
    }

    setMessages(prev => [...prev, optimistic])
    setAtBottom(true)
    const outDraft = draft, outReply = replyToId
    setDraft(''); setReplyToId(null)

    if (connected && emit) {
      emit(
        'msg:admin-send',
        { conversationId: convId, body: outDraft, replyToId: outReply || undefined },
        (ack) => {
          if (ack?.success && ack.message) {
            setMessages(prev =>
              prev.map(m => m.id === optimistic.id ? ack.message : m)
            )
          } else {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
          }
          setSending(false)
          loadConversations()
        }
      )
      return
    }

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
        if (connected && emit) {
          emit('msg:reaction-broadcast', {
            conversationId: convId,
            messageId,
            reactions: data.data?.reactions || {},
          })
        }
      }
    } catch { /* ignored */ }
  }, [connected, emit])

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
      if (emit) {
        emit('msg:conversation-updated', { id: convId, status })
      }
    } catch { /* ignored */ }
  }, [emit])

  const handleNewConvCreated = useCallback((conv) => {
    setShowNewChat(false)
    loadConversations()
    if (conv?.id) openConversation(conv.id)
  }, [loadConversations, openConversation])

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

  /* ─── Socket Events ──────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!on || !off) return

    const onMessage = (payload) => {
      if (!payload) return
      const cid = String(payload.conversationId)

      if (payload.senderType === 'user') {
        clearTimeout(typingTimers.current[cid])
        delete typingTimers.current[cid]
        setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
        if (cid === String(activeIdRef.current)) setUserTyping(null)
      }

      if (cid === String(activeIdRef.current)) {
        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(payload.id))) return prev
          const optimisticIndex = prev.findIndex(
            m => String(m.id).startsWith('tmp-') && m.senderType === payload.senderType && m.body === payload.body
          )
          if (optimisticIndex >= 0) {
            const next = [...prev]
            next[optimisticIndex] = payload
            return next
          }
          return [...prev, payload]
        })
      }

      setConversations(prev =>
        prev.map(c => {
          if (String(c.id) !== cid) return c
          return {
            ...c,
            lastMessage: payload.body,
            lastMessageAt: payload.createdAt,
            unreadAdmin: payload.senderType !== 'admin'
              ? (cid !== String(activeIdRef.current) ? (c.unreadAdmin || 0) + 1 : 0)
              : c.unreadAdmin,
          }
        })
      )

      setConversations(prev => {
        const idx = prev.findIndex(c => String(c.id) === cid)
        if (idx <= 0) return prev
        const updated = [...prev]
        const [item] = updated.splice(idx, 1)
        return [item, ...updated]
      })

      if (payload.senderType !== 'admin' && document.hidden) {
        showDesktopNotif(
          `New message from ${payload.senderName || 'traveler'}`,
          payload.body?.slice(0, 120),
          payload.conversationId
        )
      }
    }

    const onTyping = (payload) => {
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
          setUserTyping(prev => prev && String(prev.convId) === cid ? null : prev)
        }, 4000)
      } else {
        clearTimeout(typingTimers.current[cid])
        delete typingTimers.current[cid]
        setTypingConvIds(prev => { const s = new Set(prev); s.delete(cid); return s })
        setUserTyping(prev => prev && String(prev.convId) === cid ? null : prev)
      }
    }

    const onNewFromUser = (payload) => {
      loadConversations()
      if (document.hidden) {
        showDesktopNotif(
          'New message from traveler',
          payload.message?.body?.slice(0, 120) || 'New message',
          payload.conversationId
        )
      }
    }

    const onConvUpdated = (conv) => {
      if (!conv) return
      setActiveConv(p => p?.id === conv.id ? { ...p, ...conv } : p)
      setConversations(prev =>
        prev.map(c => String(c.id) === String(conv.id) ? { ...c, ...conv } : c)
      )
    }

    const onReaction = ({ messageId, reactions }) => {
      if (!messageId) return
      setMessages(prev =>
        prev.map(m =>
          String(m.id) === String(messageId) ? { ...m, reactions: reactions || {} } : m
        )
      )
    }

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

  useEffect(() => {
    if (!emit || !activeId) return
    emit('msg:admin-join', { conversationId: activeId })
    return () => {
      if (emit) emit('msg:leave-conversation', { conversationId: activeId })
    }
  }, [emit, activeId])

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

  /* ─── Derived Attributes ───────────────────────────────────────────────────── */

  const replyMap = useMemo(() => new Map(messages.map(m => [String(m.id), m])), [messages])
  const msgGroups = useMemo(() => groupMessages(messages), [messages])
  const replyMsg = replyToId ? replyMap.get(String(replyToId)) : null
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadAdmin || 0), 0)

  const convTitle = activeConv?.subject
    || (activeConv?.bookingNumber ? `Booking #${activeConv.bookingNumber}` : null)
    || activeConv?.guestName
    || 'Conversation'

  const showMobileChat = !!activeId

  return (
    <>
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleNewConvCreated}
        />
      )}

      {/* ── Outer Shell viewport calculation (fills exactly with NO parent overflow issues) ── */}
      <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">

        {/* ── Page Header (Sticky, Fixed Height) ── */}
        <div className={`flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-slate-200/85 z-10
                        ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/10">
              <MessageSquare size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-850 flex items-center gap-2">
                Messages
                {totalUnread > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold rounded-full px-2 py-0.5 shadow-sm">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                Live traveler communication portal
                {connected ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Connected
                  </span>
                ) : (
                  <span className="text-amber-500 font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Connecting…
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewChat(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600
                         text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/15
                         active:scale-95 transition-all">
              <Plus size={15} strokeWidth={2.2} />
              <span>New Chat</span>
            </button>
            <button onClick={() => setClearConfirm({ open: true })}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-700
                         border border-red-200/60 text-xs font-bold rounded-xl hover:bg-red-100/60 transition-colors">
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          </div>
        </div>

        {/* ── Main Two-Pane Section (Strictly restricted height calculations) ── */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">

          {/* ════════════════ SIDEBAR CONVERSATIONS ════════════════ */}
          <div className={`w-full md:w-[320px] lg:w-[360px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200/70 h-full
                          ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Search + filter sticky header */}
            <div className="flex-shrink-0 p-4 border-b border-slate-150 space-y-3 bg-white z-10">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…" aria-label="Search threads"
                  className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" />
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl" role="tablist">
                {['open', 'closed', 'all'].map(f => (
                  <button key={f} role="tab" aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all
                                ${filter === f
                                  ? 'bg-white text-emerald-700 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800'}`}>
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {conversations.length} Active Threads
                </span>
                <button onClick={loadConversations} disabled={loadingList}
                  aria-label="Refresh conversations" title="Refresh"
                  className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-emerald-600 transition-colors">
                  <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Scrollable List container */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingList && conversations.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border-b border-slate-100 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-250 flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="flex justify-between gap-3">
                        <div className="h-3 flex-1 bg-slate-200 rounded" />
                        <div className="h-2 w-10 bg-slate-200 rounded" />
                      </div>
                      <div className="h-2 w-4/5 bg-slate-200 rounded" />
                      <div className="h-2.5 w-1/4 bg-slate-250 rounded" />
                    </div>
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                    <MessageSquare size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No conversations</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[180px]">No chats found matching your criteria.</p>
                </div>
              ) : (
                conversations.map(c => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    onSelect={openConversation}
                    isTyping={typingConvIds.has(String(c.id))}
                  />
                ))
              )}
            </div>
          </div>

          {/* ════════════════ CHAT WINDOW PANEL ════════════════ */}
          <div className={`flex-1 flex flex-col bg-slate-50/50 h-full overflow-hidden relative
                          ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>

            {!activeConv ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 flex items-center justify-center mb-5 shadow-sm">
                  <MessageSquare size={34} className="text-emerald-600/70" />
                </div>
                <h3 className="text-base font-extrabold text-slate-700">No thread selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                  Select a chat thread from the sidebar list or initiate a new discussion.
                </p>
                <button onClick={() => setShowNewChat(true)}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600
                             text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
                  <Plus size={14} />
                  <span>Start Conversation</span>
                </button>
              </div>
            ) : (
              <>
                {/* Fixed Chat Panel Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200/80 z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => openConversation(null)} aria-label="Back"
                      className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <ArrowLeft size={18} />
                    </button>

                    <Avatar
                      name={activeConv.guestName || activeConv.guestEmail || '?'}
                      src={activeConv.guestAvatar}
                      size="md"
                      online={activeConv.isOnline}
                    />

                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-850 truncate leading-tight">
                        {convTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400 truncate font-medium">
                          {activeConv.guestEmail || 'Guest traveler'}
                          {activeConv.bookingNumber && (
                            <span className="font-mono bg-slate-100 px-1 rounded ml-1.5 border border-slate-200/50 text-[10px]">
                              #{activeConv.bookingNumber}
                            </span>
                          )}
                        </p>
                        {userTyping && String(userTyping.convId) === String(activeId) && (
                          <span className="text-[10px] text-emerald-600 font-extrabold animate-pulse">
                            typing…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={activeConv.status} />
                    {activeConv.status !== 'closed' ? (
                      <button onClick={() => changeStatus('closed')}
                        className="hidden sm:inline-flex text-xs font-bold border border-slate-200/80 rounded-xl
                                   px-3.5 py-2 text-slate-600 hover:bg-slate-50 transition-colors bg-white">
                        Close Ticket
                      </button>
                    ) : (
                      <button onClick={() => changeStatus('open')}
                        className="hidden sm:inline-flex text-xs font-bold border border-emerald-200/60 rounded-xl
                                   px-3.5 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 transition-colors">
                        Reopen Ticket
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Messages Log Viewport (The ONLY Scrollable container on page) ── */}
                <div
                  ref={scrollRef}
                  onScroll={onScroll}
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
                  role="log"
                  aria-live="polite"
                >
                  {loadingMsgs && messages.length === 0 ? (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
                          {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-slate-200 mr-2 self-end" />}
                          <div className={`h-11 rounded-2xl ${i % 2 === 0 ? 'bg-slate-200' : 'bg-emerald-100'}`}
                               style={{ width: `${140 + i * 35}px` }} />
                        </div>
                      ))}
                    </div>
                  ) : msgGroups.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm">
                        <Send size={18} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No conversation history</p>
                      <p className="text-xs text-slate-400 mt-0.5">Send a response below to initiate conversation.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {msgGroups.map(item =>
                        item.type === 'sep' ? (
                          <DateSep key={item.key} label={item.label} />
                        ) : (
                          <MsgBubble
                            key={item.key}
                            message={item.data}
                            mine={item.data.senderType === 'admin'}
                            replyTo={item.data.replyToId ? replyMap.get(String(item.data.replyToId)) : null}
                            onReact={toggleReaction}
                            onReply={setReplyToId}
                          />
                        )
                      )}

                      {userTyping && String(userTyping.convId) === String(activeId) && (
                        <div className="pt-2">
                          <TypingDots name={userTyping.name} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Floating scroll action anchor */}
                <ScrollBtn visible={showScrollBtn} onClick={() => scrollToBottom(true)} />

                {/* ── Strict Fixed Input Composer Footer (Zero scroll interference) ── */}
                <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-4.5 z-10 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.03)]">
                  
                  {/* Status update banner on mobile */}
                  <div className="sm:hidden flex gap-2 mb-3">
                    {activeConv.status !== 'closed' ? (
                      <button onClick={() => changeStatus('closed')}
                        className="flex-1 text-xs font-bold border border-slate-200/80 rounded-xl py-2 text-slate-600 bg-white hover:bg-slate-50">
                        Close Ticket
                      </button>
                    ) : (
                      <button onClick={() => changeStatus('open')}
                        className="flex-1 text-xs font-bold border border-emerald-200/60 rounded-xl py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/60">
                        Reopen Ticket
                      </button>
                    )}
                  </div>

                  {/* Reply targeted ribbon */}
                  {replyMsg && (
                    <div className="flex items-center justify-between gap-3 mb-3 px-3.5 py-2.5 bg-emerald-50 rounded-2xl border border-emerald-100 animate-fade-in">
                      <div className="flex items-center gap-2 min-w-0">
                        <CornerUpLeft size={13} className="text-emerald-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">
                            Replying to {replyMsg.senderName || 'Message'}
                          </span>
                          <span className="text-xs text-slate-500 truncate block mt-0.5">
                            {replyMsg.body}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setReplyToId(null)} aria-label="Cancel reply link"
                        className="text-slate-400 hover:text-slate-600 p-1 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Writing container row */}
                  <div className="flex items-end gap-2 max-w-full">
                    
                    {/* Emoji Menu */}
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setShowEmoji(p => !p)}
                        aria-label="Toggle emoji picker" aria-expanded={showEmoji}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors
                                    ${showEmoji
                                      ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600'
                                    }`}>
                        <Smile size={18} />
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

                    {/* Integrated Text Area input */}
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
                      placeholder="Type a message… (Enter send, Shift+Enter new line)"
                      aria-label="Draft response"
                      className="flex-1 resize-none text-sm px-4 py-2.5 rounded-xl border border-slate-200
                                 bg-slate-50 outline-none leading-relaxed transition-all
                                 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      style={{ minHeight: 40, maxHeight: 120 }}
                    />

                    {/* Actions panel send CTA */}
                    <button onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      aria-label="Send response"
                      className="h-10 px-4.5 rounded-xl flex-shrink-0 flex items-center justify-center gap-1.5
                                 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs uppercase tracking-wide
                                 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all
                                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:transform-none">
                      {sending ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>

                  {/* Desktop keyboard shortcut hints */}
                  <p className="hidden sm:block text-center text-[10px] text-slate-300 font-semibold uppercase tracking-wider mt-2.5 select-none">
                    Enter send · Shift+Enter newline · Esc cancel reply
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation prompt modal */}
      <ConfirmDialog
        isOpen={clearConfirm.open}
        onClose={() => setClearConfirm({ open: false })}
        onConfirm={handleClearAll}
        type="delete"
        title="Purge messaging logs?"
        description="This will permanently delete all records, messages, reactions, and reference data across all active conversations. This is irreversible."
        confirmLabel="Purge All Records"
        loading={clearing}
      />
    </>
  )
}