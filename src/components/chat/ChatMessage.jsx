import React from 'react'
import Avatar from '@components/common/Avatar'
import { formatTime } from '@utils/formatters'

export default function ChatMessage({ message, isAdmin }) {
  const fromAdmin = message.senderType === 'admin'

  return (
    <div className={`flex gap-2 ${fromAdmin ? 'flex-row-reverse' : ''}`}>
      <Avatar name={message.senderName || (fromAdmin ? 'Admin' : 'Guest')} size="xs" rounded="full" className="flex-shrink-0 mt-1" />
      <div className={`max-w-[75%] ${fromAdmin ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${fromAdmin
            ? 'bg-primary-600 text-white rounded-br-md'
            : 'bg-surface-100 text-slate-800 rounded-bl-md border border-surface-200'
          }`}>
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        </div>
        <div className={`flex items-center gap-1.5 mt-1 ${fromAdmin ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-slate-400">{message.senderName || (fromAdmin ? 'You' : 'Guest')}</span>
          <span className="text-[10px] text-slate-300">·</span>
          <span className="text-[10px] text-slate-400">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}