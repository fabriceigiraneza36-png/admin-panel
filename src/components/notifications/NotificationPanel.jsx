// admin/src/components/notifications/NotificationPanel.jsx
import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Link } from 'react-router-dom';

const fmt = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

const TYPE_ICONS = {
  admin_checklist_request: '📋',
  checklist_ready:         '✅',
  payment_confirmed:       '💳',
  payment_request:         '💰',
  booking_created:         '📅',
  general:                 '💬',
};

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, loading, fetchAll } = useNotifications();
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const recent = notifications.slice(0, 8);

  return (
    <div
      ref={panelRef}
      style={{
        position:    'absolute',
        top:         '100%',
        right:       0,
        width:       360,
        background:  '#fff',
        borderRadius: 16,
        border:      '1.5px solid #e2e8f0',
        boxShadow:   '0 16px 40px rgba(0,0,0,0.12)',
        zIndex:      999,
        overflow:    'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding:         '14px 18px',
        borderBottom:    '1px solid #f1f5f9',
        background:      '#fafdfb',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>🔔</span>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span style={{
              background: '#059669', color: '#fff',
              borderRadius: 999, fontSize: 10, fontWeight: 800,
              padding: '1px 7px',
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchAll()}
          style={{
            background: 'transparent', border: 'none',
            cursor: 'pointer', fontSize: '1rem', color: '#64748b',
          }}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
            Loading…
          </div>
        )}
        {!loading && recent.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>All caught up!</p>
          </div>
        )}
        {recent.map((n, idx) => (
          <div
            key={n.id}
            style={{
              padding:      '12px 18px',
              borderBottom: idx < recent.length - 1 ? '1px solid #f8fafc' : 'none',
              background:   n.priority === 'high' ? '#fef2f2' : '#fff',
              display:      'flex',
              gap:          10,
              alignItems:   'flex-start',
              transition:   'background 0.15s',
              cursor:       'default',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: '#f0fdf4', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0,
            }}>
              {TYPE_ICONS[n.type] || '💬'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                {n.title}
              </p>
              <p style={{
                margin: 0, fontSize: '0.78rem', color: '#64748b',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {n.message}
              </p>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {fmt(n.created_at || n.createdAt)}
              </span>
            </div>
            {n.priority === 'high' && (
              <span style={{
                fontSize: 9, fontWeight: 800, background: '#fecaca',
                color: '#dc2626', padding: '2px 6px', borderRadius: 4,
                textTransform: 'uppercase', flexShrink: 0,
              }}>
                HIGH
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding:      '12px 18px',
        borderTop:    '1px solid #f1f5f9',
        textAlign:    'center',
        background:   '#fafdfb',
      }}>
        <Link
          to="/notifications"
          onClick={onClose}
          style={{
            fontSize:   '0.82rem',
            color:      '#059669',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          View All Notifications →
        </Link>
      </div>
    </div>
  );
}