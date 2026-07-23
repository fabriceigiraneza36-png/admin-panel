// admin/src/pages/Messages.jsx
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import {
  Send, Smile, X, ArrowLeft, CornerUpLeft, Check, CheckCheck,
  MessageSquare, RefreshCw, Search, Plus, User, ChevronDown,
} from 'lucide-react'
import { useAuth }   from '@context/AuthContext'
import { useSocket } from '@context/SocketContext'
import { API_BASE }  from '@utils/constants'

/* ─── Token / fetch helpers ─────────────────────────────────────────────────── */

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

/* ─── Formatting ────────────────────────────────────────────────────────────── */

const fmtTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now  = new Date()
  const diff = now - date

  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fmtTimeShort = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

const STATUS_STYLE = {
  open:    { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  closed:  { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200' },
  pending: { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
}

const QUICK_EMOJIS         = ['👍','❤️','😂','🎉','👏','😮','👎','🔥','🙏','✨','😊','😢']
const INLINE_REACTION_EMOJIS = ['👍','❤️','😂','🎉']

/* ─── Avatar ─────────────────────────────────────────────────────────────────── */

function Avatar({ name = '', src, size = 8 }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const s = `w-${size} h-${size}`

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        onError={e => { e.target.onerror = null; e.target.style.display = 'none' }}
        className={`${s} rounded-full object-cover border border-slate-200 flex-shrink-0`}
      />
    )
  }
  return (
    <div className={`${s} rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs
                    flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  )
}

/* ─── Conversation Row ───────────────────────────────────────────────────────── */

const ConversationRow = React.memo(function ConversationRow({ conv, active, onSelect }) {
  const title    = conv.subject || conv.guestName || conv.guestEmail || 'Conversation'
  const subtitle = conv.lastMessage || 'No messages yet'
  const tone     = STATUS_STYLE[conv.status] || STATUS_STYLE.pending

  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={`
        w-full text-left px-4 py-3.5 border-b border-slate-100 transition-all
        hover:bg-slate-50 group
        ${active
          ? 'bg-emerald-50/70 border-l-[3px] border-l-emerald-600'
          : 'border-l-[3px] border-l-transparent'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <Avatar name={conv.guestName || conv.guestEmail || '?'} src={conv.guestAvatar} size={9} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-semibold text-sm text-slate-800 truncate flex-1">
              {title}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {conv.unreadAdmin > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[10px] font-bold
                                 min-w-[18px] h-[18px] px-1 grid place-items-center">
                  {conv.unreadAdmin > 9 ? '9+' : conv.unreadAdmin}
                </span>
              )}
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {fmtTime(conv.lastMessageAt)}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 truncate">{subtitle}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5
                             rounded-full ${tone.text} ${tone.bg} border ${tone.border}`}>
              <span className={`w-1 h-1 rounded-full ${tone.dot}`} />
              {conv.status}
            </span>
            {conv.bookingNumber && (
              <span className="text-[10px] text-slate-400">· {conv.bookingNumber}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
})

/* ─── Emoji Picker ───────────────────────────────────────────────────────────── */

function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref}
      className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200
                 rounded-2xl shadow-xl p-2 grid grid-cols-6 gap-1 z-50 w-52">
      {QUICK_EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => onPick(emoji)}
          className="text-xl p-1.5 rounded-lg hover:bg-slate-100 transition">
          {emoji}
        </button>
      ))}
    </div>
  )
}

/* ─── Message Bubble ─────────────────────────────────────────────────────────── */

const MessageBubble = React.memo(function MessageBubble({
  message, mine, replyTo, onReact, onReply,
}) {
  const reactions = useMemo(() => {
    const r = message.reactions || {}
    return Object.entries(r).filter(([, ids]) => ids?.length > 0)
  }, [message.reactions])

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className="max-w-[82%] sm:max-w-[70%] group">
        {/* Reply reference */}
        {replyTo && (
          <div className={`text-[11px] text-slate-400 mb-1 italic truncate px-2 border-l-2 border-slate-300
            ${mine ? 'text-right border-l-0 border-r-2 pr-2 pl-0' : ''}`}>
            ↩ {replyTo.senderName || 'message'}: {(replyTo.body || '').slice(0, 50)}
          </div>
        )}

        {/* Bubble */}
        <div className={`
          inline-block px-3.5 py-2.5 text-sm leading-relaxed
          whitespace-pre-wrap break-words rounded-2xl max-w-full
          ${mine
            ? 'bg-emerald-600 text-white rounded-br-md'
            : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-md'
          }
        `}>
          {!mine && (
            <p className="text-[10px] font-bold text-emerald-700 mb-1">
              {message.senderName || 'User'}
            </p>
          )}
          {message.body}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-400
                        ${mine ? 'justify-end' : 'justify-start'}`}>
          <span>{fmtTimeShort(message.createdAt)}</span>
          {mine && (
            message.isRead
              ? <CheckCheck size={12} className="text-emerald-500" />
              : !String(message.id).startsWith('tmp-')
                ? <Check size={12} />
                : null
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : ''}`}>
            {reactions.map(([emoji, ids]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className="bg-white border border-slate-200 rounded-full px-2 py-0.5
                           text-xs hover:bg-slate-50 transition shadow-sm"
              >
                {emoji} {ids.length}
              </button>
            ))}
          </div>
        )}

        {/* Quick actions (hover) */}
        <div className={`flex items-center gap-0.5 mt-1
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        ${mine ? 'justify-end' : ''}`}>
          {INLINE_REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onMouseDown={e => { e.preventDefault(); onReact(message.id, emoji) }}
              className="text-sm p-1 rounded-lg hover:bg-slate-100 transition"
            >
              {emoji}
            </button>
          ))}
          <button
            onMouseDown={e => { e.preventDefault(); onReply(message.id) }}
            className="text-[11px] text-slate-400 hover:text-slate-700 px-1.5 py-1
                       rounded-lg hover:bg-slate-100 transition inline-flex items-center gap-0.5"
          >
            <CornerUpLeft size={11} /> Reply
          </button>
        </div>
      </div>
    </div>
  )
})

/* ─── New Chat Modal (admin picks a user) ────────────────────────────────────── */

function NewChatModal({ onClose, onCreated }) {
  const [search,        setSearch]        = useState('')
  const [users,         setUsers]         = useState([])
  const [loadingUsers,  setLoadingUsers]  = useState(false)
  const [selected,      setSelected]      = useState(null)
  const [subject,       setSubject]       = useState('')
  const [firstMessage,  setFirstMessage]  = useState('')
  const [creating,      setCreating]      = useState(false)
  const [error,         setError]         = useState('')
  const searchRef = useRef(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  // Search users
  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true)
      try {
        const res  = await authFetch(
          `${API_BASE}/messages/users-list?search=${encodeURIComponent(search)}&limit=30`
        )
        const data = await res.json()
        setUsers(data.data || [])
      } catch { setUsers([]) }
      finally  { setLoadingUsers(false) }
    }

    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  const handleCreate = async () => {
    if (!selected) { setError('Please select a user.'); return }
    if (!firstMessage.trim()) { setError('Please enter a message.'); return }
    setError('')
    setCreating(true)
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations`, {
        method: 'POST',
        body: JSON.stringify({
          targetUserId:  selected.id,
          subject:       subject.trim() || `Chat with ${selected.fullName || selected.email}`,
          body:          firstMessage.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create conversation')
      onCreated(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800">New Conversation</h3>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       hover:bg-slate-100 text-slate-500 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Pick user */}
          {!selected ? (
            <div className="p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Select a traveller to message
              </p>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Users list */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {loadingUsers ? (
                  <div className="text-center py-6 text-slate-400 text-sm">Loading…</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <User size={28} className="mx-auto mb-2 opacity-40" />
                    No users found
                  </div>
                ) : users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                               hover:bg-emerald-50 transition text-left group"
                  >
                    <Avatar name={u.fullName || u.email} src={u.avatar} size={9} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        {u.fullName || '(no name)'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <ChevronDown size={14}
                      className="text-slate-300 group-hover:text-emerald-500 transition -rotate-90" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Step 2: Compose */
            <div className="p-4 space-y-4">
              {/* Selected user */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <Avatar name={selected.fullName || selected.email} src={selected.avatar} size={10} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{selected.fullName || '(no name)'}</p>
                  <p className="text-xs text-slate-500">{selected.email}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={`Chat with ${selected.fullName || selected.email}`}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  First Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={firstMessage}
                  onChange={e => setFirstMessage(e.target.value)}
                  rows={4}
                  placeholder="Hi! I'm reaching out about…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl
                             outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                             resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600
              border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !firstMessage.trim()}
              className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl
                         hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed
                         transition flex items-center gap-2"
            >
              {creating ? (
                <><RefreshCw size={14} className="animate-spin" /> Creating…</>
              ) : (
                <><Send size={14} /> Start Conversation</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function Messages() {
  const { user }                     = useAuth()
  const { connected, on, off, emit } = useSocket()

  const [conversations,  setConversations]  = useState([])
  const [activeId,       setActiveId]       = useState(null)
  const [activeConv,     setActiveConv]     = useState(null)
  const [messages,       setMessages]       = useState([])
  const [loadingList,    setLoadingList]    = useState(false)
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [sending,        setSending]        = useState(false)
  const [draft,          setDraft]          = useState('')
  const [filter,         setFilter]         = useState('open')
  const [search,         setSearch]         = useState('')
  const [replyToId,      setReplyToId]      = useState(null)
  const [showEmoji,      setShowEmoji]      = useState(false)
  const [showNewChat,    setShowNewChat]    = useState(false)

  const scrollRef     = useRef(null)
  const textareaRef   = useRef(null)
  const notifShownRef = useRef(new Set())

  /* ── Desktop notifications ────────────────────────────────────────────── */

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const showDesktopNotif = useCallback((title, body, convId) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (!document.hidden) return

    const key = `${convId}-${Math.floor(Date.now() / 5000)}`
    if (notifShownRef.current.has(key)) return
    notifShownRef.current.add(key)

    try {
      const n = new Notification(`Altuvera — ${title}`, {
        body,
        icon: '/favicon.ico',
        tag:  `conv-${convId}`,
      })
      n.onclick = () => { window.focus(); n.close() }
      setTimeout(() => notifShownRef.current.delete(key), 30_000)
    } catch { /* non-fatal */ }
  }, [])

  /* ── Load conversations ─────────────────────────────────────────────── */

  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filter !== 'all') params.set('status', filter)
      if (search.trim()) params.set('search', search.trim())

      const res = await authFetch(`${API_BASE}/messages/conversations?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setConversations(data.data || [])
    } catch (err) {
      console.error('[Messages] load conversations:', err.message)
    } finally {
      setLoadingList(false)
    }
  }, [filter, search])

  useEffect(() => { loadConversations() }, [loadConversations])

  /* ── Open conversation ──────────────────────────────────────────────── */

  const openConversation = useCallback(async (id) => {
    setActiveId(id)
    setReplyToId(null)
    setDraft('')
    setLoadingMsgs(true)
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActiveConv(data.data)
      setMessages(data.data?.messages || [])
      // Mark as read
      authFetch(`${API_BASE}/messages/conversations/${id}/read`, { method: 'PATCH' })
        .catch(() => {})
      // Update unread count in list
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, unreadAdmin: 0 } : c)
      )
    } catch (err) {
      console.error('[Messages] open conversation:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  const closeMobile = useCallback(() => {
    setActiveId(null)
    setActiveConv(null)
    setMessages([])
    setReplyToId(null)
  }, [])

  /* ── Reactions ──────────────────────────────────────────────────────── */

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!activeId) return
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages/${messageId}/react`,
        { method: 'PATCH', body: JSON.stringify({ emoji }) },
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
      }
    } catch { /* silent */ }
  }, [activeId])

  /* ── Send message ───────────────────────────────────────────────────── */

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!activeId || !text || sending) return

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
    const outDraft  = draft
    const outReply  = replyToId
    setDraft('')
    setReplyToId(null)

    // Try socket first
    if (connected && emit) {
      emit(
        'msg:admin-send',
        { conversationId: activeId, body: outDraft, replyToId: outReply || undefined },
        (ack) => {
          if (ack?.success && ack.message) {
            setMessages(prev =>
              prev.map(m => m.id === optimistic.id ? ack.message : m)
            )
          } else if (ack?.error) {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
          }
        }
      )
      setSending(false)
      loadConversations()
      return
    }

    // REST fallback
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${activeId}/messages`,
        {
          method: 'POST',
          body:   JSON.stringify({
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
  }, [activeId, draft, sending, connected, emit, user, loadConversations, replyToId])

  /* ── Status change ──────────────────────────────────────────────────── */

  const changeStatus = useCallback(async (status) => {
    if (!activeId) return
    try {
      await authFetch(`${API_BASE}/messages/conversations/${activeId}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      })
      setActiveConv(p => p ? { ...p, status } : p)
      setConversations(prev =>
        prev.map(c => c.id === activeId ? { ...c, status } : c)
      )
    } catch { /* silent */ }
  }, [activeId])

  /* ── New chat created ───────────────────────────────────────────────── */

  const handleNewConvCreated = useCallback((conv) => {
    setShowNewChat(false)
    loadConversations()
    if (conv?.id) openConversation(conv.id)
  }, [loadConversations, openConversation])

  /* ── Socket listeners ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!on || !off) return

    const onMsg = (payload) => {
      setMessages(prev => {
        if (payload.conversationId !== activeId) return prev
        if (prev.some(m => m.id === payload.id)) return prev
        return [...prev, payload]
      })
      setConversations(prev =>
        prev.map(c =>
          c.id === payload.conversationId
            ? {
                ...c,
                lastMessage:   payload.body,
                lastMessageAt: payload.createdAt,
                unreadAdmin: payload.senderType !== 'admin'
                  ? (c.id !== activeId ? (c.unreadAdmin || 0) + 1 : 0)
                  : c.unreadAdmin,
              }
            : c
        )
      )
      if (document.hidden) {
        showDesktopNotif('New message', payload.body?.slice(0, 120) || 'New message', payload.conversationId)
      }
    }

    const onNewUser = (payload) => {
      loadConversations()
      if (document.hidden) {
        showDesktopNotif(
          'New message from traveller',
          payload.message?.body?.slice(0, 120) || 'New message',
          payload.conversationId
        )
      }
    }

    const onUpdated = (conv) => {
      setActiveConv(p => p?.id === conv.id ? { ...p, ...conv } : p)
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, ...conv } : c))
    }

    const onReaction = ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m =>
          String(m.id) === String(messageId) ? { ...m, reactions: reactions || {} } : m
        )
      )
    }

    on('msg:message',              onMsg)
    on('msg:new-from-user',        onNewUser)
    on('msg:conversation-updated', onUpdated)
    on('msg:reaction',             onReaction)

    return () => {
      off('msg:message',              onMsg)
      off('msg:new-from-user',        onNewUser)
      off('msg:conversation-updated', onUpdated)
      off('msg:reaction',             onReaction)
    }
  }, [on, off, activeId, loadConversations, showDesktopNotif])

  /* ── Auto-scroll ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  /* ── Keyboard: focus textarea on Escape ─────────────────────────────── */

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setShowEmoji(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── Derived ────────────────────────────────────────────────────────── */

  const replyMap = useMemo(
    () => new Map(messages.map(m => [String(m.id), m])),
    [messages]
  )

  const convTitle = activeConv?.subject ||
    (activeConv?.bookingNumber ? `Booking ${activeConv.bookingNumber}` : activeConv?.guestName) ||
    'Conversation'

  const showMobileChat = !!activeId

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <>
      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleNewConvCreated}
        />
      )}

      <div className="h-full flex flex-col overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">

        {/* Page Header */}
        <div className={`flex items-center justify-between flex-shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare size={22} className="text-emerald-600" />
              Messages
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live conversations with travellers
              {!connected && <span className="ml-2 text-amber-600 font-semibold">· Reconnecting…</span>}
            </p>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white
                       text-sm font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm
                       shadow-emerald-200"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        {/* Two-panel layout */}
        <div className="flex-1 min-h-0 grid md:grid-cols-[320px_1fr] gap-3 sm:gap-4">

          {/* ══ CONVERSATION LIST ══ */}
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm
                          flex flex-col overflow-hidden
                          ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>

            {/* Filters */}
            <div className="p-3 border-b border-slate-100 space-y-2 flex-shrink-0">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200
                             rounded-xl outline-none focus:border-emerald-500 focus:bg-white
                             focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              {/* Status tabs */}
              <div className="flex gap-1">
                {[
                  { key: 'open',   label: 'Open' },
                  { key: 'closed', label: 'Closed' },
                  { key: 'all',    label: 'All' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition
                      ${filter === f.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh button */}
            <div className="px-3 py-2 border-b border-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </span>
              <button onClick={loadConversations} disabled={loadingList}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
                <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingList && conversations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
              ) : conversations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 px-4">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No {filter !== 'all' ? filter : ''} conversations</p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600
                               font-bold hover:underline"
                  >
                    <Plus size={12} /> Start a conversation
                  </button>
                </div>
              ) : (
                conversations.map(c => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    onSelect={openConversation}
                  />
                ))
              )}
            </div>
          </div>

          {/* ══ CHAT PANEL ══ */}
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm
                          flex flex-col overflow-hidden
                          ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>

            {!activeConv ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
                <MessageSquare size={48} className="mb-3 opacity-20" />
                <p className="text-sm font-medium text-slate-500">Select a conversation</p>
                <p className="text-xs text-slate-400 mt-1">or start a new one with any traveller</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600
                             text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition"
                >
                  <Plus size={15} /> New Conversation
                </button>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-shrink-0 bg-white">
                  {/* Back (mobile) */}
                  <button
                    onClick={closeMobile}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition"
                    aria-label="Back"
                  >
                    <ArrowLeft size={18} className="text-slate-600" />
                  </button>

                  <Avatar
                    name={activeConv.guestName || activeConv.guestEmail || '?'}
                    src={activeConv.guestAvatar}
                    size={10}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{convTitle}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {activeConv.guestEmail || activeConv.guestName || 'Guest'}
                      {activeConv.bookingNumber && ` · Booking ${activeConv.bookingNumber}`}
                    </p>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(() => {
                      const tone = STATUS_STYLE[activeConv.status] || STATUS_STYLE.pending
                      return (
                        <span className={`hidden sm:inline-flex items-center gap-1 text-[11px]
                          font-bold px-2.5 py-1 rounded-full ${tone.text} ${tone.bg}
                          border ${tone.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {activeConv.status}
                        </span>
                      )
                    })()}

                    {activeConv.status !== 'closed' ? (
                      <button
                        onClick={() => changeStatus('closed')}
                        className="text-xs border border-slate-200 rounded-xl px-3 py-1.5
                                   text-slate-600 hover:bg-slate-50 transition font-medium"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        onClick={() => changeStatus('open')}
                        className="text-xs border border-emerald-400 rounded-xl px-3 py-1.5
                                   text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition font-medium"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 bg-slate-50/60 space-y-2"
                >
                  {loadingMsgs && messages.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-12">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-12">
                      No messages yet — send the first one!
                    </div>
                  ) : (
                    messages.map(m => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        mine={m.senderType === 'admin'}
                        replyTo={m.replyToId ? replyMap.get(String(m.replyToId)) : null}
                        onReact={toggleReaction}
                        onReply={setReplyToId}
                      />
                    ))
                  )}
                </div>

                {/* Composer */}
                <div className="border-t border-slate-100 p-3 flex-shrink-0 bg-white">
                  {/* Reply preview */}
                  {replyToId && (() => {
                    const r = replyMap.get(String(replyToId))
                    return (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200
                                      rounded-xl px-3 py-2 mb-2">
                        <CornerUpLeft size={13} className="text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-emerald-700 flex-1 truncate">
                          {r?.senderName || 'Message'}: {(r?.body || '').slice(0, 60)}
                        </span>
                        <button onClick={() => setReplyToId(null)}
                          className="text-emerald-400 hover:text-emerald-600">
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })()}

                  <div className="flex items-end gap-2 relative">
                    {/* Emoji */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setShowEmoji(p => !p)}
                        className="w-10 h-10 rounded-xl border border-slate-200 bg-white
                                   hover:bg-slate-50 text-slate-500 transition
                                   flex items-center justify-center"
                        aria-label="Emoji"
                      >
                        <Smile size={18} />
                      </button>
                      {showEmoji && (
                        <EmojiPicker
                          onPick={emoji => { setDraft(p => p + emoji); setShowEmoji(false) }}
                          onClose={() => setShowEmoji(false)}
                        />
                      )}
                    </div>

                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      rows={1}
                      placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
                      className="flex-1 resize-none text-sm px-3 py-2.5 rounded-xl border
                                 border-slate-200 outline-none max-h-36
                                 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                                 transition bg-slate-50 focus:bg-white"
                    />

                    {/* Send */}
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm
                                 flex items-center gap-1.5 flex-shrink-0
                                 hover:bg-emerald-700 transition shadow-sm shadow-emerald-200
                                 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <Send size={15} />
                      <span className="hidden sm:inline">{sending ? '…' : 'Send'}</span>
                    </button>
                  </div>

                  {/* Mobile status controls */}
                  <div className="flex sm:hidden gap-2 mt-2">
                    {activeConv.status !== 'closed' ? (
                      <button onClick={() => changeStatus('closed')}
                        className="flex-1 text-xs border border-slate-200 rounded-xl
                                   py-2 text-slate-600 hover:bg-slate-50 transition">
                        Close conversation
                      </button>
                    ) : (
                      <button onClick={() => changeStatus('open')}
                        className="flex-1 text-xs border border-emerald-400 rounded-xl
                                   py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">
                        Reopen conversation
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}