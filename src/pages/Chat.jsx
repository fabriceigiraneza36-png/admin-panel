// admin/src/pages/Chat.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Plus, X, Check, MessageSquare, Users } from 'lucide-react'
import { useChatContext } from '@context/ChatContext'
import { useSocketContext } from '@context/SocketContext'
import { useDebounce } from '@hooks/useDebounce'
import { useToast } from '@hooks/useToast'
import Pagination from '@components/common/Pagination'
import ChatSidebar from '@components/chat/ChatSidebar'
import ChatWindow from '@components/chat/ChatWindow'

const PAGE_SIZE = 20

const safeArray = (val) => (Array.isArray(val) ? val : [])

function StartConversationModal({
  onClose,
  allUsers,
  isLoadingAllUsers,
  onStart,
}) {
  const [userSearch, setUserSearch] = useState('')
  const [pickedUser, setPickedUser] = useState(null)
  const [firstMessage, setFirstMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const users = safeArray(allUsers)

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const q = userSearch.toLowerCase()
    return users.filter((u) =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  }, [users, userSearch])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-800">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Selected user */}
          {pickedUser && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <img
                src={
                  pickedUser.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    pickedUser.full_name || pickedUser.email || 'U'
                  )}&background=059669&color=fff`
                }
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-sm text-emerald-700 flex-1 truncate">
                {pickedUser.full_name || pickedUser.email}
              </span>
              <button onClick={() => setPickedUser(null)} className="shrink-0">
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
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* User list */}
          <div className="rounded-lg border border-gray-100 overflow-hidden max-h-56 overflow-y-auto">
            {isLoadingAllUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">
                {userSearch ? 'No users match your search' : 'No users found'}
              </p>
            ) : (
              filteredUsers.map((user) => {
                const selected = pickedUser?.id === user.id
                return (
                  <button
                    key={user.id}
                    onClick={() => setPickedUser(selected ? null : user)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 ${
                      selected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={
                        user.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.full_name || user.email || 'U'
                        )}&background=059669&color=fff`
                      }
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        e.currentTarget.src =
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
                    {selected && <Check size={16} className="text-emerald-500 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Initial message */}
          <textarea
            placeholder="Optional first message…"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!pickedUser || submitting}
            className="flex-1 py-2.5 text-sm text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? 'Starting…' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  const toast = useToast()
  const {
    sessions: rawSessions,
    isLoadingSessions,
    allUsers: rawAllUsers,
    isLoadingAllUsers,
    selectedSession,
    messages: rawMessages,
    isLoading,
    typingUsers,
    selectSession,
    closeSession,
    sendMessage,
    startSessionWithUser,
    fetchAllUsers,
  } = useChatContext()

  const { isConnected } = useSocketContext()

  const sessions = safeArray(rawSessions)
  const allUsers = safeArray(rawAllUsers)
  const messages = safeArray(rawMessages)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showSidebar, setShowSidebar] = useState(true)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    if (showModal && allUsers.length === 0) {
      fetchAllUsers()
    }
  }, [showModal, allUsers.length, fetchAllUsers])

  const filteredSessions = useMemo(() => {
    let list = sessions

    if (statusFilter !== 'all') {
      list = list.filter((s) => (s.status || 'open') === statusFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter((s) =>
        (s.userFullName || s.full_name || s.userName || '').toLowerCase().includes(q) ||
        (s.userEmail || s.email || '').toLowerCase().includes(q) ||
        (s.lastMessage || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [sessions, debouncedSearch, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pagedSessions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredSessions.slice(start, start + PAGE_SIZE)
  }, [filteredSessions, safePage])

  const handleSelectSession = useCallback(async (session) => {
    await selectSession(session)
    setShowSidebar(false)
  }, [selectSession])

  const handleBackToSidebar = useCallback(() => {
    closeSession()
    setShowSidebar(true)
  }, [closeSession])

  const handleStartConversation = useCallback(async (user, message) => {
    const started = await startSessionWithUser(user, message)
    if (!started) {
      toast.error('Failed to start conversation')
      return
    }
    setShowSidebar(false)
  }, [startSessionWithUser, toast])

  const currentSessionId =
    selectedSession?.sessionId ?? selectedSession?.id ?? selectedSession?._id ?? null

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        {/* Sidebar */}
        <aside
          className={`w-full lg:w-80 border-r border-gray-200 bg-white flex flex-col shrink-0 ${
            showSidebar ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Live Chat</h2>
                <p className="text-xs text-gray-400">
                  {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
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
                  className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
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
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
              />
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {['all', 'open', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                    statusFilter === s
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            <ChatSidebar
              sessions={pagedSessions}
              activeId={currentSessionId}
              onSelect={handleSelectSession}
              search={search}
              onSearch={setSearch}
              loading={isLoadingSessions}
            />
          </div>

          {/* Pagination */}
          {!isLoadingSessions && totalPages > 1 && (
            <div className="border-t border-gray-100 p-2 shrink-0">
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

        {/* Chat area */}
        <main className={`flex-1 min-w-0 ${!showSidebar ? 'flex' : 'hidden lg:flex'}`}>
          <ChatWindow
            messages={messages}
            onSend={sendMessage}
            sessionInfo={selectedSession}
            connected={isConnected}
            loading={isLoading}
            typingUsers={typingUsers}
            onBack={handleBackToSidebar}
          />
        </main>
      </div>

      {showModal && (
        <StartConversationModal
          onClose={() => setShowModal(false)}
          allUsers={allUsers}
          isLoadingAllUsers={isLoadingAllUsers}
          onStart={handleStartConversation}
        />
      )}
    </>
  )
}