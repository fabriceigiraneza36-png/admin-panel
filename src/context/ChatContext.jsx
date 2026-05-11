import React, { createContext, useContext, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setSessions, setActiveSession, setMessages,
  toggleChatPanel, closeChatPanel,
  selectSessions, selectActiveSession,
  selectMessages, selectTotalUnread, selectChatOpen,
  selectSessionMessages,
} from '@store/chatSlice'
import { useSocketContext } from './SocketContext'
import apiClient from '@api/client'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const dispatch       = useDispatch()
  const { joinSession, sendMessage, sendTyping, connected } = useSocketContext()

  const sessions       = useSelector(selectSessions)
  const activeId       = useSelector(selectActiveSession)
  const allMessages    = useSelector(selectMessages)
  const totalUnread    = useSelector(selectTotalUnread)
  const isOpen         = useSelector(selectChatOpen)

  /* Load sessions from API */
  const loadSessions = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/chat/sessions')
      dispatch(setSessions(data.data || data.sessions || []))
    } catch (err) {
      console.warn('[Chat] Failed to load sessions:', err.message)
    }
  }, [dispatch])

  useEffect(() => {
    if (connected) loadSessions()
  }, [connected]) // eslint-disable-line

  /* Select a session and load its messages */
  const openSession = useCallback(async (sessionId) => {
    dispatch(setActiveSession(sessionId))

    joinSession(sessionId, (res) => {
      if (res?.messages) {
        dispatch(setMessages({ sessionId, messages: res.messages }))
      }
    })
  }, [dispatch, joinSession])

  /* Send admin reply */
  const replyMessage = useCallback((body) => {
    if (!activeId || !body?.trim()) return
    sendMessage(activeId, body, (res) => {
      if (res?.success) loadSessions()
    })
  }, [activeId, sendMessage, loadSessions])

  const currentMessages = activeId
    ? (allMessages[activeId] || [])
    : []

  return (
    <ChatContext.Provider value={{
      sessions,
      activeId,
      currentMessages,
      totalUnread,
      isOpen,
      connected,
      openSession,
      replyMessage,
      sendTyping: (isTyping) => activeId && sendTyping(activeId, isTyping),
      togglePanel: () => dispatch(toggleChatPanel()),
      closePanel:  () => dispatch(closeChatPanel()),
      loadSessions,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChatContext = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be inside ChatProvider')
  return ctx
}