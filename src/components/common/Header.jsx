import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate }    from 'react-router-dom'
import { useDispatch, useSelector }    from 'react-redux'
import { motion, AnimatePresence }     from 'framer-motion'
import {
  Bell, MessageCircle, ChevronDown,
  User, Settings, LogOut, Shield, WifiOff, Wifi,
} from 'lucide-react'
import { useAuth }                     from '@hooks/useAuth'
import { useToast }                    from '@hooks/useToast'
import { useSocketContext }            from '@context/SocketContext'
import {
  selectUnreadCount,
  togglePanel,
} from '@store/notificationsSlice'
import {
  selectTotalUnread,
  toggleChatPanel,
} from '@store/chatSlice'

/* ── import getInitials + getAvatarColor from formatters (correct location) ── */
import { getInitials, getAvatarColor } from '@utils/formatters'

import NotificationPanel from '@components/notifications/NotificationPanel'
import { NAV_ITEMS }     from '@utils/constants'

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED HAMBURGER ICON
   ═══════════════════════════════════════════════════════════════════════════ */
function AnimatedHamburger({ isOpen, onClick, className }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      className={`relative w-10 h-10 flex items-center justify-center
                  rounded-xl transition-all duration-300 ease-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                  focus-visible:ring-offset-2 ${className || ''}`}
      style={{
        background: isOpen ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
        color:      isOpen ? '#059669'     : '#6b7280',
      }}
    >
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ display: 'block' }}
      >
        {/* Top bar → becomes X top-left to bottom-right */}
        <motion.path
          d="M3 6h18"
          initial={{ rotate: 0, y: 0 }}
          animate={{
            rotate: isOpen ? 135 : 0,
            y: isOpen ? 5.5 : 0,
          }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        />
        {/* Middle bar → fades out */}
        <motion.path
          d="M3 12h18"
          initial={{ opacity: 1 }}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        />
        {/* Bottom bar → becomes X bottom-left to top-right */}
        <motion.path
          d="M3 18h18"
          initial={{ rotate: 0, y: 0 }}
          animate={{
            rotate: isOpen ? -135 : 0,
            y: isOpen ? -5.5 : 0,
          }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        />
      </motion.svg>
    </button>
  )
}

/* ── Page title from pathname ── */
const getPageTitle = (pathname) => {
  const found = NAV_ITEMS.find((n) => pathname.startsWith(n.path))
  return found?.label || 'Dashboard'
}

