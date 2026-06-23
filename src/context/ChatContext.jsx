// admin/src/context/ChatContext.jsx
/**
 * CHAT CONTEXT
 * Uses legacy /api/chat endpoints + legacy socket events.
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
      const token = localStorage.getItem(key)
      if (token) return token
    }
  } catch {}
  return null
}

const isAuthed = () => Boolean(getToken())
const is401    = (err) => err?.response?.status === 401
const safeArray = (val) => (Array.isArray(val) ? val : [])

const POLL_CONNECTED    = 30000
const POLL_DISCONNECTED = 10000

const dedupeById = (arr) => {
  const seen = new Set()
  return safeArray(arr).filter((item) => {
    const key = item?.id ?? item?.sessionId ?? item?._id ?? JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const extractList = (data) => {
  if (Array.isArray(data))           return data
  if (Array.isArray(data?.data))     return data.data
  if (Array.isArray(data?.sessions)) return data.sessions
  if (Array.isArray(data?.messages)) return data.messages
  if (Array.isArray(data?.users))    return data.users
  return []
}

const normalizeSession = (s) => ({
  ...s,
  sessionId: s?.sessionId ?? s?.session_id ?? s?.id ?? s?._id,
  lastMessage: s?.lastMessage ?? s?.last_message ?? '',
  full_name: s?.full_name ?? s?.userFullName ?? s?.user?.full_name ?? '',
  email: s?.email ?? s?.userEmail ?? s?.user?.email ?? '',
})

const normalizeMessage = (m) => ({
  ...m,
  id:         m?.id ?? m?._id,
  sessionId:  m?.sessionId ?? m?.session_id,
  body:       m?.body ?? m?.content ?? m?.message ?? '',
  senderType: m?.senderType ?? m?.sender_type,
  senderName: m?.senderName ?? m?.sender_name,
  createdAt:  m?.createdAt ?? m?.created_at,
})

const friendlyError = (err) => {
  const s = err?.response?.status
  if (s === 401) return 'Not authorized — please log in as admin'
  if (s === 403) return 'Access denied'
  if (s === 404) return 'Resource not found'
  if (s >= 500)  return 'Server error — please try again later'
  return err?.message || 'Something went wrong'
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
  selectSession:        async () => {},
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
  useEffect(() => { isConnectedRef.current = isConnected }, [isConnected])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ── Refresh sessions ───────────────────────────────────────────────────────
  const refreshSessions = useCallback(async (quiet = false) => {
    if (!isMountedRef.current) return
    if (!isAuthed()) {
      setIsLoadingSessions(false)
      return
    }

    try {
      const { data } = await apiClient.get('/chat/sessions')
      if (!isMountedRef.current) return

      const normalized = dedupeById(extractList(data).map(normalizeSession))
      setSessions(normalized)
      setError(null)
    } catch (err) {
      if (!isMountedRef.current || is401(err)) return
      const msg = friendlyError(err)
      console.error('[Chat] refreshSessions:', msg)
      setError(msg)
      if (!quiet) toast.error(msg)
    } finally {
      if (isMountedRef.current) setIsLoadingSessions(false)
    }
  }, [])

  // ── Users for modal ────────────────────────────────────────────────────────
  const fetchAllUsers = useCallback(async () => {
    if (!isAuthed() || fetchingUsers.current) return
    fetchingUsers.current = true
    setIsLoadingAllUsers(true)

    try {
      const { data } = await apiClient.get('/users', { params: { limit: 500 } })
      if (!isMountedRef.current) return
      setAllUsers(safeArray(extractList(data)))
    } catch (err) {
      if (!is401(err)) {
        console.error('[Chat] fetchAllUsers:', friendlyError(err))
        toast.error('Could not load user list')
      }
    } finally {
      fetchingUsers.current = false
      if (isMountedRef.current) setIsLoadingAllUsers(false)
    }
  }, [])

  // ── Select session ─────────────────────────────────────────────────────────
  const selectSession = useCallback(async (session) => {
    if (!session || !isMountedRef.current || !isAuthed()) return

    const sessionId = session?.sessionId ?? session?.session_id ?? session?.id ?? session?._id
    if (!sessionId) {
      console.warn('[Chat] No sessionId on session:', session)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data } = await apiClient.get(`/chat/sessions/${sessionId}`)
      if (!isMountedRef.current) return

      const sess = data?.data ?? data?.session ?? data
      const normalizedSession = normalizeSession({ ...session, ...sess })
      const normalizedMessages = dedupeById(
        extractList(sess?.messages ?? data?.messages ?? []).map(normalizeMessage)
      )

      setSelectedSession(normalizedSession)
      setMessages(normalizedMessages)
      setTypingUsers({})

      if (socket && isConnectedRef.current) {
        socket.emit('admin:join-session', { sessionId: normalizedSession.sessionId })
      }
    } catch (err) {
      if (!isMountedRef.current || is401(err)) return
      const msg = friendlyError(err)
      console.error('[Chat] selectSession:', msg)
      setError(msg)
      toast.error('Failed to load messages')
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [socket])

  // ── Close session ──────────────────────────────────────────────────────────
  const closeSession = useCallback(() => {
    setSelectedSession(null)
    setMessages([])
    setTypingUsers({})
    setError(null)
  }, [])

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (body) => {
    const trimmed = (body || '').trim()
    const session = selectedSessRef.current
    const sessionId = session?.sessionId ?? session?.session_id ?? session?.id ?? session?._id

    if (!trimmed || !sessionId || !isAuthed()) return false

    // Prefer socket real-time path
    if (socket && isConnectedRef.current) {
      socket.emit('admin:send-message', { sessionId, body: trimmed })
      return true
    }

    // HTTP fallback
    try {
      const { data } = await apiClient.post(`/chat/sessions/${sessionId}/messages`, {
        body: trimmed,
      })
      if (!isMountedRef.current) return false

      const msg = normalizeMessage(data?.data ?? data?.message ?? data)
      if (msg?.id) {
        setMessages((prev) => dedupeById([...prev, msg]))
      }
      return true
    } catch (err) {
      if (!is401(err)) {
        console.error('[Chat] sendMessage fallback:', err.message)
        toast.error('Failed to send message')
      }
      return false
    }
  }, [socket])

  // ── Start conversation ─────────────────────────────────────────────────────
  const startSessionWithUser = useCallback(async (user, initialMessage = '') => {
    if (!user || !isMountedRef.current || !isAuthed()) return null

    setIsLoading(true)
    setError(null)

    try {
      const payload = { userId: user.id }
      if (initialMessage?.trim()) payload.message = initialMessage.trim()

      // Try legacy route first
      let data
      try {
        const res = await apiClient.post('/chat/sessions', payload)
        data = res.data
      } catch (err) {
        // fallback to messaging route if available
        const res = await apiClient.post('/messages/start-with-user', payload)
        data = res.data
      }

      if (!isMountedRef.current) return null

      const session = data?.data ?? data?.session ?? data
      const normalizedSession = normalizeSession(session)

      setSelectedSession(normalizedSession)
      setMessages(
        dedupeById(safeArray(session?.messages).map(normalizeMessage))
      )

      refreshSessions(true)

      if (socket && isConnectedRef.current && normalizedSession.sessionId) {
        socket.emit('admin:join-session', { sessionId: normalizedSession.sessionId })
      }

      toast.success('Conversation started')
      return normalizedSession
    } catch (err) {
      if (!isMountedRef.current || is401(err)) return null
      const msg = friendlyError(err)
      console.error('[Chat] startSessionWithUser:', msg)
      setError(msg)
      toast.error('Failed to start conversation')
      return null
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [socket, refreshSessions])

  // ── Rejoin selected session on reconnect ──────────────────────────────────
  useEffect(() => {
    if (isConnected && selectedSession && socket) {
      const sid = selectedSession.sessionId ?? selectedSession.id ?? selectedSession._id
      if (sid) socket.emit('admin:join-session', { sessionId: sid })
    }
  }, [isConnected, selectedSession, socket])

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const currentSessId = () => {
      const s = selectedSessRef.current
      return s?.sessionId ?? s?.session_id ?? s?.id ?? s?._id ?? null
    }

    const appendIfCurrent = (messageLike) => {
      const normalized = normalizeMessage(messageLike)
      const msgSessId = normalized?.sessionId ?? messageLike?.session_id
      const currentId = currentSessId()

      if (currentId && msgSessId && String(currentId) === String(msgSessId)) {
        setMessages((prev) => dedupeById([...prev, normalized]))
      }
    }

    const onChatMessage = (message) => {
      if (!isMountedRef.current) return
      appendIfCurrent(message)
      refreshSessions(true)
    }

    const onNewChatMessage = (payload) => {
      if (!isMountedRef.current) return
      appendIfCurrent(payload)
      refreshSessions(true)
    }

    const onAdminMessageSent = (payload) => {
      if (!isMountedRef.current) return
      appendIfCurrent(payload?.message ?? payload)
      refreshSessions(true)
    }

    const onTyping = ({ sessionId, senderType, isTyping }) => {
      if (!isMountedRef.current) return
      if (String(sessionId) !== String(currentSessId())) return

      const key = senderType || 'user'
      setTypingUsers((prev) => ({ ...prev, [key]: isTyping }))

      if (isTyping) {
        clearTimeout(typingTimers.current[key])
        typingTimers.current[key] = setTimeout(() => {
          if (isMountedRef.current) {
            setTypingUsers((prev) => ({ ...prev, [key]: false }))
          }
        }, 4000)
      } else {
        clearTimeout(typingTimers.current[key])
        delete typingTimers.current[key]
      }
    }

    socket.on('chat:message', onChatMessage)
    socket.on('new-chat-message', onNewChatMessage)
    socket.on('admin:message-sent', onAdminMessageSent)
    socket.on('chat:typing', onTyping)

    return () => {
      socket.off('chat:message', onChatMessage)
      socket.off('new-chat-message', onNewChatMessage)
      socket.off('admin:message-sent', onAdminMessageSent)
      socket.off('chat:typing', onTyping)
    }
  }, [socket, refreshSessions])

  // ── Polling ────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    return () => {
      Object.values(typingTimers.current).forEach(clearTimeout)
      typingTimers.current = {}
    }
  }, [])

  const value = useMemo(() => ({
    sessions,
    isLoadingSessions,
    allUsers,
    isLoadingAllUsers,
    selectedSession,
    messages,
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
    sessions,
    isLoadingSessions,
    allUsers,
    isLoadingAllUsers,
    selectedSession,
    messages,
    isLoading,
    typingUsers,
    error,
    selectSession,
    closeSession,
    sendMessage,
    startSessionWithUser,
    fetchAllUsers,
    refreshSessions,
  ])

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export default ChatContext