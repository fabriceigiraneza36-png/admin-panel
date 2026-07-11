// admin/src/pages/Notifications.jsx
import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAdminNotifications, NOTIF_TYPES } from '../hooks/useAdminNotifications';
import {
  FiBell, FiCheck, FiTrash2, FiRefreshCw,
  FiSearch, FiX, FiCheckSquare, FiSend,
  FiMessageCircle, FiUsers, FiChevronDown,
} from 'react-icons/fi';

/* ── Helpers ── */
function timeAgo(d) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TABS = [
  { key: 'all',           label: '🔔 All'           },
  { key: 'unread',        label: '🔵 Unread'        },
  { key: 'awaiting',      label: '💬 Awaiting Reply' },
  { key: 'booking',       label: '📋 Bookings'      },
  { key: 'payment',       label: '💰 Payments'      },
  { key: 'user',          label: '👤 Users'         },
  { key: 'message',       label: '💬 Messages'      },
  { key: 'checklist',     label: '📝 Checklist'     },
  { key: 'system',        label: '🔧 System'        },
];

const NOTIF_TYPE_OPTIONS = [
  { value: 'general',     label: '💬 General'          },
  { value: 'promotion',   label: '🎉 Promotion'         },
  { value: 'new_package', label: '📦 New Package'       },
  { value: 'new_post',    label: '📝 Blog Post'         },
  { value: 'warning',     label: '⚠️ Warning'           },
  { value: 'alert',       label: '🚨 Alert'             },
  { value: 'system',      label: '🔧 System'            },
];

