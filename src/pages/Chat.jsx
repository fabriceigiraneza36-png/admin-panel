/**
 * Chat.jsx
 * Admin chat — green/white, responsive, with full feature support
 * for reply, forward, edit, delete, pin, reactions, and background theming.
 */

import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from 'react'
import {
  Search, Plus, X, Check,
  MessageSquare, Users, RefreshCw,
  Pin, Image, Palette,
} from 'lucide-react'
import { useChatContext }   from '@context/ChatContext'
import { useSocketContext } from '@context/SocketContext'
import { useDebounce }      from '@hooks/useDebounce'
import ChatSidebar          from '@components/chat/ChatSidebar'
import ChatWindow           from '@components/chat/ChatWindow'

const PAGE_SIZE = 20
const safeArr = (v) => (Array.isArray(v) ? v : [])

/* ── Avatar ───────────────────────────────────────────────────────────── */
const avatar = (name, email, url) => {
  if (url) return url
  const label = encodeURIComponent(name || email || 'U')
  return `https://ui-avatars.com/api/?name=${label}&background=16a34a&color=fff&bold=true`
}

/* ── Background presets (admin side) ─────────────────────────────────── */
const ADMIN_BACKGROUNDS = [
  { id: 'default',   label: 'Default',     value: '#f9fafb',   type: 'solid' },
  { id: 'soft',      label: 'Soft Green',  value: '#f0fdf4',   type: 'solid' },
  { id: 'white',     label: 'Clean White', value: '#ffffff',   type: 'solid' },
  { id: 'dark',      label: 'Dark',        value: '#052e16',   type: 'solid' },
  { id: 'gradient1', label: 'Emerald',     value: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', type: 'gradient' },
  { id: 'pattern1',  label: 'Dots',        value: 'radial-gradient(circle,#16a34a 1px,transparent 1px),#f9fafb', size: '20px 20px', type: 'pattern' },
]

/* ══════════════════════════════════════════════════════════════════════════
   START CONVERSATION MODAL
   ══════════════════════════════════════════════════════════════════════════ */
function StartConversationModal({ onClose, onStart }) {
  const { allUsers, isLoadingAllUsers, fetchAllUsers } = useChatContext()

  const [search,       setSearch]       = useState('')
  const [picked,       setPicked]       = useState(null)
  const [firstMessage, setFirstMessage] = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  const searchRef = useRef(null)

  useEffect(() => {
    fetchAllUsers()
    const t = setTimeout(() => searchRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [fetchAllUsers])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const users    = safeArr(allUsers)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email     || '').toLowerCase().includes(q),
    )
  }, [users, search])

  const handleSubmit = async () => {
    if (!picked || submitting) return
    setSubmitting(true)
    try {
      const result = await onStart(picked, firstMessage)
      if (result) onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-green-100 bg-white shadow-2xl sm:max-h-[80vh] sm:max-w-lg sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-green-100 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-green-900">New Conversation</h2>
            <p className="mt-0.5 text-sm text-green-400">
              {users.length} user{users.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button onClick={onClose}
            className="rounded-xl p-2 text-green-300 transition-colors hover:bg-green-50 hover:text-green-600"
            type="button">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Selected user */}
          {picked && (
            <div className="px-4 pt-4 sm:px-6">
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <img src={avatar(picked.full_name, picked.email, picked.avatar_url)}
                  alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-green-200" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-green-800">{picked.full_name || picked.email}</p>
                  <p className="truncate text-xs text-green-500">{picked.email}</p>
                </div>
                <button onClick={() => setPicked(null)}
                  className="rounded-lg p-1 transition-colors hover:bg-green-100" type="button">
                  <X size={14} className="text-green-400" />
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-4 pt-4 sm:px-6">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-green-300" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search users by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && picked && !submitting) handleSubmit() }}
                className="w-full rounded-xl border border-green-200 bg-green-50 py-2.5 pl-10 pr-4 text-sm text-green-900 placeholder:text-green-300 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* User list */}
          <div className="px-3 py-3">
            {isLoadingAllUsers ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                <p className="text-sm text-green-400">Loading users…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <Users size={32} className="text-green-200" />
                <p className="text-sm text-green-400">
                  {search ? 'No users match your search' : 'No users found'}
                </p>
              </div>
            ) : (
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {filtered.map((user) => {
                  const isSelected = picked?.id === user.id
                  return (
                    <button key={user.id}
                      onClick={() => setPicked(isSelected ? null : user)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                        isSelected ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-green-50/60'
                      }`}
                      type="button"
                    >
                      <div className="relative shrink-0">
                        <img src={avatar(user.full_name, user.email, user.avatar_url)}
                          alt="" className="h-9 w-9 rounded-full object-cover"
                          onError={(e) => { e.currentTarget.src = avatar(user.full_name, user.email) }} />
                        {user.is_online && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>
                          {user.full_name || 'No name'}
                        </p>
                        <p className="truncate text-xs text-gray-400">{user.email}</p>
                      </div>
                      {isSelected && <Check size={16} className="shrink-0 text-green-500" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* First message */}
          <div className="px-4 pb-4 sm:px-6">
            <label className="mb-1.5 block text-xs font-medium text-green-500">
              First message (optional)
            </label>
            <textarea
              placeholder="Type a message to start the conversation…"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-900 placeholder:text-green-300 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-green-100 px-4 py-4 sm:px-6">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-green-200 bg-green-50 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
            type="button">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!picked || submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-green-200 transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            type="button">
            {submitting ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Starting…</>
            ) : (
              <><MessageSquare size={15} /> Start Chat</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   BACKGROUND PICKER (admin)
   ══════════════════════════════════════════════════════════════════════════ */
function AdminBgPicker({ current, onChange, onClose }) {
  return (
    <div className="absolute right-4 top-16 z-50 w-64 rounded-2xl border border-green-100 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-green-800">
          Chat Background
        </span>
        <button onClick={onClose} className="rounded-lg p-1 text-green-400 hover:bg-green-50" type="button">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ADMIN_BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => { onChange(bg); onClose() }}
            title={bg.label}
            type="button"
            className={`relative h-12 rounded-xl border-2 transition-all ${
              current?.id === bg.id
                ? 'border-green-500 shadow-md'
                : 'border-transparent hover:border-green-300'
            }`}
            style={{ background: bg.value, backgroundSize: bg.size || 'cover' }}
          >
            {current?.id === bg.id && (
              <span className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-green-600/20">
                <Check size={14} className="text-green-700" />
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-green-400">
        {current?.label || 'Default'}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN CHAT PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function Chat() {
  const {
    sessions: rawSessions,
    isLoadingSessions,
    selectedSession,
    messages: rawMessages,
    isLoadingMessages,
    isSending,
    typingUsers,
    unreadTotal,
    selectSession,
    closeSession,
    sendMessage,
    startSessionWithUser,
    refreshSessions,
    updateSessionStatus,
    editAdminMessage,
    deleteAdminMessage,
    pinAdminMessage,
    reactAdminMessage,
  } = useChatContext()

  const { isConnected } = useSocketContext()

  const sessions = safeArr(rawSessions)
  const messages = safeArr(rawMessages)

  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [showModal,    setShowModal]    = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [mobileSide,   setMobileSide]   = useState(true)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [chatBg,       setChatBg]       = useState(ADMIN_BACKGROUNDS[0])
  const [pinnedMsgs,   setPinnedMsgs]   = useState([])
  const [showPinned,   setShowPinned]   = useState(false)

  const dSearch = useDebounce(search, 280)

  useEffect(() => { setPage(1) }, [dSearch, statusFilter])
  useEffect(() => { if (selectedSession) setMobileSide(false) }, [selectedSession])

  const filtered = useMemo(() => {
    let list = sessions
    if (statusFilter !== 'all') list = list.filter((s) => (s.status || 'open') === statusFilter)
    if (dSearch) {
      const q = dSearch.toLowerCase()
      list = list.filter(
        (s) =>
          (s.full_name    || '').toLowerCase().includes(q) ||
          (s.email        || '').toLowerCase().includes(q) ||
          (s.lastMessage  || '').toLowerCase().includes(q),
      )
    }
    return list
  }, [sessions, dSearch, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  const handleSelect = useCallback(async (session) => {
    await selectSession(session)
    // Load pins for this session
    const storedPins = JSON.parse(localStorage.getItem(`pins_${session.sessionId}`) || '[]')
    setPinnedMsgs(storedPins)
  }, [selectSession])

  const handleBack = useCallback(() => { closeSession(); setMobileSide(true) }, [closeSession])

  const handleStart = useCallback(async (user, message) => {
    return await startSessionWithUser(user, message)
  }, [startSessionWithUser])

  const handleToggleSession = useCallback(() => {
    if (!selectedSession) return
    const next = selectedSession.status === 'open' ? 'closed' : 'open'
    updateSessionStatus(selectedSession.sessionId, next)
  }, [selectedSession, updateSessionStatus])

  const handlePin = useCallback((msg) => {
    if (!selectedSession) return
    const key = `pins_${selectedSession.sessionId}`
    const isPinned = !msg.isPinned
    if (isPinned) {
      const updated = [...pinnedMsgs.filter(m => m.id !== msg.id), { ...msg, isPinned: true }]
      setPinnedMsgs(updated)
      localStorage.setItem(key, JSON.stringify(updated))
    } else {
      const updated = pinnedMsgs.filter(m => m.id !== msg.id)
      setPinnedMsgs(updated)
      localStorage.setItem(key, JSON.stringify(updated))
    }
    pinAdminMessage?.(selectedSession.sessionId, msg.id, isPinned)
  }, [selectedSession, pinnedMsgs, pinAdminMessage])

  const currentId = selectedSession?.sessionId ?? null

  const tabs = useMemo(() => [
    { key: 'all',    label: 'All',    count: sessions.length },
    { key: 'open',   label: 'Open',   count: sessions.filter((s) => (s.status || 'open') === 'open').length },
    { key: 'closed', label: 'Closed', count: sessions.filter((s) => s.status === 'closed').length },
  ], [sessions])

  const chatBgStyle = useMemo(() => {
    const bg = chatBg
    if (!bg) return {}
    if (bg.type === 'gradient' || bg.type === 'pattern')
      return { background: bg.value, backgroundSize: bg.size || 'auto' }
    return { backgroundColor: bg.value }
  }, [chatBg])

  return (
    <>
      <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 w-full overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-green-100 sm:bg-green-50/30">

        {/* ══ SIDEBAR ════════════════════════════════════════════════════ */}
        <aside className={`
          absolute inset-y-0 left-0 z-20 flex w-full max-w-full flex-col
          overflow-hidden border-r border-green-100 bg-white shadow-lg
          transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:w-[320px] lg:shadow-none xl:w-[360px]
          ${mobileSide ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Sidebar header */}
          <div className="shrink-0 space-y-3 border-b border-green-100 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
            {/* Title row */}
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-green-900">Live Chat</h1>
                  {unreadTotal > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-bold leading-none text-white">
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {isConnected ? (
                    <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    <span className="text-xs font-medium text-green-600">Live</span></>
                  ) : (
                    <><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-medium text-amber-600">Reconnecting…</span></>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button onClick={() => refreshSessions()} title="Refresh"
                  className="rounded-xl p-2 text-green-300 transition-colors hover:bg-green-50 hover:text-green-600"
                  type="button">
                  <RefreshCw size={15} />
                </button>
                <button onClick={() => setShowModal(true)} title="New conversation"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-green-200 transition-colors hover:bg-green-700"
                  type="button">
                  <Plus size={14} />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-green-300" />
              <input type="text" placeholder="Search conversations…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-green-200 bg-green-50 py-2 pl-9 pr-8 text-sm text-green-900 placeholder:text-green-300 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 transition-colors hover:bg-green-100"
                  type="button">
                  <X size={12} className="text-green-400" />
                </button>
              )}
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 rounded-xl border border-green-100 bg-green-50 p-0.5">
              {tabs.map((tab) => (
                <button key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                    statusFilter === tab.key
                      ? 'border border-green-100 bg-white text-green-800 shadow-sm'
                      : 'text-green-500 hover:text-green-700'
                  }`}
                  type="button">
                  <span className="capitalize">{tab.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    statusFilter === tab.key
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-100/70 text-green-400'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatSidebar
              sessions={paged} activeId={currentId}
              onSelect={handleSelect} loading={isLoadingSessions} search={dSearch} />
          </div>

          {/* Pagination */}
          {!isLoadingSessions && totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-green-100 px-4 py-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                type="button">Prev</button>
              <span className="text-xs text-green-400">{safePage} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                type="button">Next</button>
            </div>
          )}
        </aside>

        {/* ══ CHAT WINDOW ════════════════════════════════════════════════ */}
        <main className={`
          relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${mobileSide ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}
        `}>
          {/* Window toolbar */}
          {selectedSession && (
            <div className="flex shrink-0 items-center gap-2 border-b border-green-100 bg-white px-4 py-2">
              {/* Pin indicator */}
              {pinnedMsgs.length > 0 && (
                <button
                  onClick={() => setShowPinned(v => !v)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    showPinned
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                  type="button"
                >
                  <Pin size={12} />
                  {pinnedMsgs.length} pinned
                </button>
              )}

              <div className="flex-1" />

              {/* Background picker button */}
              <div className="relative">
                <button
                  onClick={() => setShowBgPicker(v => !v)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    showBgPicker
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                  type="button"
                  title="Chat background"
                >
                  <Palette size={12} />
                  <span className="hidden sm:inline">Background</span>
                </button>

                {showBgPicker && (
                  <AdminBgPicker
                    current={chatBg}
                    onChange={setChatBg}
                    onClose={() => setShowBgPicker(false)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Pinned messages panel (admin) */}
          {showPinned && selectedSession && pinnedMsgs.length > 0 && (
            <div className="shrink-0 border-b border-yellow-100 bg-yellow-50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-800">
                  <Pin size={12} /> Pinned Messages
                </span>
                <button onClick={() => setShowPinned(false)}
                  className="rounded-lg p-1 text-yellow-600 hover:bg-yellow-100" type="button">
                  <X size={12} />
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {pinnedMsgs.map((m) => (
                  <div key={m.id}
                    className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-white px-3 py-2">
                    <span className="text-xs font-semibold text-yellow-700">{m.senderName || 'User'}</span>
                    <span className="flex-1 truncate text-xs text-gray-600">{m.body}</span>
                    <span className="text-xs text-yellow-500">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ChatWindow
            session={selectedSession}
            messages={messages}
            onSend={sendMessage}
            onBack={handleBack}
            onToggleStatus={handleToggleSession}
            onEdit={editAdminMessage}
            onDelete={deleteAdminMessage}
            onPin={handlePin}
            onReact={reactAdminMessage}
            isConnected={isConnected}
            isLoading={isLoadingMessages}
            isSending={isSending}
            typingUsers={typingUsers}
            chatBgStyle={chatBgStyle}
            pinnedMsgs={pinnedMsgs}
          />
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <StartConversationModal
          onClose={() => setShowModal(false)}
          onStart={handleStart}
        />
      )}
    </>
  )
}