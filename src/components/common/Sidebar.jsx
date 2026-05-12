import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Globe2, MapPin, CalendarCheck, Users,
  FileText, HelpCircle, Lightbulb, UserCircle, Star,
  Image, MessageSquare, Mail, MessagesSquare, Settings,
  Menu, ChevronLeft, X, LogOut, MapPinned,
} from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { selectTotalUnread } from '@store/chatSlice'
import Header from './Header'

/* ── Icon map ── */
const ICONS = {
  LayoutDashboard, Globe2, MapPin, CalendarCheck, Users,
  FileText, HelpCircle, Lightbulb, UserCircle, Star,
  Image, MessageSquare, Mail, MessagesSquare, Settings,
}

/* ── Navigation groups ── */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    ],
  },
  {
    label: 'Content',
    items: [
      { path: '/countries',    label: 'Countries',    icon: 'Globe2'     },
      { path: '/destinations', label: 'Destinations', icon: 'MapPin'     },
      { path: '/posts',        label: 'Blog Posts',   icon: 'FileText'   },
      { path: '/tips',         label: 'Travel Tips',  icon: 'Lightbulb'  },
      { path: '/faqs',         label: 'FAQs',         icon: 'HelpCircle' },
      { path: '/gallery',      label: 'Gallery',      icon: 'Image'      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/bookings',    label: 'Bookings',    icon: 'CalendarCheck' },
      { path: '/users',       label: 'Users',       icon: 'Users'         },
      { path: '/contact',     label: 'Contact',     icon: 'MessageSquare' },
      { path: '/subscribers', label: 'Subscribers', icon: 'Mail'          },
    ],
  },
  {
    label: 'Company',
    items: [
      { path: '/team',         label: 'Team',         icon: 'UserCircle' },
      { path: '/testimonials', label: 'Testimonials', icon: 'Star'       },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/chat',     label: 'Live Chat', icon: 'MessagesSquare', badge: 'chat' },
      { path: '/settings', label: 'Settings',  icon: 'Settings' },
    ],
  },
]

/* ── Shared styles ── */
const SIDEBAR_STYLES = `
  nav::-webkit-scrollbar { display: none; }

  .sidebar-tooltip {
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    padding: 8px 14px;
    background: linear-gradient(135deg, #1f2937, #111827);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    border-radius: 10px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    z-index: 100;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1);
    backdrop-filter: blur(8px);
  }

  .sidebar-tooltip::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background: linear-gradient(135deg, #1f2937, #111827);
    border-radius: 2px;
  }

  .sidebar-nav-link:hover .sidebar-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%) translateX(4px);
  }

  .sidebar-nav-link:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16,185,129,0.5) !important;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lg-flex { display: none; }
  @media (min-width: 1024px) {
    .lg-flex   { display: flex; }
    .lg-hidden { display: none !important; }
  }
  @media (max-width: 1023px) {
    .hidden { display: none; }
  }
`

/* ═══════════════════════════════════════════════════════════════════════
   SIDEBAR LINK
   ═══════════════════════════════════════════════════════════════════════ */
