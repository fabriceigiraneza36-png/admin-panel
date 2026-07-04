// src/components/admin/AdminNotificationBell.jsx
// ============================================================
// Admin notification bell — dropdown with full interaction
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import {
  FiBell, FiCheck, FiTrash2, FiRefreshCw,
  FiExternalLink, FiX, FiCheckSquare, FiWifi,
  FiWifiOff,
} from 'react-icons/fi';

/* ── CSS ──────────────────────────────────────────────────── */
const CSS = `
.anb-wrap { position: relative; display: inline-block; }

/* Bell button */
.anb-bell {
  position: relative; width: 42px; height: 42px; border-radius: 12px;
  border: 1.5px solid #e2e8f0; background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; color: #475569;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.anb-bell:hover { border-color: #bbf7d0; color: #059669; background: #f0fdf4; }
.anb-bell--has-unread { border-color: #059669; color: #059669; }

.anb-badge {
  position: absolute; top: -5px; right: -5px;
  min-width: 18px; height: 18px; border-radius: 9px;
  background: #dc2626; color: #fff;
  font-size: 10px; font-weight: 800; line-height: 18px;
  text-align: center; padding: 0 4px;
  border: 2px solid #fff;
  animation: anb-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes anb-pop {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}

/* Pulse ring on new notifications */
.anb-bell--pulse::after {
  content: '';
  position: absolute; inset: -4px; border-radius: 14px;
  border: 2px solid #059669; opacity: 0;
  animation: anb-ring 1.5s ease-out 2;
}
@keyframes anb-ring {
  0%   { opacity: 0.6; transform: scale(0.95); }
  100% { opacity: 0;   transform: scale(1.15); }
}

/* Dropdown */
.anb-dropdown {
  position: absolute; top: calc(100% + 10px); right: 0;
  width: clamp(320px, 90vw, 400px);
  background: #fff; border-radius: 18px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 20px 60px rgba(0,0,0,0.14), 0 6px 20px rgba(0,0,0,0.06);
  z-index: 9999; overflow: hidden;
  animation: anb-slide-in 0.25s cubic-bezier(0.22,1,0.36,1);
  transform-origin: top right;
}
@keyframes anb-slide-in {
  from { opacity: 0; transform: scale(0.92) translateY(-8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}

/* Header */
.anb-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 12px; border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
}
.anb-head-left { display: flex; align-items: center; gap: 8px; }
.anb-head-title {
  font-size: 14px; font-weight: 800; color: #0f172a; margin: 0;
}
.anb-head-count {
  font-size: 10px; font-weight: 800; padding: 2px 8px;
  border-radius: 999px; background: #059669; color: #fff;
}
.anb-head-actions { display: flex; gap: 6px; align-items: center; }
.anb-head-btn {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid #e2e8f0; background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b; transition: all 0.2s;
}
.anb-head-btn:hover { border-color: #059669; color: #059669; background: #f0fdf4; }
.anb-mark-all-btn {
  font-size: 11px; font-weight: 700; color: #059669;
  background: none; border: none; cursor: pointer;
  padding: 4px 8px; border-radius: 6px; font-family: inherit;
  transition: background 0.2s;
}
.anb-mark-all-btn:hover { background: #d1fae5; }
.anb-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  display: inline-block; margin-right: 4px;
}

/* Filter tabs */
.anb-tabs {
  display: flex; gap: 4px; padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9; overflow-x: auto;
  scrollbar-width: none;
}
.anb-tabs::-webkit-scrollbar { display: none; }
.anb-tab {
  padding: 4px 12px; border-radius: 999px;
  border: 1px solid #e2e8f0; background: #fff;
  font-size: 11px; font-weight: 700; color: #64748b;
  cursor: pointer; white-space: nowrap; font-family: inherit;
  transition: all 0.2s;
}
.anb-tab:hover { border-color: #059669; color: #059669; }
.anb-tab--active {
  background: #059669; border-color: #059669; color: #fff;
}

/* List */
.anb-list {
  max-height: 380px; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent;
}
.anb-list::-webkit-scrollbar { width: 4px; }
.anb-list::-webkit-scrollbar-thumb {
  background: #e2e8f0; border-radius: 2px;
}

.anb-item {
  display: flex; gap: 10px; padding: 11px 14px;
  border-bottom: 1px solid #f8fafc; cursor: pointer;
  transition: background 0.15s; position: relative;
  align-items: flex-start;
}
.anb-item:last-child { border-bottom: none; }
.anb-item:hover { background: #f8fafc; }
.anb-item--unread { background: #fafffe; }
.anb-item--unread::before {
  content: ''; position: absolute;
  left: 0; top: 0; bottom: 0; width: 3px;
  background: #059669; border-radius: 0 2px 2px 0;
}

.anb-item-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; flex-shrink: 0;
}
.anb-item-body { flex: 1; min-width: 0; }
.anb-item-title {
  font-size: 12.5px; font-weight: 700; color: #0f172a;
  margin: 0 0 2px; line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.anb-item--unread .anb-item-title { color: #047857; }
.anb-item-msg {
  font-size: 11.5px; color: #64748b; margin: 0 0 4px;
  line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.anb-item-meta {
  display: flex; align-items: center; gap: 6px;
}
.anb-item-time { font-size: 10.5px; color: #94a3b8; font-weight: 600; }
.anb-item-type-chip {
  font-size: 9.5px; font-weight: 800; padding: 1px 7px;
  border-radius: 999px; text-transform: uppercase; letter-spacing: 0.3px;
}
.anb-item-actions {
  display: flex; gap: 4px; align-items: center; flex-shrink: 0;
}
.anb-icon-btn {
  width: 26px; height: 26px; border-radius: 7px;
  border: 1px solid #e2e8f0; background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #94a3b8; transition: all 0.2s;
  opacity: 0;
}
.anb-item:hover .anb-icon-btn { opacity: 1; }
.anb-icon-btn:hover { color: #059669; border-color: #059669; background: #f0fdf4; }
.anb-icon-btn--del:hover { color: #dc2626; border-color: #fecaca; background: #fef2f2; }

/* Empty */
.anb-empty {
  text-align: center; padding: 40px 20px;
  color: #94a3b8;
}
.anb-empty-icon { font-size: 36px; margin-bottom: 10px; }
.anb-empty p { margin: 0; font-size: 13px; font-weight: 600; }

/* Loading */
.anb-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 36px;
}
.anb-spinner {
  width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid #e2e8f0; border-top-color: #059669;
  animation: anb-spin 0.7s linear infinite;
}
@keyframes anb-spin { to { transform: rotate(360deg); } }

/* Footer */
.anb-footer {
  border-top: 1px solid #f1f5f9; padding: 10px 16px;
  display: flex; align-items: center; justify-content: space-between;
  background: #fafdfb;
}
.anb-footer-link {
  font-size: 12px; font-weight: 700; color: #059669;
  text-decoration: none; display: flex; align-items: center; gap: 5px;
  transition: color 0.2s;
}
.anb-footer-link:hover { color: #047857; }
.anb-footer-status {
  font-size: 10.5px; color: #94a3b8; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
`;

