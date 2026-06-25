/**
 * ChatWindow.jsx
 * Lifted input bar, rich emoji picker, fully responsive — green/white theme
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
} from 'react'
import {
  Send,
  ArrowLeft,
  CheckCheck,
  Loader2,
  MessageSquare,
  WifiOff,
  XCircle,
  CheckCircle,
  ChevronDown,
  Smile,
  X,
} from 'lucide-react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import ChatEmojiPicker from './ChatEmojiPicke.jsx'

const safeArr = (v) => (Array.isArray(v) ? v : [])

// ── Helpers ───────────────────────────────────────────────────────────────────
const avatarUrl = (name, email, url) => {
  if (url) return url
  const label = encodeURIComponent(name || email || 'U')
  return `https://ui-avatars.com/api/?name=${label}&background=16a34a&color=fff&bold=true`
}

const formatMessageTime = (ts) => {
  if (!ts) return ''
  try {
    return format(new Date(ts), 'HH:mm')
  } catch {
    return ''
  }
}

const formatDateSeparator = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, MMMM d')
}

const withDateSeparators = (messages) => {
  const result = []
  let lastDate = null
  for (const m of messages) {
    const d = m.createdAt ? new Date(m.createdAt) : null
    if (d && (!lastDate || !isSameDay(d, lastDate))) {
      result.push({ __isSeparator: true, ts: m.createdAt, id: `sep_${m.createdAt}` })
      lastDate = d
    }
    result.push(m)
  }
  return result
}

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingBubble = memo(() => (
  <div className="flex items-end justify-start gap-2 px-3 py-1 sm:px-4">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">
      S
    </div>
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-green-100 bg-green-50 px-3 py-2.5 shadow-sm">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-400"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  </div>
))
TypingBubble.displayName = 'TypingBubble'

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = memo(({ message }) => {
  const isAdmin = message.senderType === 'admin'
  const isOptimistic = message.isOptimistic
  const time = formatMessageTime(message.createdAt)

  return (
    <div
      className={`group flex items-end gap-2 px-3 py-0.5 sm:px-4 ${
        isAdmin ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isAdmin && (
        <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">
          {(message.senderName || 'U').charAt(0).toUpperCase()}
        </div>
      )}

      <div
        className={`flex min-w-0 max-w-[88%] flex-col sm:max-w-[76%] lg:max-w-[62%] ${
          isAdmin ? 'items-end' : 'items-start'
        }`}
      >
        {!isAdmin && message.senderName && (
          <p className="mb-1 ml-1 truncate text-[10px] font-medium text-green-400">
            {message.senderName}
          </p>
        )}

        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
            isAdmin
              ? `rounded-tr-sm bg-gradient-to-br from-green-600 to-green-700 text-white ${
                  isOptimistic ? 'opacity-60' : ''
                }`
              : 'rounded-tl-sm border border-green-100 bg-white text-gray-800'
          }`}
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {message.body}
        </div>

        <div
          className={`mt-0.5 flex items-center gap-1 px-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
            isAdmin ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-[10px] text-green-300">{time}</span>
          {isAdmin && (
            isOptimistic ? (
              <Loader2 size={10} className="animate-spin text-green-300" />
            ) : (
              <CheckCheck
                size={10}
                className={message.isRead ? 'text-green-400' : 'text-green-200'}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
})
MessageBubble.displayName = 'MessageBubble'

// ── Date separator ────────────────────────────────────────────────────────────
const DateSeparator = memo(({ ts }) => (
  <div className="my-2 flex items-center gap-3 px-4 py-1">
    <div className="h-px flex-1 bg-green-100" />
    <span className="whitespace-nowrap rounded-full border border-green-100 bg-green-50 px-2.5 py-0.5 text-[10px] font-medium text-green-400">
      {formatDateSeparator(ts)}
    </span>
    <div className="h-px flex-1 bg-green-100" />
  </div>
))
DateSeparator.displayName = 'DateSeparator'

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyMessages = ({ session }) => (
  <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-100 bg-green-50">
      <MessageSquare size={28} className="text-green-300" />
    </div>
    <p className="text-sm font-semibold text-green-500">
      {session ? 'No messages yet' : 'Select a conversation'}
    </p>
    <p className="mt-1.5 max-w-52 text-xs text-green-300">
      {session
        ? 'Send a message to start the conversation'
        : 'Choose a conversation from the sidebar to get started'}
    </p>
  </div>
)

// ── Scroll button ─────────────────────────────────────────────────────────────
const ScrollButton = ({ onClick, visible }) => (
  <button
    onClick={onClick}
    type="button"
    className={`absolute right-4 z-20 rounded-full border border-green-200 bg-white p-2 text-green-500 shadow-lg transition-all duration-300 sm:right-5 ${
      visible
        ? 'pointer-events-auto translate-y-0 opacity-100'
        : 'pointer-events-none translate-y-3 opacity-0'
    }`}
    style={{ bottom: '8px' }}
  >
    <ChevronDown size={16} />
  </button>
)

// ═══════════════════════════════════════════════════════════════════════════════
// Main ChatWindow
// ═══════════════════════════════════════════════════════════════════════════════
export default function ChatWindow({
  session,
  messages,
  onSend,
  onBack,
  onToggleStatus,
  isConnected,
  isLoading,
  isSending,
  typingUsers = {},
}) {
  const [input, setInput] = useState('')
  const [showScroll, setShowScroll] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const emojiRef = useRef(null)
  const atBottomRef = useRef(true)

  const msgs = safeArr(messages)
  const withSeps = withDateSeparators(msgs)
  const isTyping = Object.values(typingUsers).some(Boolean)
  const sessionOpen = (session?.status || 'open') === 'open'

  // ── Input auto-resize ─────────────────────────────────────────────────────
  const resizeInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const resetInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '44px'
    setInput('')
  }, [])

  // ── Scroll management ─────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = dist < 80
    setShowScroll(dist > 240)
  }, [])

  useEffect(() => {
    if (atBottomRef.current) scrollToBottom()
  }, [msgs.length, isTyping, scrollToBottom])

  useEffect(() => {
    if (session) {
      atBottomRef.current = true
      const t = setTimeout(() => scrollToBottom(false), 40)
      return () => clearTimeout(t)
    }
  }, [session?.sessionId, scrollToBottom])

  useEffect(() => {
    resetInput()
    setShowEmoji(false)
  }, [session?.sessionId, resetInput])

  // ── Close emoji on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isSending || !sessionOpen) return
    resetInput()
    setShowEmoji(false)
    await onSend(text)
    inputRef.current?.focus()
    scrollToBottom()
  }, [input, isSending, sessionOpen, onSend, scrollToBottom, resetInput])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // ── Emoji select ──────────────────────────────────────────────────────────
  const handleEmojiSelect = useCallback((emoji) => {
    const el = inputRef.current
    if (el) {
      const start = el.selectionStart ?? input.length
      const end = el.selectionEnd ?? input.length
      const newVal = input.slice(0, start) + emoji + input.slice(end)
      setInput(newVal)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + emoji.length, start + emoji.length)
        resizeInput()
      })
    } else {
      setInput((prev) => prev + emoji)
    }
    setShowEmoji(false)
  }, [input, resizeInput])

  // ── No session ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden bg-green-50/30">
        <div className="space-y-3 px-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-green-100 bg-white shadow-sm">
            <MessageSquare size={32} className="text-green-200" />
          </div>
          <p className="text-sm font-semibold text-green-400">
            No conversation selected
          </p>
          <p className="text-xs text-green-300">
            Pick one from the sidebar to start chatting
          </p>
        </div>
      </div>
    )
  }

  const name = session.full_name || session.email || 'User'
  const email = session.email || ''

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-green-100 bg-white px-3 py-3 shadow-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Mobile back */}
          <button
            onClick={onBack}
            className="shrink-0 rounded-xl p-1.5 text-green-400 transition-colors hover:bg-green-50 lg:hidden"
            type="button"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={avatarUrl(name, email, session.avatar)}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-green-100"
              onError={(e) => {
                e.currentTarget.src = avatarUrl(name, email)
              }}
            />
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                sessionOpen ? 'bg-green-400' : 'bg-gray-300'
              }`}
            />
          </div>

          {/* Name */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-green-900">{name}</p>
            <p className="truncate text-xs text-green-400">
              <span className="hidden sm:inline">{email}</span>
              <span className="sm:hidden">
                {email.length > 22 ? email.slice(0, 22) + '…' : email}
              </span>
              {isTyping && (
                <span className="font-medium text-green-500"> · typing…</span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {!isConnected && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-600">
                <WifiOff size={10} />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}

            <button
              onClick={onToggleStatus}
              title={sessionOpen ? 'Close session' : 'Reopen session'}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                sessionOpen
                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              }`}
              type="button"
            >
              {sessionOpen ? <XCircle size={13} /> : <CheckCircle size={13} />}
              <span className="hidden sm:inline">
                {sessionOpen ? 'Close' : 'Reopen'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overflow-x-hidden overscroll-contain py-3 sm:py-4"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 80% 0%, rgba(220,252,231,0.4) 0%, transparent 55%)',
            scrollbarWidth: 'thin',
            scrollbarColor: '#bbf7d0 transparent',
          }}
        >
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 size={24} className="animate-spin text-green-400" />
              <p className="text-xs text-green-400">Loading messages…</p>
            </div>
          ) : msgs.length === 0 ? (
            <EmptyMessages session={session} />
          ) : (
            <>
              {withSeps.map((item) =>
                item.__isSeparator ? (
                  <DateSeparator key={item.id} ts={item.ts} />
                ) : (
                  <MessageBubble
                    key={item.id ?? `${item.senderType}-${item.createdAt}`}
                    message={item}
                  />
                ),
              )}
              {isTyping && <TypingBubble />}
              <div className="h-2" />
            </>
          )}
        </div>

        {/* Scroll to bottom */}
        <div className="absolute bottom-2 right-4 z-20 sm:right-5">
          <button
            onClick={() => scrollToBottom()}
            type="button"
            className={`flex items-center justify-center rounded-full border border-green-200 bg-white p-2 text-green-500 shadow-lg transition-all duration-300 ${
              showScroll
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-2 opacity-0'
            }`}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* ── Input bar — lifted, never hidden ─────────────────────────────── */}
      <div className="shrink-0 border-t border-green-100 bg-white">
        {/* Closed session state */}
        {!sessionOpen ? (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-4 text-sm text-green-400">
            <XCircle size={15} className="text-green-200" />
            <span>This conversation is closed.</span>
            <button
              onClick={onToggleStatus}
              className="font-semibold text-green-600 underline-offset-2 hover:underline"
              type="button"
            >
              Reopen?
            </button>
          </div>
        ) : (
          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
            {/* Emoji picker — opens upward */}
            {showEmoji && (
              <div
                ref={emojiRef}
                className="mb-2 flex justify-start"
              >
                <div
                  className="shadow-2xl"
                  style={{ filter: 'drop-shadow(0 -4px 24px rgba(22,163,74,0.10))' }}
                >
                  <ChatEmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              </div>
            )}

            {/* Input container */}
            <div className="flex items-end gap-2 rounded-2xl border border-green-200 bg-green-50 px-3 py-2 transition-all duration-200 focus-within:border-green-400 focus-within:bg-white focus-within:shadow-md focus-within:shadow-green-100">
              {/* Emoji toggle */}
              <button
                onClick={() => setShowEmoji((v) => !v)}
                type="button"
                className={`mb-0.5 shrink-0 rounded-xl p-1.5 transition-all duration-150 ${
                  showEmoji
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-green-400 hover:bg-green-100 hover:text-green-600'
                }`}
                title="Emoji"
              >
                <Smile size={18} />
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  resizeInput()
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isConnected
                    ? 'Type a message…'
                    : 'Reconnecting…'
                }
                disabled={!isConnected && !isSending}
                className="min-h-[44px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed text-green-900 placeholder:text-green-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  overflowWrap: 'anywhere',
                  scrollbarWidth: 'none',
                }}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                  input.trim() && !isSending
                    ? 'bg-green-600 text-white shadow-sm shadow-green-200 hover:bg-green-700 hover:shadow-md active:scale-95'
                    : 'bg-green-100 text-green-300 cursor-not-allowed'
                }`}
                type="button"
              >
                {isSending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>

            {/* Hint */}
            <p className="mt-1.5 hidden text-center text-[10px] text-green-300 sm:block">
              <kbd className="rounded border border-green-200 bg-green-50 px-1 py-0.5 text-[9px] font-medium text-green-500">
                Enter
              </kbd>{' '}
              to send ·{' '}
              <kbd className="rounded border border-green-200 bg-green-50 px-1 py-0.5 text-[9px] font-medium text-green-500">
                Shift+Enter
              </kbd>{' '}
              for new line
            </p>
          </div>
        )}
      </div>
    </div>
  )
}