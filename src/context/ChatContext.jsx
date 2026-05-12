/**
 * CHAT CONTEXT v3.4
 * Restored to legacy /api/chat endpoints and socket events.
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

const TOKEN_KEYS = [
  import.meta.env.VITE_TOKEN_KEY,
  'altuvera_admin_token',
  'adminToken',
  'admin_token',
  'authToken',
  'token',
].filter(Boolean)

const getToken = () => {
  try {
    for (const key of TOKEN_KEYS) {
      const t = localStorage.getItem(key)
      if (t) return t
    }
  } catch {}
  return null
}

const isAuthed = () => Boolean(getToken())
const is401    = (err) => err?.response?.status === 401

const POLL_CONNECTED    = 30_000
const POLL_DISCONNECTED = 10_000

const safeArray = (val) => (Array.isArray(val) ? val : [])

const dedupeById = (arr) => {
  const seen = new Set()
  return safeArray(arr).filter((item) => {
    const key = item?.id ?? item?.sessionId ?? JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const friendlyError = (err) => {
  const s = err?.response?.status
  if (s === 401) return 'Not authorized — please log in as admin'
  if (s === 403) return 'Access denied'
  if (s === 404) return 'Resource not found'
  if (s >= 500)  return 'Server error — please try again later'
  return err?.message || 'Something went wrong'
}

const extractList = (data) => {
  if (Array.isArray(data))           return data
  if (Array.isArray(data?.data))     return data.data
  if (Array.isArray(data?.sessions)) return data.sessions
  if (Array.isArray(data?.messages)) return data.messages
  if (Array.isArray(data?.users))    return data.users
  return []
}

const DEFAULT_CTX = {
  sessions:             [],
  isLoadingSessions:    true,
  allUsers:             [],
  isLoadingAllUsers:    false,
  selectedSession:      null,
  messages:             [],
  isLoading:            false,
  typingUsers:          {},
  error:                null,
  selectSession:        () => {},
  closeSession:         () => {},
  sendMessage:          async () => false,
  startSessionWithUser: async () => null,
  fetchAllUsers:        async () => {},
  refreshSessions:      async () => {},
}

export const ChatContext = createContext(DEFAULT_CTX)

export const useChatContext = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be inside <ChatProvider>')
  return ctx
}

export function ChatProvider({ children }) {
  const { socket, isConnected } = useSocketContext()

  const [sessions,          setSessions]          = useState([])
  const [allUsers,          setAllUsers]          = useState([])
  const [selectedSession,   setSelectedSession]   = useState(null)
  const [messages,          setMessages]          = useState([])
  const [isLoading,         setIsLoading]         = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false)
  const [typingUsers,       setTypingUsers]       = useState({})
  const [error,             setError]             = useState(null)

  const isMountedRef    = useRef(true)
  const selectedSessRef = useRef(null)
  const isConnectedRef  = useRef(false)
  const pollTimerRef    = useRef(null)
  const typingTimers    = useRef({})
  const fetchingUsers   = useRef(false)

  useEffect(() => { selectedSessRef.current = selectedSession }, [selectedSession])
  useEffect(() => { isConnectedRef.current  = isConnected    }, [isConnected])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════════
  // REFRESH SESSIONS → GET /api/chat/sessions
  // ═══════════════════════════════════════════════════════════════════════════════

  const refreshSessions = useCallback(async (quiet = false) => {
    if (!isMountedRef.current) return
    if (!isAuthed()) {
      if (isMountedRef.current) setIsLoadingSessions(false)
      return
    }

    try {
      const { data } = await apiClient.get('/chat/sessions')
      if (!isMountedRef.current) return

      const raw = dedupeById(extractList(data))
      // Normalize: ensure every session has a stable `sessionId` field.
      // Use _id (Mongo ObjectId) as the canonical session identifier.
      const normalized = raw.map(s => ({
        ...s,
        sessionId: s.sessionId ?? s.id ?? s._id,
      }))
      setSessions(normalized)
      setError(null)
    } catch (err) {
      if (!isMountedRef.current) return
      if (is401(err)) return
      const msg = friendlyError(err)
      console.error('[Chat] refreshSessions:', msg)
      setError(msg)
      if (!quiet) toast.error(msg)
    } finally {
      if (isMountedRef.current) setIsLoadingSessions(false)
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH ALL USERS → GET /api/users?limit=500
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchAllUsers = useCallback(async () => {
    if (!isAuthed()) return
    if (fetchingUsers.current) return
    fetchingUsers.current = true
    setIsLoadingAllUsers(true)

    try {
      const { data } = await apiClient.get('/users', { params: { limit: 500 } })
      if (!isMountedRef.current) return
      setAllUsers(safeArray(extractList(data)))
    } catch (err) {
      if (is401(err)) return
      console.error('[Chat] fetchAllUsers:', friendlyError(err))
      toast.error('Could not load user list')
    } finally {
      fetchingUsers.current = false
      if (isMountedRef.current) setIsLoadingAllUsers(false)
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════════
  // SELECT SESSION → GET /api/chat/sessions/:sessionId/messages
  // ═══════════════════════════════════════════════════════════════════════════════

  const selectSession = useCallback(async (session) => {
    if (!session || !isMountedRef.current) return
    if (!isAuthed()) return

    const sessionId = session.sessionId ?? session.id ?? session._id
    if (!sessionId) {
      console.warn('[Chat] selectSession: no sessionId on', session)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch full session (includes messages)
      const { data } = await apiClient.get(`/chat/sessions/${sessionId}`)
      if (!isMountedRef.current) return

      const sess = data?.data ?? data?.session ?? data
      const sessId = sess?.sessionId ?? sess?.id ?? sess?._id ?? sessionId

      setSelectedSession({ ...session, ...sess, sessionId: sessId })
      setMessages(dedupeById(extractList(sess?.messages ?? sess)))
      setTypingUsers({})

      if (socket && isConnectedRef.current) {
        socket.emit('msg:admin-join', { sessionId: sessId })
      }
    } catch (err) {
      if (!isMountedRef.current) return
      if (is401(err)) return
      const msg = friendlyError(err)
      console.error('[Chat] selectSession:', msg)
      setError(msg)
      toast.error('Failed to load messages')
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [socket])

  // ═══════════════════════════════════════════════════════════════════════════════
  // CLOSE SESSION
  // ═══════════════════════════════════════════════════════════════════════════════

  const closeSession = useCallback(() => {
    setSelectedSession(null)
    setMessages([])
    setTypingUsers({})
    setError(null)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE → POST /api/chat/sessions/:sessionId/messages  OR  socket emit
  // ═══════════════════════════════════════════════════════════════════════════════

  const sendMessage = useCallback(async (body) => {
    const trimmed   = (body ?? '').trim()
    const session   = selectedSessRef.current
    const sessionId = session?.sessionId ?? session?.id ?? session?._id

    if (!trimmed || !sessionId) return false
    if (!isAuthed()) return false

    // Prefer socket for real-time delivery
    if (socket && isConnectedRef.current) {
      socket.emit('msg:admin-send', { sessionId, body: trimmed })
      return true
    }

    // HTTP fallback
    try {
      const { data } = await apiClient.post(`/chat/sessions/${sessionId}/messages`, { body: trimmed })
      if (!isMountedRef.current) return false

      const msg = data?.data ?? data?.message ?? data
      if (msg && typeof msg === 'object' && isMountedRef.current) {
        setMessages(prev => dedupeById([...prev, msg]))
      }
      return true
    } catch (err) {
      if (is401(err)) return false
      console.error('[Chat] sendMessage fallback:', err.message)
      toast.error('Failed to send message')
      return false
    }
  }, [socket])

  // ═══════════════════════════════════════════════════════════════════════════════
  // START SESSION WITH USER → POST /api/chat/sessions
  // ═══════════════════════════════════════════════════════════════════════════════

  const startSessionWithUser = useCallback(async (user, initialMessage = '') => {
    if (!user || !isMountedRef.current) return null
    if (!isAuthed()) return null

    setIsLoading(true)
    setError(null)

    try {
      const payload = { userId: user.id }
      if (initialMessage && initialMessage.trim()) {
        payload.message = initialMessage.trim()
      }
      const { data } = await apiClient.post('/chat/sessions', payload)
      if (!isMountedRef.current) return null

      const session = data?.data ?? data?.session ?? data
      const sessId  = session?.sessionId ?? session?.session_id ?? session?.id ?? session?._id

      setSelectedSession({ ...session, sessionId: sessId })
      setMessages(dedupeById(safeArray(session?.messages)))
      refreshSessions(true)

      if (socket && isConnectedRef.current && sessId) {
        socket.emit('msg:admin-join', { sessionId: sessId })
      }

      toast.success('Conversation started')
      return session
    } catch (err) {
      if (!isMountedRef.current) return null
      if (is401(err)) return null
      const msg = friendlyError(err)
      console.error('[Chat] startSessionWithUser:', msg)
      setError(msg)
      toast.error(
        err?.response?.status === 404
          ? 'Starting new sessions is not yet supported by the server'
          : 'Failed to start conversation',
      )
      return null
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [socket, refreshSessions])

  // ─── Rejoin current session on (re)connect ───────────────────────────────────
  useEffect(() => {
    if (isConnected && selectedSession && socket) {
      const sessId = selectedSession.sessionId ?? selectedSession.id ?? selectedSession._id
      if (sessId) {
        socket.emit('msg:admin-join', { sessionId: sessId })
      }
    }
  }, [isConnected, selectedSession, socket])

  // ─── Socket event listeners ───────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return

    const currentSessId = () => {
      const s = selectedSessRef.current
      return s?.sessionId ?? s?.id ?? s?._id ?? null
    }

    const onMessage = (message) => {
      if (!isMountedRef.current) return
      const myId  = currentSessId()
      const msgId = message?.sessionId ?? message?.conversationId

      if (myId && msgId === myId) {
        setMessages(prev => dedupeById([...prev, message]))
      }
      refreshSessions(true)
    }

    const onNewFromUser = (payload) => onMessage(payload?.message ?? payload)
    const onAdminSent   = (message) => onMessage(message)

    const onRead = ({ sessionId }) => {
      if (!isMountedRef.current) return
      if (sessionId !== currentSessId()) return
      setMessages(prev =>
        prev.map(m =>
          (m.senderType ?? m.sender_type) !== 'admin'
            ? { ...m, isRead: true }
            : m,
        ),
      )
    }

    const onTyping = ({ sessionId, senderType, isTyping }) => {
      if (!isMountedRef.current) return
      if (sessionId !== currentSessId()) return
      const key = senderType ?? 'user'

      setTypingUsers(prev => ({ ...prev, [key]: isTyping }))

      if (isTyping) {
        clearTimeout(typingTimers.current[key])
        typingTimers.current[key] = setTimeout(() => {
          if (isMountedRef.current) {
            setTypingUsers(prev => ({ ...prev, [key]: false }))
          }
        }, 4000)
      } else {
        clearTimeout(typingTimers.current[key])
        delete typingTimers.current[key]
      }
    }

    const onSessionUpdated = ({ sessionId, ...patch }) => {
      if (!isMountedRef.current) return
      const update = (s) =>
        (s.sessionId ?? s.id) === sessionId ? { ...s, ...patch } : s

      setSessions(prev => prev.map(update))
      setSelectedSession(prev =>
        prev && (prev.sessionId ?? prev.id) === sessionId
          ? { ...prev, ...patch }
          : prev,
      )
    }

    socket.on('msg:message',          onMessage)
    socket.on('msg:new-from-user',    onNewFromUser)
    socket.on('msg:admin-sent',       onAdminSent)
    socket.on('msg:read',             onRead)
    socket.on('msg:typing',           onTyping)
    socket.on('msg:session-updated',  onSessionUpdated)
    socket.on('chat:session-updated', onSessionUpdated)

    return () => {
      socket.off('msg:message',          onMessage)
      socket.off('msg:new-from-user',    onNewFromUser)
      socket.off('msg:admin-sent',       onAdminSent)
      socket.off('msg:read',             onRead)
      socket.off('msg:typing',           onTyping)
      socket.off('msg:session-updated',  onSessionUpdated)
      socket.off('chat:session-updated', onSessionUpdated)
    }
  }, [socket, refreshSessions])

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLLING
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isAuthed()) {
      setIsLoadingSessions(false)
      return
    }

    refreshSessions()

    const schedule = () => {
      if (!isMountedRef.current) return
      const delay = isConnectedRef.current ? POLL_CONNECTED : POLL_DISCONNECTED
      pollTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return
        if (isAuthed()) await refreshSessions(true)
        schedule()
      }, delay)
    }

    schedule()

    return () => {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [refreshSessions])

  useEffect(() => () => {
    Object.values(typingTimers.current).forEach(clearTimeout)
    typingTimers.current = {}
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════════

  const value = useMemo(() => ({
    sessions,           // always []
    isLoadingSessions,
    allUsers,           // always []
    isLoadingAllUsers,
    selectedSession,
    messages,           // always []
    isLoading,
    typingUsers,
    error,
    selectSession,
    closeSession,
    sendMessage,
    startSessionWithUser,
    fetchAllUsers,
    refreshSessions,
  }), [
    sessions, isLoadingSessions,
    allUsers, isLoadingAllUsers,
    selectedSession, messages,
    isLoading, typingUsers, error,
    selectSession, closeSession, sendMessage,
    startSessionWithUser, fetchAllUsers, refreshSessions,
  ])

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export default ChatContext
