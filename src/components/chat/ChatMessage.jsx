import React from 'react'
import { formatTime } from '@utils/formatters'
import {
  Check, CheckCheck, Clock, AlertCircle,
  Image as ImageIcon, FileText, Link2, MapPin,
  Phone, Video, Copy, Reply, Forward, Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ConfirmDialog from '@components/common/ConfirmDialog'

export default function ChatMessage({
  message,
  isOwn,
  onReply,
  onDelete,
  showActions = true,
}) {
  const [showMenu, setShowMenu]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const text     = message.body ?? message.content ?? message.message ?? ''
  const time     = message.createdAt ?? message.created_at ?? null
  const sender   = message.senderName ?? message.sender_name ?? null
  const status   = message.status ?? 'sent'  // 'sent', 'delivered', 'read', 'failed'
  const type     = message.type ?? 'text'    // 'text', 'image', 'file', 'link', 'location', 'contact'
  const meta     = message.meta ?? {}

  const getStatusIcon = () => {
    if (!isOwn) return null
    switch (status) {
      case 'read':   return <CheckCheck size={13} className="text-blue-500" />
      case 'delivered': return <CheckCheck size={13} className="text-gray-400" />
      case 'sent':   return <Check size={13} className="text-gray-400" />
      case 'failed': return <AlertCircle size={13} className="text-red-500" />
      default:       return <Clock size={13} className="text-gray-300" />
    }
  }

  const getTypeIcon = () => {
    if (!meta.attachment) return null
    switch (type) {
      case 'image':
        return (
          <img
            src={meta.attachment.url}
            alt={meta.attachment.name || 'image'}
            className="rounded-lg max-w-[240px] mt-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(meta.attachment.url, '_blank')}
          />
        )
      case 'file':
        return (
          <a
            href={meta.attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 mt-2 hover:bg-gray-100 transition-colors max-w-[280px]"
          >
            <FileText size={20} className="text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">
                {meta.attachment.name || 'File'}
              </p>
              {meta.attachment.size && (
                <p className="text-[10px] text-gray-400">
                  {(meta.attachment.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </a>
        )
      case 'link':
        return (
          <a
            href={meta.link?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 mt-2 hover:bg-blue-100 transition-colors max-w-[280px]"
          >
            <Link2 size={16} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-800 truncate">
                {meta.link?.title || meta.link?.url}
              </p>
              {meta.link?.description && (
                <p className="text-[10px] text-blue-600 truncate">
                  {meta.link.description}
                </p>
              )}
            </div>
          </a>
        )
      case 'location':
        return (
          <a
            href={`https://maps.google.com/?q=${meta.location?.lat},${meta.location?.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 mt-2 hover:bg-amber-100 transition-colors"
          >
            <MapPin size={16} className="text-amber-600" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-800 truncate">
                {meta.location?.name || 'Location'}
              </p>
              {meta.location?.address && (
                <p className="text-[10px] text-amber-600 truncate">
                  {meta.location.address}
                </p>
              )}
            </div>
          </a>
        )
      default:
        return null
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setShowMenu(false)
  }

  const handleReply = () => {
    onReply?.(message)
    setShowMenu(false)
  }

  const handleDelete = () => {
    setShowConfirm(true)
    setShowMenu(false)
  }

  const confirmDelete = () => {
    onDelete?.(message)
    setShowConfirm(false)
  }

  return (
    <div
      className={`relative group flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm transition-all
            ${isOwn
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md hover:border-gray-300'
            }`}
        >
          {/* Sender name */}
          {!isOwn && sender && (
            <p className="text-xs font-semibold mb-1 text-emerald-600">{sender}</p>
          )}

          {/* Text content */}
          {text && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {text}
            </p>
          )}

          {/* Attachments & media */}
          {getTypeIcon()}

          {/* Footer */}
          <div
            className={`flex items-center gap-1.5 mt-1.5
              ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {time && (
              <span className={`text-[10px] ${isOwn ? 'text-emerald-100' : 'text-gray-400'}`}>
                {formatTime(time)}
              </span>
            )}

            {/* Status indicator */}
            {isOwn && getStatusIcon() && (
              <span className="flex items-center gap-0.5">
                {getStatusIcon()}
              </span>
            )}

            {/* Actions menu */}
            {showActions && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity
                    p-1 rounded hover:bg-black/10 ${isOwn ? 'hover:bg-white/20' : ''}`}
                >
                  <MoreHorizontal size={14} className={isOwn ? 'text-white' : 'text-gray-400'} />
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMenu(false)
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`absolute bottom-full right-0 mb-1 w-40 bg-white rounded-lg
                          shadow-xl border border-gray-200 py-1 z-50 overflow-hidden`}
                      >
                        <button
                          onClick={handleReply}
                          className="w-full flex items-center gap-2 px-3 py-1.5
                            text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Reply size={13} />
                          Reply
                        </button>
                        <button
                          onClick={handleCopy}
                          className="w-full flex items-center gap-2 px-3 py-1.5
                            text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Copy size={13} />
                          Copy text
                        </button>
                        <button
                          onClick={() => {
                            // Placeholder: forward functionality
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5
                            text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Forward size={13} />
                          Forward
                        </button>
                        {onDelete && (
                          <div className="h-px bg-gray-100 my-1" />
                        )}
                        {onDelete && (
                          <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-2 px-3 py-1.5
                              text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        type="delete"
        title="Delete message?"
        description="This action cannot be undone."
      />
    </div>
  )
}
