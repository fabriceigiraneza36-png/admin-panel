// admin/src/pages/Messages.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES v4.0 — Instagram-Style Fixed Composer Layout
// ═══════════════════════════════════════════════════════════════════════════════

import EmojiPickerNative from "emoji-picker-react";
import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react'
import {
  Send, Smile, X, ArrowLeft, CornerUpLeft, Check, CheckCheck,
  MessageSquare, RefreshCw, Search, Plus, User, UsersRound, ChevronDown, Circle, Trash2,
  PanelLeftClose, PanelLeftOpen, MoreHorizontal, Pin, Highlighter, Pencil, Undo2, Copy,
  Archive, ArchiveRestore, Forward,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth }   from '@context/AuthContext'
import { useSocket } from '@context/SocketContext'
import { API_BASE }  from '@utils/constants'
import { maintenanceAPI } from '@api/maintenance'
import ConfirmDialog from '@components/common/ConfirmDialog'
import { useToast } from '@hooks/useToast'
import '../messaging-phase2.css'

/* ─── Token / Fetch Helpers ────────────────────────────────────────────────── */

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

/* ─── Constants & Formatting ───────────────────────────────────────────────── */

const QUICK_EMOJIS = ['👍','❤️','😂','🎉','👏','😮','👎','🔥','🙏','✨','😊','😢']
const QUICK_REACTIONS = ['👍','❤️','😂','🎉','👏','😮','🙏','🔥']

// The API has historically returned camelCase and database-style IDs in
// different endpoints. Normalize IDs at the boundary so every click opens
// the same conversation regardless of which shape the backend returned.
const resolveConversationId = (conversation) =>
  conversation?.id ?? conversation?.conversationId ?? conversation?.conversation_id ?? null

const normalizeConversation = (conversation) => {
  if (!conversation || typeof conversation !== 'object') return conversation
  const id = resolveConversationId(conversation)
  return { ...conversation, id: id == null || String(id).trim() === '' ? null : String(id) }
}

const safeEndUserName = (name) => {
  const value = String(name || '').trim()
  return !value || /^(super\s*admin|admin|administrator|altuvera support)$/i.test(value) ? 'End user' : value
}

const fmtRelative = (d) => {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 60_000)      return 'Just now'
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000)  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604_800_000) return new Date(d).toLocaleDateString('en-US', { weekday: 'short' })
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fmtShort = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

const fmtElapsed = (d, now = Date.now()) => {
  if (!d) return ''
  const mins = Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm ago'
  return Math.floor(hrs / 24) + 'd ago'
}

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

/* ─── UI Primitives ────────────────────────────────────────────────────────── */