/* ── CSS ── */
const CSS = `
.np-root { animation: np-fade 0.4s ease; }
@keyframes np-fade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

.np-toolbar {
  background:#fff; border-radius:16px;
  border:1.5px solid #e2e8f0; padding:14px 18px;
  margin-bottom:20px; display:flex;
  gap:10px; flex-wrap:wrap; align-items:center;
  box-shadow:0 1px 8px rgba(0,0,0,0.04);
}
.np-search-wrap { position:relative; flex:1; min-width:200px; }
.np-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; }
.np-search {
  width:100%; padding:9px 36px; border:1.5px solid #e2e8f0;
  border-radius:11px; background:#f8fafc;
  font-size:13px; font-family:inherit; color:#0f172a;
  transition:border-color 0.2s; box-sizing:border-box;
}
.np-search:focus { outline:none; border-color:#059669; box-shadow:0 0 0 3px rgba(5,150,105,0.08); }
.np-search-clear {
  position:absolute; right:10px; top:50%; transform:translateY(-50%);
  width:18px; height:18px; border-radius:50%; border:none;
  background:#e2e8f0; display:grid; place-items:center;
  cursor:pointer; color:#64748b;
}
.np-search-clear:hover { background:#fecaca; color:#dc2626; }
.np-select {
  padding:9px 32px 9px 12px; border:1.5px solid #e2e8f0;
  border-radius:11px; background:#f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 8px center;
  font-size:12.5px; font-weight:600; font-family:inherit;
  color:#0f172a; cursor:pointer; appearance:none;
}
.np-select:focus { outline:none; border-color:#059669; }
.np-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:9px 16px; border-radius:11px; font-size:12.5px;
  font-weight:700; cursor:pointer; border:1.5px solid #e2e8f0;
  background:#fff; color:#475569; font-family:inherit;
  white-space:nowrap; transition:all 0.2s;
}
.np-btn:hover { border-color:#059669; color:#059669; background:#f0fdf4; }
.np-btn--primary {
  background:linear-gradient(135deg,#10b981,#059669);
  border-color:transparent; color:#fff;
  box-shadow:0 3px 12px rgba(5,150,105,0.25);
}
.np-btn--primary:hover { box-shadow:0 5px 18px rgba(5,150,105,0.38); color:#fff; transform:translateY(-1px); }
.np-btn--danger:hover { border-color:#fecaca; color:#dc2626; background:#fef2f2; }

/* Stats */
.np-stats { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px; }
.np-stat { flex:1; min-width:100px; background:#fff; border:1.5px solid #e2e8f0; border-radius:14px; padding:14px 16px; text-align:center; }
.np-stat-val { font-size:1.6rem; font-weight:900; margin:0; line-height:1; }
.np-stat-label { font-size:10.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.4px; margin:4px 0 0; }

/* Tabs */
.np-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
.np-tab { padding:6px 16px; border-radius:999px; border:1.5px solid #e2e8f0; background:#fff; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; font-family:inherit; transition:all 0.2s; white-space:nowrap; }
.np-tab:hover { border-color:#059669; color:#059669; background:#f0fdf4; }
.np-tab--active { background:#059669; border-color:#059669; color:#fff; box-shadow:0 2px 10px rgba(5,150,105,0.28); }

/* Status bar */
.np-status-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
.np-status-text { font-size:12.5px; color:#64748b; font-weight:600; }
.np-status-text strong { color:#059669; }
.np-live-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; }
.np-live-badge--on { background:#ecfdf5; color:#059669; }
.np-live-badge--off { background:#f1f5f9; color:#94a3b8; }
.np-live-dot { width:6px; height:6px; border-radius:50%; }

/* List */
.np-list { display:flex; flex-direction:column; gap:8px; }
.np-item {
  background:#fff; border-radius:14px; border:1.5px solid #e2e8f0;
  padding:14px 16px; display:flex; gap:12px;
  align-items:flex-start; cursor:pointer;
  transition:all 0.2s; position:relative;
  box-shadow:0 1px 6px rgba(0,0,0,0.03);
}
.np-item:hover { border-color:#bbf7d0; box-shadow:0 4px 18px rgba(5,150,105,0.08); transform:translateY(-1px); }
.np-item--unread { border-color:#d1fae5; background:#fafffe; }
.np-item--unread::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:linear-gradient(135deg,#10b981,#059669); border-radius:4px 0 0 4px; }
.np-item--reply { border-color:#ddd6fe; background:#faf5ff; }
.np-item--reply::before { background:linear-gradient(135deg,#8b5cf6,#7c3aed) !important; }

.np-item-icon { width:44px; height:44px; border-radius:13px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
.np-item-body { flex:1; min-width:0; }
.np-item-title { font-size:14px; font-weight:700; color:#0f172a; margin:0 0 4px; }
.np-item--unread .np-item-title { color:#065f46; }
.np-item-msg { font-size:13px; color:#475569; margin:0 0 8px; line-height:1.5; }
.np-item-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.np-item-time { font-size:11px; color:#94a3b8; font-weight:600; }
.np-item-chip { font-size:10px; font-weight:800; padding:2px 8px; border-radius:999px; text-transform:uppercase; letter-spacing:0.3px; }

/* Reply section */
.np-reply-box { margin-top:10px; padding:10px 12px; background:#f0fdf4; border-radius:10px; border:1px solid #bbf7d0; }
.np-reply-label { font-size:11px; font-weight:800; color:#166534; text-transform:uppercase; margin:0 0 4px; }
.np-reply-text { font-size:13px; color:#166534; margin:0 0 8px; line-height:1.5; }
.np-admin-reply-form { margin-top:8px; }
.np-admin-reply-form textarea {
  width:100%; padding:8px 12px; border-radius:8px; border:1.5px solid #d1fae5;
  font-size:13px; font-family:inherit; resize:none; outline:none; box-sizing:border-box;
}
.np-admin-reply-form textarea:focus { border-color:#059669; }
.np-admin-reply-actions { display:flex; gap:6px; margin-top:6px; }

.np-item-actions { display:flex; gap:6px; align-items:center; flex-shrink:0; }
.np-action-btn { width:32px; height:32px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#94a3b8; transition:all 0.2s; }
.np-action-btn:hover { border-color:#059669; color:#059669; background:#f0fdf4; }
.np-action-btn--del:hover { border-color:#fecaca; color:#dc2626; background:#fef2f2; }
.np-action-btn--reply:hover { border-color:#ddd6fe; color:#7c3aed; background:#faf5ff; }

/* Empty */
.np-empty { text-align:center; padding:60px 20px; background:#fff; border-radius:16px; border:1.5px dashed #e2e8f0; }
.np-empty-icon { font-size:48px; margin-bottom:14px; }
.np-empty h3 { font-size:18px; font-weight:700; color:#0f172a; margin:0 0 6px; }
.np-empty p { font-size:13px; color:#94a3b8; margin:0; }

.np-spinner { width:32px; height:32px; border-radius:50%; border:3px solid #e2e8f0; border-top-color:#059669; animation:np-spin 0.7s linear infinite; margin:0 auto; }
@keyframes np-spin { to{ transform:rotate(360deg) } }

/* ── Send Notification Modal ── */
.snm-overlay {
  position:fixed; inset:0; z-index:1000;
  background:rgba(0,0,0,0.5); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center; padding:20px;
  animation:snm-in 0.2s ease;
}
@keyframes snm-in { from{opacity:0} to{opacity:1} }
.snm-box {
  background:#fff; border-radius:20px; width:100%; max-width:600px;
  max-height:90vh; overflow-y:auto;
  box-shadow:0 24px 64px rgba(0,0,0,0.18);
  animation:snm-slide 0.25s cubic-bezier(0.22,1,0.36,1);
}
@keyframes snm-slide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.snm-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:20px 24px 16px; border-bottom:1px solid #f1f5f9;
}
.snm-title { font-size:18px; font-weight:800; color:#0f172a; margin:0; }
.snm-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; }
.snm-field { display:flex; flex-direction:column; gap:6px; }
.snm-label { font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.3px; }
.snm-input, .snm-textarea, .snm-select {
  padding:10px 14px; border:1.5px solid #e2e8f0;
  border-radius:11px; font-size:14px; font-family:inherit;
  color:#0f172a; background:#f8fafc; transition:border-color 0.2s;
  box-sizing:border-box;
}
.snm-input:focus, .snm-textarea:focus, .snm-select:focus {
  outline:none; border-color:#059669;
  box-shadow:0 0 0 3px rgba(5,150,105,0.08);
}
.snm-textarea { resize:vertical; min-height:80px; }
.snm-group-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; }
.snm-group-card {
  padding:12px; border-radius:12px; border:2px solid #e2e8f0;
  cursor:pointer; transition:all 0.2s; text-align:left;
  background:#fff;
}
.snm-group-card:hover { border-color:#059669; background:#f0fdf4; }
.snm-group-card--active { border-color:#059669; background:#ecfdf5; }
.snm-group-card-label { font-size:13px; font-weight:700; color:#0f172a; margin:0 0 2px; }
.snm-group-card-count { font-size:11px; color:#059669; font-weight:600; margin:0; }
.snm-group-card-desc { font-size:11px; color:#94a3b8; margin:4px 0 0; }
.snm-foot { padding:16px 24px; border-top:1px solid #f1f5f9; display:flex; gap:10px; justify-content:flex-end; }

@media (max-width:640px) {
  .np-toolbar { flex-direction:column; }
  .np-search-wrap { width:100%; min-width:0; }
  .np-stats { flex-direction:column; }
  .np-item-actions { display:none; }
  .np-item:active .np-item-actions { display:flex; }
  .snm-group-grid { grid-template-columns:1fr 1fr; }
}
`;

