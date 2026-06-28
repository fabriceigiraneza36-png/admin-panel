/**
 * ChatContext.jsx v3.0
 *
 * - Unified socket event names matching the server (msg:message, msg:read, etc.)
 * - Clean session/message normalization pipeline
 * - Optimistic message UI with rollback on failure
 * - Unread badge tracking
 * - Smart polling: fast when disconnected, slow when socket is live
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react'
import { toast } from 'react-hot-toast'
import { useSocketContext } from './SocketContext'
import apiClient from '@api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_KEYS = [
  import.meta.env.VITE_TOKEN_KEY,
  'altuvera_admin_token',
  'adminToken',
  'admin_token',
  'authToken',
  'token',
].filter(Boolean)

const POLL_CONNECTED    = 45_000   // when socket is live, poll as backup
const POLL_DISCONNECTED = 8_000    // when offline, poll aggressively

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getToken = () => {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k)
      if (v) return v
    }
  } catch {}
  return null
}

const isAuthed = () => Boolean(getToken())
const is401    = (err) => err?.response?.status === 401
const safeArr  = (v) => (Array.isArray(v) ? v : [])

const friendlyError = (err) => {
  const s = err?.response?.status
  if (s === 401) return 'Not authorized — please log in'
  if (s === 403) return 'Access denied'
  if (s === 404) return 'Not found'
  if (s >= 500)  return 'Server error — please try again'
  return err?.message || 'Something went wrong'
}

const dedupeById = (arr) => {
  const seen = new Set()
  return safeArr(arr).filter((item) => {
    const key =
      item?.id       ??
      item?.sessionId ??
      item?._id      ??
      JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const extractList = (data) => {
  if (Array.isArray(data))            return data
  if (Array.isArray(data?.data))      return data.data
  if (Array.isArray(data?.sessions))  return data.sessions
  if (Array.isArray(data?.messages))  return data.messages
  if (Array.isArray(data?.users))     return data.users
  return []
}

/** Normalize a raw session row from the API */
const normSession = (s) => {
  if (!s) return null
  return {
    ...s,
    // Stable ID field — always use sessionId
    sessionId:      s.sessionId      ?? s.session_id ?? s.id ?? s._id,
    // Display fields
    full_name:      s.fullName       ?? s.full_name      ?? s.userFullName  ?? s.user?.full_name ?? '',
    email:          s.email          ?? s.userEmail      ?? s.user?.email   ?? '',
    avatar:         s.userAvatar     ?? s.avatar_url     ?? s.user?.avatar_url ?? null,
    status:         s.status         ?? 'open',
    lastMessage:    s.lastMessage    ?? s.last_message   ?? '',
    lastMessageAt:  s.lastMessageAt  ?? s.last_message_at ?? s.lastActive ?? s.last_active ?? null,
    unreadCount:    parseInt(s.unreadCount ?? s.unread_count ?? 0, 10),
  }
}

