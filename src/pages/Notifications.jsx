// admin/src/pages/Notifications.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import notificationsAPI from '../api/notifications';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../hooks/useToast';
import { ImageUpload } from '../components/common/ImageUpload';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '—';
  const dt   = new Date(d);
  const diff = Date.now() - dt.getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PRIORITY_COLORS = {
  high:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', dot: '#dc2626' },
  normal: { bg: '#f0fdf4', border: '#bbf7d0', color: '#059669', dot: '#059669' },
  low:    { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', dot: '#94a3b8' },
};

const TYPE_ICONS = {
  checklist_request:       '📋',
  admin_checklist_request: '📋',
  checklist_ready:         '✅',
  payment_confirmed:       '💳',
  payment_request:         '💰',
  booking_created:         '📅',
  booking_confirmed:       '✅',
  booking_cancelled:       '❌',
  general:                 '💬',
  system:                  '⚙️',
  alert:                   '🚨',
};

const css = `
  .adm-notif * { box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }
  .adm-notif { padding: 24px; background: #f8fafc; min-height: 100vh; }

  /* ── Header ── */
  .adm-notif-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
  }
  .adm-notif-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
  .adm-notif-subtitle { font-size: 0.85rem; color: #64748b; margin: 4px 0 0; }

  /* ── Stats bar ── */
  .adm-stat-row {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(130px,1fr));
    gap: 12px; margin-bottom: 24px;
  }
  .adm-stat {
    background: #fff; border-radius: 14px; border: 1px solid #e2e8f0;
    padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .adm-stat-value { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0; line-height: 1; }
  .adm-stat-label { font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin: 4px 0 0; }

  /* ── Tabs ── */
  .adm-tabs {
    display: flex; gap: 4px; background: #f1f5f9; border-radius: 12px;
    padding: 4px; margin-bottom: 20px; overflow-x: auto; width: fit-content;
  }
  .adm-tab {
    padding: 8px 18px; border-radius: 9px; border: none;
    font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap;
    transition: all 0.15s; font-family: inherit;
  }
  .adm-tab.active {
    background: #fff; color: #059669; font-weight: 800;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .adm-tab:not(.active) { background: transparent; color: #64748b; }

  /* ── Controls ── */
  .adm-controls {
    display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;
  }
  .adm-search {
    flex: 1 1 220px; max-width: 320px; padding: 9px 14px;
    border-radius: 10px; border: 1.5px solid #e2e8f0;
    font-size: 0.85rem; outline: none; font-family: inherit;
    transition: border-color 0.2s;
  }
  .adm-search:focus { border-color: #059669; }
  .adm-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 10px; border: none;
    font-size: 0.83rem; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: all 0.18s;
  }
  .adm-btn-primary {
    background: linear-gradient(135deg,#059669,#047857); color: #fff;
    box-shadow: 0 3px 10px rgba(5,150,105,0.25);
  }
  .adm-btn-primary:hover { transform: translateY(-1px); }
  .adm-btn-secondary {
    background: #fff; color: #475569;
    border: 1.5px solid #e2e8f0;
  }
  .adm-btn-secondary:hover { background: #f8fafc; }
  .adm-btn-danger {
    background: #fef2f2; color: #dc2626;
    border: 1.5px solid #fecaca;
  }
  .adm-btn-danger:hover { background: #fee2e2; }
  .adm-btn-sm { padding: 6px 12px; font-size: 0.78rem; }
  .adm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* ── Notification Card ── */
  .adm-notif-card {
    background: #fff; border-radius: 16px; border: 1.5px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; margin-bottom: 12px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .adm-notif-card:hover { border-color: #bbf7d0; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  .adm-notif-card.checklist { border-color: #fde68a; }
  .adm-notif-card.payment   { border-color: #c7d2fe; }
  .adm-notif-card.high      { border-left: 4px solid #dc2626; }

  .adm-notif-card-inner { padding: 16px 20px; }
  .adm-notif-card-top {
    display: flex; align-items: flex-start; gap: 12px;
  }
  .adm-notif-icon {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
    background: #f0fdf4;
  }
  .adm-notif-body { flex: 1; min-width: 0; }
  .adm-notif-card-title { font-size: 0.9rem; font-weight: 800; color: #0f172a; margin: 0 0 3px; }
  .adm-notif-card-message { font-size: 0.82rem; color: #475569; margin: 0; line-height: 1.55; white-space: pre-line; }
  .adm-notif-card-meta {
    display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; align-items: center;
  }
  .adm-notif-badge {
    font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;
    text-transform: uppercase; letter-spacing: 0.3px;
  }
  .adm-notif-time { font-size: 0.72rem; color: #94a3b8; }

  /* User info */
  .adm-user-info {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.75rem; color: #64748b; font-weight: 600;
  }
  .adm-user-avatar {
    width: 20px; height: 20px; border-radius: 50%; background: #e2e8f0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 800; color: #64748b; flex-shrink: 0;
  }

  /* Reply text */
  .adm-reply-text {
    margin-top: 10px; padding: 10px 12px;
    background: #f0f9ff; border: 1px solid #bae6fd;
    border-radius: 10px; font-size: 0.82rem; color: #0369a1;
  }
  .adm-reply-text strong { display: block; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }

  /* Card actions */
  .adm-card-actions {
    display: flex; gap: 8px; margin-top: 12px;
    padding-top: 12px; border-top: 1px solid #f1f5f9; flex-wrap: wrap;
  }

  /* ── Compose / Send Panel ── */
  .adm-compose {
    background: #fff; border-radius: 18px; border: 1.5px solid #e2e8f0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.04); padding: 24px; margin-bottom: 24px;
  }
  .adm-compose h3 {
    font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0 0 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .adm-compose-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }
  .adm-field { display: flex; flex-direction: column; gap: 5px; }
  .adm-field.full { grid-column: 1 / -1; }
  .adm-label {
    font-size: 0.72rem; font-weight: 800; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .adm-input, .adm-select, .adm-textarea {
    padding: 9px 12px; border-radius: 10px; border: 1.5px solid #e2e8f0;
    font-size: 0.88rem; font-family: inherit; outline: none;
    transition: border-color 0.2s;
  }
  .adm-input:focus, .adm-select:focus, .adm-textarea:focus { border-color: #059669; }
  .adm-textarea { resize: vertical; min-height: 80px; }
  .adm-select { appearance: none; }

  /* ── Checklist Panel ── */
  .adm-checklist-panel {
    background: #fffbeb; border: 1.5px solid #fde68a;
    border-radius: 14px; padding: 20px; margin-top: 14px;
  }
  .adm-checklist-panel h4 { margin: 0 0 12px; font-size: 0.9rem; font-weight: 800; color: #92400e; }

  /* ── Payment Panel ── */
  .adm-payment-panel {
    background: #f0f9ff; border: 1.5px solid #bae6fd;
    border-radius: 14px; padding: 20px; margin-top: 14px;
  }
  .adm-payment-panel h4 { margin: 0 0 12px; font-size: 0.9rem; font-weight: 800; color: #0369a1; }

  /* ── Empty ── */
  .adm-empty {
    text-align: center; padding: 64px 24px;
    background: #fff; border-radius: 16px; border: 1.5px dashed #e2e8f0;
  }

  /* ── Loading ── */
  .adm-spinner {
    width: 40px; height: 40px; border-radius: 50%;
    border: 3px solid #e2e8f0; border-top-color: #059669;
    animation: admSpin 0.8s linear infinite; margin: 32px auto;
  }

  @keyframes admSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
  .adm-spin { animation: admSpin 1s linear infinite; }

  @media (max-width: 640px) {
    .adm-compose-grid { grid-template-columns: 1fr; }
    .adm-field.full { grid-column: 1; }
    .adm-notif { padding: 16px; }
  }
`;

// ─── Compose Form ─────────────────────────────────────────────────────────────
function ComposeForm({ onSent }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title:       '',
    message:     '',
    type:        'general',
    priority:    'normal',
    targetScope: 'all',
    userId:      '',
    actionUrl:   '',
    actionLabel: '',
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setSending(true);
    try {
      await notificationsAPI.create({
        ...form,
        userId: form.userId ? parseInt(form.userId, 10) : null,
      });
      toast.success('Notification sent!');
      setForm({
        title: '', message: '', type: 'general', priority: 'normal',
        targetScope: 'all', userId: '', actionUrl: '', actionLabel: '',
      });
      onSent?.();
    } catch (err) {
      toast.error(err.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="adm-compose">
      <h3>📢 Send Notification</h3>
      <form onSubmit={handleSend}>
        <div className="adm-compose-grid">
          <div className="adm-field full">
            <label className="adm-label">Title *</label>
            <input
              name="title"
              className="adm-input"
              value={form.title}
              onChange={handleChange}
              placeholder="Notification title…"
              required
            />
          </div>
          <div className="adm-field full">
            <label className="adm-label">Message *</label>
            <textarea
              name="message"
              className="adm-textarea"
              value={form.message}
              onChange={handleChange}
              placeholder="Write your message…"
              required
            />
          </div>
          <div className="adm-field">
            <label className="adm-label">Type</label>
            <select name="type" className="adm-select" value={form.type} onChange={handleChange}>
              <option value="general">💬 General</option>
              <option value="alert">🚨 Alert</option>
              <option value="promotion">🎉 Promotion</option>
              <option value="system">⚙️ System</option>
              <option value="new_destination">🗺️ New Destination</option>
              <option value="new_package">📦 New Package</option>
              <option value="booking_confirmed">✅ Booking Confirmed</option>
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label">Priority</label>
            <select name="priority" className="adm-select" value={form.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label">Target</label>
            <select name="targetScope" className="adm-select" value={form.targetScope} onChange={handleChange}>
              <option value="all">🌍 All Users</option>
              <option value="individual">👤 Specific User</option>
              <option value="role">🎭 By Role</option>
            </select>
          </div>
          {form.targetScope === 'individual' && (
            <div className="adm-field">
              <label className="adm-label">User ID</label>
              <input
                name="userId"
                type="number"
                className="adm-input"
                value={form.userId}
                onChange={handleChange}
                placeholder="User ID number"
              />
            </div>
          )}
          <div className="adm-field">
            <label className="adm-label">Action URL (optional)</label>
            <input
              name="actionUrl"
              className="adm-input"
              value={form.actionUrl}
              onChange={handleChange}
              placeholder="/my-bookings"
            />
          </div>
          <div className="adm-field">
            <label className="adm-label">Action Label (optional)</label>
            <input
              name="actionLabel"
              className="adm-input"
              value={form.actionLabel}
              onChange={handleChange}
              placeholder="View Booking"
            />
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button
            type="submit"
            className="adm-btn adm-btn-primary"
            disabled={sending || !form.title || !form.message}
          >
            {sending
              ? <><span className="adm-spin">↻</span> Sending…</>
              : '📤 Send Notification'
            }
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Checklist Action Panel ────────────────────────────────────────────────────
function ChecklistPanel({ notification, onDone }) {
  const toast   = useToast();
  const [pdfUrl,   setPdfUrl]   = useState('');
  const [sending,  setSending]  = useState(false);

  const userId = notification?.metadata?.requesterId
    || notification?.userId
    || notification?.user_id;

  const tripTitle = notification?.metadata?.destination
    || notification?.metadata?.checklistType
    || 'Your Trip';

  const handleSend = async () => {
    if (!pdfUrl) { toast.error('Please enter a PDF URL or upload a file.'); return; }
    if (!userId) { toast.error('Cannot determine user ID.'); return; }
    setSending(true);
    try {
      await notificationsAPI.sendChecklist({
        userId,
        pdfUrl,
        tripTitle,
        requestNotifId: notification.id,
      });
      toast.success('✅ Checklist PDF sent to user!');
      onDone?.();
    } catch (err) {
      toast.error(err.message || 'Failed to send checklist.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="adm-checklist-panel">
      <h4>📋 Send Checklist PDF to User</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="adm-field">
          <label className="adm-label">PDF URL or Upload Link</label>
          <input
            type="url"
            className="adm-input"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="https://your-cdn.com/checklist.pdf"
          />
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400e' }}>
          Upload your PDF to Cloudinary or any file host, then paste the link above.
          The user will receive an instant notification with a download button.
        </p>
        <div>
          <button
            className="adm-btn adm-btn-primary adm-btn-sm"
            onClick={handleSend}
            disabled={sending || !pdfUrl}
          >
            {sending ? '⏳ Sending…' : '📤 Send to User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Action Panel ──────────────────────────────────────────────────────
function PaymentPanel({ notification, onDone }) {
  const toast = useToast();
  const [action,   setAction]   = useState('confirm');
  const [amount,   setAmount]   = useState('');
  const [dueDate,  setDueDate]  = useState('');
  const [sending,  setSending]  = useState(false);

  const userId        = notification?.metadata?.requesterId || notification?.user_id;
  const bookingId     = notification?.metadata?.bookingId;
  const bookingNumber = notification?.metadata?.bookingNumber;

  const handleSubmit = async () => {
    setSending(true);
    try {
      if (action === 'confirm') {
        await notificationsAPI.confirmPayment({
          bookingId, userId, bookingNumber,
          amount:   parseFloat(amount) || null,
          currency: 'USD',
        });
        toast.success('✅ Payment confirmed and user notified!');
      } else {
        await notificationsAPI.requestPayment({
          bookingId, userId, bookingNumber,
          amount:   parseFloat(amount) || null,
          currency: 'USD',
          dueDate,
        });
        toast.success('💰 Payment request sent to user!');
      }
      onDone?.();
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="adm-payment-panel">
      <h4>💳 Payment Action</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`adm-btn adm-btn-sm ${action === 'confirm' ? 'adm-btn-primary' : 'adm-btn-secondary'}`}
            onClick={() => setAction('confirm')}
          >
            ✅ Confirm Payment
          </button>
          <button
            className={`adm-btn adm-btn-sm ${action === 'request' ? 'adm-btn-primary' : 'adm-btn-secondary'}`}
            onClick={() => setAction('request')}
          >
            💰 Request Payment
          </button>
        </div>
        <input
          type="number"
          className="adm-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (USD)"
        />
        {action === 'request' && (
          <input
            type="date"
            className="adm-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        )}
        <button
          className="adm-btn adm-btn-primary adm-btn-sm"
          onClick={handleSubmit}
          disabled={sending}
        >
          {sending ? '⏳ Processing…' : action === 'confirm' ? '✅ Confirm' : '💰 Send Request'}
        </button>
      </div>
    </div>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────
function NotifCard({ notif, onRefresh }) {
  const toast = useToast();
  const [expanded,       setExpanded]       = useState(false);
  const [replyText,      setReplyText]      = useState('');
  const [replying,       setReplying]       = useState(false);
  const [showChecklist,  setShowChecklist]  = useState(false);
  const [showPayment,    setShowPayment]    = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  const isChecklist = notif.type?.includes('checklist');
  const isPayment   = notif.category === 'payment' || notif.type?.includes('payment');
  const pCol        = PRIORITY_COLORS[notif.priority] || PRIORITY_COLORS.normal;

  const cardClass = [
    'adm-notif-card',
    isChecklist  ? 'checklist' : '',
    isPayment    ? 'payment'   : '',
    notif.priority === 'high' ? 'high' : '',
  ].filter(Boolean).join(' ');

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await notificationsAPI.adminReply(notif.id, replyText.trim());
      toast.success('Reply sent!');
      setReplyText('');
      setExpanded(false);
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Reply failed.');
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this notification?')) return;
    setDeleting(true);
    try {
      await notificationsAPI.adminDelete(notif.id);
      toast.success('Deleted.');
      onRefresh?.();
    } catch { toast.error('Delete failed.'); }
    finally { setDeleting(false); }
  };

  return (
    <div className={cardClass}>
      <div className="adm-notif-card-inner">
        <div className="adm-notif-card-top">
          <div className="adm-notif-icon">
            {TYPE_ICONS[notif.type] || '💬'}
          </div>
          <div className="adm-notif-body">
            <p className="adm-notif-card-title">{notif.title}</p>
            <p className="adm-notif-card-message">{notif.message}</p>

            <div className="adm-notif-card-meta">
              <span
                className="adm-notif-badge"
                style={{ background: pCol.bg, color: pCol.color, border: `1px solid ${pCol.border}` }}
              >
                {notif.priority}
              </span>
              <span
                className="adm-notif-badge"
                style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}
              >
                {notif.type}
              </span>
              {notif.user_full_name && (
                <div className="adm-user-info">
                  <div className="adm-user-avatar">
                    {notif.user_full_name.charAt(0).toUpperCase()}
                  </div>
                  {notif.user_full_name} · {notif.user_email}
                </div>
              )}
              <span className="adm-notif-time">{fmt(notif.created_at || notif.createdAt)}</span>
            </div>

            {/* User's reply to admin */}
            {notif.reply_text && (
              <div className="adm-reply-text">
                <strong>User replied:</strong>
                {notif.reply_text}
              </div>
            )}

            {/* Admin's reply */}
            {notif.admin_reply && (
              <div style={{
                marginTop: 8, padding: '8px 12px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, fontSize: '0.82rem', color: '#166534',
              }}>
                <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: 2 }}>
                  Your reply:
                </strong>
                {notif.admin_reply}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="adm-card-actions">
          {/* Checklist action */}
          {isChecklist && !notif.metadata?.handled && (
            <button
              className="adm-btn adm-btn-sm"
              style={{ background: '#fefce8', color: '#d97706', border: '1.5px solid #fde68a' }}
              onClick={() => { setShowChecklist(!showChecklist); setShowPayment(false); }}
            >
              📋 {showChecklist ? 'Close' : 'Send PDF'}
            </button>
          )}

          {/* Payment action */}
          {notif.category === 'payment' || notif.type?.includes('booking') ? (
            <button
              className="adm-btn adm-btn-sm"
              style={{ background: '#f0f9ff', color: '#0369a1', border: '1.5px solid #bae6fd' }}
              onClick={() => { setShowPayment(!showPayment); setShowChecklist(false); }}
            >
              💳 {showPayment ? 'Close' : 'Payment Action'}
            </button>
          ) : null}

          {/* Reply */}
          {notif.reply_text && !notif.admin_reply && (
            <button
              className="adm-btn adm-btn-sm adm-btn-secondary"
              onClick={() => setExpanded(!expanded)}
            >
              💬 {expanded ? 'Close' : 'Reply to User'}
            </button>
          )}

          <button
            className="adm-btn adm-btn-sm adm-btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? '⏳' : '🗑️'} Delete
          </button>
        </div>

        {/* Checklist send panel */}
        {showChecklist && (
          <ChecklistPanel
            notification={notif}
            onDone={() => { setShowChecklist(false); onRefresh?.(); }}
          />
        )}

        {/* Payment action panel */}
        {showPayment && (
          <PaymentPanel
            notification={notif}
            onDone={() => { setShowPayment(false); onRefresh?.(); }}
          />
        )}

        {/* Reply form */}
        {expanded && !notif.admin_reply && (
          <div style={{ marginTop: 12 }}>
            <textarea
              className="adm-textarea"
              style={{ width: '100%' }}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply to the user…"
              rows={3}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="adm-btn adm-btn-primary adm-btn-sm"
                onClick={handleReply}
                disabled={replying || !replyText.trim()}
              >
                {replying ? '⏳ Sending…' : '📤 Send Reply'}
              </button>
              <button
                className="adm-btn adm-btn-secondary adm-btn-sm"
                onClick={() => setExpanded(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Notifications() {
  const toast  = useToast();
  const socket = useSocket?.();

  const [tab,           setTab]           = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [stats,         setStats]         = useState({});
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [showCompose,   setShowCompose]   = useState(false);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);

  const fetchAll = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 30 };
      if (tab === 'checklist') params.type = 'admin_checklist_request,checklist_request';
      if (tab === 'payment')   params.type = 'payment_confirmed,payment_request';
      if (tab === 'replies')   { /* filter client-side */ }

      const [data, statsData] = await Promise.all([
        notificationsAPI.getAll(params),
        notificationsAPI.getStats(),
      ]);

      setNotifications(pageNum === 1 ? (data.data || []) : (prev) => [...prev, ...(data.data || [])]);
      setTotalPages(data.pagination?.total_pages || 1);
      setPage(pageNum);
      setStats(statsData.data || {});
    } catch (err) {
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => { fetchAll(1); }, [fetchAll]);

  // Live socket updates
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      toast.info(`New: ${notif.title}`);
    };
    socket.on('notification:new', handler);
    socket.on('notification:user-replied', () => fetchAll(1));
    return () => {
      socket.off('notification:new',       handler);
      socket.off('notification:user-replied');
    };
  }, [socket, fetchAll, toast]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (tab === 'replies')   list = list.filter(n => n.reply_text && !n.admin_reply);
    if (tab === 'checklist') list = list.filter(n => n.type?.includes('checklist'));
    if (tab === 'payment')   list = list.filter(n => n.category === 'payment' || n.type?.includes('payment'));
    if (tab === 'high')      list = list.filter(n => n.priority === 'high');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        String(n.title   || '').toLowerCase().includes(q) ||
        String(n.message || '').toLowerCase().includes(q) ||
        String(n.user_email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [notifications, tab, search]);

  const TABS = [
    { key: 'all',       label: `All (${notifications.length})`                    },
    { key: 'checklist', label: `📋 Checklists (${stats.checklist_requests || 0})` },
    { key: 'payment',   label: `💳 Payments`                                      },
    { key: 'replies',   label: `💬 Replies (${stats.awaiting_reply || 0})`        },
    { key: 'high',      label: `🚨 High Priority (${stats.high_priority || 0})`   },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="adm-notif">

        {/* Header */}
        <div className="adm-notif-header">
          <div>
            <h1 className="adm-notif-title">🔔 Notifications Center</h1>
            <p className="adm-notif-subtitle">
              Manage all user notifications, checklist requests, and payment actions
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="adm-btn adm-btn-secondary"
              onClick={() => fetchAll(1)}
              disabled={loading}
            >
              {loading ? '⏳' : '↻'} Refresh
            </button>
            <button
              className="adm-btn adm-btn-primary"
              onClick={() => setShowCompose(!showCompose)}
            >
              {showCompose ? '✕ Close' : '📤 Send Notification'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="adm-stat-row">
          {[
            { value: stats.total         || 0, label: 'Total',           color: '#0f172a' },
            { value: stats.unread        || 0, label: 'Unread',          color: '#059669' },
            { value: stats.checklist_requests || 0, label: 'Checklist Requests', color: '#d97706' },
            { value: stats.awaiting_reply || 0, label: 'Awaiting Reply', color: '#7c3aed' },
            { value: stats.high_priority || 0, label: 'High Priority',  color: '#dc2626' },
            { value: stats.last_24h      || 0, label: 'Last 24h',       color: '#0891b2' },
          ].map((s) => (
            <div key={s.label} className="adm-stat">
              <p className="adm-stat-value" style={{ color: s.color }}>{s.value}</p>
              <p className="adm-stat-label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Compose */}
        {showCompose && (
          <ComposeForm onSent={() => { setShowCompose(false); fetchAll(1); }} />
        )}

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="adm-controls">
          <input
            className="adm-search"
            type="text"
            placeholder="Search by title, message, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* List */}
        {loading && <div className="adm-spinner" />}

        {!loading && filtered.length === 0 && (
          <div className="adm-empty">
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔔</div>
            <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: '#0f172a' }}>
              No notifications
            </h3>
            <p style={{ color: '#64748b', margin: 0 }}>
              {tab === 'checklist' ? 'No checklist requests yet.'
               : tab === 'replies' ? 'No user replies awaiting response.'
               : 'Nothing here yet.'}
            </p>
          </div>
        )}

        {filtered.map((n) => (
          <NotifCard
            key={n.id}
            notif={n}
            onRefresh={() => fetchAll(1)}
          />
        ))}

        {/* Load more */}
        {page < totalPages && !loading && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <button
              className="adm-btn adm-btn-secondary"
              onClick={() => fetchAll(page + 1)}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </>
  );
}