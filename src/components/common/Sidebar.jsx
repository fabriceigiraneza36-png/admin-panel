import React, { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Globe2, MapPin, CalendarCheck, Users,
  FileText, HelpCircle, Lightbulb, UserCircle, Star,
  Image, MessageSquare, Mail, MessagesSquare, Settings,
  ChevronLeft, ChevronRight, X, LogOut, MapPinned,
} from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { selectTotalUnread } from '@store/chatSlice'
import { selectUnreadCount } from '@store/notificationsSlice'
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
      { path: '/bookings',    label: 'Bookings',    icon: 'CalendarCheck'  },
      { path: '/users',       label: 'Users',       icon: 'Users'          },
      { path: '/contact',     label: 'Contact',     icon: 'MessageSquare'  },
      { path: '/subscribers', label: 'Subscribers', icon: 'Mail'           },
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

/* ═══════════════════════════════════════════════════════════════════════
   SIDEBAR LINK
   ═══════════════════════════════════════════════════════════════════════ */
function SidebarLink({ item, collapsed, chatUnread }) {
  const Icon   = ICONS[item.icon] || LayoutDashboard
  const unread = item.badge === 'chat' ? chatUnread : 0

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => 'sidebar-link-wrapper'}
      style={{ textDecoration: 'none' }}
    >
      {({ isActive }) => (
        <div
          className="sidebar-nav-link"
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           collapsed ? '0' : '12px',
            padding:       collapsed ? '10px' : '10px 14px',
            borderRadius:  '12px',
            position:      'relative',
            transition:    'all 0.2s ease',
            cursor:        'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background:    isActive
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : 'transparent',
            color: isActive ? '#ffffff' : '#d1fae5',
            boxShadow: isActive
              ? '0 4px 12px rgba(5,150,105,0.3)'
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color      = '#ffffff'
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color      = '#d1fae5'
            }
          }}
        >
          {/* Active indicator bar */}
          {isActive && (
            <span style={{
              position:     'absolute',
              left:         '-2px',
              top:          '50%',
              transform:    'translateY(-50%)',
              width:        '4px',
              height:       '20px',
              borderRadius: '0 4px 4px 0',
              background:   '#ffffff',
            }} />
          )}

          {/* Icon */}
          <span style={{
            flexShrink: 0,
            display:    'flex',
            transition: 'transform 0.2s',
            transform:  isActive ? 'scale(1.1)' : 'scale(1)',
          }}>
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
          </span>

          {/* Label */}
          {!collapsed && (
            <span style={{
              flex:       1,
              fontSize:   '13.5px',
              fontWeight: isActive ? 700 : 500,
              whiteSpace: 'nowrap',
              overflow:   'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.01em',
            }}>
              {item.label}
            </span>
          )}

          {/* Badge (unread count) */}
          {unread > 0 && !collapsed && (
            <span style={{
              flexShrink:     0,
              minWidth:       '20px',
              height:         '20px',
              padding:        '0 5px',
              background:     '#ef4444',
              color:          '#fff',
              fontSize:       '10px',
              fontWeight:     800,
              borderRadius:   '99px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              boxShadow:      '0 2px 6px rgba(239,68,68,0.3)',
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}

          {/* Collapsed badge dot */}
          {unread > 0 && collapsed && (
            <span style={{
              position:     'absolute',
              top:          '6px',
              right:        '6px',
              width:        '8px',
              height:       '8px',
              background:   '#ef4444',
              borderRadius: '50%',
              border:       '2px solid #064e3b',
            }} />
          )}

          {/* Tooltip when collapsed */}
          {collapsed && (
            <span className="sidebar-tooltip">
              {item.label}
              {unread > 0 ? ` (${unread})` : ''}
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
export default function Sidebar({ collapsed, onToggle, onMobileClose, isMobile }) {
  const { admin, logout } = useAuth()
  const { error: toastError } = useToast()
  const chatUnread  = useSelector(selectTotalUnread)

  const handleLogout = async () => {
    try { await logout() }
    catch { toastError('Logout failed') }
  }

  const displayName = admin?.fullName || admin?.full_name || admin?.username || 'Admin'
  const initial     = displayName.charAt(0).toUpperCase()

  return (
    <aside
      style={{
        display:        'flex',
        flexDirection:  'column',
        height:         '100%',
        width:          collapsed && !isMobile ? '72px' : '260px',
        background:     'linear-gradient(180deg, #022c22 0%, #064e3b 40%, #065f46 100%)',
        transition:     'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        position:       'relative',
        overflow:       'hidden',
        flexShrink:     0,
      }}
    >
      {/* ── Logo area ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            collapsed && !isMobile ? '0' : '12px',
        padding:        '16px',
        borderBottom:   '1px solid rgba(255,255,255,0.08)',
        flexShrink:     0,
        justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
      }}>
        {/* Icon */}
        <div style={{
          width:          '40px',
          height:         '40px',
          borderRadius:   '14px',
          background:     'rgba(255,255,255,0.1)',
          border:         '1px solid rgba(255,255,255,0.15)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}>
          <MapPinned size={20} style={{ color: '#6ee7b7' }} strokeWidth={2.5} />
        </div>

        {/* Text */}
        {(!collapsed || isMobile) && (
          <div style={{ overflow: 'hidden' }}>
            <h1 style={{
              color:          '#ffffff',
              fontWeight:     800,
              fontSize:       '17px',
              lineHeight:     1.1,
              letterSpacing:  '-0.3px',
              margin:         0,
            }}>
              Altuvera
            </h1>
            <p style={{
              color:          '#6ee7b7',
              fontSize:       '9px',
              fontWeight:     700,
              letterSpacing:  '0.2em',
              textTransform:  'uppercase',
              margin:         '2px 0 0',
            }}>
              Admin Panel
            </p>
          </div>
        )}

        {/* Mobile close */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            style={{
              marginLeft: 'auto',
              padding:    '6px',
              background: 'transparent',
              border:     'none',
              cursor:     'pointer',
              color:      '#a7f3d0',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{
        flex:       1,
        overflowY:  'auto',
        overflowX:  'hidden',
        padding:    '12px 8px',
        scrollbarWidth: 'none',
      }}>
        <style>{`
          nav::-webkit-scrollbar { display: none; }
          .sidebar-tooltip {
            position: absolute;
            left: calc(100% + 12px);
            top: 50%;
            transform: translateY(-50%);
            padding: 6px 12px;
            background: #1a1a1a;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            border-radius: 8px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: all 0.15s ease;
            z-index: 100;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .sidebar-tooltip::before {
            content: '';
            position: absolute;
            left: -4px;
            top: 50%;
            transform: translateY(-50%) rotate(45deg);
            width: 8px;
            height: 8px;
            background: #1a1a1a;
          }
          .sidebar-nav-link:hover .sidebar-tooltip {
            opacity: 1;
            visibility: visible;
          }
        `}</style>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: '8px' }}>
            {/* Group label */}
            {(!collapsed || isMobile) && (
              <p style={{
                fontSize:       '10px',
                fontWeight:     700,
                color:          'rgba(167,243,208,0.4)',
                textTransform:  'uppercase',
                letterSpacing:  '0.18em',
                padding:        '6px 14px 4px',
                margin:         0,
              }}>
                {group.label}
              </p>
            )}

            {/* Collapsed divider */}
            {collapsed && !isMobile && (
              <div style={{
                height:       '1px',
                background:   'rgba(255,255,255,0.06)',
                margin:       '6px 8px',
              }} />
            )}

            {/* Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  collapsed={collapsed && !isMobile}
                  chatUnread={chatUnread}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Admin profile + logout ── */}
      <div style={{
        flexShrink:   0,
        borderTop:    '1px solid rgba(255,255,255,0.08)',
        padding:      '12px',
      }}>
        {(!collapsed || isMobile) ? (
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
          }}>
            {/* Avatar */}
            <div style={{
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
              boxShadow:      '0 4px 10px rgba(5,150,105,0.3)',
            }}>
              {initial}
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
                color:          '#6ee7b7',
                fontSize:       '10px',
                fontWeight:     600,
                textTransform:  'capitalize',
                margin:         '1px 0 0',
              }}>
                {admin?.role || 'admin'}
              </p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                flexShrink:  0,
                padding:     '8px',
                borderRadius:'10px',
                background:  'transparent',
                border:      'none',
                cursor:      'pointer',
                color:       '#a7f3d0',
                transition:  'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
                e.currentTarget.style.color      = '#fca5a5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color      = '#a7f3d0'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          /* Collapsed state */
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            '8px',
          }}>
            <div style={{
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
            }}>
              {initial}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                padding:     '6px',
                borderRadius:'8px',
                background:  'transparent',
                border:      'none',
                cursor:      'pointer',
                color:       '#a7f3d0',
                transition:  'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
                e.currentTarget.style.color      = '#fca5a5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color      = '#a7f3d0'
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Collapse toggle button (desktop only) ── */}
      {!isMobile && (
        <button
          onClick={onToggle}
          style={{
            position:       'absolute',
            right:          '-14px',
            top:            '80px',
            width:          '28px',
            height:         '28px',
            borderRadius:   '50%',
            background:     '#ffffff',
            border:         '2px solid #d1fae5',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            zIndex:         10,
            boxShadow:      '0 2px 8px rgba(0,0,0,0.1)',
            transition:     'all 0.2s ease',
            color:          '#059669',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#059669'
            e.currentTarget.style.boxShadow   = '0 4px 12px rgba(5,150,105,0.2)'
            e.currentTarget.style.transform   = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1fae5'
            e.currentTarget.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.1)'
            e.currentTarget.style.transform   = 'scale(1)'
          }}
        >
          {collapsed
            ? <ChevronRight size={14} strokeWidth={3} />
            : <ChevronLeft  size={14} strokeWidth={3} />
          }
        </button>
      )}
    </aside>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN LAYOUT — wraps all admin pages with sidebar + header
   ═══════════════════════════════════════════════════════════════════════ */
export function AdminLayout() {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  /* Close mobile drawer on route change */
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  /* Auto-collapse on resize */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{
      display:  'flex',
      height:   '100vh',
      overflow: 'hidden',
      background: '#f8faf9',
    }}>

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex" style={{ flexShrink: 0 }}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position:   'fixed',
                inset:      0,
                zIndex:     40,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
              }}
              className="lg:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{
                type:      'spring',
                damping:   28,
                stiffness: 320,
              }}
              style={{
                position: 'fixed',
                top:      0,
                left:     0,
                bottom:   0,
                zIndex:   50,
              }}
              className="lg:hidden"
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

      {/* ── Main area ── */}
      <div style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        minWidth:       0,
        overflow:       'hidden',
      }}>
        <Header onMenuClick={() => setMobileOpen(true)} />

        <main style={{
          flex:       1,
          overflowY:  'auto',
        }}>
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

      {/* Animation keyframe */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Hide scrollbar in nav */
        .lg\\:flex { display: none; }
        @media (min-width: 1024px) {
          .lg\\:flex  { display: flex; }
          .lg\\:hidden { display: none !important; }
        }

        /* Responsive adjustments */
        @media (max-width: 1023px) {
          .hidden { display: none; }
        }
      `}</style>
    </div>
  )
}