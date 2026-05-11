import React, {
    createContext, useContext, useEffect, useRef,
    useState, useCallback,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectIsLoggedIn, selectInitialized } from '@store/authSlice'
import { addNotification } from '@store/notificationsSlice'
import { addMessage, upsertSession } from '@store/chatSlice'
import { SOCKET_URL, SOCKET_EVENTS, NOTIFICATION_TYPES } from '@utils/constants'
import { getToken } from '@utils/helpers'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
    const dispatch = useDispatch()
    const isLoggedIn = useSelector(selectIsLoggedIn)
    const initialized = useSelector(selectInitialized)

    const socketRef = useRef(null)
    const [connected, setConnected] = useState(false)

    const safeMsg = (val) => {
        if (!val) return ''
        if (typeof val === 'string') return val
        if (typeof val === 'object') return val.message || val.body || JSON.stringify(val)
        return String(val)
    }

    const connect = useCallback(async () => {
        if (socketRef.current?.connected) return

        let io
        try {
            const mod = await import('socket.io-client')
            io = mod.io || mod.default
        } catch {
            console.warn('[Socket] socket.io-client not available')
            return
        }

        if (!io) return

        const token = getToken()

        const socket = io(SOCKET_URL, {
            auth: { token: token || undefined },
            /* ── Force polling on Render.com (WebSockets not always supported on free tier) ── */
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 5,
            timeout: 15000,
            forceNew: false,
        })

        socket.on(SOCKET_EVENTS.CONNECT, () => {
            setConnected(true)
            console.info('[Socket] Connected')
        })

        socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
            setConnected(false)
            console.info('[Socket] Disconnected:', reason)
        })

        socket.on('connect_error', (err) => {
            console.warn('[Socket] Error:', err.message)
            setConnected(false)
        })

        /* ── Incoming chat from users ── */
        socket.on(SOCKET_EVENTS.NEW_CHAT, (payload) => {
            try {
                dispatch(addMessage({
                    sessionId: payload.sessionId,
                    senderType: 'user',
                    senderName: safeMsg(payload.senderName || payload.fullName),
                    senderEmail: safeMsg(payload.email),
                    body: safeMsg(payload.body),
                    createdAt: new Date().toISOString(),
                    isRead: false,
                }))
                dispatch(upsertSession({
                    session_id: payload.sessionId,
                    email: payload.email,
                    full_name: payload.fullName,
                    unreadCount: payload.unreadCount || 1,
                    lastMessage: safeMsg(payload.body),
                    last_active: new Date().toISOString(),
                }))
                dispatch(addNotification({
                    type: NOTIFICATION_TYPES.CHAT,
                    title: 'New Chat Message',
                    message: `${safeMsg(payload.senderName || payload.fullName) || 'Guest'}: ${safeMsg(payload.body).slice(0, 60)}`,
                    data: payload,
                }))
            } catch (err) {
                console.warn('[Socket] Error handling new-chat-message:', err.message)
            }
        })

        /* ── New booking ── */
        socket.on(SOCKET_EVENTS.NEW_BOOKING, (booking) => {
            try {
                dispatch(addNotification({
                    type: NOTIFICATION_TYPES.BOOKING,
                    title: 'New Booking',
                    message: `${safeMsg(booking.full_name)} booked ${safeMsg(booking.destination || 'a trip')}`,
                    data: booking,
                }))
            } catch { }
        })

        /* ── New contact message ── */
        socket.on(SOCKET_EVENTS.NEW_MESSAGE, (msg) => {
            try {
                dispatch(addNotification({
                    type: NOTIFICATION_TYPES.MESSAGE,
                    title: 'New Contact Message',
                    message: `From ${safeMsg(msg.full_name)}: ${safeMsg(msg.subject || msg.message).slice(0, 50)}`,
                    data: msg,
                }))
            } catch { }
        })

        /* ── New messaging system events ── */
        socket.on('msg:new-from-user', (payload) => {
            try {
                dispatch(addNotification({
                    type: NOTIFICATION_TYPES.CHAT,
                    title: 'New Message',
                    message: `${safeMsg(payload.senderName) || 'Guest'}: ${safeMsg(payload.message?.body).slice(0, 60)}`,
                    data: payload,
                }))
            } catch { }
        })

        socketRef.current = socket
    }, [dispatch])

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect()
            socketRef.current = null
        }
        setConnected(false)
    }, [])

    useEffect(() => {
        if (!initialized) return
        if (isLoggedIn) {
            connect()
        } else {
            disconnect()
        }
    }, [isLoggedIn, initialized]) // eslint-disable-line

    useEffect(() => {
        return () => disconnect()
    }, [disconnect])

    const emit = useCallback((event, ...args) => {
        socketRef.current?.emit(event, ...args)
    }, [])

    const joinSession = useCallback((sessionId, cb) => {
        socketRef.current?.emit(SOCKET_EVENTS.ADMIN_JOIN, { sessionId }, cb)
    }, [])

    const sendMessage = useCallback((sessionId, body, cb) => {
        socketRef.current?.emit(SOCKET_EVENTS.ADMIN_SEND, { sessionId, body }, cb)
    }, [])

    const sendTyping = useCallback((sessionId, isTyping) => {
        socketRef.current?.emit(SOCKET_EVENTS.CHAT_TYPING, { sessionId, isTyping })
    }, [])

    return (
        <SocketContext.Provider value={{
            socket: socketRef.current,
            connected,
            emit,
            joinSession,
            sendMessage,
            sendTyping,
        }}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocketContext = () => {
    const ctx = useContext(SocketContext)
    if (!ctx) throw new Error('useSocketContext must be inside SocketProvider')
    return ctx
}