/** Normalize a raw message row from the API */
const normMessage = (m) => {
  if (!m) return null
  return {
    ...m,
    id:         m.id         ?? m._id,
    sessionId:  m.sessionId  ?? m.session_id,
    body:       m.body       ?? m.content ?? m.message ?? '',
    senderType: m.senderType ?? m.sender_type,
    senderName: m.senderName ?? m.sender_name ?? '',
    createdAt:  m.createdAt  ?? m.created_at,
    isRead:     m.isRead     ?? m.is_read     ?? false,
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const DEFAULT_CTX = {
  sessions:             [],
  isLoadingSessions:    true,
  allUsers:             [],
  isLoadingAllUsers:    false,
  selectedSession:      null,
  messages:             [],
  isLoadingMessages:    false,
  isSending:            false,
  typingUsers:          {},
  unreadTotal:          0,
  error:                null,
  selectSession:        async () => {},
  closeSession:         () => {},
  sendMessage:          async () => false,
  startSessionWithUser: async () => null,
  fetchAllUsers:        async () => {},
  refreshSessions:      async () => {},
  markSessionRead:      async () => {},
  updateSessionStatus:  async () => {},
}

export const ChatContext = createContext(DEFAULT_CTX)

export const useChatContext = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be inside <ChatProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ChatProvider({ children }) {
  const { socket, isConnected } = useSocketContext()

  // ── State ────────────────────────────────────────────────────────────────
  const [sessions,           setSessions]           = useState([])
  const [allUsers,           setAllUsers]           = useState([])
  const [selectedSession,    setSelectedSession]    = useState(null)
  const [messages,           setMessages]           = useState([])
  const [isLoadingSessions,  setIsLoadingSessions]  = useState(true)
  const [isLoadingMessages,  setIsLoadingMessages]  = useState(false)
  const [isLoadingAllUsers,  setIsLoadingAllUsers]  = useState(false)
  const [isSending,          setIsSending]          = useState(false)
  const [typingUsers,        setTypingUsers]        = useState({})
  const [error,              setError]              = useState(null)

  // ── Refs ─────────────────────────────────────────────────────────────────
  const mounted         = useRef(true)
  const selectedRef     = useRef(null)
  const connectedRef    = useRef(false)
  const pollTimer       = useRef(null)
  const typingTimers    = useRef({})
  const fetchingUsers   = useRef(false)
  const fetchingSessions = useRef(false)

  useEffect(() => { selectedRef.current = selectedSession }, [selectedSession])
  useEffect(() => { connectedRef.current = isConnected },   [isConnected])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const unreadTotal = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0),
    [sessions],
  )

  // ── Session list ──────────────────────────────────────────────────────────

  const refreshSessions = useCallback(async (quiet = false) => {
    if (!mounted.current || !isAuthed() || fetchingSessions.current) return
    fetchingSessions.current = true

    try {
      const { data } = await apiClient.get('/chat/sessions')
      if (!mounted.current) return

      const normalized = dedupeById(extractList(data).map(normSession))
      setSessions(normalized)
      setError(null)
    } catch (err) {
      if (!mounted.current || is401(err)) return
      const msg = friendlyError(err)
      if (!quiet) {
        setError(msg)
        toast.error(msg)
      }
    } finally {
      fetchingSessions.current = false
      if (mounted.current) setIsLoadingSessions(false)
    }
  }, [])

  // ── Users ─────────────────────────────────────────────────────────────────

  const fetchAllUsers = useCallback(async () => {
    if (!isAuthed() || fetchingUsers.current) return
    fetchingUsers.current = true
    setIsLoadingAllUsers(true)

    try {
      const { data } = await apiClient.get('/users', { params: { limit: 500 } })
      if (!mounted.current) return
      setAllUsers(dedupeById(extractList(data)))
    } catch (err) {
      if (!is401(err)) toast.error('Could not load user list')
    } finally {
      fetchingUsers.current = false
      if (mounted.current) setIsLoadingAllUsers(false)
    }
  }, [])

  // ── Select session (load messages) ────────────────────────────────────────

  const selectSession = useCallback(async (session) => {
    if (!session || !mounted.current || !isAuthed()) return

    const sessionId =
      session?.sessionId ?? session?.session_id ?? session?.id ?? session?._id

    if (!sessionId) return

    // Already selected → no-op
    if (selectedRef.current?.sessionId === sessionId) return

    setIsLoadingMessages(true)
    setError(null)
    setMessages([])
    setTypingUsers({})

    try {
      // GET /chat/sessions/:sessionId  → { success, data: { session, messages } }
      const { data } = await apiClient.get(`/chat/sessions/${sessionId}`)
      if (!mounted.current) return

      const raw     = data?.data ?? data
      const rawSess = raw?.session ?? raw
      const rawMsgs = raw?.messages ?? []

      const normalizedSession  = normSession({ ...session, ...rawSess })
      const normalizedMessages = dedupeById(safeArr(rawMsgs).map(normMessage))

      setSelectedSession(normalizedSession)
      setMessages(normalizedMessages)

      // Clear unread badge locally
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === sessionId ? { ...s, unreadCount: 0 } : s,
        ),
      )

      // Join socket room
      if (socket && connectedRef.current) {
        socket.emit('admin:join-session', { sessionId })
      }

      // Mark server-side as read (non-blocking)
      apiClient
        .patch(`/chat/sessions/${sessionId}/read`)
        .catch(() => {})
    } catch (err) {
      if (!mounted.current || is401(err)) return
      const msg = friendlyError(err)
      setError(msg)
      toast.error('Failed to load conversation')
    } finally {
      if (mounted.current) setIsLoadingMessages(false)
    }
  }, [socket])

  // ── Close session ─────────────────────────────────────────────────────────

  const closeSession = useCallback(() => {
    setSelectedSession(null)
    setMessages([])
    setTypingUsers({})
    setError(null)
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (body) => {
    const trimmed   = (body || '').trim()
    const session   = selectedRef.current
    const sessionId = session?.sessionId ?? session?.session_id ?? session?.id

    if (!trimmed || !sessionId || !isAuthed()) return false

    // Optimistic message
    const optimisticId = `opt_${Date.now()}`
    const optimistic = normMessage({
      id:         optimisticId,
      sessionId,
      body:       trimmed,
      senderType: 'admin',
      senderName: 'You',
      createdAt:  new Date().toISOString(),
      isOptimistic: true,
    })

    setMessages((prev) => [...prev, optimistic])
    setIsSending(true)

    // ── Prefer socket ────────────────────────────────────────────────────────
    if (socket && connectedRef.current) {
      socket.emit('admin:send-message', { sessionId, body: trimmed })
      // The echoed response will arrive via 'admin:message-sent' / 'msg:message'
      // and replace or dedupe the optimistic message.
      setIsSending(false)
      return true
    }

    // ── HTTP fallback ────────────────────────────────────────────────────────
    try {
      const { data } = await apiClient.post(
        `/chat/sessions/${sessionId}/messages`,
        { body: trimmed },
      )
      if (!mounted.current) return false

      const confirmed = normMessage(data?.data ?? data?.message ?? data)

      // Replace optimistic with confirmed
      setMessages((prev) =>
        dedupeById(
          prev.map((m) => (m.id === optimisticId ? confirmed : m)),
        ),
      )

      // Bump session to top
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.sessionId === sessionId)
        if (idx < 0) return prev
        const updated = {
          ...prev[idx],
          lastMessage:   trimmed,
          lastMessageAt: confirmed.createdAt,
        }
        return [updated, ...prev.filter((_, i) => i !== idx)]
      })

      return true
    } catch (err) {
      // Rollback optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      if (!is401(err)) toast.error('Failed to send message')
      return false
    } finally {
      if (mounted.current) setIsSending(false)
    }
  }, [socket])

  // ── Emit typing indicator (for new conversations system) ─────────────────────

  const emitTyping = useCallback((isTypingNow) => {
    const sock = socket
    if (!sock?.connected) return
    const session = selectedRef.current
    const convId = session?.id ?? session?.conversationId ?? session?.sessionId
    if (!convId) return

    sock.emit('msg:typing', {
      conversationId: convId,
      isTyping:       isTypingNow,
      senderType:     'admin',
    })
  }, [socket])

  // ── Start conversation with user ──────────────────────────────────────────

  const startSessionWithUser = useCallback(async (user, initialMessage = '') => {
    if (!user || !mounted.current || !isAuthed()) return null

    setIsLoadingMessages(true)
    setError(null)

    try {
      const payload = { userId: user.id }
      if (initialMessage?.trim()) payload.message = initialMessage.trim()

      const { data } = await apiClient.post('/chat/sessions', payload)
      if (!mounted.current) return null

      const raw     = data?.data ?? data
      const rawSess = raw?.session ?? raw
      const rawMsgs = raw?.messages ?? []

      const normalizedSession  = normSession({ ...user, ...rawSess })
      const normalizedMessages = dedupeById(safeArr(rawMsgs).map(normMessage))

      setSelectedSession(normalizedSession)
      setMessages(normalizedMessages)

      setSessions((prev) => {
        const filtered = prev.filter(
          (s) => s.sessionId !== normalizedSession.sessionId,
        )
        return [normalizedSession, ...filtered]
      })

      if (socket && connectedRef.current && normalizedSession.sessionId) {
        socket.emit('admin:join-session', { sessionId: normalizedSession.sessionId })
      }

      toast.success('Conversation started')
      return normalizedSession
    } catch (err) {
      if (!mounted.current || is401(err)) return null
      const msg = friendlyError(err)
      setError(msg)
      toast.error('Failed to start conversation')
      return null
    } finally {
      if (mounted.current) setIsLoadingMessages(false)
    }
  }, [socket])

  // ── Mark read ─────────────────────────────────────────────────────────────

  const markSessionRead = useCallback(async (sessionId) => {
    if (!sessionId) return
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === sessionId ? { ...s, unreadCount: 0 } : s,
      ),
    )
    apiClient.patch(`/chat/sessions/${sessionId}/read`).catch(() => {})
  }, [])

  // ── Update session status ─────────────────────────────────────────────────

  const updateSessionStatus = useCallback(async (sessionId, status) => {
    if (!sessionId || !['open', 'closed'].includes(status)) return
    try {
      await apiClient.patch(`/chat/sessions/${sessionId}/status`, { status })
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, status } : s)),
      )
      if (selectedRef.current?.sessionId === sessionId) {
        setSelectedSession((prev) => prev ? { ...prev, status } : prev)
      }
    } catch (err) {
      toast.error('Failed to update status')
    }
  }, [])

  // ── Rejoin on reconnect ───────────────────────────────────────────────────

  useEffect(() => {
    if (isConnected && socket && selectedRef.current) {
      const sid = selectedRef.current.sessionId
      if (sid) socket.emit('admin:join-session', { sessionId: sid })
      refreshSessions(true)
    }
  }, [isConnected, socket, refreshSessions])

  // ── Socket events ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return

    const currentId = () => selectedRef.current?.sessionId ?? null

    /** Append a message if it belongs to the active session */
    const appendMessage = (raw) => {
      if (!mounted.current) return
      const msg = normMessage(raw)
      if (!msg) return

      const msgSid = msg.sessionId ?? raw?.session_id

      // Add to message list if this session is open
      if (msgSid && String(msgSid) === String(currentId())) {
        setMessages((prev) => {
          // Replace optimistic if body matches
          const hasOptimistic = prev.find(
            (m) => m.isOptimistic && m.body === msg.body,
          )
          if (hasOptimistic) {
            return dedupeById(
              prev.map((m) => (m.isOptimistic && m.body === msg.body ? msg : m)),
            )
          }
          return dedupeById([...prev, msg])
        })
        // Mark as read immediately since admin is viewing
        if (msg.senderType !== 'admin') {
          apiClient.patch(`/chat/sessions/${msgSid}/read`).catch(() => {})
        }
      }

      // Always bump session to top with latest message preview
      setSessions((prev) => {
        const idx = prev.findIndex(
          (s) => String(s.sessionId) === String(msgSid),
        )
        const isActive = String(msgSid) === String(currentId())

        if (idx < 0) {
          // Unknown session — refresh full list
          refreshSessions(true)
          return prev
        }

        const updated = {
          ...prev[idx],
          lastMessage:   msg.body,
          lastMessageAt: msg.createdAt,
          unreadCount:
            isActive || msg.senderType === 'admin'
              ? 0
              : (prev[idx].unreadCount || 0) + 1,
        }
        return [updated, ...prev.filter((_, i) => i !== idx)]
      })
    }

    // Server emits 'msg:message' for all new messages
    const onMsgMessage = (payload) => appendMessage(payload)

    // Admin echo (sent via socket)
    const onAdminSent = (payload) => appendMessage(payload?.message ?? payload)

    // Legacy event names (keep for compatibility)
    const onChatMessage    = (payload) => appendMessage(payload)
    const onNewChatMessage = (payload) => appendMessage(payload)

    // Session updated (status change, etc.)
    const onSessionUpdated = ({ sessionId, status }) => {
      if (!mounted.current) return
      setSessions((prev) =>
        prev.map((s) => (String(s.sessionId) === String(sessionId) ? { ...s, status } : s)),
      )
      if (String(sessionId) === String(currentId())) {
        setSelectedSession((prev) => prev ? { ...prev, status } : prev)
      }
    }

    // Typing indicator
    const onTyping = ({ sessionId, senderType, isTyping }) => {
      if (!mounted.current) return
      if (String(sessionId) !== String(currentId())) return

      const key = senderType || 'user'
      setTypingUsers((prev) => ({ ...prev, [key]: isTyping }))

      if (isTyping) {
        clearTimeout(typingTimers.current[key])
        typingTimers.current[key] = setTimeout(() => {
          if (mounted.current) {
            setTypingUsers((prev) => ({ ...prev, [key]: false }))
          }
        }, 5_000)
      } else {
        clearTimeout(typingTimers.current[key])
        delete typingTimers.current[key]
      }
    }

    // Typing indicator — new messaging system (conversationId based)
    const onTypingNew = ({ conversationId, senderType, isTyping }) => {
      if (!mounted.current) return
      const currentConvId = selectedRef.current?.id ?? selectedRef.current?.conversationId ?? null
      if (!conversationId || String(conversationId) !== String(currentConvId)) return

      const key = senderType || 'user'
      setTypingUsers((prev) => ({ ...prev, [key]: isTyping }))

      if (isTyping) {
        clearTimeout(typingTimers.current[key])
        typingTimers.current[key] = setTimeout(() => {
          if (mounted.current) {
            setTypingUsers((prev) => ({ ...prev, [key]: false }))
          }
        }, 5_000)
      } else {
        clearTimeout(typingTimers.current[key])
        delete typingTimers.current[key]
      }
    }

    // Read receipt
    const onRead = ({ sessionId }) => {
      if (!mounted.current) return
      setSessions((prev) =>
        prev.map((s) =>
          String(s.sessionId) === String(sessionId) ? { ...s, unreadCount: 0 } : s,
        ),
      )
      if (String(sessionId) === String(currentId())) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
      }
    }

    socket.on('msg:message',        onMsgMessage)
    socket.on('admin:message-sent', onAdminSent)
    socket.on('chat:message',       onChatMessage)
    socket.on('new-chat-message',   onNewChatMessage)
    socket.on('msg:session-updated',onSessionUpdated)
    socket.on('chat:typing',        onTyping)
    socket.on('msg:typing',         onTypingNew)
    socket.on('msg:read',           onRead)

    return () => {
      socket.off('msg:message',        onMsgMessage)
      socket.off('admin:message-sent', onAdminSent)
      socket.off('chat:message',       onChatMessage)
      socket.off('new-chat-message',   onNewChatMessage)
      socket.off('msg:session-updated',onSessionUpdated)
      socket.off('chat:typing',        onTyping)
      socket.off('msg:typing',         onTypingNew)
      socket.off('msg:read',           onRead)
    }
  }, [socket, refreshSessions])

  // ── Polling ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthed()) {
      setIsLoadingSessions(false)
      return
    }

    refreshSessions()

    const schedule = () => {
      if (!mounted.current) return
      const delay = connectedRef.current ? POLL_CONNECTED : POLL_DISCONNECTED

      pollTimer.current = setTimeout(async () => {
        if (!mounted.current || !isAuthed()) return
        await refreshSessions(true)
        schedule()
      }, delay)
    }

    schedule()

    return () => {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }, [refreshSessions])

  // ── Cleanup typing timers on unmount ──────────────────────────────────────

  useEffect(() => {
    return () => {
      Object.values(typingTimers.current).forEach(clearTimeout)
      typingTimers.current = {}
    }
  }, [])

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    sessions,
    isLoadingSessions,
    allUsers,
    isLoadingAllUsers,
    selectedSession,
    messages,
    isLoadingMessages,
    isSending,
    typingUsers,
    unreadTotal,
    error,
    selectSession,
    closeSession,
    sendMessage,
    startSessionWithUser,
    fetchAllUsers,
    refreshSessions,
    markSessionRead,
    updateSessionStatus,
    emitTyping,
  }), [
    sessions,
    isLoadingSessions,
    allUsers,
    isLoadingAllUsers,
    selectedSession,
    messages,
    isLoadingMessages,
    isSending,
    typingUsers,
    unreadTotal,
    error,
    selectSession,
    closeSession,
    sendMessage,
    startSessionWithUser,
    fetchAllUsers,
    refreshSessions,
    markSessionRead,
    updateSessionStatus,
    emitTyping,
  ])

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export default ChatContext