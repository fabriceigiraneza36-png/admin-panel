import { createSlice } from '@reduxjs/toolkit'

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    sessions:        [],
    activeSessionId: null,
    messages:        {},    // { [sessionId]: Message[] }
    unreadCounts:    {},    // { [sessionId]: number }
    totalUnread:     0,
    isOpen:          false,
    loading:         false,
  },
  reducers: {
    setSessions: (state, { payload }) => {
      state.sessions = payload
    },

    upsertSession: (state, { payload }) => {
      const idx = state.sessions.findIndex(
        (s) => s.session_id === payload.session_id,
      )
      if (idx !== -1) {
        state.sessions[idx] = { ...state.sessions[idx], ...payload }
      } else {
        state.sessions.unshift(payload)
      }
    },

    setActiveSession: (state, { payload }) => {
      state.activeSessionId = payload
      if (payload) {
        const prev = state.unreadCounts[payload] || 0
        state.unreadCounts[payload] = 0
        state.totalUnread = Math.max(0, state.totalUnread - prev)
      }
    },

    setMessages: (state, { payload: { sessionId, messages } }) => {
      state.messages[sessionId] = messages
    },

    addMessage: (state, { payload }) => {
      const sid = payload.sessionId
      if (!state.messages[sid]) state.messages[sid] = []
      state.messages[sid].push(payload)

      if (
        payload.senderType !== 'admin' &&
        sid !== state.activeSessionId
      ) {
        state.unreadCounts[sid] = (state.unreadCounts[sid] || 0) + 1
        state.totalUnread++
      }

      // Update session last message
      const session = state.sessions.find((s) => s.session_id === sid)
      if (session) {
        session.lastMessage  = payload.body
        session.lastActivity = payload.createdAt
        if (payload.senderType !== 'admin') {
          session.unreadCount = (session.unreadCount || 0) + 1
        }
      }
    },

    setUnreadCount: (state, { payload: { sessionId, count } }) => {
      const prev = state.unreadCounts[sessionId] || 0
      state.unreadCounts[sessionId] = count
      state.totalUnread = Math.max(0, state.totalUnread - prev + count)
    },

    toggleChatPanel: (state) => {
      state.isOpen = !state.isOpen
    },

    closeChatPanel: (state) => {
      state.isOpen = false
    },

    setLoading: (state, { payload }) => {
      state.loading = payload
    },
  },
})

export const {
  setSessions,
  upsertSession,
  setActiveSession,
  setMessages,
  addMessage,
  setUnreadCount,
  toggleChatPanel,
  closeChatPanel,
  setLoading,
} = chatSlice.actions

/* ── Selectors ── */
export const selectSessions        = (s) => s.chat.sessions
export const selectActiveSession   = (s) => s.chat.activeSessionId
export const selectMessages        = (s) => s.chat.messages
export const selectTotalUnread     = (s) => s.chat.totalUnread
export const selectChatOpen        = (s) => s.chat.isOpen
export const selectSessionMessages = (sid) => (s) =>
  s.chat.messages[sid] || []

export default chatSlice.reducer