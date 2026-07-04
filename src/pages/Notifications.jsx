// src/pages/Notifications.jsx  (Admin full notifications page)
// ============================================================
import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAdminNotifications } from '../hooks/useAdminNotifications';
import {
  FiBell, FiCheck, FiTrash2, FiRefreshCw,
  FiSearch, FiX, FiCheckSquare, FiFilter,
  FiWifi, FiWifiOff,
} from 'react-icons/fi';

/* ── CSS ────────────────────────────────────────────────── */
const CSS = `
.np-root { animation: np-fade 0.4s ease; }
@keyframes np-fade { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

.np-toolbar {
  background: #fff; border-radius: 16px;
  border: 1.5px solid #e2e8f0; padding: 14px 18px;
  margin-bottom: 20px; display: flex;
  gap: 10px; flex-wrap: wrap; align-items: center;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.np-search-wrap { position: relative; flex: 1; min-width: 200px; }
.np-search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: #94a3b8; pointer-events: none;
}
.np-search {
  width: 100%; padding: 9px 36px; border: 1.5px solid #e2e8f0;
  border-radius: 11px; background: #f8fafc;
  font-size: 13px; font-family: inherit; color: #0f172a;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.np-search:focus {
  outline: none; border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5,150,105,0.08);
}
.np-search-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px; border-radius: 50%; border: none;
  background: #e2e8f0; display: grid; place-items: center;
  cursor: pointer; color: #64748b; transition: all 0.2s;
}
.np-search-clear:hover { background: #fecaca; color: #dc2626; }

.np-select {
  padding: 9px 32px 9px 12px; border: 1.5px solid #e2e8f0;
  border-radius: 11px; background: #f8fafc;
  font-size: 12.5px; font-weight: 600; font-family: inherit;
  color: #0f172a; cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
  transition: border-color 0.2s;
}
.np-select:focus { outline: none; border-color: #059669; }

.np-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: 11px; font-size: 12.5px;
  font-weight: 700; cursor: pointer; border: 1.5px solid #e2e8f0;
  background: #fff; color: #475569; font-family: inherit;
  transition: all 0.2s; white-space: nowrap;
}
.np-btn:hover { border-color: #059669; color: #059669; background: #f0fdf4; }
.np-btn--danger:hover { border-color: #fecaca; color: #dc2626; background: #fef2f2; }
.np-btn--primary {
  background: linear-gradient(135deg,#10b981,#059669);
  border-color: transparent; color: #fff;
  box-shadow: 0 3px 12px rgba(5,150,105,0.25);
}
.np-btn--primary:hover { box-shadow: 0 5px 18px rgba(5,150,105,0.38); color: #fff; transform: translateY(-1px); }

/* Stats bar */
.np-stats {
  display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;
}
.np-stat {
  flex: 1; min-width: 100px; background: #fff;
  border: 1.5px solid #e2e8f0; border-radius: 14px;
  padding: 14px 16px; text-align: center;
  box-shadow: 0 1px 6px rgba(0,0,0,0.03);
}
.np-stat-val {
  font-size: 1.6rem; font-weight: 900; margin: 0; line-height: 1;
}
.np-stat-label {
  font-size: 10.5px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.4px; margin: 4px 0 0;
}

/* Category tabs */
.np-tabs {
  display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;
}
.np-tab {
  padding: 6px 16px; border-radius: 999px;
  border: 1.5px solid #e2e8f0; background: #fff;
  font-size: 12px; font-weight: 700; color: #64748b;
  cursor: pointer; font-family: inherit; transition: all 0.2s;
  white-space: nowrap;
}
.np-tab:hover { border-color: #059669; color: #059669; background: #f0fdf4; }
.np-tab--active {
  background: #059669; border-color: #059669; color: #fff;
  box-shadow: 0 2px 10px rgba(5,150,105,0.28);
}

/* List */
.np-list { display: flex; flex-direction: column; gap: 8px; }

.np-item {
  background: #fff; border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  padding: 14px 16px; display: flex; gap: 12px;
  align-items: flex-start; cursor: pointer;
  transition: all 0.2s; position: relative;
  box-shadow: 0 1px 6px rgba(0,0,0,0.03);
}
.np-item:hover {
  border-color: #bbf7d0;
  box-shadow: 0 4px 18px rgba(5,150,105,0.08);
  transform: translateY(-1px);
}
.np-item--unread {
  border-color: #d1fae5; background: #fafffe;
}
.np-item--unread::before {
  content: ''; position: absolute;
  left: 0; top: 0; bottom: 0; width: 4px;
  background: linear-gradient(135deg,#10b981,#059669);
  border-radius: 4px 0 0 4px;
}

.np-item-icon {
  width: 44px; height: 44px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.np-item-body { flex: 1; min-width: 0; }
.np-item-title {
  font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px;
}
.np-item--unread .np-item-title { color: #065f46; }
.np-item-msg {
  font-size: 13px; color: #475569; margin: 0 0 8px; line-height: 1.5;
}
.np-item-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.np-item-time { font-size: 11px; color: #94a3b8; font-weight: 600; }
.np-item-chip {
  font-size: 10px; font-weight: 800; padding: 2px 8px;
  border-radius: 999px; text-transform: uppercase; letter-spacing: 0.3px;
}
.np-item-unread-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #059669; flex-shrink: 0; margin-top: 2px;
}

.np-item-actions {
  display: flex; gap: 6px; align-items: center; flex-shrink: 0;
}
.np-action-btn {
  width: 32px; height: 32px; border-radius: 9px;
  border: 1.5px solid #e2e8f0; background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #94a3b8; transition: all 0.2s;
}
.np-action-btn:hover { border-color: #059669; color: #059669; background: #f0fdf4; }
.np-action-btn--del:hover { border-color: #fecaca; color: #dc2626; background: #fef2f2; }

/* Empty */
.np-empty {
  text-align: center; padding: 60px 20px;
  background: #fff; border-radius: 16px;
  border: 1.5px dashed #e2e8f0;
}
.np-empty-icon { font-size: 48px; margin-bottom: 14px; }
.np-empty h3 {
  font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px;
}
.np-empty p {
  font-size: 13px; color: #94a3b8; margin: 0 0 18px;
}

/* Status bar */
.np-status-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
}
.np-status-text { font-size: 12.5px; color: #64748b; font-weight: 600; }
.np-status-text strong { color: #059669; }
.np-live-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 700;
}
.np-live-badge--on { background: #ecfdf5; color: #059669; }
.np-live-badge--off { background: #f1f5f9; color: #94a3b8; }
.np-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
}

.np-spinner {
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid #e2e8f0; border-top-color: #059669;
  animation: np-spin 0.7s linear infinite; margin: 0 auto;
}
@keyframes np-spin { to{ transform:rotate(360deg); } }

@media (max-width: 640px) {
  .np-toolbar { flex-direction: column; }
  .np-search-wrap { width: 100%; min-width: 0; }
  .np-stats { flex-direction: column; }
  .np-item-actions { display: none; }
  .np-item:active .np-item-actions { display: flex; }
}
`;

