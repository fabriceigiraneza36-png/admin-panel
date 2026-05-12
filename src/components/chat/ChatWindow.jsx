import { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import ChatMessage from './ChatMessage'
import Loader from '@components/common/Loader'
import EmptyState from '@components/common/EmptyState'

export default function ChatWindow({ messages, onSend, sessionInfo, connected, loading }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!sessionInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50">
        <EmptyState compact icon={MessageCircle} title="Select a chat session" description="Choose a conversation from the sidebar" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-100 flex-shrink-0 bg-white">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">{sessionInfo.full_name || sessionInfo.email || 'Guest'}</p>
          <p className="text-xs text-slate-400">{sessionInfo.email || sessionInfo.source || 'Unknown'}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
          ${connected ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-600'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-primary-500' : 'bg-red-500'}`} />
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-50/50">
        {loading ? (
          <div className="flex justify-center py-10"><Loader size="md" text="Loading messages…" /></div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center py-10">
            <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage key={msg.id || i} message={msg} isAdmin />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-surface-100 p-4 bg-white">
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
              style={{ height: Math.min(120, Math.max(44, text.split('\n').length * 24)) }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim() || !connected}
            className="btn-primary flex-shrink-0 h-[44px] w-[44px] p-0 rounded-xl"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}