/* ── Helpers ─────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const FILTER_TABS = [
  { key: 'all',      label: 'All'      },
  { key: 'unread',   label: 'Unread'   },
  { key: 'booking',  label: 'Bookings' },
  { key: 'payment',  label: 'Payments' },
  { key: 'user',     label: 'Users'    },
  { key: 'message',  label: 'Messages' },
];

/* ── Component ───────────────────────────────────────────── */
export default function AdminNotificationBell() {
  const {
    notifications, unreadCount, loading, connected,
    NOTIF_TYPES, markAsRead, markAllAsRead, deleteNotification, refresh,
  } = useAdminNotifications();

  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState('all');
  const [pulse,  setPulse]  = useState(false);
  const wrapRef = useRef(null);
  const prevCount = useRef(unreadCount);

  // Close on outside click
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Pulse when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setPulse(true);
      setTimeout(() => setPulse(false), 3200);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  // Filter logic
  const filtered = notifications.filter(n => {
    if (filter === 'all')     return true;
    if (filter === 'unread')  return !n.is_read;
    if (filter === 'booking') return n.type?.includes('booking');
    if (filter === 'payment') return n.type?.includes('payment');
    if (filter === 'user')    return n.type?.includes('user');
    if (filter === 'message') return n.type?.includes('contact') || n.type?.includes('message');
    return true;
  });

  const handleItemClick = useCallback((n) => {
    if (!n.is_read) markAsRead(n.id);
    // Navigate based on type
    const routes = {
      booking_new:       '/bookings',
      booking_confirmed: '/bookings',
      booking_cancelled: '/bookings',
      payment_received:  '/bookings',
      user_registered:   '/users',
      contact_message:   '/contact',
      review_posted:     '/testimonials',
      checklist_request: '/checklist',
    };
    const path = routes[n.type];
    if (path) window.location.href = path;
  }, [markAsRead]);

  return (
    <>
      <style>{CSS}</style>
      <div className="anb-wrap" ref={wrapRef}>

        {/* Bell trigger */}
        <button
          className={[
            'anb-bell',
            unreadCount > 0 ? 'anb-bell--has-unread' : '',
            pulse           ? 'anb-bell--pulse'       : '',
          ].join(' ')}
          onClick={() => setOpen(o => !o)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <FiBell size={18} />
          {unreadCount > 0 && (
            <span className="anb-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="anb-dropdown" role="dialog" aria-label="Notifications">

            {/* Header */}
            <div className="anb-head">
              <div className="anb-head-left">
                <FiBell size={15} color="#059669" />
                <h3 className="anb-head-title">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="anb-head-count">{unreadCount}</span>
                )}
              </div>
              <div className="anb-head-actions">
                {unreadCount > 0 && (
                  <button className="anb-mark-all-btn" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
                <button
                  className="anb-head-btn"
                  onClick={refresh}
                  title="Refresh"
                >
                  <FiRefreshCw size={13} />
                </button>
                <button
                  className="anb-head-btn"
                  onClick={() => setOpen(false)}
                  title="Close"
                >
                  <FiX size={13} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="anb-tabs">
              {FILTER_TABS.map(t => (
                <button
                  key={t.key}
                  className={`anb-tab${filter === t.key ? ' anb-tab--active' : ''}`}
                  onClick={() => setFilter(t.key)}
                >
                  {t.label}
                  {t.key === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="anb-list">
              {loading ? (
                <div className="anb-loading"><div className="anb-spinner" /></div>
              ) : filtered.length === 0 ? (
                <div className="anb-empty">
                  <div className="anb-empty-icon">🔔</div>
                  <p>
                    {filter === 'unread'
                      ? 'All caught up!'
                      : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                filtered.map(n => {
                  const meta = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
                  return (
                    <div
                      key={n.id}
                      className={`anb-item${!n.is_read ? ' anb-item--unread' : ''}`}
                      onClick={() => handleItemClick(n)}
                    >
                      <div
                        className="anb-item-icon"
                        style={{ background: meta.bg }}
                      >
                        {meta.icon}
                      </div>
                      <div className="anb-item-body">
                        <p className="anb-item-title">{n.title}</p>
                        <p className="anb-item-msg">{n.message}</p>
                        <div className="anb-item-meta">
                          <span className="anb-item-time">
                            {timeAgo(n.created_at)}
                          </span>
                          <span
                            className="anb-item-type-chip"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                      <div className="anb-item-actions" onClick={e => e.stopPropagation()}>
                        {!n.is_read && (
                          <button
                            className="anb-icon-btn"
                            onClick={() => markAsRead(n.id)}
                            title="Mark as read"
                          >
                            <FiCheck size={11} />
                          </button>
                        )}
                        <button
                          className="anb-icon-btn anb-icon-btn--del"
                          onClick={() => deleteNotification(n.id)}
                          title="Delete"
                        >
                          <FiTrash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="anb-footer">
              <Link
                to="/notifications"
                className="anb-footer-link"
                onClick={() => setOpen(false)}
              >
                <FiExternalLink size={12} />
                View all notifications
              </Link>
              <span className="anb-footer-status">
                <span
                  className="anb-status-dot"
                  style={{ background: connected ? '#059669' : '#e2e8f0' }}
                />
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}