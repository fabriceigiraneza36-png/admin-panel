/**
 * Chat.jsx — Admin messaging interface
 * Defensive: every array access guarded with ?? [] so .length never throws
 */

import React, {
  useState, useEffect, useRef,
  useCallback, useMemo,
} from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Search, Plus, X, Check, MessageSquare } from 'lucide-react'
import { useChatContext } from '../context/ChatContext'
import { useSocketContext } from '../context/SocketContext'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import Pagination from '@components/common/Pagination'

const TYPING_TIMEOUT = 3_000
const PAGE_SIZE      = 20

// ─── Safe array guard ──────────────────────────────────────────────────────────
const sa = (v) => (Array.isArray(v) ? v : [])

// ═══════════════════════════════════════════════════════════════════════════════
// START CONVERSATION MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const StartConversationModal = React.memo(({
  onClose,
  allUsers,
  isLoadingAllUsers,
  onStart,
}) => {
  const [userSearch,   setUserSearch]   = useState('')
  const [pickedUser,   setPickedUser]   = useState(null)
  const [firstMessage, setFirstMessage] = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  const safeUsers = sa(allUsers)

  const filtered = useMemo(() => {
    if (!userSearch.trim()) return safeUsers
    const q = userSearch.toLowerCase()
    return safeUsers.filter((u) =>
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.email     ?? '').toLowerCase().includes(q),
    )
  }, [safeUsers, userSearch])

  const handleSubmit = async () => {
    if (!pickedUser || submitting) return
    setSubmitting(true)
    try {
      await onStart(pickedUser, firstMessage)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md
                      flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-800">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Picked user chip */}
          {pickedUser && (
            <div className="flex items-center gap-2 bg-emerald-50 border
                            border-emerald-200 rounded-lg px-3 py-2">
              <img
                src={
                  pickedUser.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    pickedUser.full_name || pickedUser.email || 'U',
                  )}&background=059669&color=fff`
                }
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-sm text-emerald-700 flex-1 truncate">
                {pickedUser.full_name || pickedUser.email}
              </span>
              <button
                onClick={() => setPickedUser(null)}
                className="flex-shrink-0"
              >
                <X size={14} className="text-emerald-500" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200
                         rounded-lg focus:outline-none focus:ring-2
                         focus:ring-emerald-500"
            />
          </div>

          {/* User list */}
          <div className="rounded-lg border border-gray-100 overflow-hidden
                          max-h-56 overflow-y-auto">
            {isLoadingAllUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6
                                border-b-2 border-emerald-500" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">
                {userSearch ? 'No users match your search' : 'No users found'}
              </p>
            ) : (
              filtered.map((user) => {
                const isPicked = pickedUser?.id === user.id
                return (
                  <button
                    key={user.id}
                    onClick={() => setPickedUser(isPicked ? null : user)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5
                      text-left transition-colors border-b border-gray-50
                      last:border-0
                      ${isPicked ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                  >
                    <img
                      src={
                        user.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.full_name || user.email || 'U',
                        )}&background=059669&color=fff`
                      }
                      alt=""
                      className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                      onError={(e) => {
                        e.target.src =
                          'https://ui-avatars.com/api/?name=U&background=059669&color=fff'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {user.full_name || 'No name'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    {isPicked && (
                      <Check size={16} className="text-emerald-500 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Optional first message */}
          <textarea
            placeholder="Optional first message…"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2
                       text-sm resize-none focus:outline-none focus:ring-2
                       focus:ring-emerald-500"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!pickedUser || submitting}
            className="flex-1 py-2.5 text-sm text-white bg-emerald-500 rounded-lg
                       hover:bg-emerald-600 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? 'Starting…' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  )
})

StartConversationModal.displayName = 'StartConversationModal'

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION LIST ITEM
// ═══════════════════════════════════════════════════════════════════════════════

const SessionListItem = React.memo(({ session, isSelected, onSelect }) => {
  const name   = session.userFullName
    ?? session.userName
    ?? session.user?.full_name
    ?? 'Guest User'

  const email  = session.userEmail ?? session.user?.email ?? ''
  const avatar = session.userAvatar ?? session.user?.avatar_url ?? null
  const lastMsg = session.lastMessage ?? ''
  const lastAt  = session.lastMessageAt ?? session.updatedAt ?? null
  const unread  = Number(session.unreadCount ?? session.unreadAdmin ?? 0)
  const status  = session.status ?? 'open'

  return (
    <button
      onClick={() => onSelect(session)}
      className={`w-full text-left px-4 py-3 transition-colors border-b
        border-gray-100 hover:bg-gray-50
        ${isSelected
          ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
          : 'border-l-4 border-l-transparent'}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={
              avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`
            }
            alt={name}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              e.target.src =
                'https://ui-avatars.com/api/?name=U&background=059669&color=fff'
            }}
          />
          {status === 'open' && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400
                             border-2 border-white rounded-full" />
          )}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500
                             text-white text-xs rounded-full flex items-center
                             justify-center font-medium leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline gap-1">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {name}
            </h3>
            {lastAt && (
              <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                {formatDistanceToNow(new Date(lastAt), { addSuffix: true })}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center gap-1">
            <p className="text-xs text-gray-500 truncate">
              {lastMsg || email || 'No messages yet'}
            </p>
            {status === 'closed' && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5
                               rounded flex-shrink-0">
                Closed
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
})

SessionListItem.displayName = 'SessionListItem'

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT HEADER
// ═══════════════════════════════════════════════════════════════════════════════

const ChatHeader = React.memo(({ session, onClose }) => {
  const name   = session?.userFullName
    ?? session?.userName
    ?? session?.user?.full_name
    ?? 'Guest User'

  const email  = session?.userEmail ?? session?.user?.email ?? ''
  const avatar = session?.userAvatar ?? session?.user?.avatar_url ?? null

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200
                    bg-white flex-shrink-0">
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden
                   flex-shrink-0 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none"
          stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <img
        src={
          avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`
        }
        alt={name}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        onError={(e) => {
          e.target.src =
            'https://ui-avatars.com/api/?name=U&background=059669&color=fff'
        }}
      />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-gray-900 truncate">{name}</h3>
        {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
      </div>

      <span className="flex-shrink-0 text-xs text-green-500 font-medium">
        ● Live
      </span>
    </div>
  )
})

ChatHeader.displayName = 'ChatHeader'

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHAT PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const Chat = () => {
  const toast = useToast()
  const {
    sessions:          rawSessions,
    isLoadingSessions,
    allUsers:          rawAllUsers,
    isLoadingAllUsers,
    selectedSession,
    messages:          rawMessages,
    isLoading,
    typingUsers,
    selectSession,
    closeSession,
    sendMessage,
    startSessionWithUser,
    fetchAllUsers,
  } = useChatContext()

  // ── Defensive: guarantee arrays even if context value is momentarily undefined
  const sessions = sa(rawSessions)
  const allUsers = sa(rawAllUsers)
  const messages = sa(rawMessages)

  const { socket, isConnected } = useSocketContext()

  // ── Local state ───────────────────────────────────────────────────────────
  const [newMessage,   setNewMessage]   = useState('')
  const [showSidebar,  setShowSidebar]  = useState(true)
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [showModal,    setShowModal]    = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const debouncedSearch  = useDebounce(search, 300)
  const messagesEndRef   = useRef(null)
  const typingTimeoutRef = useRef(null)
  const textareaRef      = useRef(null)

  // Reset page on filter/search change
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  // Load users when modal opens
  useEffect(() => {
    if (showModal && allUsers.length === 0) fetchAllUsers()
  }, [showModal, allUsers.length, fetchAllUsers])

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let list = sessions   // already a safe array

    if (statusFilter !== 'all') {
      list = list.filter((s) => (s.status ?? 'open') === statusFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter((s) =>
        (s.userFullName ?? s.userName ?? s.user?.full_name ?? '')
          .toLowerCase().includes(q) ||
        (s.userEmail ?? s.user?.email ?? '')
          .toLowerCase().includes(q) ||
        (s.lastMessage ?? '').toLowerCase().includes(q),
      )
    }

    return list
  }, [sessions, debouncedSearch, statusFilter])

  const totalPages    = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const safePage      = Math.min(page, totalPages)
  const pagedSessions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredSessions.slice(start, start + PAGE_SIZE)
  }, [filteredSessions, safePage])

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages.length, scrollToBottom])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectSession = useCallback((session) => {
    selectSession(session)
    setShowSidebar(false)
  }, [selectSession])

  const handleClose = useCallback(() => {
    closeSession()
    setShowSidebar(true)
  }, [closeSession])

  const handleSend = useCallback((e) => {
    e?.preventDefault()
    if (!newMessage.trim()) return
    sendMessage(newMessage)
    setNewMessage('')
    textareaRef.current?.focus()
  }, [newMessage, sendMessage])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleTyping = useCallback(() => {
    const sessId = selectedSession?.sessionId ?? selectedSession?.id
    if (!socket || !isConnected || !sessId) return
    socket.emit('msg:typing', { sessionId: sessId, isTyping: true })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('msg:typing', { sessionId: sessId, isTyping: false })
    }, TYPING_TIMEOUT)
  }, [socket, isConnected, selectedSession])

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), [])

  const someoneTyping = Object.values(typingUsers ?? {}).some(Boolean)
  const isClosed      = selectedSession?.status === 'closed'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex h-[calc(100vh-64px)] bg-gray-50 rounded-xl
                      overflow-hidden border border-gray-200 shadow-sm">

        {/* ══════════════════════════════════════════════════════════════════
            SIDEBAR
        ══════════════════════════════════════════════════════════════════ */}
        <aside
          className={`w-full lg:w-80 border-r border-gray-200 bg-white
            flex flex-col flex-shrink-0
            ${showSidebar ? 'flex' : 'hidden lg:flex'}`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200
                          flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Live Chat
                </h2>
                <p className="text-xs text-gray-400">
                  {filteredSessions.length} session
                  {filteredSessions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {isConnected
                    ? <span className="text-green-500 font-medium">● Live</span>
                    : <span className="text-amber-500 font-medium">● Offline</span>}
                </span>
                <button
                  onClick={() => setShowModal(true)}
                  title="Start new conversation"
                  className="p-1.5 bg-emerald-500 hover:bg-emerald-600
                             text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search sessions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200
                           rounded-lg focus:outline-none focus:ring-2
                           focus:ring-emerald-500 bg-gray-50"
              />
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {['all', 'open', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md
                    transition-colors capitalize
                    ${statusFilter === s
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingSessions ? (
              <div className="flex flex-col items-center justify-center
                              py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8
                                border-b-2 border-emerald-500" />
                <p className="text-xs text-gray-400">Loading sessions…</p>
              </div>
            ) : pagedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center
                              py-16 px-6 text-center">
                <MessageSquare size={40} className="text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  {search || statusFilter !== 'all'
                    ? 'No matching sessions'
                    : 'No sessions yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {search
                    ? 'Try a different search'
                    : 'Start a conversation with a registered user'}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-3 text-xs text-emerald-600
                               hover:text-emerald-700 font-medium"
                  >
                    + New Conversation
                  </button>
                )}
              </div>
            ) : (
              pagedSessions.map((session) => {
                const sessId = session.sessionId ?? session.id ?? session._id
                const selId  = selectedSession?.sessionId ?? selectedSession?.id
                return (
                  <SessionListItem
                    key={String(sessId)}
                    session={session}
                    isSelected={String(sessId) === String(selId)}
                    onSelect={handleSelectSession}
                  />
                )
              })
            )}
          </div>

          {/* Pagination */}
          {!isLoadingSessions && totalPages > 1 && (
            <div className="border-t border-gray-100 p-2 flex-shrink-0">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={filteredSessions.length}
                limit={PAGE_SIZE}
                hasNext={safePage < totalPages}
                hasPrev={safePage > 1}
                onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
                onPrev={() => setPage((p) => Math.max(p - 1, 1))}
                onGoTo={(p) => setPage(Math.max(1, Math.min(p, totalPages)))}
                showPageSize={false}
              />
            </div>
          )}
        </aside>

        {/* ══════════════════════════════════════════════════════════════════
            CHAT AREA
        ══════════════════════════════════════════════════════════════════ */}
        <main
          className={`flex-1 flex flex-col min-w-0
            ${!showSidebar ? 'flex' : 'hidden lg:flex'}`}
        >
          {selectedSession ? (
            <>
              <ChatHeader session={selectedSession} onClose={handleClose} />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8
                                    border-b-2 border-emerald-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center
                                  h-full text-center">
                    <MessageSquare size={56} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No messages yet</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Send the first message below
                    </p>
                  </div>
                 ) : (
                   messages.map((msg) => {
                     const isOwn =
                       msg.senderType === 'admin' ||
                       msg.sender_type === 'admin' ||
                       msg.isAdmin === true ||
                       msg.role === 'admin'
                     return (
                       <ChatMessage
                         key={msg.id ?? msg._id ?? msg.messageId}
                         message={msg}
                         isOwn={isOwn}
                         onReply={(m) => {
                           const sessId = selectedSession?.sessionId ?? selectedSession?.id
                           if (sessId) {
                             const replyText = `Replying to: ${m.body?.substring(0, 50)}…\n\n`
                             setNewMessage(replyText)
                             textareaRef.current?.focus()
                           }
                         }}
                         onDelete={async () => {
                           // Optional: implement message deletion via API
                           toast.info('Message deletion not implemented')
                         }}
                         showActions={true}
                       />
                     )
                   })
                 )}

                {someoneTyping && (
                  <div className="flex items-center gap-2 pl-2 py-1">
                    <div className="bg-white border border-gray-200 rounded-2xl
                                    rounded-bl-sm px-4 py-2.5 shadow-sm">
                      <div className="flex gap-1 items-center">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">typing…</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {!isClosed ? (
                <form
                  onSubmit={handleSend}
                  className="border-t border-gray-200 p-4 bg-white flex-shrink-0"
                >
                  <div className="flex gap-3 items-end">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        handleTyping()
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message… (Enter sends, Shift+Enter = new line)"
                      rows={1}
                      className="flex-1 resize-none border border-gray-300 rounded-xl
                                 px-4 py-2.5 text-sm focus:outline-none focus:ring-2
                                 focus:ring-emerald-500 focus:border-transparent
                                 max-h-32 overflow-y-auto"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="p-2.5 bg-emerald-500 text-white rounded-xl
                                 hover:bg-emerald-600 disabled:opacity-40
                                 disabled:cursor-not-allowed transition-colors
                                 flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border-t border-gray-200 p-4 bg-gray-50
                                flex-shrink-0 text-center">
                  <p className="text-sm text-gray-500">This session is closed.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center px-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center
                                justify-center mx-auto mb-5">
                  <MessageSquare size={36} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Select a session
                </h3>
                <p className="text-gray-400 text-sm mb-5">
                  Choose from the sidebar or start a new conversation
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5
                             bg-emerald-500 text-white rounded-xl
                             hover:bg-emerald-600 transition-colors
                             text-sm font-medium"
                >
                  <Plus size={16} />
                  New Conversation
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <StartConversationModal
          onClose={() => setShowModal(false)}
          allUsers={allUsers}
          isLoadingAllUsers={isLoadingAllUsers}
          onStart={startSessionWithUser}
        />
      )}
    </>
  )
}

export default Chat;