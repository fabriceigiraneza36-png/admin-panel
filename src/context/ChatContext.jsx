/**
 * ChatContext.jsx v4.0 — Admin Panel
 *
 * Key fixes vs v3:
 *   ✅ Uses conversationId (not sessionId) for new messaging system
 *   ✅ Admin join: emits msg:admin-join { conversationId } — matches server
 *   ✅ Admin send: emits msg:admin-send { conversationId, body } — matches server
 *   ✅ Admin typing: emits msg:typing { conversationId, senderType:'admin' }
 *   ✅ Listens on msg:new-from-user (server's broadcast for new user messages)
 *   ✅ selectSession fetches from /chat/sessions/:id AND joins conv room
 *   ✅ Deduplication handles both conversationId and sessionId keyed sessions
 */

import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, useMemo,
} from 'react'
import { toast } from 'react-hot-toast'
import { useSocketContext } from './SocketContext'
import apiClient from '@api/client'

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════ */
const POLL_CONNECTED    = 60_000
const POLL_DISCONNECTED = 10_000

const TOKEN_KEYS = [
  import.meta.env.VITE_TOKEN_KEY,
  'altuvera_admin_token',
  'adminToken',
  'admin_token',
  'authToken',
  'token',
].filter(Boolean)

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */
const getToken = () => {
  for (const k of TOKEN_KEYS) {
    try { const v = localStorage.getItem(k); if (v) return v } catch {}
  }
  return null
}

const isAuthed = () => Boolean(getToken())

const friendlyError = (err) => {
  const s = err?.response?.status
  if (s === 401) return null   // silent
  if (s === 403) return 'Access denied'
  if (s === 404) return 'Not found'
  if (s >= 500)  return 'Server error — please try again'
  return err?.message || 'Something went wrong'
}

const safeArr = (v) => Array.isArray(v) ? v : []