/* ── Helpers ────────────────────────────────────────────── */
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

const TABS = [
  { key: 'all',      label: '🔔 All'       },
  { key: 'unread',   label: '🔵 Unread'    },
  { key: 'booking',  label: '📋 Bookings'  },
  { key: 'payment',  label: '💰 Payments'  },
  { key: 'user',     label: '👤 Users'     },
  { key: 'message',  label: '💬 Messages'  },
  { key: 'system',   label: '🔧 System'    },
];

/* ── Component ─────────────────────────────────────────── */
export default function NotificationsPage() {
  const {
    notifications, unreadCount, loading, connected,
    NOTIF_TYPES, markAsRead, markAllAsRead, deleteNotification, refresh,
  } = useAdminNotifications();

  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('all');
  const [sortBy,   setSortBy]   = useState('newest');

  const filtered = useMemo(() => {
    let list = [...notifications];
    // Tab filter
    if (tab === 'unread')  list = list.filter(n => !n.is_read);
    else if (tab === 'booking') list = list.filter(n => n.type?.includes('booking'));
    else if (tab === 'payment') list = list.filter(n => n.type?.includes('payment'));
    else if (tab === 'user')    list = list.filter(n => n.type?.includes('user'));
    else if (tab === 'message') list = list.filter(n =>
      n.type?.includes('contact') || n.type?.includes('message')
    );
    else if (tab === 'system')  list = list.filter(n => n.type === 'system');
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q)
      );
    }
    // Sort
    if (sortBy === 'oldest') list.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    else list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [notifications, tab, search, sortBy]);

  const stats = useMemo(() => ({
    total:   notifications.length,
    unread:  notifications.filter(n => !n.is_read).length,
    today:   notifications.filter(n => {
      const d = new Date(n.created_at);
      const t = new Date();
      return d.toDateString() === t.toDateString();
    }).length,
    booking: notifications.filter(n => n.type?.includes('booking')).length,
  }), [notifications]);

  const handleItemClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
  };

  return (
    <>
      <Helmet>
        <title>Notifications | Admin</title>
      </Helmet>
      <style>{CSS}</style>

      <div className="np-root">

        {/* Stats */}
        <div className="np-stats">
          {[
            { val: stats.total,   label: 'Total',    color: '#0f172a' },
            { val: stats.unread,  label: 'Unread',   color: '#059669' },
            { val: stats.today,   label: 'Today',    color: '#0891b2' },
            { val: stats.booking, label: 'Bookings', color: '#d97706' },
          ].map(s => (
            <div key={s.label} className="np-stat">
              <p className="np-stat-val" style={{ color: s.color }}>{s.val}</p>
              <p className="np-stat-label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="np-toolbar">
          <div className="np-search-wrap">
            <FiSearch size={14} className="np-search-icon" />
            <input
              className="np-search"
              placeholder="Search notifications…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="np-search-clear" onClick={() => setSearch('')}>
                <FiX size={10} />
              </button>
            )}
          </div>

          <select
            className="np-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>

          {unreadCount > 0 && (
            <button className="np-btn np-btn--primary" onClick={markAllAsRead}>
              <FiCheckSquare size={13} />
              Mark all read
            </button>
          )}

          <button className="np-btn" onClick={refresh} title="Refresh">
            <FiRefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="np-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`np-tab${tab === t.key ? ' np-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Status bar */}
        <div className="np-status-bar">
          <span className="np-status-text">
            Showing <strong>{filtered.length}</strong> of {notifications.length} notifications
          </span>
          <span className={`np-live-badge np-live-badge--${connected ? 'on' : 'off'}`}>
            <span
              className="np-live-dot"
              style={{ background: connected ? '#059669' : '#94a3b8' }}
            />
            {connected ? 'Live updates' : 'Offline'}
          </span>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div className="np-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="np-empty">
            <div className="np-empty-icon">🔔</div>
            <h3>{search ? `No results for "${search}"` : 'No notifications'}</h3>
            <p>
              {search
                ? 'Try a different search term.'
                : tab === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : 'Notifications will appear here when there is activity.'}
            </p>
            {search && (
              <button className="np-btn" onClick={() => setSearch('')}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="np-list">
            {filtered.map(n => {
              const meta = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
              return (
                <div
                  key={n.id}
                  className={`np-item${!n.is_read ? ' np-item--unread' : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div
                    className="np-item-icon"
                    style={{ background: meta.bg }}
                  >
                    {meta.icon}
                  </div>

                  <div className="np-item-body">
                    <p className="np-item-title">
                      {!n.is_read && (
                        <span
                          className="np-item-unread-dot"
                          style={{ display: 'inline-block', marginRight: 6 }}
                        />
                      )}
                      {n.title}
                    </p>
                    <p className="np-item-msg">{n.message}</p>
                    <div className="np-item-meta">
                      <span className="np-item-time">{timeAgo(n.created_at)}</span>
                      <span
                        className="np-item-chip"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  <div
                    className="np-item-actions"
                    onClick={e => e.stopPropagation()}
                  >
                    {!n.is_read && (
                      <button
                        className="np-action-btn"
                        onClick={() => markAsRead(n.id)}
                        title="Mark as read"
                      >
                        <FiCheck size={13} />
                      </button>
                    )}
                    <button
                      className="np-action-btn np-action-btn--del"
                      onClick={() => deleteNotification(n.id)}
                      title="Delete"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}