function Avatar({ name = '', src, size = 'md', online = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [src])
  const sz = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  }
  const cls = sz[size] || sz.md
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="relative flex-shrink-0 select-none">
      {src && !imageFailed ? (
        <img src={src} alt={name}
          onError={() => setImageFailed(true)}
          className={`${cls} rounded-full object-cover border-2 border-white ring-1 ring-slate-100`} />
      ) : (
        <div className={`${cls} rounded-full bg-gradient-to-br from-emerald-500 to-teal-600
                         text-white font-bold flex items-center justify-center border-2 border-white ring-1 ring-slate-100`}>
          {ini}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    open:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed:  'bg-slate-100 text-slate-500 border-slate-200',
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    archived: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  const dot = { open: 'bg-emerald-500', closed: 'bg-slate-400', pending: 'bg-amber-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5
                      rounded-full border capitalize flex-shrink-0 ${map[status] || map.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] || dot.pending}`} />
      {status || 'open'}
    </span>
  )
}

function DateSep({ label }) {
  return (
    <div className="flex items-center gap-3 my-5 select-none">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase
                       bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

function TypingDots({ name = 'User' }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <Avatar name={name} size="xs" />
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm
                      px-3.5 py-2 shadow-sm flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">{name} is typing</span>
        <span className="flex items-center gap-0.5">
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
  const ref = useRef(null);
  useEffect(() => {
    const h = e => {
      const root = ref.current;
      if (!root) return;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      if (path.includes(root) || root.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", h, true);
    return () => document.removeEventListener("pointerdown", h, true);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      aria-label="Searchable emoji picker"
      className="absolute bottom-full left-0 mb-2 z-[70] max-w-[calc(100vw-24px)]"
    >
      <EmojiPickerNative
        onEmojiClick={(emojiData) => onPick(emojiData.emoji)}
        emojiStyle="native"
        theme="light"
        width={300}
        height={340}
        lazyLoadEmojis
        searchPlaceHolder="Search emojis..."
        previewConfig={{ showPreview: false }}
        skinTonesDisabled={false}
      />
    </div>
  );
}
function ScrollBtn({ visible, onClick, unread = 0, composerVisible = true }) {
  return (
    <button onClick={onClick} aria-label="Scroll to latest"
      className={`absolute ${composerVisible ? 'bottom-24' : 'bottom-4'} right-4 w-10 h-10 rounded-full bg-white border border-slate-200
                 text-emerald-600 shadow-lg flex items-center justify-center transition-all duration-300 z-20
                 hover:bg-emerald-50 active:scale-95
                 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <ChevronDown size={18} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                         bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}

/* ─── Conversation Row ─────────────────────────────────────────────────────── */

const ConvRow = React.memo(function ConvRow({ conv, active, onSelect, isTyping }) {
  const title = conv.groupName || conv.subject || safeEndUserName(conv.guestName)
  const hasUnread = (conv.unreadAdmin || 0) > 0
  const pointerStartRef = useRef(null)
  const skipSyntheticClickRef = useRef(false)

  // Some mobile browsers suppress the synthetic click after touch interactions.
  // Handle a stationary tap on pointer-up as a fallback, while letting vertical
  // swipes remain native scrolling. Suppress the following click to avoid double opens.
  const handlePointerDown = (event) => {
    if (event.pointerType !== 'touch') return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
  }
  const handlePointerUp = (event) => {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (event.pointerType !== 'touch' || !start) return
    const movedX = Math.abs(event.clientX - start.x)
    const movedY = Math.abs(event.clientY - start.y)
    if (movedX > 10 || movedY > 10) return
    skipSyntheticClickRef.current = true
    onSelect(conv)
    window.setTimeout(() => { skipSyntheticClickRef.current = false }, 500)
  }
  const handleClick = () => {
    if (skipSyntheticClickRef.current) {
      skipSyntheticClickRef.current = false
      return
    }
    onSelect(conv)
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null }}
      onClick={handleClick}
      style={{ touchAction: 'pan-y' }}
      aria-pressed={active}
      className={`w-full text-left px-3.5 py-3 transition-all border-l-[3px]
                  flex items-start gap-3 outline-none
                  ${active
                    ? 'bg-emerald-50/60 border-l-emerald-600'
                    : 'border-l-transparent hover:bg-slate-50'}`}
    >
      <Avatar
        name={safeEndUserName(conv.guestName)}
        src={conv.guestAvatar}
        size="md"
        online={conv.isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`text-sm truncate flex-1 leading-tight
                            ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
            {title}
          </span>
          <span className={`text-[10px] font-medium whitespace-nowrap flex-shrink-0
                            ${hasUnread ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
            {fmtRelative(conv.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {isTyping ? (
            <div className="flex items-center gap-1 min-w-0">
              <span className="flex gap-0.5 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
              <span className="text-xs text-emerald-600 font-bold ml-1">typing…</span>
            </div>
          ) : (
            <p className={`text-xs truncate leading-snug flex-1
                           ${hasUnread ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
              {conv.lastMessage || 'No messages yet'}
            </p>
          )}
          {hasUnread && (
            <span className="bg-emerald-600 text-white rounded-full text-[10px] font-bold
                             min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center flex-shrink-0">
              {conv.unreadAdmin > 9 ? '9+' : conv.unreadAdmin}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1.5">
          <StatusBadge status={conv.status} />
          {conv.bookingNumber && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              #{conv.bookingNumber}
            </span>
          )}
        </div>
      </div>
    </button>
  )
})

const ADMIN_MESSAGE_TYPES = new Set(['admin', 'super_admin', 'superadmin', 'administrator', 'moderator', 'editor', 'support', 'staff', 'agent'])

const isAdminMessage = (message) => ADMIN_MESSAGE_TYPES.has(
  String(message?.senderType ?? message?.sender_type ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
)

const getMessageSenderLabel = (message, { currentUserId, guestName } = {}) => {
  if (isAdminMessage(message)) {
    const senderId = message?.senderId ?? message?.sender_id
    return currentUserId != null && senderId != null && String(senderId) === String(currentUserId)
      ? 'You'
      : 'Admin'
  }

  const name = String(message?.senderName ?? message?.sender_name ?? '').trim()
  // Some legacy records incorrectly store the admin account's display name on
  // an end-user message. Prefer the conversation participant in that case.
  // Generic legacy sender labels should not override the real conversation participant.
  if (!name || /^(super\s*admin|admin|administrator|altuvera support|guest|guest user|visitor|traveler|end user)$/i.test(name)) {
    return safeEndUserName(guestName)
  }
  return name
}

/* ─── Message Bubble ───────────────────────────────────────────────────────── */

const MsgBubble = React.memo(function MsgBubble({
  message, mine, replyTo, onReact, onReply, now, currentUserId, guestName, guestAvatar,
  editingId, editText, setEditText, onStartEdit, onSaveEdit, onCancelEdit,
  onUnsend, onPin, onHighlight, onForward, onCopy, canModerate,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
  const reactions = useMemo(() => {
    const r = message.reactions || {}
    return Object.entries(r).filter(([, ids]) => ids?.length > 0)
  }, [message.reactions])
  const isPending = String(message.id).startsWith('tmp-')
  const isDeleted = Boolean(message.deleted)
  const isEditing = String(editingId) === String(message.id)
  const messageSenderId = message?.senderId ?? message?.sender_id
  const isOwnMessage = mine && currentUserId != null && messageSenderId != null && String(messageSenderId) === String(currentUserId)

  return (
    <div id={`admin-message-${message.id}`} data-message-id={String(message.id)} className={`group/bubble flex ${mine ? 'justify-end' : 'justify-start'} mb-2 w-full scroll-mt-6`}>
      {!mine && <div className="flex-shrink-0 self-end mr-2 mb-4"><Avatar name={getMessageSenderLabel(message, { currentUserId, guestName })} src={message.senderAvatar || message.sender_avatar || guestAvatar} size="xs" /></div>}

      <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[90%] sm:max-w-[75%] min-w-0`}>
        {!mine && <span className={`text-[10px] font-bold mb-1 ml-1 uppercase tracking-wider ${message.metadata?.senderUnavailable || message.metadata?.senderDeleted ? 'text-slate-500' : 'text-emerald-700'}`}>{message.metadata?.senderUnavailable || message.metadata?.senderDeleted ? 'Member no longer available' : getMessageSenderLabel(message, { currentUserId, guestName })}</span>}

        {replyTo && (
          <div className={`text-xs mb-1 max-w-full ${mine ? 'self-end' : 'self-start'}`}>
            <div className={`border-l-2 pl-2.5 py-1 pr-3 rounded-lg truncate max-w-[280px] ${mine ? 'border-emerald-300 bg-emerald-50 text-emerald-800/80' : 'border-slate-300 bg-slate-100 text-slate-600'}`}>
              <span className="font-bold block text-[9px] uppercase tracking-wide opacity-80">↩ {getMessageSenderLabel(replyTo, { currentUserId, guestName })}</span>
              <span className="block truncate text-[11px] mt-0.5">{replyTo.body || ''}</span>
            </div>
          </div>
        )}

        <div className={`relative flex items-center gap-2 max-w-full ${message.isHighlighted ? 'rounded-2xl ring-2 ring-amber-300 ring-offset-2' : ''}`}>
          {isEditing ? (
            <div className="w-full min-w-[220px] max-w-[520px] bg-white border border-emerald-300 rounded-2xl p-2 shadow-md">
              <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                className="w-full min-h-[76px] resize-none outline-none text-sm text-slate-800 bg-slate-50 rounded-xl p-2.5" />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={onCancelEdit} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600">Cancel</button>
                <button onClick={() => onSaveEdit(message.id)} disabled={!editText.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-40">Save</button>
              </div>
            </div>
          ) : (
            <div className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl shadow-sm
              ${mine ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'}
              ${isPending ? 'opacity-60' : ''} ${isDeleted ? 'italic opacity-60' : ''} transition-all`}
              style={{ wordBreak: 'break-word' }}>
              {isDeleted ? 'This message was unsent' : message.body}
              {message.edited && !isDeleted && <span className={`ml-2 text-[9px] ${mine ? 'text-emerald-100' : 'text-slate-400'}`}>edited</span>}
            </div>
          )}

          {!isPending && !isDeleted && !isEditing && (
            <div className="relative flex-shrink-0">
              <button onClick={() => setMenuOpen(v => !v)} aria-label="Message actions"
                className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/bubble:opacity-100 transition">
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <div className="message-actions-backdrop fixed inset-0 z-[120] flex items-center justify-center"
                     role="presentation"
                     onMouseDown={event => { if (event.target === event.currentTarget) setMenuOpen(false) }}>
                  <section className="message-actions-modal" role="dialog" aria-modal="true"
                           aria-label="Message actions">
                    <div className="message-actions-modal-header">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">Message actions</p>
                        <p className="text-xs text-slate-500 truncate">{getMessageSenderLabel(message, { currentUserId, guestName })} · {fmtShort(message.createdAt)}</p>
                      </div>
                      <button type="button" aria-label="Close message actions" onClick={() => setMenuOpen(false)} className="message-actions-close"><X size={17}/></button>
                    </div>
                    <div className="message-actions-list">
                      <button type="button" onClick={() => { setMenuOpen(false); setReactionPickerOpen(true) }}><Smile size={17}/> React</button>
                      <button type="button" onClick={() => { onReply(message.id); setMenuOpen(false) }}><CornerUpLeft size={17}/> {isOwnMessage ? 'Reply to yourself' : 'Reply'}</button>
                      <button type="button" onClick={() => { onForward(message); setMenuOpen(false) }}><Forward size={17}/> Forward to chat</button>
                      <button type="button" onClick={() => { onCopy(message.body || ''); setMenuOpen(false) }}><Copy size={17}/> Copy message</button>
                      {isOwnMessage && !message.isRead && (
                        <button type="button" onClick={() => { onStartEdit(message); setMenuOpen(false) }}><Pencil size={17}/> Edit message</button>
                      )}
                      {isOwnMessage && (
                        <button type="button" className="danger" onClick={() => { onUnsend(message.id); setMenuOpen(false) }}><Undo2 size={17}/> Unsend for everyone</button>
                      )}
                      {canModerate && (
                        <>
                          <div className="message-actions-divider" />
                          <button type="button" onClick={() => { onPin(message.id, !message.isPinned); setMenuOpen(false) }}><Pin size={17}/> {message.isPinned ? 'Unpin' : 'Pin message'}</button>
                          <button type="button" onClick={() => { onHighlight(message.id, !message.isHighlighted); setMenuOpen(false) }}><Highlighter size={17}/> {message.isHighlighted ? 'Remove highlight' : 'Highlight'}</button>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              )}
              {reactionPickerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setReactionPickerOpen(false) }}>
                  <section role="dialog" aria-modal="true" aria-label="Choose a reaction" className="w-full max-w-[260px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-800">React to message</span><button type="button" aria-label="Close reactions" onClick={() => setReactionPickerOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={15}/></button></div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_REACTIONS.map(emoji => <button type="button" key={emoji} aria-label={`React with ${emoji}`} onClick={() => { onReact(message.id, emoji); setReactionPickerOpen(false) }} className="flex h-10 items-center justify-center rounded-xl border border-slate-100 text-xl transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-95">{emoji}</button>)}
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </div>

        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : ''}`}>
            {reactions.map(([emoji, ids]) => (
              <button key={emoji} onClick={() => onReact(message.id, emoji)}
                className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs hover:bg-slate-50 transition-all shadow-sm flex items-center gap-1">
                <span>{emoji}</span><span className="text-slate-500 font-semibold text-[10px]">{ids.length}</span>
              </button>
            ))}
          </div>
        )}

        {(message.isPinned || message.isHighlighted) && !isDeleted && (
          <div className="flex items-center gap-2 mt-1">
            {message.isPinned && <span className="text-[9px] font-bold text-slate-500 inline-flex items-center gap-1"><Pin size={10}/> Pinned</span>}
            {message.isHighlighted && <span className="text-[9px] font-bold text-amber-600 inline-flex items-center gap-1"><Highlighter size={10}/> Highlighted</span>}
          </div>
        )}

        <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 ${mine ? 'justify-end' : ''}`}>
          <span>{fmtShort(message.createdAt)}</span>
          {mine && !isPending && (
            message.isRead
              ? <><CheckCheck size={13} strokeWidth={2.6} className="text-emerald-600" /><span className="text-emerald-600 font-medium">Seen {fmtElapsed(message.readAt, now)}</span></>
              : <><Check size={13} strokeWidth={2.6} className="text-emerald-600" /><span className="text-emerald-600 font-medium">Sent</span></>
          )}
          {isPending && <Circle size={7} className="text-slate-300 animate-pulse fill-slate-300" />}
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
    if (!selected) { setError('Please select an end user.'); return }
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
    <div className="message-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
         role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="message-modal-card relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl
                      flex flex-col overflow-hidden" style={{ maxHeight: '88dvh' }}>
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Plus size={17} className="text-emerald-600" />
            </div>
            <div>
              <h3 id="new-chat-title" className="font-bold text-slate-800 text-sm">New Conversation</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {selected ? 'Compose message' : 'Select traveler'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close new conversation" className="w-9 h-9 rounded-xl border border-transparent flex items-center justify-center
                             hover:bg-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 transition">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selected ? (
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input ref={searchRef} value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  aria-label="Search end users"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg
                             outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                             bg-slate-50 focus:bg-white transition" />
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                {loadingUsers ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 bg-slate-200 rounded" />
                        <div className="h-2 w-1/2 bg-slate-200 rounded" />
                      </div>
                    </div>
                  ))
                ) : users.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-slate-50/50">
                    <User size={30} className="mx-auto mb-2 opacity-30 text-emerald-600" />
                    <p className="text-sm font-semibold">No travelers found</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {users.map(u => (
                      <button key={u.id} onClick={() => setSelected(u)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 border-b
                                   border-slate-100 last:border-0 hover:bg-emerald-50/60 transition text-left group">
                        <Avatar name={u.fullName || u.email} src={u.avatarUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{u.fullName || '(No name)'}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                        <ChevronDown size={13} className="text-slate-400 group-hover:text-emerald-600 -rotate-90" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <Avatar name={selected.fullName || selected.email} src={selected.avatarUrl} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{selected.fullName || '(No name)'}</p>
                  <p className="text-xs text-slate-500 truncate">{selected.email}</p>
                </div>
                <button onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder={`Chat with ${selected.fullName || selected.email}`}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                             outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                             bg-slate-50 focus:bg-white transition" />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  First Message <span className="text-red-500">*</span>
                </label>
                <textarea ref={taRef} value={firstMsg}
                  onChange={e => setFirstMsg(e.target.value)}
                  rows={4} placeholder="Hi! I'm reaching out regarding your upcoming itinerary…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                             outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                             resize-none bg-slate-50 focus:bg-white transition" />
              </div>

              {error && (
                <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
          <button onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200
                       rounded-lg hover:bg-white transition">
            Cancel
          </button>
          {selected && (
            <button onClick={handleCreate} disabled={creating || !firstMsg.trim()}
              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg
                         hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2">
              {creating
                ? <><RefreshCw size={13} className="animate-spin" /> Creating…</>
                : <><Send size={13} /> Start Chat</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function GroupChatModal({ onClose, onCreated }) {
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [name, setName] = useState("")
  const [firstMessage, setFirstMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await authFetch(`${API_BASE}/messages/users-list?search=${encodeURIComponent(search)}&limit=50`)
        const data = await res.json()
        setUsers(data.data || [])
      } catch { setUsers([]) }
      finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const toggle = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const submit = async () => {
    if (!name.trim()) return setError("Enter a group name.")
    if (!selectedIds.length) return setError("Select at least one traveler.")
    if (!firstMessage.trim()) return setError("Enter the first group message.")
    setSaving(true); setError("")
    try {
      const res = await authFetch(`${API_BASE}/messages/groups`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), userIds: selectedIds, firstMessage: firstMessage.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to create group")
      onCreated(data.data)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="message-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="group-chat-title">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="message-modal-card relative z-10 w-full max-w-xl max-h-[90dvh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="group-chat-title" className="font-bold text-slate-900">Create group conversation</h3>
            <p className="text-xs text-slate-400 mt-0.5">A shared chat, not a notification broadcast.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center"><X size={17}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1.5"><label htmlFor="group-chat-name" className="block text-xs font-semibold text-slate-600">Group name <span className="text-rose-500">*</span></label><input id="group-chat-name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rwanda Gorilla Trip — June"
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"/></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Travelers</label>
              <span className="text-[11px] font-bold text-emerald-600">{selectedIds.length} selected</span>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email or phone…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500 mb-2"/>
            <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
              {loading ? <div className="p-6 text-center text-xs text-slate-400">Loading travelers…</div> :
                users.map(u => {
                  const checked = selectedIds.includes(u.id)
                  return <button key={u.id} onClick={()=>toggle(u.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 last:border-0 ${checked ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>{checked ? "✓" : ""}</div>
                    <Avatar name={u.fullName || u.email} src={u.avatarUrl} size="sm"/>
                    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800 truncate">{u.fullName || u.email}</p><p className="text-[11px] text-slate-400 truncate">{u.email}</p></div>
                  </button>
                })
              }
            </div>
          </div>
          <div className="space-y-1.5"><label htmlFor="group-first-message" className="block text-xs font-semibold text-slate-600">First message <span className="text-rose-500">*</span></label><textarea id="group-first-message" value={firstMessage} onChange={e=>setFirstMessage(e.target.value)} rows={4}
            placeholder="Write the first message every group member will see…"
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm resize-y outline-none focus:border-emerald-500"/></div>
          {error && <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold px-3 py-2">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50">
            {saving ? "Creating…" : `Create group & send`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Forward Message Modal ─────────────────────────────────────────────────── */

function ForwardMessageModal({ message, conversations, onClose, onForward, sending }) {
  const [search, setSearch] = useState('')
  const [targetId, setTargetId] = useState('')
  const query = search.trim().toLowerCase()
  const options = conversations.filter(conv => {
    if (String(conv.id) === String(message?.conversationId)) return false
    if (conv.status === 'archived') return false
    const haystack = [conv.subject, conv.guestName, conv.guestEmail, conv.lastMessage, conv.destinationName]
      .filter(Boolean).join(' ').toLowerCase()
    return !query || haystack.includes(query)
  })

  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape' && !sending) onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, sending])

  return (
    <div className="message-modal-backdrop fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:p-5"
      role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !sending) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="forward-message-title"
        className="message-modal-card w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white border border-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[.18em] text-emerald-700 font-bold">Share with a traveler</p>
            <h2 id="forward-message-title" className="text-lg font-bold text-slate-900 mt-1">Forward message</h2>
          </div>
          <button type="button" onClick={onClose} disabled={sending} aria-label="Close forward dialog"
            className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50"><X size={17}/></button>
        </header>
        <div className="px-5 pt-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Forwarding {message?.senderName || 'message'}</p>
            <p className="text-sm text-slate-700 mt-1 line-clamp-3 whitespace-pre-wrap break-words">{message?.body || 'This message has no text.'}</p>
          </div>
          <label htmlFor="forward-chat-search" className="text-xs font-bold text-slate-600">Choose a conversation</label>
          <div className="relative mt-1.5 mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input id="forward-chat-search" autoFocus value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Search traveler, subject or message…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"/>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 pb-2">
            {options.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No other conversations match.</div>
            ) : options.slice(0, 80).map(conv => {
              const selected = String(targetId) === String(conv.id)
              return (
                <button type="button" key={conv.id} onClick={() => setTargetId(String(conv.id))}
                  aria-pressed={selected}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                  <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center">
                    {(conv.guestName || conv.subject || 'U').trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{conv.subject || conv.guestName || 'End user'}</span>
                    <span className="block text-xs text-slate-500 truncate">{conv.guestName && conv.subject ? conv.guestName + ' · ' : ''}{conv.lastMessage || 'No messages yet'}</span>
                  </span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                    {selected && <Check size={10} className="text-white"/>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <footer className="flex gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={sending}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => onForward(targetId)} disabled={!targetId || sending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
            {sending ? <RefreshCw size={15} className="animate-spin"/> : <Forward size={15}/>}
            {sending ? 'Forwarding…' : 'Forward message'}
          </button>
        </footer>
      </section>
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────────────────────── */

export default function Messages() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const requestedConversationId = searchParams.get('conversationId')
  const { user } = useAuth()
  const { connected, on, off, emit } = useSocket()
  const toast = useToast()

  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [conversationLoadError, setConversationLoadError] = useState('')
  const [activeConversationError, setActiveConversationError] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const loadingOlderRef = useRef(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiSuggestionLanguage, setAiSuggestionLanguage] = useState('')
  const aiSuggestionRequestRef = useRef(0)
  useEffect(() => {
    const value = draft.trim()
    if (value.length < 12 || value.length > 700) { setAiSuggestions([]); return }
    const requestId = ++aiSuggestionRequestRef.current
    const timer = setTimeout(async () => {
      try {
        const token = getToken()
        const response = await fetch(API_BASE + '/ai/message-suggestions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
          body: JSON.stringify({ text: value }), signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) return
        const result = await response.json()
        if (requestId === aiSuggestionRequestRef.current) {
          setAiSuggestions(Array.isArray(result.suggestions) ? result.suggestions.slice(0, 2) : [])
          setAiSuggestionLanguage(result.language || '')
        }
      } catch (_) { /* Suggestions are best-effort; never interrupt chat. */ }
    }, 650)
    return () => clearTimeout(timer)
  }, [draft])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [presenceByConversation, setPresenceByConversation] = useState({})
  // Show every conversation by default so threads are never hidden by the initial filter.
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [replyToId, setReplyToId] = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [forwardMessage, setForwardMessage] = useState(null)
  const [forwarding, setForwarding] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editText, setEditText] = useState("")
  const [atBottom, setAtBottom] = useState(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [composerVisible, setComposerVisible] = useState(true)
  const lastScrollTopRef = useRef(0)
  const [newMsgsWhileScrolled, setNewMsgsWhileScrolled] = useState(0)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // Update relative timestamps in message notifications without creating a
  // separate notification for each incoming message.
  useEffect(() => {
    const timer = setInterval(() => setNotificationNow(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  const [userTyping, setUserTyping] = useState(null)
  const [typingConvIds, setTypingConvIds] = useState(new Set())

  const [clearing, setClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState({ open: false })

  const draftStorageKey = activeId ? `altuvera:admin-chat-draft:${activeId}` : null
  useEffect(() => {
    if (!draftStorageKey) return
    try { setDraft(localStorage.getItem(draftStorageKey) || '') } catch {}
  }, [draftStorageKey])
  useEffect(() => {
    if (!draftStorageKey) return
    try { if (draft) localStorage.setItem(draftStorageKey, draft); else localStorage.removeItem(draftStorageKey) } catch {}
  }, [draft, draftStorageKey])

  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const conversationSearchRef = useRef(null)
  const [incomingNotifications, setIncomingNotifications] = useState([])
  const [notificationNow, setNotificationNow] = useState(Date.now())
  const incomingNotificationIdsRef = useRef(new Set())
  const conversationsRef = useRef([])
  conversationsRef.current = conversations
  const typingTimers = useRef({})
  const isAdminTypingRef = useRef(false)
  const adminTypingTimer = useRef(null)
  const activeIdRef = useRef(null)
  const atBottomRef = useRef(true)
  const conversationsLoadedRef = useRef(false)
  const conversationRefreshTimer = useRef(null)
  const conversationRequestRef = useRef(0)
  const requestedConversationOpenedRef = useRef(null)
  const pendingScrollToLatestRef = useRef(false)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { atBottomRef.current = atBottom }, [atBottom])

  // Ctrl/⌘+K focuses inbox search; Ctrl/⌘+N starts a separate conversation.
  // Preserve native editing shortcuts while typing in a form or composing a message.
  useEffect(() => {
    const handleShortcut = event => {
      const command = event.ctrlKey || event.metaKey
      if (!command || event.altKey || event.repeat) return
      const target = event.target
      const typing = target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
      if (typing) return
      const key = event.key.toLowerCase()
      if (key === 'k') {
        event.preventDefault()
        conversationSearchRef.current?.focus()
        conversationSearchRef.current?.select()
      } else if (key === 'n') {
        event.preventDefault()
        setShowNewChat(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  // The admin Messages page owns these in-app notifications. Events emitted
  // by both message channels are de-duplicated by message ID and grouped by
  // conversation, so a follow-up message updates the existing card.
  const pushIncomingMessageNotification = useCallback((eventPayload, forceIncoming = false) => {
    if (!eventPayload || typeof eventPayload !== 'object') return
    const nestedMessage = eventPayload.message && typeof eventPayload.message === 'object'
      ? eventPayload.message
      : null
    const message = nestedMessage ? { ...eventPayload, ...nestedMessage } : eventPayload
    const conversationId = eventPayload.conversationId
      ?? eventPayload.conversation_id
      ?? message.conversationId
      ?? message.conversation_id
    if (conversationId == null || String(conversationId).trim() === '') return

    const senderType = String(
      message.senderType ?? message.sender_type ?? eventPayload.senderType ?? eventPayload.sender_type ?? ''
    ).toLowerCase()
    if (!forceIncoming && senderType && !['user', 'traveler', 'guest'].includes(senderType)) return

    const conversationKey = String(conversationId)
    const conversation = conversationsRef.current.find(item => String(item.id) === conversationKey)
    const bodyValue = message.body ?? message.text ?? message.content ?? eventPayload.body ?? ''
    const body = String(bodyValue || '').trim() || 'Sent a message'
    const createdAt = message.createdAt ?? message.created_at
      ?? eventPayload.createdAt ?? eventPayload.created_at
      ?? eventPayload.timestamp ?? new Date().toISOString()
    const rawMessageId = message.id ?? message.messageId ?? message.message_id
      ?? eventPayload.messageId ?? eventPayload.message_id
    const messageKey = rawMessageId != null
      ? `${conversationKey}:${String(rawMessageId)}`
      : `${conversationKey}:${String(createdAt)}:${body}`

    if (incomingNotificationIdsRef.current.has(messageKey)) return
    incomingNotificationIdsRef.current.add(messageKey)
    if (incomingNotificationIdsRef.current.size > 500) {
      const firstKey = incomingNotificationIdsRef.current.values().next().value
      incomingNotificationIdsRef.current.delete(firstKey)
    }

    const candidateName = [
      message.senderName, message.sender_name, eventPayload.senderName,
      eventPayload.sender_name, eventPayload.user?.fullName, eventPayload.user?.name,
      conversation?.guestName,
    ].find(value => typeof value === 'string' && value.trim())
    const senderName = String(candidateName || 'Traveler').trim()
    const senderAvatar = message.senderAvatar ?? message.sender_avatar
      ?? eventPayload.senderAvatar ?? eventPayload.sender_avatar
      ?? eventPayload.user?.avatarUrl ?? eventPayload.user?.avatar
      ?? conversation?.guestAvatar ?? conversation?.avatarUrl ?? conversation?.avatar ?? ''

    const incomingMessage = {
      id: messageKey,
      body: body.slice(0, 240),
      createdAt,
    }
    const updatedAt = Date.now()
    setIncomingNotifications(previous => {
      const existing = previous.find(item => String(item.conversationId) === conversationKey)
      if (existing) {
        const next = {
          ...existing,
          senderName: senderName !== 'Traveler' ? senderName : existing.senderName,
          senderAvatar: senderAvatar || existing.senderAvatar,
          messages: [...existing.messages, incomingMessage].slice(-4),
          count: (existing.count || existing.messages.length || 0) + 1,
          updatedAt,
        }
        return [next, ...previous.filter(item => String(item.conversationId) !== conversationKey)]
          .slice(0, 5)
      }

      return [{
        conversationId: conversationKey,
        senderName,
        senderAvatar,
        messages: [incomingMessage],
        count: 1,
        updatedAt,
      }, ...previous].slice(0, 5)
    })
  }, [])

  const loadConversations = useCallback(async () => {
    // Only the first load uses the skeleton. Refreshes update the existing
    // list in place so conversations never disappear/flicker while refreshing.
    const requestId = ++conversationRequestRef.current
    const firstLoad = !conversationsLoadedRef.current
    if (firstLoad) setLoadingList(true)

    try {
      const p = new URLSearchParams({ limit: '100', active: 'all' })
      if (filter !== 'all') p.set('status', filter)
      if (search.trim()) p.set('search', search.trim())
      const res = await authFetch(`${API_BASE}/messages/conversations?${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (requestId === conversationRequestRef.current) {
        const rows = Array.isArray(data.data) ? data.data.map(normalizeConversation) : []
        setConversations(rows)
        setConversationLoadError('')
        conversationsLoadedRef.current = true
      }
    } catch (err) {
      if (requestId === conversationRequestRef.current) setConversationLoadError('Could not load conversations. Check your connection and refresh to try again.')
      console.error('[AdminMessages] load error:', err.message)
    } finally {
      if (firstLoad) setLoadingList(false)
    }
  }, [filter, search])

  useEffect(() => {
    loadConversations()
    return () => {
      if (conversationRefreshTimer.current) clearTimeout(conversationRefreshTimer.current)
    }
  }, [loadConversations])

  const scheduleConversationRefresh = useCallback(() => {
    clearTimeout(conversationRefreshTimer.current)
    conversationRefreshTimer.current = setTimeout(() => {
      loadConversations()
    }, 500)
  }, [loadConversations])

  const openConversation = useCallback(async (id) => {
    if (id == null || String(id).trim() === '') {
      activeIdRef.current = null
      setActiveId(null); setActiveConv(null)
      setActiveConversationError('')
      setMessages([]); setReplyToId(null)
      setHasMoreMessages(false); setLoadingOlderMessages(false); loadingOlderRef.current = false
      setUserTyping(null); setLoadingMsgs(false)
      setSidebarOpen(true)
      setShowMobileChat(false)
      return
    }
    const conversationId = String(id).trim()
    setIncomingNotifications(previous => previous.filter(item => String(item.conversationId) !== conversationId))
    activeIdRef.current = conversationId
    pendingScrollToLatestRef.current = true
    setActiveId(conversationId)
    setActiveConv(null)
    setActiveConversationError('')
    setReplyToId(null); setDraft('')
    setHasMoreMessages(false); setLoadingOlderMessages(false); loadingOlderRef.current = false
    setLoadingMsgs(true); setMessages([])
    setUserTyping(null); setAtBottom(true)
    setShowScrollBtn(false)
    setComposerVisible(true)
    lastScrollTopRef.current = 0
    setNewMsgsWhileScrolled(0)

    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${encodeURIComponent(conversationId)}?limit=10`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not open conversation (HTTP ${res.status})`)
      if (String(activeIdRef.current) !== conversationId) return
      if (!data?.data || typeof data.data !== 'object') throw new Error('The conversation details were not returned. Please try again.')
      setActiveConv(data.data)
      setMessages(data.data?.messages || [])
      setHasMoreMessages(Boolean(data.data?.hasMoreMessages))

      authFetch(`${API_BASE}/messages/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'PATCH' }).catch(() => {})

      setConversations(prev =>
        prev.map(c => String(c.id) === conversationId ? { ...c, unreadAdmin: 0 } : c)
      )
    } catch (err) {
      if (String(activeIdRef.current) === conversationId) {
        setActiveConversationError(err.message || 'Could not open this conversation. Please try again.')
        setActiveConv(null)
      }
      console.error('[AdminMessages] open error:', err.message)
    } finally {
      if (String(activeIdRef.current) === conversationId) setLoadingMsgs(false)
    }
  }, [])

  const openIncomingNotification = useCallback((notification) => {
    const conversationId = notification?.conversationId
    if (conversationId == null || String(conversationId).trim() === '') return
    setIncomingNotifications(previous => previous.filter(item => String(item.conversationId) !== String(conversationId)))
    setSidebarOpen(false)
    setShowMobileChat(true)
    void openConversation(String(conversationId))
  }, [openConversation])

  const handleSelectConversation = useCallback((conversation) => {
    const conversationId = resolveConversationId(conversation)
    if (conversationId == null || String(conversationId).trim() === '') {
      console.error('[AdminMessages] Cannot open conversation: the list item has no conversation ID.', conversation)
      toast.error('This conversation is missing its ID. Refresh the inbox and try again.')
      return
    }
    setSidebarOpen(false)
    setShowMobileChat(true)
    void openConversation(String(conversationId))
  }, [openConversation, toast])

  // Only notification links should open a thread automatically. Entering
  // the Messages page normally always starts at the full conversation list.
  useEffect(() => {
    if (!requestedConversationId || !conversations.length) return
    const requestKey = String(requestedConversationId)
    // Opening a thread updates the conversation list (unread count), which
    // changes the array identity. Guard the URL-driven open so that update
    // cannot trigger another fetch forever.
    if (requestedConversationOpenedRef.current === requestKey) return
    const target = conversations.find(c => String(c.id) === requestKey)
    if (target) {
      requestedConversationOpenedRef.current = requestKey
      setSidebarOpen(false)
      openConversation(target.id)
    }
  }, [requestedConversationId, conversations, openConversation])

  const loadOlderMessages = useCallback(async () => {
    const conversationId = activeIdRef.current
    if (!conversationId || !hasMoreMessages || loadingOlderRef.current || !messages.length) return
    const oldest = messages[0]
    if (oldest?.id == null) return

    loadingOlderRef.current = true
    setLoadingOlderMessages(true)
    try {
      const params = new URLSearchParams({ limit: '10', beforeId: String(oldest.id) })
      const res = await authFetch(`${API_BASE}/messages/conversations/${conversationId}?${params.toString()}`)
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.message || 'Could not load earlier messages')
      if (String(activeIdRef.current) !== String(conversationId)) return
      const older = Array.isArray(payload.data?.messages) ? payload.data.messages : []
      setMessages(current => {
        const ids = new Set(current.map(message => String(message.id)))
        return [...older.filter(message => !ids.has(String(message.id))), ...current]
      })
      setHasMoreMessages(Boolean(payload.data?.hasMoreMessages))
    } catch (error) {
      toast.error(error.message || 'Could not load earlier messages')
    } finally {
      loadingOlderRef.current = false
      setLoadingOlderMessages(false)
    }
  }, [hasMoreMessages, messages, toast])

  // Opening a conversation is passive: show the chat and composer without
  // automatically focusing the textarea or another control.

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    setNewMsgsWhileScrolled(0)
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    // The composer is persistent: scrolling the message history must never
    // hide the reply field or move it below the visible chat panel.
    setComposerVisible(true)
    lastScrollTopRef.current = el.scrollTop
    setAtBottom(bottom)
    atBottomRef.current = bottom
    setShowScrollBtn(!bottom)
    if (bottom) setNewMsgsWhileScrolled(0)

    if (el.scrollTop <= 48 && hasMoreMessages && !loadingOlderRef.current) {
      const previousHeight = el.scrollHeight
      setAtBottom(false)
      atBottomRef.current = false
      loadOlderMessages().then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const current = scrollRef.current
          if (current) current.scrollTop = current.scrollHeight - previousHeight
        }))
      })
    }
  }, [hasMoreMessages, loadOlderMessages])

  // When a conversation opens, anchor the message log to its newest message
  // immediately. Smooth programmatic scrolling can be mistaken for a user
  // scrolling down and hide the composer before the chat has finished opening.
  useEffect(() => {
    if (loadingMsgs || !activeConv || !pendingScrollToLatestRef.current) return
    if (!messages.length) {
      pendingScrollToLatestRef.current = false
      setComposerVisible(true)
      return
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scrollToBottom(false)
      setComposerVisible(true)
      lastScrollTopRef.current = scrollRef.current?.scrollTop ?? 0
      pendingScrollToLatestRef.current = false
    }))
  }, [loadingMsgs, activeConv, activeId, messages, scrollToBottom])

  // Keep the normal inbox load anchored to the latest message as well.
  useEffect(() => {
    if (!loadingMsgs && messages.length > 0 && !pendingScrollToLatestRef.current) {
      requestAnimationFrame(() => scrollToBottom(false))
    }
  }, [loadingMsgs, activeId, scrollToBottom]) // eslint-disable-line

  // Keep the latest message in view without triggering the scroll-direction
  // animation that is reserved for deliberate user scrolling.
  useEffect(() => {
    if (pendingScrollToLatestRef.current) return
    if (atBottom) {
      requestAnimationFrame(() => scrollToBottom(false))
    }
  }, [messages.length, atBottom, scrollToBottom])

  useEffect(() => {
    setDraft(''); setReplyToId(null); setShowEmoji(false)
    clearTimeout(adminTypingTimer.current)
    isAdminTypingRef.current = false
  }, [activeId])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
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
      let ackHandled = false
      const ackTimer = setTimeout(() => {
        if (ackHandled) return
        ackHandled = true
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setSending(false)
        toast.error('Message delivery was not confirmed. Refresh the conversation before retrying.')
        loadConversations()
      }, 12000)
      emit(
        'msg:admin-send',
        { conversationId: convId, body: outDraft, replyToId: outReply || undefined },
        (ack) => {
          if (ackHandled) return
          ackHandled = true
          clearTimeout(ackTimer)
          if (ack?.success && ack.message) {
            setMessages(prev => prev.map(m => m.id === optimistic.id ? ack.message : m))
            toast.success('Message sent to end user')
          } else {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
            toast.error(ack?.error || 'The message could not be sent. Please try again.')
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
          setMessages(prev => prev.map(m => m.id === optimistic.id ? data.data : m))
          toast.success('Message sent to end user')
        }
      } else {
        const payload = await res.json().catch(() => ({}))
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        toast.error(payload.message || 'The message could not be sent. Please try again.')
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      toast.error(error?.message || 'The message could not be sent. Check your connection.')
    } finally {
      setSending(false)
      loadConversations()
    }
  }, [draft, sending, connected, emit, user, loadConversations, replyToId, emitAdminTyping, toast])

  const copyMessageText = useCallback(async (body) => {
    try {
      await navigator.clipboard.writeText(String(body || ''))
      toast.success('Message copied')
    } catch {
      toast.error('Could not copy this message on this device')
    }
  }, [toast])

  const toggleReaction = useCallback(async (messageId, emoji) => {
    const convId = activeIdRef.current
    if (!convId) return
    const current = messages.find(m => String(m.id) === String(messageId))
    const mine = current?.reactions?.[emoji]?.map(String).includes(String(user?.id))
    try {
      const res = await authFetch(
        `${API_BASE}/messages/conversations/${convId}/messages/${messageId}/react`,
        { method: 'PATCH', body: JSON.stringify({ emoji, add: !mine }) }
      )
      if (!res.ok) throw new Error('Reaction failed')
      const data = await res.json()
      setMessages(prev => prev.map(m =>
        String(m.id) === String(messageId)
          ? { ...m, reactions: data.data?.reactions || {} } : m
      ))
    } catch (e) { toast.error(e.message) }
  }, [messages, user, toast])

  const startEditMessage = useCallback((message) => {
    if (!message || message.deleted) return
    setEditingMessageId(message.id)
    setEditText(message.body || "")
  }, [])

  const saveEditMessage = useCallback(async (messageId) => {
    const body = editText.trim()
    if (!body || !activeId) return
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${activeId}/messages/${messageId}`, {
        method: 'PATCH', body: JSON.stringify({ body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to edit message')
      setMessages(prev => prev.map(m => String(m.id) === String(messageId) ? data.data : m))
      setEditingMessageId(null); setEditText("")
      toast.success('Message edited')
    } catch (e) { toast.error(e.message) }
  }, [activeId, editText, toast])

  const unsendMessage = useCallback(async (messageId) => {
    if (!activeId || !window.confirm('Unsend this message? It will be replaced with an unsent marker for everyone.')) return
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${activeId}/messages/${messageId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to unsend message')
      setMessages(prev => prev.map(m => String(m.id) === String(messageId) ? data.data : m))
    } catch (e) { toast.error(e.message) }
  }, [activeId, toast])

  const setMessageFlag = useCallback(async (messageId, flag, value) => {
    if (!activeId) return
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${activeId}/messages/${messageId}/${flag}`, {
        method: 'PATCH', body: JSON.stringify({ value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to update message')
      setMessages(prev => prev.map(m => String(m.id) === String(messageId) ? data.data : m))
    } catch (e) { toast.error(e.message) }
  }, [activeId, toast])

  const handleNewConvCreated = useCallback((conv) => {
    setShowNewChat(false)
    loadConversations()
    if (conv?.id) { setShowMobileChat(true); setSidebarOpen(false); openConversation(conv.id) }
  }, [loadConversations, openConversation])

  const handleForwardToConversation = useCallback(async (targetId) => {
    if (!forwardMessage || !targetId || forwarding) return
    // Forward the text as a fresh admin-authored reply. The traveler sees the
    // content and the authenticated admin's profile, not internal forward labels.
    const forwardedBody = String(forwardMessage.body || '').trim()
    if (!forwardedBody) return
    setForwarding(true)
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${encodeURIComponent(targetId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: forwardedBody }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'The message could not be forwarded.')
      setForwardMessage(null)
      toast.success('Message forwarded')
      loadConversations()
    } catch (error) {
      toast.error(error.message || 'The message could not be forwarded.')
    } finally {
      setForwarding(false)
    }
  }, [forwardMessage, forwarding, toast, loadConversations])

  const handleToggleArchive = useCallback(async () => {
    if (!activeId || !activeConv) return
    const nextStatus = activeConv.status === 'archived' ? 'open' : 'archived'
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${encodeURIComponent(activeId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not ${nextStatus === 'archived' ? 'archive' : 'restore'} this conversation.`)
      const updated = data.data || { ...activeConv, status: nextStatus }
      setActiveConv(prev => prev ? { ...prev, ...updated, status: nextStatus } : prev)
      toast.success(nextStatus === 'archived' ? 'Conversation archived' : 'Conversation restored')
      if (filter !== 'all' && filter !== nextStatus) {
        // Remove a thread immediately when its new status no longer matches
        // the selected filter, avoiding a stale row re-opening during refresh.
        setConversations(prev => prev.filter(conv => String(conv.id) !== String(activeId)))
        setActiveId(null)
        setActiveConv(null)
        setMessages([])
      } else {
        setConversations(prev => prev.map(conv => String(conv.id) === String(activeId) ? { ...conv, ...updated, status: nextStatus } : conv))
      }
      await loadConversations()
    } catch (error) {
      toast.error(error.message || 'Conversation status could not be updated.')
    }
  }, [activeId, activeConv, filter, toast, loadConversations])

  const handleDeleteConversation = useCallback(async () => {
    if (!activeId || !window.confirm("Delete this conversation and hide its history from both inboxes?")) return
    try {
      const res = await authFetch(`${API_BASE}/messages/conversations/${activeId}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to delete conversation")
      setConversations(prev => prev.filter(c => String(c.id) !== String(activeId)))
      setActiveId(null)
      setActiveConv(null)
      setMessages([])
      toast.success("Conversation deleted")
      loadConversations()
    } catch (e) { toast.error(e.message) }
  }, [activeId, toast, loadConversations])

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

  /* ─── Socket Events ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!on || !off) return

    const onMessage = (payload) => {
      if (!payload) return
      const cid = String(payload.conversationId)

      if (String(payload.senderType ?? payload.sender_type ?? '').toLowerCase() === 'user') {
        pushIncomingMessageNotification(payload)
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
          // Track new messages while scrolled up
          if (!atBottomRef.current && payload.senderType !== 'admin') {
            setNewMsgsWhileScrolled(c => c + 1)
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
      pushIncomingMessageNotification(payload, true)
      scheduleConversationRefresh()
    }

    const onConvUpdated = (conv) => {
      if (!conv) return
      setActiveConv(p => p?.id === conv.id ? { ...p, ...conv } : p)
      setConversations(prev => prev.map(c => String(c.id) === String(conv.id) ? { ...c, ...conv } : c))
    }

    const onRead = (payload) => {
      if (!payload?.conversationId) return
      const ids = new Set((payload.messageIds || []).map(String))
      if (String(payload.conversationId) === String(activeIdRef.current) && payload.readBy === 'user') {
        setMessages(prev => prev.map(m =>
          ids.has(String(m.id)) || m.senderType === 'admin'
            ? { ...m, isRead: true, readAt: m.readAt || payload.readAt || new Date().toISOString() }
            : m
        ))
      }
    }

    const onPresence = (payload) => {
      if (!payload?.conversationId || payload.senderType !== 'user') return
      setPresenceByConversation(prev => ({
        ...prev,
        [String(payload.conversationId)]: {
          active: Boolean(payload.active),
          activeSince: payload.activeSince || null,
          lastSeenAt: payload.lastSeenAt || null,
        },
      }))
    }

    const onReaction = ({ messageId, reactions }) => {
      if (!messageId) return
      setMessages(prev =>
        prev.map(m => String(m.id) === String(messageId) ? { ...m, reactions: reactions || {} } : m)
      )
    }

    const onMessageMutation = (payload) => {
      if (!payload?.id) return
      setMessages(prev => prev.map(m => String(m.id) === String(payload.id) ? { ...m, ...payload } : m))
    }

    if (emit) emit('join:admin')

    on('msg:message',              onMessage)
    on('msg:new-from-user',        onNewFromUser)
    on('msg:conversation-updated', onConvUpdated)
    on('msg:reaction',             onReaction)
    on('msg:message-edited',       onMessageMutation)
    on('msg:message-deleted',      onMessageMutation)
    on('msg:message-pinned',       onMessageMutation)
    on('msg:message-highlighted',  onMessageMutation)
    on('msg:read',                 onRead)
    on('msg:presence',             onPresence)
    on('msg:typing',               onTyping)

    return () => {
      off('msg:message',              onMessage)
      off('msg:new-from-user',        onNewFromUser)
      off('msg:conversation-updated', onConvUpdated)
      off('msg:reaction',             onReaction)
      off('msg:message-edited',       onMessageMutation)
      off('msg:message-deleted',      onMessageMutation)
      off('msg:message-pinned',       onMessageMutation)
      off('msg:message-highlighted',  onMessageMutation)
      off('msg:read',                 onRead)
      off('msg:presence',             onPresence)
      off('msg:typing',               onTyping)
    }
  }, [on, off, emit, scheduleConversationRefresh, pushIncomingMessageNotification])

  useEffect(() => {
    if (!emit || !activeId) return
    emit('msg:admin-join', { conversationId: activeId })
    emit('msg:mark-read', { conversationId: activeId })
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

  const replyMap = useMemo(() => new Map(messages.map(m => [String(m.id), m])), [messages])
  const msgGroups = useMemo(() => groupMessages(messages), [messages])
  const replyMsg = replyToId ? replyMap.get(String(replyToId)) : null
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadAdmin || 0), 0)

  const activePresence = activeId ? presenceByConversation[String(activeId)] : null
  const activeSince = activePresence?.activeSince ? new Date(activePresence.activeSince).getTime() : 0
  const activeDurationMins = activeSince ? Math.max(0, Math.floor((now - activeSince) / 60000)) : 0
  const presenceLabel = activePresence?.active
    ? (activeDurationMins < 1 ? 'Active now' : `Active for ${activeDurationMins}m`)
    : activePresence?.lastSeenAt
      ? `Last active ${fmtElapsed(activePresence.lastSeenAt, now)}`
      : 'Offline'

  const convTitle = activeConv?.groupId
    ? (activeConv?.groupName || activeConv?.subject || 'Group conversation')
    : (activeConv?.subject
      || (activeConv?.bookingNumber ? `Booking #${activeConv.bookingNumber}` : null)
      || safeEndUserName(activeConv?.guestName)
      || 'Conversation')

  const [showMobileChat, setShowMobileChat] = useState(false)

  return (
    <>
      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onCreated={handleNewConvCreated} />
      )}
      {forwardMessage && (
        <ForwardMessageModal
          message={{ ...forwardMessage, conversationId: activeId || forwardMessage.conversationId }}
          conversations={conversations}
          onClose={() => { if (!forwarding) setForwardMessage(null) }}
          onForward={handleForwardToConversation}
          sending={forwarding}
        />
      )}
      {showGroupChat && (
        <GroupChatModal
          onClose={() => setShowGroupChat(false)}
          onCreated={(data) => {
            setShowGroupChat(false)
            loadConversations()
            if (data?.conversationId) openConversation(data.conversationId)
          }}
        />
      )}

      {/*
        ═══════════════════════════════════════════════════════════════════════
        ROOT: Full-height container with STRICT overflow hidden
        This is the KEY to preventing composer movement — the outer container
        has fixed height, and only ONE child inside scrolls (the message log)
        ═══════════════════════════════════════════════════════════════════════
      */}
      <div className="messages-admin-shell relative flex flex-1 min-h-0 min-w-0 w-full flex-col bg-white" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>

        {incomingNotifications.length > 0 && (
          <div className="messages-incoming-notification-stack" aria-label="New messages" aria-live="polite">
            {incomingNotifications.map(notification => (
              <article key={notification.conversationId} className="messages-incoming-notification">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openIncomingNotification(notification)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openIncomingNotification(notification)
                    }
                  }}
                  aria-label={`Open conversation with ${notification.senderName}`}
                  className="messages-incoming-notification-content"
                >
                  <Avatar name={notification.senderName} src={notification.senderAvatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="messages-incoming-notification-name truncate">{notification.senderName}</span>
                      <span className="messages-incoming-notification-count">
                        {notification.count} {notification.count === 1 ? 'message' : 'messages'}
                      </span>
                    </div>
                    <div className="messages-incoming-notification-snippets">
                      {notification.messages.map(message => (
                        <div key={message.id} className="messages-incoming-notification-snippet">
                          <p>{message.body}</p>
                          <time dateTime={String(message.createdAt)}>
                            {fmtElapsed(message.createdAt, notificationNow)}
                          </time>
                        </div>
                      ))}
                    </div>
                    <span className="messages-incoming-notification-open-hint">
                      Open conversation <CornerUpLeft size={11} />
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="messages-incoming-notification-dismiss"
                  aria-label={`Dismiss notification from ${notification.senderName}`}
                  title="Dismiss"
                  onClick={() => setIncomingNotifications(previous => previous.filter(item => String(item.conversationId) !== String(notification.conversationId)))}
                >
                  <X size={14} />
                </button>
              </article>
            ))}
          </div>
        )}

        {/* ═══ TOP HEADER (fixed, non-scrolling) ═══ */}
        <header className={`flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3
                            bg-white border-b border-slate-200 z-20
                            ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center gap-3 min-w-0"><button onClick={() => setSidebarOpen(v => !v)} className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 flex items-center justify-center hover:text-emerald-600" aria-label="Toggle conversations" title="Toggle conversations">{sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600
                            flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/20">
              <MessageSquare size={17} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Messages
                {totalUnread > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className={activePresence?.active ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                  {activePresence?.active ? "●" : "○"} {presenceLabel}
                </span>
                <span className="text-slate-300">•</span>
                {connected ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Connecting…
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 max-w-[60%]">
            <button onClick={() => setShowGroupChat(true)} aria-label="Create group conversation"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-700 border border-emerald-200
                         text-xs font-bold rounded-lg hover:bg-emerald-50 transition-all" title="Send to a shared group chat">
              <UsersRound size={14} />
              <span className="hidden sm:inline">Group</span>
            </button>
            <button onClick={() => setShowNewChat(true)} title="New conversation · Ctrl/⌘+N" aria-label="Start a new conversation"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600
                         text-white text-xs font-bold rounded-lg hover:shadow-lg hover:shadow-emerald-500/20
                         active:scale-95 transition-all">
              <Plus size={14} strokeWidth={2.2} />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button onClick={() => setClearConfirm({ open: true })} aria-label="Clear all messaging records"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700
                         border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition">
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </header>

        {/* ═══ MAIN 2-PANE AREA ═══ */}
        <main className="flex-1 flex min-h-0 min-w-0 overflow-hidden w-full">

          {/* ═══════════════════════════════════════════════════════════
              LEFT SIDEBAR — Conversations list
              ═══════════════════════════════════════════════════════════ */}
          <aside data-mobile-hidden={showMobileChat ? "true" : "false"} className={`w-full md:w-[300px] lg:w-[340px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200 min-h-0 transition-all duration-200 ${showMobileChat ? "hidden md:flex" : "flex"} ${sidebarOpen ? "" : "md:hidden"}`}>

            {/* Sidebar sticky header */}
            <div className="flex-shrink-0 p-3 border-b border-slate-100 space-y-2.5 bg-white">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input ref={conversationSearchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search names, subjects or messages…"
                  title="Search conversations · Ctrl/⌘+K"
                  aria-label="Search conversations"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg
                             outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all" />
              </div>

              <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-lg" role="tablist" aria-label="Filter conversations by status">
                {['open', 'pending', 'closed', 'archived', 'all'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className={`py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all
                                ${filter === f
                                  ? 'bg-white text-emerald-700 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800'}`}>
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
                </span>
                <button onClick={loadConversations} disabled={loadingList}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors">
                  <RefreshCw size={12} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* SCROLLABLE list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {conversationLoadError && conversations.length === 0 && !loadingList && (
                <div className="m-3 rounded-xl border border-rose-200 bg-rose-50 p-3" role="alert">
                  <p className="text-xs font-semibold text-rose-700">{conversationLoadError}</p>
                  <button type="button" onClick={loadConversations} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"><RefreshCw size={12}/> Try again</button>
                </div>
              )}
              {loadingList && conversations.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border-b border-slate-100 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="flex justify-between gap-3">
                        <div className="h-3 flex-1 bg-slate-200 rounded" />
                        <div className="h-2 w-10 bg-slate-200 rounded" />
                      </div>
                      <div className="h-2 w-4/5 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                    <MessageSquare size={22} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No conversations</p>
                  <p className="text-xs text-slate-400 mt-1">No chats match your criteria.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {conversations.map(c => (
                    <ConvRow
                      key={c.id}
                      conv={c}
                      active={String(c.id) === String(activeId)}
                      onSelect={handleSelectConversation}
                      isTyping={typingConvIds.has(String(c.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ═══════════════════════════════════════════════════════════
              RIGHT: CHAT PANEL — Fixed header + Scrollable log + Fixed composer
              ═══════════════════════════════════════════════════════════ */}
          <section data-mobile-active={showMobileChat ? "true" : "false"} className={`flex-1 w-0 flex flex-col bg-white min-h-0 min-w-0 relative ${showMobileChat ? "flex" : "hidden md:flex"}`}>
            {!sidebarOpen && !showMobileChat && <button onClick={() => setSidebarOpen(true)} className="absolute left-3 top-3 z-30 w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 flex items-center justify-center hover:text-emerald-600" aria-label="Show conversations" title="Show conversations"><PanelLeftOpen size={17} /></button>}

            {!activeConv ? (
              loadingMsgs ? (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-8 bg-white" role="status" aria-live="polite">
                  <span className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-emerald-600" /></span>
                  <p className="text-sm font-semibold text-slate-700">Opening conversation…</p>
                  <p className="text-xs text-slate-400 text-center">Loading messages and preparing your reply box.</p>
                </div>
              ) : activeConversationError ? (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-8 bg-white" role="alert">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3"><MessageSquare size={23} className="text-rose-500" /></div>
                  <h3 className="text-sm font-bold text-slate-800">This conversation could not be opened</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">{activeConversationError}</p>
                  <button type="button" onClick={() => openConversation(activeId)} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"><RefreshCw size={14} /> Try again</button>
                </div>
              ) : (
              /* EMPTY STATE */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50
                                border border-emerald-100 flex items-center justify-center mb-4 shadow-sm">
                  <MessageSquare size={32} className="text-emerald-600/70" />
                </div>
                <h3 className="text-base font-bold text-slate-700">No conversation selected</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                  Choose a thread from the sidebar or start a new discussion.
                </p>
                <button onClick={() => setShowNewChat(true)}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600
                             text-white text-xs font-bold rounded-lg hover:shadow-lg transition-all">
                  <Plus size={14} />
                  <span>Start Conversation</span>
                </button>
              </div>
              )
            ) : (
              <>
                {/* ═══ CHAT HEADER (fixed, non-scrolling) ═══ */}
                <div className="flex-shrink-0 min-w-0 flex items-center justify-between px-3 sm:px-5 py-3
                                bg-white border-b border-slate-200 z-10">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <button onClick={() => { navigate("/messages", { replace: true }); openConversation(null); setSidebarOpen(true); setShowMobileChat(false) }} aria-label="Back"
                      className="md:hidden -ml-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition">
                      <ArrowLeft size={18} />
                    </button>

                    <Avatar
                      name={safeEndUserName(activeConv.guestName)}
                      src={activeConv.guestAvatar}
                      size="md"
                      online={activeConv.isOnline}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-800 truncate">
                        {convTitle}
                      </p>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-xs text-slate-500 truncate min-w-0">
                          {presenceByConversation[String(activeId)]?.active
                            ? 'Active ' + fmtElapsed(presenceByConversation[String(activeId)]?.activeSince, now)
                            : (presenceByConversation[String(activeId)]?.lastSeenAt
                              ? 'Last seen ' + fmtElapsed(presenceByConversation[String(activeId)]?.lastSeenAt, now)
                              : safeEndUserName(activeConv.guestName))}
                          {activeConv.bookingNumber && (
                            <span className="font-mono bg-slate-100 px-1 rounded ml-1.5 border border-slate-200 text-[10px]">
                              #{activeConv.bookingNumber}
                            </span>
                          )}
                        </p>
                        {userTyping && String(userTyping.convId) === String(activeId) && (
                          <span className="text-[10px] text-emerald-600 font-bold flex-shrink-0">typing…</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={activeConv.status} />
                    <button onClick={handleToggleArchive} title={activeConv.status === 'archived' ? 'Restore conversation' : 'Archive conversation'} aria-label={activeConv.status === 'archived' ? 'Restore conversation' : 'Archive conversation'}
                      className="w-9 h-9 rounded-xl border border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition">
                      {activeConv.status === 'archived' ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    </button>
                    <button onClick={handleDeleteConversation} title="Delete conversation" aria-label="Delete conversation"
                      className="w-9 h-9 rounded-xl border border-rose-100 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/*
                  ═══════════════════════════════════════════════════════════
                  MESSAGE LOG — THE ONLY SCROLLABLE ELEMENT
                  This is the KEY:
                    - flex-1        → takes remaining space
                    - min-h-0       → allows shrinking below content size
                    - overflow-y-auto → enables scroll
                    - overscroll-contain → prevents parent scroll chaining
                  ═══════════════════════════════════════════════════════════
                */}
                <div
                  ref={scrollRef}
                  onScroll={onScroll}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 py-4 bg-white"
                  role="log"
                  aria-live="polite"
                  style={{
                    backgroundColor: '#ffffff',
                  }}
                >
                  {loadingMsgs && messages.length === 0 ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
                          {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-slate-200 mr-2 self-end" />}
                          <div className={`h-10 rounded-2xl ${i % 2 === 0 ? 'bg-slate-200' : 'bg-emerald-100'}`}
                               style={{ width: `${140 + i * 30}px` }} />
                        </div>
                      ))}
                    </div>
                  ) : msgGroups.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm">
                        <Send size={20} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No messages yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Send the first message below.</p>
                    </div>
                  ) : (
                    <>
                      {loadingOlderMessages && (
                    <div className="flex justify-center py-2" aria-live="polite">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
                        <RefreshCw size={12} className="animate-spin" /> Loading earlier messages…
                      </span>
                    </div>
                  )}
                  {hasMoreMessages && !loadingOlderMessages && (
                    <div className="flex justify-center py-2">
                      <button type="button" onClick={loadOlderMessages}
                        className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50">
                        Load earlier messages
                      </button>
                    </div>
                  )}
                  {msgGroups.map(item =>
                        item.type === 'sep' ? (
                          <DateSep key={item.key} label={item.label} />
                        ) : (
                          <MsgBubble
                            key={item.key}
                            message={item.data}
                            mine={isAdminMessage(item.data)}
                            currentUserId={user?.id}
                            guestName={activeConv?.guestName}
                            guestAvatar={activeConv?.guestAvatar}
                            replyTo={item.data.replyToId ? replyMap.get(String(item.data.replyToId)) : null}
                            onReact={toggleReaction}
                            onReply={setReplyToId}
                            now={now}
                            editingId={editingMessageId}
                            editText={editText}
                            setEditText={setEditText}
                            onStartEdit={startEditMessage}
                            onSaveEdit={saveEditMessage}
                            onCancelEdit={() => { setEditingMessageId(null); setEditText("") }}
                            onUnsend={unsendMessage}
                            onPin={(id, value) => setMessageFlag(id, 'pin', value)}
                            onHighlight={(id, value) => setMessageFlag(id, 'highlight', value)}
                            onForward={(message) => setForwardMessage({ ...message, conversationId: activeId })}
                            onCopy={copyMessageText}
                            canModerate={true}
                          />
                        )
                      )}

                      {userTyping && String(userTyping.convId) === String(activeId) && (
                        <div className="pt-1">
                          <TypingDots name={userTyping.name} />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Floating scroll-to-bottom button, kept above the fixed composer */}
                <ScrollBtn
                  visible={showScrollBtn}
                  onClick={() => scrollToBottom(true)}
                  unread={newMsgsWhileScrolled}
                  composerVisible={composerVisible}
                />

                {/*
                  ═══════════════════════════════════════════════════════════
                  COMPOSER — STICKY BOTTOM (like Instagram)
                  flex-shrink-0 ensures it NEVER shrinks or moves
                  It sits below the scrollable log, always visible
                  ═══════════════════════════════════════════════════════════
                */}
                <div className="messages-chat-composer flex-shrink-0 bg-white border-t border-slate-200
                                shadow-[0_-2px_10px_-2px_rgba(0,0,0,0.04)] z-10"
                     aria-label="Message composer">

                  {/* Reply preview */}
                  {replyMsg && (
                    <div className="flex items-center justify-between gap-3 mx-3 sm:mx-5 mt-3 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <CornerUpLeft size={13} className="text-emerald-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                            {isAdminMessage(replyMsg) && String(replyMsg?.senderId ?? replyMsg?.sender_id) === String(user?.id) ? 'Replying to yourself' : `Replying to ${getMessageSenderLabel(replyMsg, { currentUserId: user?.id, guestName: activeConv?.guestName })}`}
                          </span>
                          <span className="text-xs text-slate-600 truncate block">
                            {replyMsg.body}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setReplyToId(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 bg-white hover:bg-slate-100 rounded-md transition flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Input row */}
                  <div className="px-3 sm:px-5 py-3 bg-white min-w-0 w-full max-w-4xl mx-auto">
                    <div className="relative w-full flex items-end gap-2 min-w-0 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm focus-within:border-emerald-400 focus-within:shadow-md transition-all">

                    {/* Emoji button */}
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setShowEmoji(p => !p)}
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
                      placeholder="Write a message…"
                      aria-label="Type a message"
                      className="flex-1 w-0 min-w-0 resize-none text-[14px] px-3.5 sm:px-4 py-2.5 rounded-xl border-0
                                 bg-transparent outline-none leading-relaxed transition-all focus:ring-0 focus:outline-none
                                 placeholder:text-slate-400 break-words"
                      style={{ minHeight: 44, maxHeight: 'min(28dvh, 148px)' }}
                    />
                    {aiSuggestions.length > 0 && (
                      <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 z-30 rounded-xl border border-emerald-100 bg-white p-2 shadow-xl shadow-slate-900/10 sm:left-12" role="group" aria-label="Optional writing suggestions">
                        <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{aiSuggestionLanguage ? "Suggestion · " + aiSuggestionLanguage : "Writing suggestion"}</div>
                        {aiSuggestions.map((suggestion, index) => <button key={index} type="button" onClick={() => { setDraft(suggestion); setAiSuggestions([]); }} className="block w-full rounded-lg px-2 py-2 text-left text-xs leading-relaxed text-slate-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{suggestion}</button>)}
                        <button type="button" onClick={() => setAiSuggestions([])} className="mt-1 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700">Dismiss</button>
                      </div>
                    )}

                    {/* Send button */}
                    <button onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      aria-label="Send"
                      className="h-10 w-10 sm:w-auto sm:px-4 rounded-xl flex-shrink-0 flex items-center justify-center gap-1.5
                                 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs
                                 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all
                                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none">
                      {sending ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      <span className="hidden sm:inline">Send</span>
                    </button>
                    </div>
                  </div>

                  {/* Shortcut hint */}
                  <p className="hidden sm:block text-center text-[10px] text-slate-300 font-semibold uppercase tracking-wider pb-2 select-none">
                    Enter to send · Shift+Enter for new line · Esc to cancel reply · Ctrl/⌘+K search · Ctrl/⌘+N new chat
                  </p>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      <ConfirmDialog
        isOpen={clearConfirm.open}
        onClose={() => setClearConfirm({ open: false })}
        onConfirm={handleClearAll}
        type="delete"
        title="Purge messaging logs?"
        description="This will permanently delete all conversations, messages, reactions, and related data. This action is irreversible."
        confirmLabel="Purge All Records"
        loading={clearing}
      />
    </>
  )
}