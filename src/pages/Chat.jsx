import React, { useState, useEffect } from 'react'
import { MessagesSquare, Wifi, WifiOff } from 'lucide-react'
import { useChat }    from '@hooks/useChat'
import ChatSidebar    from '@components/chat/ChatSidebar'
import ChatWindow     from '@components/chat/ChatWindow'

export default function ChatPage() {
  const {
    sessions, activeId, currentMessages, totalUnread,
    connected, openSession, replyMessage, loadSessions,
  } = useChat()

  const [search, setSearch] = useState('')
  const [sessionLoading, setSessionLoading] = useState(false)

  // Reload sessions periodically
  useEffect(() => {
    loadSessions()
    const timer = setInterval(loadSessions, 15000)
    return () => clearInterval(timer)
  }, [loadSessions])

  const handleSelect = async (sessionId) => {
    setSessionLoading(true)
    await openSession(sessionId)
    setSessionLoading(false)
  }

  const activeSession = sessions.find(
    (s) => (s.session_id || s.id) === activeId
  )

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MessagesSquare size={28} className="text-primary-600" />
            Live Chat
          </h1>
          <p className="page-subtitle flex items-center gap-2">
            {connected
              ? <><Wifi size={12} className="text-primary-500" /> Connected · {sessions.length} sessions</>
              : <><WifiOff size={12} className="text-red-500" /> Disconnected</>
            }
            {totalUnread > 0 && (
              <span className="ml-2 badge-red">{totalUnread} unread</span>
            )}
          </p>
        </div>
      </div>

      {/* Chat layout */}
      <div className="card overflow-hidden flex"
        style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>

        {/* Sidebar — session list */}
        <div className="w-72 lg:w-80 flex-shrink-0 hidden md:flex">
          <ChatSidebar
            sessions={sessions}
            activeId={activeId}
            onSelect={handleSelect}
            search={search}
            onSearch={setSearch}
          />
        </div>

        {/* Mobile session list toggle */}
        <div className="md:hidden w-full">
          {!activeId ? (
            <ChatSidebar
              sessions={sessions}
              activeId={activeId}
              onSelect={handleSelect}
              search={search}
              onSearch={setSearch}
            />
          ) : (
            <div className="flex flex-col h-full">
              <button
                onClick={() => handleSelect(null)}
                className="px-4 py-2 text-sm text-primary-600 font-semibold
                           border-b border-surface-100 hover:bg-primary-50
                           text-left"
              >
                ← Back to chats
              </button>
              <ChatWindow
                messages={currentMessages}
                onSend={replyMessage}
                sessionInfo={activeSession}
                connected={connected}
                loading={sessionLoading}
              />
            </div>
          )}
        </div>

        {/* Desktop chat window */}
        <div className="flex-1 hidden md:flex">
          <ChatWindow
            messages={currentMessages}
            onSend={replyMessage}
            sessionInfo={activeSession}
            connected={connected}
            loading={sessionLoading}
          />
        </div>
      </div>
    </div>
  )
}