/* ── Admin dropdown ── */
function AdminMenu({ admin, onLogout, onClose }) {
  const navigate = useNavigate()

  const items = [
    {
      icon:   User,
      label:  'My Profile',
      action: () => { navigate('/settings'); onClose() },
    },
    {
      icon:   Settings,
      label:  'Settings',
      action: () => { navigate('/settings'); onClose() },
    },
    {
      icon:   Shield,
      label:  'Security',
      action: () => { navigate('/settings'); onClose() },
    },
    { type: 'divider' },
    {
      icon:    LogOut,
      label:   'Sign Out',
      action:  onLogout,
      danger:  true,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1,    y: 0   }}
      exit={{   opacity: 0, scale: 0.95, y: -8   }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl
                 shadow-xl border border-gray-100 overflow-hidden z-50"
    >
      {/* Admin info header */}
      <div className="px-4 py-3 border-b border-gray-50"
           style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
        <p className="text-sm font-bold text-gray-800 truncate">
          {admin?.fullName || admin?.full_name || admin?.username || 'Admin'}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {admin?.email || ''}
        </p>
        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5
                         rounded-full text-[10px] font-bold capitalize"
              style={{ background: '#dcfce7', color: '#065f46' }}>
          <Shield size={9} />
          {admin?.role || 'admin'}
        </span>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {items.map((item, i) => {
          if (item.type === 'divider') {
            return <div key={i} className="my-1 border-t border-gray-100" />
          }
          return (
            <button
              key={i}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-2.5
                         text-sm transition-colors duration-100"
              style={{
                color: item.danger ? '#dc2626' : '#374151',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.danger ? '#fef2f2' : '#f0fdf4'
                e.currentTarget.style.color      = item.danger ? '#dc2626' : '#059669'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color      = item.danger ? '#dc2626' : '#374151'
              }}
            >
              <item.icon size={15} strokeWidth={2} />
              {item.label}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADER COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Header({ onMenuClick, isMobileOpen }) {
  const location    = useLocation()
  const dispatch    = useDispatch()
  const { admin, logout } = useAuth()
  const { success: toastSuccess } = useToast()

   /* Socket connection status */
   const { isConnected } = useSocketContext()
   const connected = isConnected

  const notifUnread = useSelector(selectUnreadCount)
  const chatUnread  = useSelector(selectTotalUnread)

  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const adminMenuRef = useRef(null)

  const pageTitle = getPageTitle(location.pathname)

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setAdminMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setAdminMenuOpen(false)
    await logout()
    toastSuccess('Signed out successfully')
  }

  /* Safe initials + color */
  const displayName = admin?.fullName || admin?.full_name || admin?.username || 'Admin'
  const initials    = getInitials(displayName)
  const avatarColor = getAvatarColor(displayName)

  /* Color class to bg style mapping */
  const avatarStyle = (() => {
    const colorMap = {
      'bg-green-500':   '#22c55e',
      'bg-emerald-500': '#10b981',
      'bg-teal-500':    '#14b8a6',
      'bg-blue-500':    '#3b82f6',
      'bg-indigo-500':  '#6366f1',
      'bg-violet-500':  '#8b5cf6',
      'bg-orange-500':  '#f97316',
      'bg-rose-500':    '#f43f5e',
      'bg-cyan-500':    '#06b6d4',
    }
    return colorMap[avatarColor] || '#059669'
  })()

  return (
    <>
      <header className="flex-shrink-0 h-16 bg-white border-b border-gray-100
                         flex items-center gap-4 px-4 md:px-6 z-30 relative">

         {/* Mobile menu button */}
         <AnimatedHamburger
           isOpen={isMobileOpen}
           onClick={onMenuClick}
           className="lg:hidden"
         />

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate leading-tight">
            {pageTitle}
          </h2>
          <p className="text-xs text-gray-400 hidden sm:block mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year:    'numeric',
              month:   'long',
              day:     'numeric',
            })}
          </p>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 md:gap-2">

          {/* Connection badge */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1
                       rounded-full text-xs font-semibold"
            style={{
              background: connected ? '#f0fdf4' : '#fef2f2',
              color:      connected ? '#065f46' : '#dc2626',
            }}
            title={connected ? 'Real-time connected' : 'Disconnected from server'}
          >
            {connected
              ? <><Wifi    size={11} /> Live</>
              : <><WifiOff size={11} /> Offline</>
            }
          </div>

          {/* Chat button */}
          <button
            onClick={() => dispatch(toggleChatPanel())}
            className="relative w-9 h-9 flex items-center justify-center
                       rounded-xl transition-all duration-150"
            style={{ color: '#6b7280', background: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0fdf4'
              e.currentTarget.style.color      = '#059669'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color      = '#6b7280'
            }}
            title="Live Chat"
          >
            <MessageCircle size={19} />
            {chatUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]
                               px-1 flex items-center justify-center
                               rounded-full text-white text-[10px] font-bold"
                    style={{ background: '#ef4444' }}>
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </button>

          {/* Notifications button */}
          <button
            onClick={() => dispatch(togglePanel())}
            className="relative w-9 h-9 flex items-center justify-center
                       rounded-xl transition-all duration-150"
            style={{ color: '#6b7280', background: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0fdf4'
              e.currentTarget.style.color      = '#059669'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color      = '#6b7280'
            }}
            title="Notifications"
          >
            <Bell size={19} />
            {notifUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]
                               px-1 flex items-center justify-center
                               rounded-full text-white text-[10px] font-bold animate-pulse"
                    style={{ background: '#ef4444' }}>
                {notifUnread > 9 ? '9+' : notifUnread}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-100 hidden md:block mx-1" />

          {/* Admin avatar + dropdown */}
          <div ref={adminMenuRef} className="relative">
            <button
              onClick={() => setAdminMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl
                         transition-all duration-150"
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdf4' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-xl flex items-center justify-center
                              text-white font-bold text-sm flex-shrink-0"
                   style={{ background: `linear-gradient(135deg, ${avatarStyle}, #10b981)` }}>
                {initials}
              </div>

              {/* Name — desktop only */}
              <span className="hidden md:block text-sm font-semibold text-gray-700
                               max-w-[100px] truncate">
                {displayName.split(' ')[0]}
              </span>

              <ChevronDown
                size={14}
                className="hidden md:block text-gray-400 transition-transform duration-200"
                style={{ transform: adminMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            <AnimatePresence>
              {adminMenuOpen && (
                <AdminMenu
                  admin={admin}
                  onLogout={handleLogout}
                  onClose={() => setAdminMenuOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Notification panel */}
      <NotificationPanel />
    </>
  )
}