const dedupeBy = (arr, keyFn) => {
  const seen = new Set()
  return safeArr(arr).filter((item) => {
    const k = keyFn(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const extractList = (data) => {
  if (Array.isArray(data))               return data
  if (Array.isArray(data?.data))         return data.data
  if (Array.isArray(data?.sessions))     return data.sessions
  if (Array.isArray(data?.messages))     return data.messages
  if (Array.isArray(data?.conversations))return data.conversations
  return []
}

/**
 * Normalize a session row.
 * Server /chat/sessions returns rows from chat_sessions table.
 * Key: session_id (string)
 */
const normSession = (s) => {
  if (!s) return null
  return {
    ...s,
    // Always expose sessionId as the primary key for admin list
    sessionId:      s.sessionId     ?? s.session_id ?? s.id ?? s._id,
    // conversationId from new messaging system (may be null for legacy)
    conversationId: s.conversationId ?? s.conversation_id ?? null,
    full_name:      s.fullName       ?? s.full_name  ?? s.userFullName ?? s.user?.full_name ?? '',
    email:          s.email          ?? s.userEmail   ?? s.user?.email  ?? '',
    avatar:         s.userAvatar     ?? s.avatar_url  ?? s.user?.avatar_url ?? null,
    status:         s.status         ?? 'open',
    lastMessage:    s.lastMessage    ?? s.last_message   ?? '',
    lastMessageAt:  s.lastMessageAt  ?? s.last_message_at ?? s.lastActive ?? null,
    unreadCount:    parseInt(s.unreadCount ?? s.unread_count ?? s.unread_admin ?? 0, 10),
  }
}

/**
 * Normalize a message row.
 * Server serializeConvMessage() returns camelCase.
 */
const normMessage = (m) => {
  if (!m) return null
  return {
    ...m,
    id:             m.id             ?? m._id,
    conversationId: m.conversationId ?? m.conversation_id ?? null,
    sessionId:      m.sessionId      ?? m.session_id      ?? null,
    body:           m.body           ?? m.content ?? m.message ?? '',
    senderType:     m.senderType     ?? m.sender_type ?? 'user',
    senderName:     m.senderName     ?? m.sender_name ?? '',
    createdAt:      m.createdAt      ?? m.created_at ?? new Date().toISOString(),
    isRead:         Boolean(m.isRead ?? m.is_read ?? false),
    isOptimistic:   Boolean(m.isOptimistic ?? false),
  }
}

/* ══════════════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════════════ */
const ChatContext = createContext(null)

export const useChatContext = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be inside <ChatProvider>')
  return ctx
}

/* ══════════════════════════════════════════════════════════════════
   PROVIDER
══════════════════════════════════════════════════════════════════ */
export function ChatProvider({ children }) {
  const { socket, isConnected } = useSocketContext()

  /* ── State ── */
  const [sessions,          setSessions]          = useState([])
  const [allUsers,          setAllUsers]          = useState([])
  const [selectedSession,   setSelectedSession]   = useState(null)
  const [messages,          setMessages]          = useState([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false)
  const [isSending,         setIsSending]         = useState(false)
  const [typingUsers,       setTypingUsers]        = useState({})
  const [error,             setError]             = useState(null)

  /* ── Refs ── */
  const mounted          = useRef(true)
  const selectedRef      = useRef(null)
  const connectedRef     = useRef(false)
  const pollTimer        = useRef(null)
  const typingTimers     = useRef({})
  const fetchingUsers    = useRef(false)
  const fetchingSessions = useRef(false)

  useEffect(() => { selectedRef.current  = selectedSession }, [selectedSession])
  useEffect(() => { connectedRef.current = isConnected     }, [isConnected])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(pollTimer.current)
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, [])

  /* ── Derived ── */
  const unreadTotal = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0),
    [sessions],
  )

  /* ══════════════════════════════════════════════════════════════
     HELPERS — get IDs from selected session
  ══════════════════════════════════════════════════════════════ */
  const getSelectedIds = useCallback((session = null) => {
    const s = session || selectedRef.current
    return {
      sessionId:      s?.sessionId      ?? s?.session_id ?? s?.id ?? null,
      conversationId: s?.conversationId ?? s?.conversation_id     ?? null,
    }
  }, [])

  /* ══════════════════════════════════════════════════════════════
     SESSION LIST — /chat/sessions
  ══════════════════════════════════════════════════════════════ */
  const refreshSessions = useCallback(async (quiet = false) => {
    if (!mounted.current || !isAuthed() || fetchingSessions.current) return
    fetchingSessions.current = true

    try {
      const { data } = await apiClient.get('/chat/sessions')
      if (!mounted.current) return

      const normalized = dedupeBy(
        extractList(data).map(normSession).filter(Boolean),
        (s) => s.sessionId,
      )
      setSessions(normalized)
      setError(null)
    } catch (err) {
      if (!mounted.current) return
      if (err?.response?.status === 401) return
      const msg = friendlyError(err)
      if (msg && !quiet) { setError(msg); toast.error(msg) }
    } finally {
      fetchingSessions.current = false
      if (mounted.current) setIsLoadingSessions(false)
    }
  }, [])

  /* ══════════════════════════════════════════════════════════════
     JOIN ADMIN TO CONVERSATION SOCKET ROOM
     Server event: msg:admin-join { conversationId }
     Server joins socket to conv:${conversationId} and marks unread
  ══════════════════════════════════════════════════════════════ */
  const joinConversation = useCallback((conversationId) => {
    if (!socket || !connectedRef.current || !conversationId) return

    socket.emit('msg:admin-join', { conversationId }, (ack) => {
      if (ack?.success) {
        console.debug('[admin] joined conv:', conversationId)
        // If server returns messages, merge them
        if (Array.isArray(ack.messages) && mounted.current) {
          const normalized = dedupeBy(
            ack.messages.map(normMessage).filter(Boolean),
            (m) => m.id,
          )
          setMessages(normalized)
        }
      } else {
        console.warn('[admin] msg:admin-join failed:', ack?.error)
      }
    })
  }, [socket])

  /* ══════════════════════════════════════════════════════════════
     SELECT SESSION — load messages, join room
  ══════════════════════════════════════════════════════════════ */
  const selectSession = useCallback(async (session) => {
    if (!session || !mounted.current || !isAuthed()) return

    const { sessionId } = getSelectedIds(session)
    if (!sessionId) { console.warn('[admin] selectSession: no sessionId', session); return }
    if (selectedRef.current?.sessionId === sessionId) return

    setIsLoadingMessages(true)
    setError(null)
    setMessages([])
    setTypingUsers({})

    try {
      // GET /api/chat/sessions/:sessionId
      const { data } = await apiClient.get(`/chat/sessions/${sessionId}`)
      if (!mounted.current) return

      const raw  = data?.data ?? data
      const sess = normSession({ ...session, ...(raw?.session ?? raw) })
      const msgs = dedupeBy(
        safeArr(raw?.messages).map(normMessage).filter(Boolean),
        (m) => m.id,
      )

      setSelectedSession(sess)
      setMessages(msgs)

      // Clear local unread
      setSessions((prev) =>
        prev.map((s) => s.sessionId === sessionId ? { ...s, unreadCount: 0 } : s),
      )

      // Join socket room using conversationId (new system)
      // or fall back to legacy admin:join-session
      const convId = sess.conversationId
      if (convId) {
        joinConversation(convId)
      } else {
        // Legacy: join chat:${sessionId} room
        socket?.emit('admin:join-session', { sessionId }, (ack) => {
          console.debug('[admin] legacy join-session ack:', ack)
        })
      }

      // Mark read on server (non-blocking)
      apiClient.patch(`/chat/sessions/${sessionId}/read`).catch(() => {})

    } catch (err) {
      if (!mounted.current || err?.response?.status === 401) return
      setError(friendlyError(err))
      toast.error('Failed to load conversation')
    } finally {
      if (mounted.current) setIsLoadingMessages(false)
    }
  }, [getSelectedIds, joinConversation, socket])

  /* ══════════════════════════════════════════════════════════════
     CLOSE SESSION
  ══════════════════════════════════════════════════════════════ */
  const closeSession = useCallback(() => {
    setSelectedSession(null)
    setMessages([])
    setTypingUsers({})
    setError(null)
  }, [])

  /* ══════════════════════════════════════════════════════════════
     SEND MESSAGE
     Server event: msg:admin-send { conversationId, body }
     Falls back to: admin:send-message { sessionId, body } (legacy)
  ══════════════════════════════════════════════════════════════ */
  const sendMessage = useCallback(async (body) => {
    const trimmed = (body || '').trim()
    if (!trimmed || !isAuthed()) return false

    const { sessionId, conversationId } = getSelectedIds()
    if (!sessionId && !conversationId) {
      toast.error('No active conversation')
      return false
    }

    // Optimistic message
    const optId = `opt_admin_${Date.now()}`
    const optimistic = normMessage({
      id:             optId,
      conversationId: conversationId,
      sessionId:      sessionId,
      body:           trimmed,
      senderType:     'admin',
      senderName:     'Support',
      createdAt:      new Date().toISOString(),
      isOptimistic:   true,
    })

    setMessages((prev) => [...prev, optimistic])
    setIsSending(true)

    const removeOpt = () =>
      setMessages((prev) => prev.filter((m) => m.id !== optId))

    const replaceOpt = (confirmed) => {
      if (!confirmed?.id) return
      setMessages((prev) =>
        dedupeBy(
          prev.map((m) => m.id === optId ? { ...confirmed, isOptimistic: false } : m),
          (m) => m.id,
        ),
      )
    }

    const bumpSession = (msgBody) => {
      setSessions((prev) => {
        const idx = prev.findIndex(
          (s) => s.sessionId === sessionId ||
                 s.conversationId === conversationId,
        )
        if (idx < 0) return prev
        const updated = {
          ...prev[idx],
          lastMessage:   msgBody,
          lastMessageAt: new Date().toISOString(),
        }
        return [updated, ...prev.filter((_, i) => i !== idx)]
      })
    }

    /* ── Socket: new messaging system ── */
    if (socket && connectedRef.current && conversationId) {
      socket.emit('msg:admin-send', { conversationId, body: trimmed }, (ack) => {
        if (!mounted.current) return
        setIsSending(false)

        console.debug('[admin] msg:admin-send ack:', ack)

        if (ack?.success === false) {
          removeOpt()
          toast.error(ack.error || 'Failed to send')
          return
        }

        const confirmed = normMessage(ack?.message ?? ack?.data)
        if (confirmed?.id) replaceOpt(confirmed)
        else {
          // Server will echo via msg:message
          setMessages((prev) =>
            prev.map((m) => m.id === optId ? { ...m, isOptimistic: false } : m),
          )
        }

        bumpSession(trimmed)
      })
      return true
    }

    /* ── Socket: legacy system ── */
    if (socket && connectedRef.current && sessionId) {
      socket.emit('admin:send-message', { sessionId, body: trimmed }, (ack) => {
        if (!mounted.current) return
        setIsSending(false)

        if (ack?.success === false) {
          removeOpt()
          toast.error(ack.error || 'Failed to send')
          return
        }

        const confirmed = normMessage(ack?.message)
        if (confirmed?.id) replaceOpt(confirmed)
        else {
          setMessages((prev) =>
            prev.map((m) => m.id === optId ? { ...m, isOptimistic: false } : m),
          )
        }

        bumpSession(trimmed)
      })
      return true
    }

    /* ── HTTP fallback ── */
    try {
      const endpoint = conversationId
        ? `/messages/conversations/${conversationId}/admin-reply`
        : `/chat/sessions/${sessionId}/messages`

      const { data } = await apiClient.post(endpoint, {
        body:       trimmed,
        senderType: 'admin',
      })
      if (!mounted.current) return false

      const confirmed = normMessage(data?.data ?? data?.message ?? data)
      if (confirmed?.id) replaceOpt(confirmed)
      else removeOpt()

      bumpSession(trimmed)
      return true
    } catch (err) {
      if (!mounted.current) return false
      removeOpt()
      if (err?.response?.status !== 401) toast.error('Failed to send message')
      return false
    } finally {
      if (mounted.current) setIsSending(false)
    }
  }, [socket, getSelectedIds])

  /* ══════════════════════════════════════════════════════════════
     TYPING INDICATOR
     Server event: msg:typing { conversationId, isTyping, senderType:'admin' }
  ══════════════════════════════════════════════════════════════ */
  const emitTyping = useCallback((isTypingNow) => {
    if (!socket?.connected) return
    const { conversationId, sessionId } = getSelectedIds()

    if (conversationId) {
      socket.emit('msg:typing', {
        conversationId,
        isTyping:   isTypingNow,
        senderType: 'admin',
      })
    } else if (sessionId) {
      // Legacy
      socket.emit('chat:typing', {
        sessionId,
        isTyping:   isTypingNow,
        senderType: 'admin',
      })
    }
  }, [socket, getSelectedIds])

  /* ══════════════════════════════════════════════════════════════
     SOCKET EVENTS
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!socket) return

    const currentIds = () => getSelectedIds()

    /**
     * Upsert a message into the active conversation
     */
    const upsertMsg = (raw) => {
      if (!mounted.current) return
      const msg    = normMessage(raw)
      if (!msg)    return

      const { conversationId: curConvId, sessionId: curSid } = currentIds()

      // Check if this message belongs to the active conversation
      const msgConvId = msg.conversationId ? String(msg.conversationId) : null
      const msgSid    = msg.sessionId      ? String(msg.sessionId)      : null
      const isActive  =
        (msgConvId && curConvId && msgConvId === String(curConvId)) ||
        (msgSid    && curSid    && msgSid    === String(curSid))

      if (isActive) {
        setMessages((prev) => {
          // Replace optimistic
          const optIdx = prev.findIndex(
            (m) => m.isOptimistic &&
                   m.body === msg.body &&
                   m.senderType === msg.senderType,
          )
          if (optIdx !== -1) {
            const next = [...prev]
            next[optIdx] = { ...msg, isOptimistic: false }
            return dedupeBy(next, (m) => m.id)
          }
          // Dedupe by id
          if (msg.id && prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })

        // If user sent, mark read immediately (we're viewing)
        if (msg.senderType === 'user' && curConvId) {
          socket.emit('msg:mark-read', { conversationId: curConvId })
          apiClient
            .post(`/messages/conversations/${curConvId}/admin-read`)
            .catch(() => {})
        }
      }

      // Bump session in list
      setSessions((prev) => {
        const idx = prev.findIndex(
          (s) =>
            (msgConvId && String(s.conversationId) === msgConvId) ||
            (msgSid    && String(s.sessionId)      === msgSid),
        )

        if (idx < 0) {
          // Unknown session → re-fetch
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

    // Primary: new messaging system broadcasts msg:message to conv:${id} room
    const onMsgMessage = (payload) => {
      console.debug('[admin socket] msg:message', payload)
      upsertMsg(payload)
    }

    // Server broadcasts this to 'admins' room when user sends
    const onMsgNewFromUser = (payload) => {
      console.debug('[admin socket] msg:new-from-user', payload)
      upsertMsg(payload?.message ?? payload)
    }

    // Admin echo (admin:message-sent from server)
    const onAdminSent = (payload) => {
      console.debug('[admin socket] admin:message-sent', payload)
      upsertMsg(payload?.message ?? payload)
    }

    // Legacy events
    const onChatMessage    = (p) => upsertMsg(p)
    const onNewChatMessage = (p) => upsertMsg(p)

    // Typing indicator
    const onTyping = ({ conversationId, sessionId, senderType, isTyping }) => {
      if (!mounted.current) return
      const { conversationId: curConv, sessionId: curSid } = currentIds()

      const matches =
        (conversationId && curConv && String(conversationId) === String(curConv)) ||
        (sessionId      && curSid  && String(sessionId)      === String(curSid))

      if (!matches) return

      const key = senderType || 'user'
      setTypingUsers((prev) => ({ ...prev, [key]: Boolean(isTyping) }))

      clearTimeout(typingTimers.current[key])
      if (isTyping) {
        typingTimers.current[key] = setTimeout(() => {
          if (mounted.current) setTypingUsers((p) => ({ ...p, [key]: false }))
        }, 5000)
      }
    }

    // Read receipt
    const onRead = ({ conversationId, sessionId, readBy }) => {
      if (!mounted.current) return
      const { conversationId: curConv, sessionId: curSid } = currentIds()

      const matches =
        (conversationId && curConv && String(conversationId) === String(curConv)) ||
        (sessionId      && curSid  && String(sessionId)      === String(curSid))

      if (matches) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
      }

      // Clear badge
      setSessions((prev) =>
        prev.map((s) => {
          const sid = String(s.sessionId ?? '')
          const cid = String(s.conversationId ?? '')
          if (
            (conversationId && cid === String(conversationId)) ||
            (sessionId      && sid === String(sessionId))
          ) {
            return { ...s, unreadCount: 0 }
          }
          return s
        }),
      )
    }

    // Conversation status updated
    const onSessionUpdated = ({ conversationId, sessionId, status, priority }) => {
      if (!mounted.current) return

      setSessions((prev) =>
        prev.map((s) => {
          const match =
            (conversationId && String(s.conversationId) === String(conversationId)) ||
            (sessionId      && String(s.sessionId)      === String(sessionId))
          return match ? { ...s, status: status || s.status } : s
        }),
      )

      const { conversationId: curConv, sessionId: curSid } = currentIds()
      const isActive =
        (conversationId && String(conversationId) === String(curConv)) ||
        (sessionId      && String(sessionId)      === String(curSid))

      if (isActive) {
        setSelectedSession((prev) =>
          prev ? { ...prev, status: status || prev.status } : prev,
        )
      }
    }

    // New session from a user
    const onNewSession = (data) => {
      if (!mounted.current) return
      const sess = normSession(data?.session ?? data)
      if (!sess) return
      setSessions((prev) => {
        const exists = prev.some((s) => s.sessionId === sess.sessionId)
        return exists ? prev : [sess, ...prev]
      })
      toast('💬 New conversation', { icon: '👤', duration: 4000 })
    }

    socket.on('msg:message',          onMsgMessage)
    socket.on('msg:new-from-user',    onMsgNewFromUser)
    socket.on('admin:message-sent',   onAdminSent)
    socket.on('chat:message',         onChatMessage)
    socket.on('new-chat-message',     onNewChatMessage)
    socket.on('msg:typing',           onTyping)
    socket.on('chat:typing',          onTyping)
    socket.on('msg:read',             onRead)
    socket.on('messages-read',        onRead)
    socket.on('msg:conversation-updated', onSessionUpdated)
    socket.on('msg:session-updated',  onSessionUpdated)
    socket.on('msg:user-registered',  onNewSession)
    socket.on('admin:new-session',    onNewSession)
    socket.on('new-chat-session',     onNewSession)

    return () => {
      socket.off('msg:message',          onMsgMessage)
      socket.off('msg:new-from-user',    onMsgNewFromUser)
      socket.off('admin:message-sent',   onAdminSent)
      socket.off('chat:message',         onChatMessage)
      socket.off('new-chat-message',     onNewChatMessage)
      socket.off('msg:typing',           onTyping)
      socket.off('chat:typing',          onTyping)
      socket.off('msg:read',             onRead)
      socket.off('messages-read',        onRead)
      socket.off('msg:conversation-updated', onSessionUpdated)
      socket.off('msg:session-updated',  onSessionUpdated)
      socket.off('msg:user-registered',  onNewSession)
      socket.off('admin:new-session',    onNewSession)
      socket.off('new-chat-session',     onNewSession)
    }
  }, [socket, getSelectedIds, refreshSessions])

  /* ── Re-join active conversation on reconnect ── */
  useEffect(() => {
    if (!isConnected || !socket) return
    const { conversationId, sessionId } = getSelectedIds()
    if (conversationId) joinConversation(conversationId)
    else if (sessionId) socket.emit('admin:join-session', { sessionId })
    refreshSessions(true)
  }, [isConnected, socket, getSelectedIds, joinConversation, refreshSessions])

  /* ══════════════════════════════════════════════════════════════
     POLLING
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isAuthed()) { setIsLoadingSessions(false); return }

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
    return () => clearTimeout(pollTimer.current)
  }, [refreshSessions])

  /* ══════════════════════════════════════════════════════════════
     USERS
  ══════════════════════════════════════════════════════════════ */
  const fetchAllUsers = useCallback(async () => {
    if (!isAuthed() || fetchingUsers.current) return
    fetchingUsers.current = true
    setIsLoadingAllUsers(true)
    try {
      const { data } = await apiClient.get('/users', { params: { limit: 500 } })
      if (!mounted.current) return
      setAllUsers(dedupeBy(extractList(data), (u) => u.id))
    } catch (err) {
      if (err?.response?.status !== 401) toast.error('Could not load users')
    } finally {
      fetchingUsers.current = false
      if (mounted.current) setIsLoadingAllUsers(false)
    }
  }, [])

  /* ══════════════════════════════════════════════════════════════
     START SESSION WITH USER
  ══════════════════════════════════════════════════════════════ */
  const startSessionWithUser = useCallback(async (user, initialMessage = '') => {
    if (!user || !mounted.current || !isAuthed()) return null

    setIsLoadingMessages(true)
    setError(null)

    try {
      const payload = { userId: user.id }
      if (initialMessage?.trim()) payload.message = initialMessage.trim()

      const { data } = await apiClient.post('/chat/sessions', payload)
      if (!mounted.current) return null

      const raw  = data?.data ?? data
      const sess = normSession({ ...user, ...(raw?.session ?? raw) })
      const msgs = dedupeBy(
        safeArr(raw?.messages).map(normMessage).filter(Boolean),
        (m) => m.id,
      )

      setSelectedSession(sess)
      setMessages(msgs)
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.sessionId !== sess.sessionId)
        return [sess, ...filtered]
      })

      if (sess.conversationId) joinConversation(sess.conversationId)
      else socket?.emit('admin:join-session', { sessionId: sess.sessionId })

      toast.success('Conversation started')
      return sess
    } catch (err) {
      if (!mounted.current || err?.response?.status === 401) return null
      toast.error('Failed to start conversation')
      return null
    } finally {
      if (mounted.current) setIsLoadingMessages(false)
    }
  }, [socket, joinConversation])

  /* ══════════════════════════════════════════════════════════════
     MARK READ / STATUS
  ══════════════════════════════════════════════════════════════ */
  const markSessionRead = useCallback(async (sessionId) => {
    if (!sessionId) return
    setSessions((prev) =>
      prev.map((s) => s.sessionId === sessionId ? { ...s, unreadCount: 0 } : s),
    )
    apiClient.patch(`/chat/sessions/${sessionId}/read`).catch(() => {})
  }, [])

  const updateSessionStatus = useCallback(async (sessionId, status) => {
    if (!sessionId || !['open', 'closed'].includes(status)) return
    try {
      await apiClient.patch(`/chat/sessions/${sessionId}/status`, { status })
      setSessions((prev) =>
        prev.map((s) => s.sessionId === sessionId ? { ...s, status } : s),
      )
      if (selectedRef.current?.sessionId === sessionId) {
        setSelectedSession((prev) => prev ? { ...prev, status } : prev)
      }
    } catch {
      toast.error('Failed to update status')
    }
  }, [])

  /* ══════════════════════════════════════════════════════════════
     CONTEXT VALUE
  ══════════════════════════════════════════════════════════════ */
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
    emitTyping,
    startSessionWithUser,
    fetchAllUsers,
    refreshSessions,
    markSessionRead,
    updateSessionStatus,
  }), [
    sessions, isLoadingSessions,
    allUsers, isLoadingAllUsers,
    selectedSession,
    messages, isLoadingMessages,
    isSending, typingUsers,
    unreadTotal, error,
    selectSession, closeSession,
    sendMessage, emitTyping,
    startSessionWithUser, fetchAllUsers,
    refreshSessions, markSessionRead, updateSessionStatus,
  ])

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export default ChatContext