/* ── Send Notification Modal ── */
function SendNotificationModal({ open, onClose, targetGroups, onSend }) {
  const [form, setForm] = useState({
    targetGroup:  'all',
    userId:       '',
    userEmail:    '',
    type:         'general',
    title:        '',
    message:      '',
    actionUrl:    '',
    actionLabel:  '',
    priority:     'normal',
  });
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.'); return;
    }
    if (form.targetGroup === 'individual' && !form.userId && !form.userEmail) {
      setError('Please provide a User ID or email for individual targeting.'); return;
    }
    setSending(true); setError('');
    try {
      const payload = {
        type:        form.type,
        title:       form.title.trim(),
        message:     form.message.trim(),
        priority:    form.priority,
        targetGroup: form.targetGroup,
        ...(form.actionUrl    ? { actionUrl:   form.actionUrl.trim()   } : {}),
        ...(form.actionLabel  ? { actionLabel: form.actionLabel.trim() } : {}),
        ...(form.targetGroup === 'individual' ? {
          ...(form.userId    ? { userId:    form.userId.trim()    } : {}),
          ...(form.userEmail ? { userEmail: form.userEmail.trim() } : {}),
        } : {}),
      };
      await onSend(payload);
      setForm({ targetGroup:'all', userId:'', userEmail:'', type:'general', title:'', message:'', actionUrl:'', actionLabel:'', priority:'normal' });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const selectedGroup = targetGroups.find(g => g.key === form.targetGroup);

  return (
    <div className="snm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="snm-box">
        <div className="snm-head">
          <h2 className="snm-title">📢 Send Notification</h2>
          <button onClick={onClose} className="np-btn" style={{ padding: '6px 10px' }}>
            <FiX size={16} />
          </button>
        </div>

        <div className="snm-body">
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Target group */}
          <div className="snm-field">
            <label className="snm-label">
              <FiUsers size={12} style={{ marginRight: 4 }} />
              Target Audience
            </label>
            <div className="snm-group-grid">
              {targetGroups.map(g => (
                <button
                  key={g.key}
                  className={`snm-group-card${form.targetGroup === g.key ? ' snm-group-card--active' : ''}`}
                  onClick={() => set('targetGroup', g.key)}
                >
                  <p className="snm-group-card-label">{g.label}</p>
                  {g.count !== null && (
                    <p className="snm-group-card-count">{g.count.toLocaleString()} users</p>
                  )}
                  <p className="snm-group-card-desc">{g.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Individual user */}
          {form.targetGroup === 'individual' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="snm-field">
                <label className="snm-label">User ID</label>
                <input className="snm-input" placeholder="e.g. 42" value={form.userId}
                  onChange={e => set('userId', e.target.value)} />
              </div>
              <div className="snm-field">
                <label className="snm-label">Or User Email</label>
                <input className="snm-input" placeholder="user@example.com" value={form.userEmail}
                  onChange={e => set('userEmail', e.target.value)} />
              </div>
            </div>
          )}

          {selectedGroup && selectedGroup.count !== null && selectedGroup.count > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534', fontWeight: 600 }}>
              📊 This will send to approximately <strong>{selectedGroup.count.toLocaleString()}</strong> {selectedGroup.count === 1 ? 'user' : 'users'}
            </div>
          )}

          {/* Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="snm-field">
              <label className="snm-label">Notification Type</label>
              <select className="snm-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {NOTIF_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="snm-field">
              <label className="snm-label">Priority</label>
              <select className="snm-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">🟢 Low</option>
                <option value="normal">🔵 Normal</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="snm-field">
            <label className="snm-label">Title *</label>
            <input className="snm-input" placeholder="Notification title…" value={form.title}
              onChange={e => set('title', e.target.value)} maxLength={120} />
          </div>

          {/* Message */}
          <div className="snm-field">
            <label className="snm-label">Message *</label>
            <textarea className="snm-textarea" placeholder="Write your notification message…"
              value={form.message} onChange={e => set('message', e.target.value)} maxLength={500} />
            <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
              {form.message.length}/500
            </span>
          </div>

          {/* Optional CTA */}
          <details>
            <summary style={{ fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer', userSelect: 'none', marginBottom: 8 }}>
              ➕ Add action button (optional)
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div className="snm-field">
                <label className="snm-label">Action URL</label>
                <input className="snm-input" placeholder="/my-bookings" value={form.actionUrl}
                  onChange={e => set('actionUrl', e.target.value)} />
              </div>
              <div className="snm-field">
                <label className="snm-label">Button Label</label>
                <input className="snm-input" placeholder="View Details" value={form.actionLabel}
                  onChange={e => set('actionLabel', e.target.value)} />
              </div>
            </div>
          </details>
        </div>

        <div className="snm-foot">
          <button className="np-btn" onClick={onClose}>Cancel</button>
          <button
            className="np-btn np-btn--primary"
            onClick={handleSend}
            disabled={sending || !form.title.trim() || !form.message.trim()}
            style={{ opacity: (sending || !form.title.trim() || !form.message.trim()) ? 0.6 : 1 }}
          >
            <FiSend size={13} />
            {sending ? 'Sending…' : `Send${selectedGroup?.count ? ` to ${selectedGroup.count.toLocaleString()}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Admin Reply Inline Form ── */
function AdminReplyForm({ notif, onSend, onCancel }) {
  const [text,    setText]    = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(notif.id, text.trim());
      setText('');
    } catch { /* error handled in hook */ }
    finally { setSending(false); }
  };

  return (
    <div className="np-admin-reply-form">
      <textarea
        className="snm-textarea"
        placeholder={`Reply to ${notif.user_full_name || 'user'}…`}
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Ctrl+Enter to send</p>
      <div className="np-admin-reply-actions">
        <button
          className="np-btn np-btn--primary"
          style={{ padding: '7px 14px', fontSize: 12 }}
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          <FiSend size={12} />
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
        <button className="np-btn" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function NotificationsPage() {
  const {
    notifications, unreadCount, loading, connected,
    NOTIF_TYPES: NT, targetGroups, awaitingReply, stats,
    markAsRead, markAllAsRead, deleteNotification,
    sendAdminReply, sendNotification, refresh,
  } = useAdminNotifications();

  const [search,      setSearch]      = useState('');
  const [tab,         setTab]         = useState('all');
  const [sortBy,      setSortBy]      = useState('newest');
  const [sendModal,   setSendModal]   = useState(false);
  const [replyingId,  setReplyingId]  = useState(null);
  const [sendSuccess, setSendSuccess] = useState('');

  const filtered = useMemo(() => {
    let list = [...notifications];
    switch (tab) {
      case 'unread':    list = list.filter(n => !n.is_read); break;
      case 'awaiting':  list = list.filter(n => n.reply_text && !n.admin_reply); break;
      case 'booking':   list = list.filter(n => n.type?.includes('booking')); break;
      case 'payment':   list = list.filter(n => n.type?.includes('payment')); break;
      case 'user':      list = list.filter(n => n.type?.includes('user')); break;
      case 'message':   list = list.filter(n => n.type?.includes('contact') || n.type?.includes('message')); break;
      case 'checklist': list = list.filter(n => n.type?.includes('checklist')); break;
      case 'system':    list = list.filter(n => n.type === 'system'); break;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.user_email?.toLowerCase().includes(q) ||
        n.user_full_name?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) =>
      sortBy === 'oldest'
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at),
    );
    return list;
  }, [notifications, tab, search, sortBy]);

  const handleSend = async (payload) => {
    const result = await sendNotification(payload);
    const count  = result.sent || (Array.isArray(result.data) ? result.data.length : 1);
    setSendSuccess(`✅ Notification sent to ${count} user${count !== 1 ? 's' : ''}`);
    setTimeout(() => setSendSuccess(''), 5000);
    return result;
  };

  const handleAdminReply = async (notifId, text) => {
    await sendAdminReply(notifId, text);
    setReplyingId(null);
  };

  return (
    <>
      <Helmet><title>Notifications | Admin</title></Helmet>
      <style>{CSS}</style>

      <div className="np-root">

        {sendSuccess && (
          <div style={{ padding: '12px 18px', borderRadius: 12, background: '#ecfdf5', border: '1.5px solid #bbf7d0', color: '#166534', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
            {sendSuccess}
          </div>
        )}

        {/* Stats */}
        <div className="np-stats">
          {[
            { val: notifications.length,           label: 'Total',          color: '#0f172a' },
            { val: unreadCount,                    label: 'Unread',         color: '#059669' },
            { val: awaitingReply.length,           label: 'Need Reply',     color: '#7c3aed' },
            { val: stats.last_24h || 0,            label: 'Today',          color: '#0891b2' },
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
            <input className="np-search" placeholder="Search notifications, users…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="np-search-clear" onClick={() => setSearch('')}>
                <FiX size={10} />
              </button>
            )}
          </div>

          <select className="np-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>

          {unreadCount > 0 && (
            <button className="np-btn np-btn--primary" onClick={markAllAsRead}>
              <FiCheckSquare size={13} /> Mark all read
            </button>
          )}

          <button className="np-btn" onClick={refresh}>
            <FiRefreshCw size={13} /> Refresh
          </button>

          <button
            className="np-btn np-btn--primary"
            onClick={() => setSendModal(true)}
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}
          >
            <FiSend size={13} /> Send Notification
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
              {t.key === 'unread'   && unreadCount       > 0 ? ` (${unreadCount})`       : ''}
              {t.key === 'awaiting' && awaitingReply.length > 0 ? ` (${awaitingReply.length})` : ''}
            </button>
          ))}
        </div>

        {/* Status bar */}
        <div className="np-status-bar">
          <span className="np-status-text">
            Showing <strong>{filtered.length}</strong> of {notifications.length}
          </span>
          <span className={`np-live-badge np-live-badge--${connected ? 'on' : 'off'}`}>
            <span className="np-live-dot" style={{ background: connected ? '#059669' : '#94a3b8' }} />
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
              {search ? 'Try a different search term.' :
               tab === 'unread'   ? "You're all caught up!" :
               tab === 'awaiting' ? 'No notifications awaiting reply.' :
               'Notifications will appear here when there is activity.'}
            </p>
            {search && <button className="np-btn" onClick={() => setSearch('')} style={{ marginTop: 12 }}>Clear search</button>}
          </div>
        ) : (
          <div className="np-list">
            {filtered.map(n => {
              const meta        = NT[n.type] || NT.system;
              const hasReply    = Boolean(n.reply_text || n.replyText);
              const hasAdminRep = Boolean(n.admin_reply);
              const isReplying  = replyingId === n.id;

              return (
                <div
                  key={n.id}
                  className={[
                    'np-item',
                    !n.is_read             ? 'np-item--unread' : '',
                    hasReply && !hasAdminRep ? 'np-item--reply'  : '',
                  ].join(' ')}
                  onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                >
                  <div className="np-item-icon" style={{ background: meta.bg }}>
                    {meta.icon}
                  </div>

                  <div className="np-item-body">
                    <p className="np-item-title">
                      {!n.is_read && (
                        <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#059669', marginRight:6, verticalAlign:'middle' }} />
                      )}
                      {n.title}
                      {n.user_full_name && (
                        <span style={{ fontWeight: 500, fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                          — {n.user_full_name} ({n.user_email})
                        </span>
                      )}
                    </p>

                    <p className="np-item-msg">{n.message}</p>

                    <div className="np-item-meta">
                      <span className="np-item-time">{timeAgo(n.created_at)}</span>
                      <span className="np-item-chip" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      {n.priority === 'high' && (
                        <span className="np-item-chip" style={{ background: '#fef2f2', color: '#dc2626' }}>
                          HIGH
                        </span>
                      )}
                      {n.target_scope !== 'individual' && (
                        <span className="np-item-chip" style={{ background: '#f0f9ff', color: '#0891b2' }}>
                          {n.target_scope === 'all' ? '📢 Broadcast' : `📣 ${n.target_role}`}
                        </span>
                      )}
                    </div>

                    {/* User reply + admin reply */}
                    {hasReply && (
                      <div className="np-reply-box" onClick={e => e.stopPropagation()}>
                        <p className="np-reply-label">💬 User replied:</p>
                        <p className="np-reply-text">{n.reply_text || n.replyText}</p>

                        {hasAdminRep ? (
                          <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #d1fae5' }}>
                            <p className="np-reply-label" style={{ color: '#047857' }}>✅ Your reply:</p>
                            <p className="np-reply-text" style={{ color: '#047857' }}>{n.admin_reply}</p>
                          </div>
                        ) : isReplying ? (
                          <AdminReplyForm
                            notif={n}
                            onSend={handleAdminReply}
                            onCancel={() => setReplyingId(null)}
                          />
                        ) : (
                          <button
                            className="np-btn np-btn--primary"
                            style={{ padding: '7px 14px', fontSize: 12, marginTop: 8 }}
                            onClick={() => setReplyingId(n.id)}
                          >
                            <FiMessageCircle size={12} /> Reply to User
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="np-item-actions" onClick={e => e.stopPropagation()}>
                    {!n.is_read && (
                      <button className="np-action-btn" onClick={() => markAsRead(n.id)} title="Mark as read">
                        <FiCheck size={13} />
                      </button>
                    )}
                    {hasReply && !hasAdminRep && !isReplying && (
                      <button className="np-action-btn np-action-btn--reply" onClick={() => setReplyingId(n.id)} title="Reply">
                        <FiMessageCircle size={13} />
                      </button>
                    )}
                    <button className="np-action-btn np-action-btn--del" onClick={() => deleteNotification(n.id)} title="Delete">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send Notification Modal */}
      <SendNotificationModal
        open={sendModal}
        onClose={() => setSendModal(false)}
        targetGroups={targetGroups.length > 0 ? targetGroups : [
          { key: 'all',               label: 'All Users',           count: null, description: 'Send to every registered user' },
          { key: 'with_bookings',     label: 'Users with Bookings', count: null, description: 'Users who have at least one booking' },
          { key: 'confirmed_booking', label: 'Confirmed Bookings',  count: null, description: 'Users with confirmed bookings' },
          { key: 'pending_booking',   label: 'Pending Bookings',    count: null, description: 'Users with pending bookings' },
          { key: 'new_users',         label: 'New Users (7 days)',  count: null, description: 'Users registered in the last 7 days' },
          { key: 'individual',        label: 'Specific User',       count: null, description: 'Target a single user by ID or email' },
        ]}
        onSend={handleSend}
      />
    </>
  );
}