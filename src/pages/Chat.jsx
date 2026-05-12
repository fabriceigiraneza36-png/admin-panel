import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessagesSquare, Wifi, WifiOff, Search, Send, Users,
  MessageCircle, ArrowLeft, Phone, Mail, Shield, Globe,
  Clock, ChevronRight, Plus, Loader2, User, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocketContext }        from '@context/SocketContext'
import { chatAPI }                 from '@api/chat'
import { getErrorMessage }         from '@api/client'
import { useToast }                from '@hooks/useToast'
import Avatar                      from '@components/common/Avatar'
import Badge                       from '@components/common/Badge'
import EmptyState                  from '@components/common/EmptyState'
import { formatTimeAgo, formatDate, formatTime, getInitials } from '@utils/formatters'

/* ═══════════════════════════════════════════════════════════════════════
   MESSAGE BUBBLE
   ═══════════════════════════════════════════════════════════════════════ */
function Bubble({ msg }) {
  const isAdmin = msg.sender_type === 'admin' || msg.senderType === 'admin'
  const body    = msg.body    || msg.message || ''
  const name    = msg.sender_name || msg.senderName || (isAdmin ? 'You' : 'User')
  const time    = msg.created_at  || msg.createdAt   || ''
  const read    = msg.is_read     || msg.isRead

  return (
    <div className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : ''}`}
         style={{ animation: 'fadeSlideUp 0.25s ease' }}>
      <div className="flex-shrink-0 mt-1">
        <Avatar name={name} size="xs" rounded="full" />
      </div>
      <div style={{ maxWidth: '72%' }}>
        <div
          className="px-4 py-2.5 text-sm leading-relaxed"
          style={{
            borderRadius: isAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background:   isAdmin
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : '#f0fdf4',
            color:        isAdmin ? '#fff' : '#1a1a1a',
            border:       isAdmin ? 'none' : '1px solid #d1fae5',
            boxShadow:    isAdmin ? '0 4px 12px rgba(5,150,105,0.2)' : 'none',
            whiteSpace:   'pre-wrap',
            wordBreak:    'break-word',
          }}
        >
          {!isAdmin && (
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#059669',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        marginBottom: '3px' }}>
              {name}
            </p>
          )}
          {body}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 ${isAdmin ? 'justify-end' : ''}`}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>
            {formatTime(time)}
          </span>
          {isAdmin && (
            <span style={{ fontSize: '11px', color: read ? '#34d399' : '#9ca3af' }}>
              {read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   TYPING INDICATOR
   ═══════════════════════════════════════════════════════════════════════ */
function TypingDots() {
  return (
    <div className="flex items-end gap-2">
      <Avatar name="User" size="xs" rounded="full" />
      <div style={{
        display: 'flex', gap: '5px', padding: '12px 16px',
        background: '#f0fdf4', border: '1px solid #d1fae5',
        borderRadius: '18px 18px 18px 4px',
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#059669', display: 'block',
            animation: `typingDot 1.4s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   USER LIST ITEM
   ═══════════════════════════════════════════════════════════════════════ */
function UserListItem({ user, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-150"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '12px',
        padding:      '12px 14px',
        background:   isActive ? '#f0fdf4' : 'transparent',
        borderLeft:   isActive ? '3px solid #059669' : '3px solid transparent',
        borderBottom: '1px solid #f3f4f6',
        cursor:       'pointer',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#fafffe' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Avatar with online dot */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={user.avatar_url}
          name={user.full_name || user.email}
          size="sm"
          rounded="full"
        />
        {user.is_online && (
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#22c55e', border: '2px solid #fff',
          }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>
            {user.full_name || user.email?.split('@')[0] || 'User'}
          </p>
          {user.last_message_at && (
            <span className="text-[10px] flex-shrink-0"
                  style={{ color: '#9ca3af' }}>
              {formatTimeAgo(user.last_message_at)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs truncate"
             style={{ color: user.last_message ? '#6b7280' : '#d1d5db' }}>
            {user.last_message
              ? user.last_message.slice(0, 40) + (user.last_message.length > 40 ? '…' : '')
              : user.email || 'No messages yet'}
          </p>
          {user.unread_count > 0 && (
            <span style={{
              flexShrink: 0, minWidth: '18px', height: '18px',
              padding: '0 5px', borderRadius: '99px',
              background: '#059669', color: '#fff',
              fontSize: '10px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {user.unread_count > 99 ? '99+' : user.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   USER INFO PANEL
   ═══════════════════════════════════════════════════════════════════════ */
function UserInfoHeader({ user }) {
  if (!user) return null

  const fullName = user.full_name || user.email?.split('@')[0] || 'User'
  const isOnline = user.is_online || (
    user.last_login && new Date(user.last_login) > new Date(Date.now() - 5 * 60 * 1000)
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 18px',
      background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
      borderBottom: '1px solid #d1fae5',
      flexShrink: 0,
    }}>
      <div className="relative flex-shrink-0">
        <Avatar src={user.avatar_url} name={fullName} size="md" rounded="full" />
        {isOnline && (
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: '12px', height: '12px', borderRadius: '50%',
            background: '#22c55e', border: '2px solid #f0fdf4',
          }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: '#1a1a1a' }}>
          {fullName}
        </p>
        <p className="text-xs truncate" style={{ color: '#6b7280' }}>
          {user.email}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {isOnline ? (
            <span className="flex items-center gap-1 text-[10px] font-bold"
                  style={{ color: '#059669' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#22c55e', display: 'inline-block',
              }} />
              Online
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: '#9ca3af' }}>
              Last seen {formatTimeAgo(user.last_login)}
            </span>
          )}
          {user.is_verified && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold"
                  style={{ color: '#065f46' }}>
              <Shield size={9} /> Verified
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   CHAT PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const toast = useToast()

  let socketConnected = false
  try {
    const ctx = useSocketContext()
    socketConnected = ctx?.connected || false
  } catch { socketConnected = false }

  // State
  const [users,          setUsers]          = useState([])
  const [loadingUsers,   setLoadingUsers]   = useState(true)
  const [userSearch,     setUserSearch]     = useState('')
  const [activeUser,     setActiveUser]     = useState(null)
  const [messages,       setMessages]       = useState([])
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [convId,         setConvId]         = useState(null)
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [showMobileList, setShowMobileList] = useState(true)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const pollRef   = useRef(null)

  // ── Load users ──
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const { data } = await chatAPI.getUsers({
        limit:  100,
        search: userSearch || undefined,
      })
      setUsers(data.data || [])
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoadingUsers(false)
    }
  }, [userSearch, toast])

  useEffect(() => { loadUsers() }, [loadUsers])

  // Refresh users list every 20 seconds
  useEffect(() => {
    const timer = setInterval(loadUsers, 20000)
    return () => clearInterval(timer)
  }, [loadUsers])

  // ── Select user & load conversation ──
  const selectUser = useCallback(async (user) => {
    setActiveUser(user)
    setShowMobileList(false)
    setLoadingMsgs(true)
    setMessages([])
    setConvId(null)

    try {
      const { data } = await chatAPI.getUserConvo(user.id)
      const d = data.data || data

      if (d.conversation) {
        setConvId(d.conversation.id)
        setMessages(d.messages || [])
      } else {
        setConvId(null)
        setMessages([])
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error(getErrorMessage(err))
      }
    } finally {
      setLoadingMsgs(false)
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 100)
    }
  }, [toast])

  // ── Poll for new messages when conversation is active ──
  useEffect(() => {
    if (!convId) return
    clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await chatAPI.getMessages(convId, { limit: 100 })
        const newMsgs = data.data || data.messages || []
        setMessages((prev) => {
          if (newMsgs.length !== prev.length) return newMsgs
          const lastNew  = newMsgs[newMsgs.length - 1]?.id
          const lastPrev = prev[prev.length - 1]?.id
          return lastNew !== lastPrev ? newMsgs : prev
        })
      } catch {}
    }, 4000)

    return () => clearInterval(pollRef.current)
  }, [convId])

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ──
  const handleSend = useCallback(async () => {
    const body = input.trim()
    if (!body || !activeUser) return

    setSending(true)
    try {
      if (convId) {
        // Reply in existing conversation
        await chatAPI.adminReply(convId, { body })
      } else {
        // Start new conversation with user
        const { data } = await chatAPI.startWithUser({
          userId:  activeUser.id,
          message: body,
        })
        const d = data.data || data
        setConvId(d.conversation?.id || null)
      }

      setInput('')

      // Refresh messages
      setTimeout(async () => {
        if (convId) {
          try {
            const { data } = await chatAPI.getMessages(convId, { limit: 100 })
            setMessages(data.data || data.messages || [])
          } catch {}
        } else {
          // Re-fetch via user conversation
          try {
            const { data } = await chatAPI.getUserConvo(activeUser.id)
            const d = data.data || data
            if (d.conversation) {
              setConvId(d.conversation.id)
              setMessages(d.messages || [])
            }
          } catch {}
        }
        loadUsers()
      }, 500)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, activeUser, convId, toast, loadUsers])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"
              style={{ color: '#111827' }}>
            <MessagesSquare size={26} className="text-emerald-600" />
            Live Chat
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2"
             style={{ color: '#6b7280' }}>
            {socketConnected
              ? <><Wifi size={12} style={{ color: '#059669' }} /> Connected</>
              : <><WifiOff size={12} style={{ color: '#ef4444' }} /> Polling mode</>
            }
            <span>·</span>
            <span>{users.length} users</span>
            <span>·</span>
            <span>
              {users.filter((u) => u.unread_count > 0).length} with unread
            </span>
          </p>
        </div>
      </div>

      {/* Chat layout */}
      <div
        className="overflow-hidden flex"
        style={{
          background:   '#fff',
          borderRadius: '20px',
          border:       '1px solid #e5e7eb',
          height:       'calc(100vh - 220px)',
          minHeight:    '500px',
          boxShadow:    '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        {/* ── LEFT: User list ── */}
        <div
          className={`flex-col ${showMobileList ? 'flex' : 'hidden'} md:flex`}
          style={{
            width:       '320px',
            borderRight: '1px solid #f3f4f6',
            flexShrink:  0,
            background:  '#fff',
          }}
        >
          {/* Search */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
            <div className="relative">
              <Search size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: '#9ca3af' }} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full py-2 pr-3 text-sm rounded-xl outline-none"
                style={{
                  paddingLeft: '34px', color: '#1a1a1a',
                  background: '#f9fafb', border: '1.5px solid #e5e7eb',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(5,150,105,0.06)' }}
                onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase"
               style={{ color: '#9ca3af', letterSpacing: '0.15em' }}>
              {loadingUsers ? 'Loading…' : `${users.length} users`}
            </p>
          </div>

          {/* User list */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin" style={{ color: '#059669' }} />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users size={32} style={{ color: '#d1d5db' }} className="mx-auto mb-3" />
                <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>
                  {userSearch ? 'No users found' : 'No registered users yet'}
                </p>
              </div>
            ) : (
              users.map((u) => (
                <UserListItem
                  key={u.id}
                  user={u}
                  isActive={activeUser?.id === u.id}
                  onClick={() => selectUser(u)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Chat window ── */}
        <div className={`flex-1 flex flex-col ${!showMobileList ? 'flex' : 'hidden'} md:flex`}
             style={{ background: '#fafffe', minWidth: 0 }}>

          {activeUser ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <button
                  onClick={() => setShowMobileList(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold w-full"
                  style={{ color: '#059669', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <ArrowLeft size={16} /> Back to users
                </button>
              </div>

              {/* User info header */}
              <UserInfoHeader user={activeUser} />

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '8px',
                scrollbarWidth: 'thin', scrollbarColor: '#d1fae5 transparent',
              }}>
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin" style={{ color: '#059669' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={40} style={{ color: '#d1fae5' }} className="mx-auto mb-3" />
                    <p className="text-sm font-semibold" style={{ color: '#6b7280' }}>
                      No messages yet
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <Bubble key={msg.id || i} msg={msg} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                flexShrink: 0, padding: '12px 14px',
                borderTop: '1px solid #f3f4f6', background: '#fff',
              }}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message…"
                    rows={1}
                    className="flex-1 outline-none resize-none"
                    style={{
                      padding: '10px 14px', fontSize: '14px',
                      borderRadius: '14px', border: '1.5px solid #d1fae5',
                      background: '#f8fffe', color: '#1a1a1a',
                      minHeight: '42px', maxHeight: '120px',
                      lineHeight: '1.5', scrollbarWidth: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#059669'
                      e.target.style.boxShadow   = '0 0 0 3px rgba(5,150,105,0.08)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1fae5'
                      e.target.style.boxShadow   = 'none'
                    }}
                  />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    style={{
                      width: '42px', height: '42px', flexShrink: 0,
                      borderRadius: '14px', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                      background: input.trim()
                        ? 'linear-gradient(135deg, #059669, #10b981)'
                        : '#e5e7eb',
                      color: input.trim() ? '#fff' : '#9ca3af',
                      boxShadow: input.trim()
                        ? '0 4px 12px rgba(5,150,105,0.3)'
                        : 'none',
                      opacity: sending ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (input.trim()) e.currentTarget.style.transform = 'scale(1.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                    title="Send"
                  >
                    {sending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
                <p style={{ fontSize: '10px', color: '#d1d5db', marginTop: '4px', marginLeft: '4px' }}>
                  <kbd style={{ color: '#9ca3af' }}>Enter</kbd> to send
                  · <kbd style={{ color: '#9ca3af' }}>Shift+Enter</kbd> for new line
                </p>
              </div>
            </>
          ) : (
            /* No user selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <div style={{
                  width: '72px', height: '72px', borderRadius: '24px',
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <MessagesSquare size={32} style={{ color: '#059669' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>
                  Select a user to chat
                </h3>
                <p className="text-sm mt-1" style={{ color: '#9ca3af', maxWidth: '280px' }}>
                  Choose a user from the list to view their messages or start a new conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%           { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}