function SidebarLink({ item, collapsed, chatUnread }) {
  const Icon   = ICONS[item.icon] || LayoutDashboard
  const unread = item.badge === 'chat' ? chatUnread : 0

  const handleHover = (e, isActive, entering) => {
    if (isActive) return
    const el = e.currentTarget
    if (entering) {
      el.style.background = 'rgba(255,255,255,0.08)'
      el.style.color      = '#ffffff'
      el.style.transform  = 'translateX(4px)'
    } else {
      el.style.background = 'transparent'
      el.style.color      = '#a7f3d0'
      el.style.transform  = 'translateX(0)'
    }
  }

  const handleFocus = (e, isActive, focusing) => {
    if (isActive) return
    const el = e.currentTarget
    if (focusing) {
      el.style.background = 'rgba(255,255,255,0.12)'
      el.style.color      = '#ffffff'
      el.style.boxShadow  = '0 0 0 3px rgba(16,185,129,0.3)'
    } else {
      el.style.background = 'transparent'
      el.style.color      = '#a7f3d0'
      el.style.boxShadow  = 'none'
    }
  }

  return (
    <NavLink
      to={item.path}
      className="sidebar-link-wrapper"
      style={{ textDecoration: 'none' }}
    >
      {({ isActive }) => (
        <div
          className="sidebar-nav-link"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            collapsed ? '0' : '12px',
            padding:        collapsed ? '10px' : '10px 14px',
            borderRadius:   '12px',
            position:       'relative',
            transition:     'all 0.2s cubic-bezier(0.4,0,0.2,1)',
            cursor:         'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background:     isActive
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              : 'transparent',
            color:          isActive ? '#ffffff' : '#a7f3d0',
            boxShadow:      isActive
              ? '0 4px 14px rgba(5,150,105,0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
              : 'none',
          }}
          onMouseEnter={(e) => handleHover(e, isActive, true)}
          onMouseLeave={(e) => handleHover(e, isActive, false)}
          onFocus={(e)      => handleFocus(e, isActive, true)}
          onBlur={(e)       => handleFocus(e, isActive, false)}
        >
          {/* Active indicator bar */}
          <AnimatePresence>
            {isActive && (
              <motion.span
                key="indicator"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={{ scaleY: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  position:     'absolute',
                  left:         '-2px',
                  top:          '50%',
                  transform:    'translateY(-50%)',
                  width:        '4px',
                  height:       '24px',
                  borderRadius: '0 4px 4px 0',
                  background:   'linear-gradient(180deg, #ffffff, #6ee7b7)',
                  boxShadow:    '0 2px 8px rgba(255,255,255,0.3)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Icon */}
          <motion.span
            animate={{ scale: isActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            style={{ flexShrink: 0, display: 'flex' }}
          >
            <Icon
              size={18}
              strokeWidth={isActive ? 2.5 : 2}
              style={{
                filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
              }}
            />
          </motion.span>

          {/* Label */}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                key="label"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  flex:         1,
                  fontSize:     '13.5px',
                  fontWeight:   isActive ? 700 : 500,
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing:'0.01em',
                }}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Badge — expanded */}
          <AnimatePresence>
            {unread > 0 && !collapsed && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                style={{
                  flexShrink:     0,
                  minWidth:       '20px',
                  height:         '20px',
                  padding:        '0 5px',
                  background:     'linear-gradient(135deg, #ef4444, #dc2626)',
                  color:          '#fff',
                  fontSize:       '10px',
                  fontWeight:     800,
                  borderRadius:   '99px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  boxShadow:      '0 2px 8px rgba(239,68,68,0.4)',
                }}
              >
                {unread > 99 ? '99+' : unread}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Badge dot — collapsed */}
          <AnimatePresence>
            {unread > 0 && collapsed && (
              <motion.span
                key="dot"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{
                  position:     'absolute',
                  top:          '6px',
                  right:        '6px',
                  width:        '8px',
                  height:       '8px',
                  background:   'linear-gradient(135deg, #ef4444, #dc2626)',
                  borderRadius: '50%',
                  border:       '2px solid #064e3b',
                  boxShadow:    '0 0 0 2px rgba(239,68,68,0.3)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Tooltip — collapsed only */}
          {collapsed && (
            <span className="sidebar-tooltip">
              {item.label}{unread > 0 ? ` (${unread})` : ''}
            </span>
          )}
        </div>
      )}
    </NavLink>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════════════ */
export default function Sidebar({ collapsed = false, onToggle, onMobileClose, isMobile = false }) {
  const { admin, logout }     = useAuth()
  const { error: toastError } = useToast()
  const chatUnread             = useSelector(selectTotalUnread)

  useEffect(() => {
    if (!isMobile) return
    const onKey = (e) => { if (e.key === 'Escape') onMobileClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isMobile, onMobileClose])

  const handleLogout = async () => {
    try { await logout() }
    catch { toastError('Logout failed') }
  }

  const displayName = admin?.fullName || admin?.full_name || admin?.username || 'Admin'
  const initial     = displayName.charAt(0).toUpperCase()
  const isCollapsed = collapsed && !isMobile

  /* ── Shared style objects ── */
  const avatarStyle = {
    position:       'relative',
    width:          '36px',
    height:         '36px',
    borderRadius:   '12px',
    background:     'linear-gradient(135deg, #10b981, #059669)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    color:          '#fff',
    fontWeight:     800,
    fontSize:       '14px',
    flexShrink:     0,
    boxShadow:      '0 4px 12px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
  }

  const onlineDot = {
    position:     'absolute',
    bottom:       '-2px',
    right:        '-2px',
    width:        '10px',
    height:       '10px',
    background:   '#22c55e',
    border:       '2px solid #064e3b',
    borderRadius: '50%',
  }

  const logoutBtnBase = {
    padding:      '8px',
    borderRadius: '10px',
    background:   'transparent',
    border:       'none',
    cursor:       'pointer',
    color:        '#a7f3d0',
    transition:   'all 0.15s ease',
  }

  /* ── Shared icon container style ── */
  const headerIconBox = {
    width:          '40px',
    height:         '40px',
    borderRadius:   '14px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    cursor:         'pointer',
  }

  return (
    <aside
      aria-label="Admin navigation sidebar"
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        width:         isCollapsed ? '72px' : '260px',
        background:    'linear-gradient(180deg, #022c22 0%, #064e3b 40%, #065f46 100%)',
        transition:    'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        position:      'relative',
        overflow:      'hidden',
        flexShrink:    0,
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          HEADER — Hamburger replaces logo when collapsed
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            isCollapsed ? '0' : '12px',
          padding:        '20px 16px',
          borderBottom:   '1px solid rgba(255,255,255,0.08)',
          flexShrink:     0,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          position:       'relative',
          minHeight:      '80px',
        }}
      >
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            /* ── COLLAPSED: Hamburger icon replaces logo ── */
            <motion.button
              key="hamburger"
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggle}
              aria-label="Expand sidebar"
              style={{
                ...headerIconBox,
                background: 'rgba(255,255,255,0.1)',
                border:     '1px solid rgba(255,255,255,0.15)',
                color:      '#22d3ee',
                boxShadow:  '0 4px 12px rgba(6,182,212,0.2)',
                transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.color      = '#ffffff'
                e.currentTarget.style.boxShadow  = '0 6px 20px rgba(6,182,212,0.35)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color      = '#22d3ee'
                e.currentTarget.style.boxShadow  = '0 4px 12px rgba(6,182,212,0.2)'
              }}
            >
              <Menu size={20} strokeWidth={2.5} />
            </motion.button>
          ) : (
            /* ── EXPANDED: Logo + brand text + collapse button ── */
            <motion.div
              key="logo-area"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '12px',
                flex:       1,
                minWidth:   0,
              }}
            >
              {/* Logo icon */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  ...headerIconBox,
                  background: 'rgba(255,255,255,0.1)',
                  border:     '1px solid rgba(255,255,255,0.15)',
                  boxShadow:  '0 4px 12px rgba(6,182,212,0.2)',
                }}
              >
                <MapPinned size={20} style={{ color: '#22d3ee' }} strokeWidth={2.5} />
              </motion.div>

              {/* Brand text */}
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <h1 style={{
                  color:         '#ffffff',
                  fontWeight:    800,
                  fontSize:      '17px',
                  lineHeight:    1.1,
                  letterSpacing: '-0.3px',
                  margin:        0,
                  textShadow:    '0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  Altuvera
                </h1>
                <p style={{
                  color:         '#22d3ee',
                  fontSize:      '9px',
                  fontWeight:    700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  margin:        '2px 0 0',
                }}>
                  Admin Panel
                </p>
              </div>

              {/* Collapse button (desktop only) */}
              {!isMobile && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggle}
                  aria-label="Collapse sidebar"
                  style={{
                    marginLeft:     'auto',
                    width:          '28px',
                    height:         '28px',
                    borderRadius:   '8px',
                    background:     'rgba(255,255,255,0.1)',
                    border:         '1px solid rgba(255,255,255,0.2)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    cursor:         'pointer',
                    color:          '#a7f3d0',
                    flexShrink:     0,
                    transition:     'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.color      = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color      = '#a7f3d0'
                  }}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </motion.button>
              )}

              {/* Mobile close */}
              {isMobile && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onMobileClose}
                  aria-label="Close sidebar"
                  style={{
                    marginLeft:   'auto',
                    padding:      '8px',
                    background:   'rgba(255,255,255,0.1)',
                    border:       'none',
                    borderRadius: '10px',
                    cursor:       'pointer',
                    color:        '#a7f3d0',
                    flexShrink:   0,
                    transition:   'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                    e.currentTarget.style.color      = '#fca5a5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color      = '#a7f3d0'
                  }}
                >
                  <X size={18} />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ── */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          flex:           1,
          overflowY:      'auto',
          overflowX:      'hidden',
          padding:        '12px 8px',
          scrollbarWidth: 'none',
        }}
      >
        <style>{SIDEBAR_STYLES}</style>

        {NAV_GROUPS.map((group) => (
          <div
            key={group.label}
            role="group"
            aria-label={`${group.label} navigation`}
            style={{ marginBottom: '8px' }}
          >
            {/* Group label */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  key={`label-${group.label}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    fontSize:      '10px',
                    fontWeight:    700,
                    color:         'rgba(167,243,208,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    padding:       '6px 14px 4px',
                    margin:        0,
                  }}
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Collapsed divider */}
            {isCollapsed && (
              <div style={{
                height:     '1px',
                background: 'rgba(255,255,255,0.06)',
                margin:     '6px 8px',
              }} />
            )}

            {/* Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  collapsed={isCollapsed}
                  chatUnread={chatUnread}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Profile + logout ── */}
      <div style={{
        flexShrink: 0,
        borderTop:  '1px solid rgba(255,255,255,0.08)',
        padding:    '12px',
      }}>
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="profile-expanded"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <div style={avatarStyle}>
                {initial}
                <span style={onlineDot} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color:        '#ffffff',
                  fontSize:     '13px',
                  fontWeight:   700,
                  margin:       0,
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {displayName}
                </p>
                <p style={{
                  color:         '#22d3ee',
                  fontSize:      '10px',
                  fontWeight:    600,
                  textTransform: 'capitalize',
                  margin:        '1px 0 0',
                  opacity:       0.9,
                }}>
                  {admin?.role || 'admin'}
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                style={logoutBtnBase}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                  e.currentTarget.style.color      = '#fca5a5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color      = '#a7f3d0'
                }}
              >
                <LogOut size={16} strokeWidth={2} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="profile-collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '8px',
              }}
            >
              <div style={{ ...avatarStyle, boxShadow: '0 4px 12px rgba(5,150,105,0.4)' }}>
                {initial}
                <span style={onlineDot} />
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                style={{ ...logoutBtnBase, padding: '6px', borderRadius: '8px' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                  e.currentTarget.style.color      = '#fca5a5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color      = '#a7f3d0'
                }}
              >
                <LogOut size={14} strokeWidth={2} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN LAYOUT
   ═══════════════════════════════════════════════════════════════════════ */
export function AdminLayout() {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) setCollapsed(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div style={{
      display:    'flex',
      height:     '100vh',
      overflow:   'hidden',
      background: '#f8faf9',
    }}>

      {/* Desktop sidebar */}
      <div className="lg-flex" style={{ flexShrink: 0 }}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
              className="lg-hidden"
              style={{
                position:       'fixed',
                inset:          0,
                zIndex:         40,
                background:     'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
              }}
            />

            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, { offset, velocity }) => {
                if (offset.x < -100 || velocity.x < -500) setMobileOpen(false)
              }}
              className="lg-hidden"
              style={{
                position:  'fixed',
                top:       0,
                left:      0,
                bottom:    0,
                zIndex:    50,
                boxShadow: '8px 0 32px rgba(0,0,0,0.15)',
              }}
            >
              <Sidebar
                collapsed={false}
                isMobile
                onMobileClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        minWidth:      0,
        overflow:      'hidden',
      }}>
        <Header onMenuClick={() => setMobileOpen(true)} isMobileOpen={mobileOpen} />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            padding:   'clamp(16px, 2vw, 24px)',
            maxWidth:  '1600px',
            margin:    '0 auto',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}