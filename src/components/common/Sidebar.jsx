// admin/src/components/common/Sidebar.jsx
import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Globe2, MapPin, CalendarCheck, Users,
  FileText, HelpCircle, Lightbulb, UserCircle, Star,
  Image, MessageSquare, Mail, MessagesSquare, Settings,
  Menu, ChevronLeft, X, LogOut, MapPinned, Package,
  Bell, Check, Trash2, RefreshCw, ExternalLink, Megaphone,
  Wifi, WifiOff, CheckSquare, Filter, Search,
} from 'lucide-react'
import { useAuth }           from '@hooks/useAuth'
import { useToast }          from '@hooks/useToast'
import Header                from './Header'

/* ═══════════════════════════════════════════════════════════
   ADMIN NOTIFICATIONS HOOK  (inline — no extra file needed)
═══════════════════════════════════════════════════════════*/
const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'

const NOTIF_TYPES = {
  booking_new:       { icon: '📋', color: '#059669', bg: '#ecfdf5', label: 'New Booking'      },
  booking_confirmed: { icon: '✅', color: '#0891b2', bg: '#f0f9ff', label: 'Confirmed'         },
  booking_cancelled: { icon: '❌', color: '#dc2626', bg: '#fef2f2', label: 'Cancelled'         },
  payment_received:  { icon: '💰', color: '#d97706', bg: '#fffbeb', label: 'Payment'           },
  user_registered:   { icon: '👤', color: '#7c3aed', bg: '#faf5ff', label: 'New User'          },
  contact_message:   { icon: '💬', color: '#0891b2', bg: '#f0f9ff', label: 'Message'           },
  review_posted:     { icon: '⭐', color: '#d97706', bg: '#fffbeb', label: 'Review'            },
  checklist_request: { icon: '📝', color: '#059669', bg: '#ecfdf5', label: 'Checklist'         },
  system:            { icon: '🔧', color: '#64748b', bg: '#f8fafc', label: 'System'            },
}

