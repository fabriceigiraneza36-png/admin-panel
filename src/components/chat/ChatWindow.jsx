// admin/src/components/chat/ChatWindow.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Send, MessageCircle, ArrowLeft } from 'lucide-react'
import ChatMessage from './ChatMessage'
import Loader from '@components/common/Loader'
import EmptyState from '@components/common/EmptyState'

const safeArray = (val) => (Array.isArray(val) ? val : [])

export default function ChatWindow({
  messages = [],
  onSend,
  sessionInfo,
  connected,
  loading,
  typingUsers = {},
  onBack,
}) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const safeMessages = safeArray(messages)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [safeMessages.length])

  const handleSend = () => {
    if (!text.trim()) return
    onSend?.(text.trim())
    setText('')
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const someoneTyping = useMemo(
    () => Object.values(typingUsers || {}).some(Boolean),
    [typingUsers]
  )

  if (!sessionInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50">
        <EmptyState
          compact
          icon={MessageCircle}
          title="Select a chat session"
          description="Choose a conversation from the sidebar"
        />
      </div>
    )
  }

  const sessionName =
    sessionInfo.full_name ||
    sessionInfo.userFullName ||
    sessionInfo.email ||
    sessionInfo.userEmail ||
    'Guest'

  const sessionEmail =
    sessionInfo.email ||
    sessionInfo.userEmail ||
    sessionInfo.source ||
    'Unknown'

  const isClosed = sessionInfo.status === 'closed'

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-100 shrink-0 bg-white">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
          title="Back"
        >
          <ArrowLeft size={18} className="text-gray-500" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{sessionName}</p>
          <p className="text-xs text-slate-400 truncate">{sessionEmail}</p>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            connected ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-600'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-primary-500' : 'bg-red-500'}`} />
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-50/50">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader size="md" text="Loading messages…" />
          </div>
        ) : safeMessages.length === 0 ? (
          <div className="flex justify-center py-10">
            <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          safeMessages.map((msg, i) => {
            const isOwn =
              msg.senderType === 'admin' ||
              msg.sender_type === 'admin' ||
              msg.isAdmin === true ||
              msg.role === 'admin'

            return (
              <ChatMessage
                key={msg.id || msg._id || i}
                message={msg}
                isOwn={isOwn}
                onReply={() => {
                  const snippet = msg?.body || msg?.message || ''
                  setText(`Replying to: ${snippet.substring(0, 50)}...\n\n`)
                  inputRef.current?.focus()
                }}
                onDelete={() => {
                  // Placeholder until delete endpoint is added
                  console.info('Delete not implemented yet')
                }}
                showActions
              />
            )
          })
        )}

        {someoneTyping && (
          <div className="flex items-center gap-2 pl-2 py-1">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
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

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isClosed ? (
        <div className="shrink-0 border-t border-surface-100 p-4 bg-white">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your message…"
                rows={1}
                className="input min-h-[44px] max-h-[120px] resize-none py-3 pr-12"
                style={{
                  height: Math.min(120, Math.max(44, text.split('\n').length * 24)),
                }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!text.trim() || !connected}
              className="btn-primary shrink-0 h-[44px] w-[44px] p-0 rounded-xl"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      ) : (
        <div className="shrink-0 border-t border-surface-100 p-4 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">This session is closed.</p>
        </div>
      )}
    </div>
  )
}