function getToken() {
  return (
    localStorage.getItem('altuvera_admin_token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('token')      ||
    sessionStorage.getItem('altuvera_admin_token') ||
    sessionStorage.getItem('adminToken') ||
    ''
  )
}

function useAdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [connected,     setConnected]     = useState(false)
  const pollRef    = React.useRef(null)
  const mountedRef = React.useRef(true)

  /* ── Mock fallback so UI is never empty during dev ── */
  const injectMock = React.useCallback(() => {
    const now = Date.now()
    const mock = [
      {
        id: 'mock-1', type: 'booking_new', is_read: false,
        title: 'New booking received',
        message: 'John Doe booked Serengeti Safari for 3 people',
        created_at: new Date(now - 2 * 60000).toISOString(),
      },
      {
        id: 'mock-2', type: 'payment_received', is_read: false,
        title: 'Payment confirmed',
        message: '$1,200 received for Kilimanjaro Climb booking',
        created_at: new Date(now - 15 * 60000).toISOString(),
      },
      {
        id: 'mock-3', type: 'user_registered', is_read: false,
        title: 'New user registered',
        message: 'Sarah K. created an account',
        created_at: new Date(now - 35 * 60000).toISOString(),
      },
      {
        id: 'mock-4', type: 'contact_message', is_read: true,
        title: 'Contact form message',
        message: 'Inquiry about Zanzibar beach packages',
        created_at: new Date(now - 2 * 3600000).toISOString(),
      },
      {
        id: 'mock-5', type: 'review_posted', is_read: true,
        title: 'New review posted',
        message: '5-star review for Nyungwe Forest tour',
        created_at: new Date(now - 5 * 3600000).toISOString(),
      },
    ]
    setNotifications(mock)
    setUnreadCount(mock.filter(n => !n.is_read).length)
  }, [])

  /* ── Fetch ── */
  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/admin?limit=50`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type':  'application/json',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!mountedRef.current) return
      const list = json.data || json.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter(n => !n.is_read && !n.read_at).length)
      setConnected(true)
    } catch {
      if (!mountedRef.current) return
      setConnected(false)
      if (notifications.length === 0) injectMock()
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectMock])

  /* ── Mark one as read ── */
  const markAsRead = React.useCallback(async (id) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method:  'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      })
    } catch { /* optimistic — ignore */ }
  }, [])

  /* ── Mark all as read ── */
  const markAllAsRead = React.useCallback(async () => {
    setNotifications(p => p.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    try {
      await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method:  'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      })
    } catch { /* optimistic */ }
  }, [])

  /* ── Delete one ── */
  const deleteNotification = React.useCallback(async (id) => {
    setNotifications(p => {
      const item = p.find(n => n.id === id)
      if (item && !item.is_read) setUnreadCount(c => Math.max(0, c - 1))
      return p.filter(n => n.id !== id)
    })
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      })
    } catch { /* optimistic */ }
  }, [])

  /* ── Lifecycle ── */
  useEffect(() => {
    mountedRef.current = true
    fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, 30_000)
    return () => {
      mountedRef.current = false
      clearInterval(pollRef.current)
    }
  }, [fetchNotifications])

  return {
    notifications, unreadCount, loading, connected,
    NOTIF_TYPES, markAsRead, markAllAsRead, deleteNotification,
    refresh: fetchNotifications,
  }
}

/* ═══════════════════════════════════════════════════════════
   TIME AGO HELPER
═══════════════════════════════════════════════════════════ */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION BELL DROPDOWN  (used in Header)
═══════════════════════════════════════════════════════════ */
const BELL_CSS = `
.anb-wrap { position:relative; display:inline-block; }

.anb-bell {
  position:relative; width:40px; height:40px; border-radius:11px;
  border:1.5px solid rgba(255,255,255,0.18);
  background:rgba(255,255,255,0.1);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all 0.2s; color:rgba(255,255,255,0.8);
}
.anb-bell:hover { border-color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.18); color:#fff; }
.anb-bell--unread { border-color:rgba(16,185,129,0.5); color:#6ee7b7; }

.anb-badge {
  position:absolute; top:-5px; right:-5px;
  min-width:18px; height:18px; border-radius:9px;
  background:#dc2626; color:#fff;
  font-size:10px; font-weight:800; line-height:18px;
  text-align:center; padding:0 4px; border:2px solid #064e3b;
  animation:anb-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes anb-pop { from{transform:scale(0)} to{transform:scale(1)} }

.anb-bell--pulse::after {
  content:''; position:absolute; inset:-4px; border-radius:14px;
  border:2px solid #10b981; opacity:0;
  animation:anb-ring 1.6s ease-out 2;
}
@keyframes anb-ring {
  0%  { opacity:0.7; transform:scale(0.9); }
  100%{ opacity:0;   transform:scale(1.2); }
}

.anb-drop {
  position:absolute; top:calc(100% + 12px); right:0;
  width:clamp(310px,88vw,390px);
  background:#fff; border-radius:18px;
  border:1.5px solid #e2e8f0;
  box-shadow:0 24px 64px rgba(0,0,0,0.16), 0 6px 20px rgba(0,0,0,0.06);
  z-index:9999; overflow:hidden;
  animation:anb-in 0.24s cubic-bezier(0.22,1,0.36,1);
  transform-origin:top right;
}
@keyframes anb-in {
  from{ opacity:0; transform:scale(0.9) translateY(-8px); }
  to  { opacity:1; transform:scale(1)   translateY(0);    }
}

.anb-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:13px 15px 11px;
  border-bottom:1px solid #f1f5f9;
  background:linear-gradient(135deg,#f0fdf4,#ecfdf5);
}
.anb-head-l { display:flex; align-items:center; gap:8px; }
.anb-head-title { font-size:13.5px; font-weight:800; color:#0f172a; margin:0; }
.anb-head-cnt {
  font-size:10px; font-weight:800; padding:2px 8px;
  border-radius:999px; background:#059669; color:#fff;
}
.anb-head-r { display:flex; gap:5px; align-items:center; }
.anb-hbtn {
  width:28px; height:28px; border-radius:8px;
  border:1px solid #e2e8f0; background:#fff;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#64748b; transition:all 0.2s;
}
.anb-hbtn:hover { border-color:#059669; color:#059669; background:#f0fdf4; }
.anb-mark-all {
  font-size:11px; font-weight:700; color:#059669;
  background:none; border:none; cursor:pointer;
  padding:3px 8px; border-radius:6px; font-family:inherit;
  transition:background 0.2s;
}
.anb-mark-all:hover { background:#d1fae5; }

.anb-tabs {
  display:flex; gap:4px; padding:8px 10px;
  border-bottom:1px solid #f1f5f9;
  overflow-x:auto; scrollbar-width:none;
}
.anb-tabs::-webkit-scrollbar { display:none; }
.anb-tab {
  padding:4px 11px; border-radius:999px;
  border:1px solid #e2e8f0; background:#fff;
  font-size:11px; font-weight:700; color:#64748b;
  cursor:pointer; white-space:nowrap; font-family:inherit;
  transition:all 0.2s;
}
.anb-tab:hover { border-color:#059669; color:#059669; }
.anb-tab--on { background:#059669; border-color:#059669; color:#fff; }

.anb-list {
  max-height:360px; overflow-y:auto;
  scrollbar-width:thin; scrollbar-color:#e2e8f0 transparent;
}
.anb-list::-webkit-scrollbar { width:3px; }
.anb-list::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:2px; }

.anb-item {
  display:flex; gap:10px; padding:11px 13px;
  border-bottom:1px solid #f8fafc;
  cursor:pointer; transition:background 0.15s;
  position:relative; align-items:flex-start;
}
.anb-item:last-child { border-bottom:none; }
.anb-item:hover { background:#f8fafc; }
.anb-item--u { background:#fafffe; }
.anb-item--u::before {
  content:''; position:absolute; left:0; top:0; bottom:0;
  width:3px; background:#059669; border-radius:0 2px 2px 0;
}
.anb-ico {
  width:36px; height:36px; border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  font-size:16px; flex-shrink:0;
}
.anb-body { flex:1; min-width:0; }
.anb-ttl {
  font-size:12.5px; font-weight:700; color:#0f172a;
  margin:0 0 2px; line-height:1.4;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.anb-item--u .anb-ttl { color:#047857; }
.anb-msg {
  font-size:11.5px; color:#64748b; margin:0 0 4px; line-height:1.45;
  display:-webkit-box; -webkit-line-clamp:2;
  -webkit-box-orient:vertical; overflow:hidden;
}
.anb-meta { display:flex; align-items:center; gap:6px; }
.anb-time { font-size:10.5px; color:#94a3b8; font-weight:600; }
.anb-chip {
  font-size:9.5px; font-weight:800; padding:1px 7px;
  border-radius:999px; text-transform:uppercase; letter-spacing:0.3px;
}
.anb-acts { display:flex; gap:4px; align-items:center; flex-shrink:0; }
.anb-ibtn {
  width:24px; height:24px; border-radius:6px;
  border:1px solid #e2e8f0; background:#fff;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#94a3b8; transition:all 0.2s;
  opacity:0;
}
.anb-item:hover .anb-ibtn { opacity:1; }
.anb-ibtn:hover { color:#059669; border-color:#059669; background:#f0fdf4; }
.anb-ibtn--d:hover { color:#dc2626; border-color:#fecaca; background:#fef2f2; }

.anb-empty {
  text-align:center; padding:36px 16px; color:#94a3b8;
}
.anb-empty-i { font-size:34px; margin-bottom:8px; }
.anb-empty p { margin:0; font-size:12.5px; font-weight:600; }

.anb-loading {
  display:flex; align-items:center; justify-content:center; padding:32px;
}
.anb-spin {
  width:26px; height:26px; border-radius:50%;
  border:3px solid #e2e8f0; border-top-color:#059669;
  animation:anb-sp 0.7s linear infinite;
}
@keyframes anb-sp { to{ transform:rotate(360deg); } }

.anb-foot {
  border-top:1px solid #f1f5f9; padding:9px 14px;
  display:flex; align-items:center; justify-content:space-between;
  background:#fafdfb;
}
.anb-foot-lnk {
  font-size:11.5px; font-weight:700; color:#059669;
  text-decoration:none; display:flex; align-items:center; gap:4px;
  transition:color 0.2s;
}
.anb-foot-lnk:hover { color:#047857; }
.anb-live {
  display:inline-flex; align-items:center; gap:4px;
  font-size:10.5px; font-weight:700; color:#94a3b8;
}
.anb-live-dot {
  width:6px; height:6px; border-radius:50%; display:inline-block;
}
`

const BELL_TABS = [
  { key: 'all',     label: 'All'      },
  { key: 'unread',  label: 'Unread'   },
  { key: 'booking', label: 'Bookings' },
  { key: 'payment', label: 'Payments' },
  { key: 'user',    label: 'Users'    },
]

function AdminNotificationBell() {
  const {
    notifications, unreadCount, loading, connected,
    NOTIF_TYPES, markAsRead, markAllAsRead, deleteNotification, refresh,
  } = useAdminNotifications()

  const [open,  setOpen]  = useState(false)
  const [tab,   setTab]   = useState('all')
  const [pulse, setPulse] = useState(false)
  const wrapRef  = React.useRef(null)
  const prevCnt  = React.useRef(unreadCount)

  /* Close on outside click */
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  /* Pulse ring on new notification */
  useEffect(() => {
    if (unreadCount > prevCnt.current) {
      setPulse(true)
      setTimeout(() => setPulse(false), 3200)
    }
    prevCnt.current = unreadCount
  }, [unreadCount])

  const filtered = React.useMemo(() => {
    return notifications.filter(n => {
      if (tab === 'unread')  return !n.is_read
      if (tab === 'booking') return n.type?.includes('booking')
      if (tab === 'payment') return n.type?.includes('payment')
      if (tab === 'user')    return n.type?.includes('user')
      return true
    })
  }, [notifications, tab])

  const handleClick = React.useCallback((n) => {
    if (!n.is_read) markAsRead(n.id)
    const routes = {
      booking_new:       '/bookings',
      booking_confirmed: '/bookings',
      booking_cancelled: '/bookings',
      payment_received:  '/bookings',
      user_registered:   '/users',
      contact_message:   '/contact',
      review_posted:     '/testimonials',
      checklist_request: '/checklist',
    }
    const path = routes[n.type]
    if (path) window.location.href = path
  }, [markAsRead])

  return (
    <>
      <style>{BELL_CSS}</style>
      <div className="anb-wrap" ref={wrapRef}>

        {/* Bell */}
        <button
          className={[
            'anb-bell',
            unreadCount > 0 ? 'anb-bell--unread' : '',
            pulse           ? 'anb-bell--pulse'  : '',
          ].join(' ')}
          onClick={() => setOpen(o => !o)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell size={17} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="anb-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="anb-drop" role="dialog" aria-label="Notifications">

            {/* Head */}
            <div className="anb-head">
              <div className="anb-head-l">
                <Bell size={14} color="#059669" />
                <h3 className="anb-head-title">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="anb-head-cnt">{unreadCount}</span>
                )}
              </div>
              <div className="anb-head-r">
                {unreadCount > 0 && (
                  <button className="anb-mark-all" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
                <button className="anb-hbtn" onClick={refresh} title="Refresh">
                  <RefreshCw size={12} />
                </button>
                <button className="anb-hbtn" onClick={() => setOpen(false)} title="Close">
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="anb-tabs">
              {BELL_TABS.map(t => (
                <button
                  key={t.key}
                  className={`anb-tab${tab === t.key ? ' anb-tab--on' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="anb-list">
              {loading ? (
                <div className="anb-loading"><div className="anb-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="anb-empty">
                  <div className="anb-empty-i">🔔</div>
                  <p>{tab === 'unread' ? "You're all caught up!" : 'No notifications'}</p>
                </div>
              ) : (
                filtered.map(n => {
                  const meta = NOTIF_TYPES[n.type] || NOTIF_TYPES.system
                  return (
                    <div
                      key={n.id}
                      className={`anb-item${!n.is_read ? ' anb-item--u' : ''}`}
                      onClick={() => handleClick(n)}
                    >
                      <div className="anb-ico" style={{ background: meta.bg }}>
                        {meta.icon}
                      </div>
                      <div className="anb-body">
                        <p className="anb-ttl">{n.title}</p>
                        <p className="anb-msg">{n.message}</p>
                        <div className="anb-meta">
                          <span className="anb-time">{timeAgo(n.created_at)}</span>
                          <span
                            className="anb-chip"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                      <div className="anb-acts" onClick={e => e.stopPropagation()}>
                        {!n.is_read && (
                          <button
                            className="anb-ibtn"
                            onClick={() => markAsRead(n.id)}
                            title="Mark as read"
                          >
                            <Check size={10} />
                          </button>
                        )}
                        <button
                          className="anb-ibtn anb-ibtn--d"
                          onClick={() => deleteNotification(n.id)}
                          title="Delete"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="anb-foot">
              <a href="/notifications" className="anb-foot-lnk">
                <ExternalLink size={11} />
                View all
              </a>
              <span className="anb-live">
                <span
                  className="anb-live-dot"
                  style={{ background: connected ? '#059669' : '#94a3b8' }}
                />
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   ICON MAP
═══════════════════════════════════════════════════════════ */
const ICONS = {
  LayoutDashboard, Globe2, MapPin, CalendarCheck, Users,
  FileText, HelpCircle, Lightbulb, UserCircle, Star,
  Image, MessageSquare, Mail, MessagesSquare, Settings, Package, Megaphone,
}

/* ═══════════════════════════════════════════════════════════
   NAV GROUPS
═══════════════════════════════════════════════════════════ */
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
      { path: '/comments',     label: 'Comments',     icon: 'MessageSquare' },
      { path: '/likes',        label: 'Likes',        icon: 'Heart' },
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
      { path: '/packages',    label: 'Packages',    icon: 'Package'       },
      { path: '/users',       label: 'Users',       icon: 'Users'         },
      { path: '/messages',    label: 'Messages',    icon: 'MessagesSquare', badge: 'msg' },
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
      { path: '/notifications', label: 'Notifications', icon: 'Bell',           badge: 'notif' },
      { path: '/broadcast',     label: 'Broadcast',     icon: 'Megaphone' },
      { path: '/settings',      label: 'Settings',      icon: 'Settings'        },
    ],
  },
]

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
const SIDEBAR_STYLES = `
  .sb-nav::-webkit-scrollbar { display:none; }

  .sb-tooltip {
    position:absolute; left:calc(100% + 12px); top:50%;
    transform:translateY(-50%);
    padding:8px 14px;
    background:linear-gradient(135deg,#1f2937,#111827);
    color:#fff; font-size:12px; font-weight:600;
    border-radius:10px; white-space:nowrap;
    pointer-events:none; opacity:0; visibility:hidden;
    transition:opacity 0.2s, visibility 0.2s, transform 0.2s;
    z-index:100;
    box-shadow:0 10px 25px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08);
    backdrop-filter:blur(8px);
  }
  .sb-tooltip::before {
    content:''; position:absolute; left:-5px; top:50%;
    transform:translateY(-50%) rotate(45deg);
    width:10px; height:10px;
    background:linear-gradient(135deg,#1f2937,#111827);
    border-radius:2px;
  }
  .sb-nav-item:hover .sb-tooltip {
    opacity:1; visibility:visible; transform:translateY(-50%) translateX(4px);
  }
  .sb-nav-item:focus-visible { outline:none; }

  @keyframes sbFadeIn {
    from{ opacity:0; transform:translateY(4px); }
    to  { opacity:1; transform:translateY(0);   }
  }

  @media (min-width:1024px) {
    .sb-lg-flex   { display:flex !important; }
    .sb-lg-hidden { display:none !important; }
  }
  @media (max-width:1023px) {
    .sb-lg-flex   { display:none; }
    .sb-lg-hidden { display:block; }
  }
`

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const resolveIcon = (icon) => {
  if (!icon) return LayoutDashboard
  if (typeof icon === 'string') {
    if (icon === 'Bell') return Bell
    return ICONS[icon] || LayoutDashboard
  }
  return icon
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR LINK
═══════════════════════════════════════════════════════════ */
function SidebarLink({ item, collapsed, notifUnread }) {
  const Icon  = resolveIcon(item.icon)
  const badge = item.badge === 'notif' ? notifUnread : 0

  return (
    <NavLink to={item.path} style={{ textDecoration: 'none', display: 'block' }}>
      {({ isActive }) => (
        <div
          className="sb-nav-item"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            collapsed ? 0 : '12px',
            padding:        collapsed ? '10px' : '10px 14px',
            borderRadius:   '12px',
            position:       'relative',
            cursor:         'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition:     'background 0.18s, color 0.18s, transform 0.18s, box-shadow 0.18s',
            background:     isActive
              ? 'linear-gradient(135deg,#059669 0%,#10b981 100%)'
              : 'transparent',
            color:          isActive ? '#ffffff' : '#a7f3d0',
            boxShadow:      isActive
              ? '0 4px 14px rgba(5,150,105,0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
              : 'none',
          }}
          onMouseEnter={e => {
            if (isActive) return
            e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.color      = '#ffffff'
            e.currentTarget.style.transform  = 'translateX(4px)'
          }}
          onMouseLeave={e => {
            if (isActive) return
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color      = '#a7f3d0'
            e.currentTarget.style.transform  = 'translateX(0)'
          }}
          onFocus={e => {
            if (isActive) return
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.color      = '#ffffff'
            e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(16,185,129,0.3)'
          }}
          onBlur={e => {
            if (isActive) return
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color      = '#a7f3d0'
            e.currentTarget.style.boxShadow  = 'none'
          }}
        >
          {/* Active bar */}
          <AnimatePresence>
            {isActive && (
              <motion.span
                key="bar"
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
                  background:   'linear-gradient(180deg,#fff,#6ee7b7)',
                  boxShadow:    '0 2px 8px rgba(255,255,255,0.3)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Icon */}
          <motion.span
            animate={{ scale: isActive ? 1.1 : 1 }}
            transition={{ duration: 0.18 }}
            style={{ flexShrink: 0, display: 'flex' }}
          >
            <Icon
              size={18}
              strokeWidth={isActive ? 2.5 : 2}
              style={{ filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}
            />
          </motion.span>

          {/* Label */}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                key="label"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{   opacity: 0, x: -8  }}
                transition={{ duration: 0.18 }}
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

          {/* Badge (expanded) */}
          <AnimatePresence>
            {badge > 0 && !collapsed && (
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
                  background:     'linear-gradient(135deg,#ef4444,#dc2626)',
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
                {badge > 99 ? '99+' : badge}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Badge dot (collapsed) */}
          <AnimatePresence>
            {badge > 0 && collapsed && (
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
                  background:   'linear-gradient(135deg,#ef4444,#dc2626)',
                  borderRadius: '50%',
                  border:       '2px solid #064e3b',
                  boxShadow:    '0 0 0 2px rgba(239,68,68,0.3)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Tooltip */}
          {collapsed && (
            <span className="sb-tooltip">
              {item.label}{badge > 0 ? ` (${badge})` : ''}
            </span>
          )}
        </div>
      )}
    </NavLink>
  )
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════ */
export default function Sidebar({
  collapsed    = false,
  onToggle,
  onMobileClose,
  isMobile     = false,
}) {
  const { admin, logout }      = useAuth()
  const { error: toastError }  = useToast()
  const { unreadCount: notifUnread } = useAdminNotifications()

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

  /* ── Style tokens ── */
  const avatarStyle = {
    position:       'relative',
    width:          '36px',
    height:         '36px',
    borderRadius:   '12px',
    background:     'linear-gradient(135deg,#10b981,#059669)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    color:          '#fff',
    fontWeight:     800,
    fontSize:       '14px',
    flexShrink:     0,
    boxShadow:      '0 4px 12px rgba(5,150,105,0.4),inset 0 1px 0 rgba(255,255,255,0.2)',
    userSelect:     'none',
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

  const iconBoxBase = {
    width:          '40px',
    height:         '40px',
    borderRadius:   '14px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    cursor:         'pointer',
    border:         '1px solid rgba(255,255,255,0.15)',
    transition:     'background 0.15s, color 0.15s, box-shadow 0.15s',
  }

  const logoutBtnBase = {
    padding:      '8px',
    borderRadius: '10px',
    background:   'transparent',
    border:       'none',
    cursor:       'pointer',
    color:        '#a7f3d0',
    transition:   'background 0.15s, color 0.15s',
  }

  return (
    <aside
      aria-label="Admin navigation sidebar"
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        width:         isCollapsed ? '72px' : '260px',
        background:    'linear-gradient(180deg,#022c22 0%,#064e3b 40%,#065f46 100%)',
        transition:    'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        position:      'relative',
        overflow:      'hidden',
        flexShrink:    0,
      }}
    >

      {/* ── Header ── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            isCollapsed ? 0 : '12px',
          padding:        '20px 16px',
          borderBottom:   '1px solid rgba(255,255,255,0.08)',
          flexShrink:     0,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          minHeight:      '80px',
        }}
      >
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.button
              key="hamburger"
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1,   rotate: 0   }}
              exit={{   opacity: 0, scale: 0.6, rotate: 90  }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              whileHover={{ scale: 1.1 }}
              whileTap={{  scale: 0.9 }}
              onClick={onToggle}
              aria-label="Expand sidebar"
              style={{
                ...iconBoxBase,
                background: 'rgba(255,255,255,0.1)',
                color:      '#22d3ee',
                boxShadow:  '0 4px 12px rgba(6,182,212,0.2)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.color      = '#ffffff'
                e.currentTarget.style.boxShadow  = '0 6px 20px rgba(6,182,212,0.35)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color      = '#22d3ee'
                e.currentTarget.style.boxShadow  = '0 4px 12px rgba(6,182,212,0.2)'
              }}
            >
              <Menu size={20} strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.div
              key="brand"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0   }}
              exit={{   opacity: 0, x: -20  }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{  scale: 0.95 }}
                style={{
                  ...iconBoxBase,
                  background: 'rgba(255,255,255,0.1)',
                  boxShadow:  '0 4px 12px rgba(6,182,212,0.2)',
                }}
              >
                <MapPinned size={20} style={{ color: '#22d3ee' }} strokeWidth={2.5} />
              </motion.div>

              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <h1 style={{
                  color: '#ffffff', fontWeight: 800, fontSize: '17px',
                  lineHeight: 1.1, letterSpacing: '-0.3px', margin: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  Altuvera
                </h1>
                <p style={{
                  color: '#22d3ee', fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase', margin: '2px 0 0',
                }}>
                  Admin Panel
                </p>
              </div>

              {!isMobile && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{  scale: 0.9 }}
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
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.color      = '#ffffff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color      = '#a7f3d0'
                  }}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </motion.button>
              )}

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
                    transition:   'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                    e.currentTarget.style.color      = '#fca5a5'
                  }}
                  onMouseLeave={e => {
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
        className="sb-nav"
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

        {NAV_GROUPS.map(group => (
          <div
            key={group.label}
            role="group"
            aria-label={`${group.label} navigation`}
            style={{ marginBottom: '8px' }}
          >
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  key={`gl-${group.label}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{   opacity: 0 }}
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

            {isCollapsed && (
              <div style={{
                height:     '1px',
                background: 'rgba(255,255,255,0.06)',
                margin:     '6px 8px',
              }} />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map(item => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  collapsed={isCollapsed}
                  notifUnread={notifUnread}
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
              key="profile-exp"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <div style={avatarStyle}>
                {initial}
                <span style={onlineDot} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color: '#ffffff', fontSize: '13px', fontWeight: 700,
                  margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {displayName}
                </p>
                <p style={{
                  color: '#22d3ee', fontSize: '10px', fontWeight: 600,
                  textTransform: 'capitalize', margin: '1px 0 0', opacity: 0.9,
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
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                  e.currentTarget.style.color      = '#fca5a5'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color      = '#a7f3d0'
                }}
              >
                <LogOut size={16} strokeWidth={2} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="profile-col"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1   }}
              exit={{   opacity: 0, scale: 0.9  }}
              transition={{ duration: 0.2 }}
              style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '8px',
              }}
            >
              <div style={avatarStyle}>
                {initial}
                <span style={onlineDot} />
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                style={{ ...logoutBtnBase, padding: '6px', borderRadius: '8px' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                  e.currentTarget.style.color      = '#fca5a5'
                }}
                onMouseLeave={e => {
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

/* ═══════════════════════════════════════════════════════════
   ADMIN LAYOUT
═══════════════════════════════════════════════════════════ */
export function AdminLayout() {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 1024) setCollapsed(false) }
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
      <div
        className="sb-lg-flex"
        style={{ flexShrink: 0, display: 'flex' }}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
        />
      </div>

      {/* Mobile overlay + drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
              className="sb-lg-hidden"
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
              animate={{ x: 0       }}
              exit={{   x: '-100%'  }}
              transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, { offset, velocity }) => {
                if (offset.x < -100 || velocity.x < -500) setMobileOpen(false)
              }}
              className="sb-lg-hidden"
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
        {/*
          Pass AdminNotificationBell into Header via a prop so it
          renders in the topbar without changing Header's internal structure.
        */}
        <Header
          onMenuClick={() => setMobileOpen(v => !v)}
          isMobileOpen={mobileOpen}
          notificationBell={<AdminNotificationBell />}
        />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            padding:   'clamp(16px, 2vw, 24px)',
            maxWidth:  '1600px',
            margin:    '0 auto',
            animation: 'sbFadeIn 0.2s ease-out',
          }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}