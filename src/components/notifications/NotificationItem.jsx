// admin/src/components/notifications/NotificationItem.jsx
import React from 'react';

const fmt = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function NotificationItem({ notification: n, onAction }) {
  const isChecklist = n.type?.includes('checklist');
  const isHigh      = n.priority === 'high';

  return (
    <div
      style={{
        padding:      '14px 18px',
        borderRadius: 12,
        border:       `1.5px solid ${isHigh ? '#fecaca' : isChecklist ? '#fde68a' : '#e2e8f0'}`,
        background:   isHigh ? '#fef2f2' : isChecklist ? '#fffbeb' : '#fff',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
            {n.title}
          </p>
          <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line' }}>
            {n.message}
          </p>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {fmt(n.created_at)} •{' '}
            <span style={{ fontWeight: 700, color: isHigh ? '#dc2626' : '#64748b' }}>
              {n.priority}
            </span>
          </span>
        </div>
        {isChecklist && (
          <button
            onClick={() => onAction?.('checklist', n)}
            style={{
              padding:    '6px 12px',
              borderRadius: 8,
              background: '#fef9c3',
              border:     '1px solid #fde68a',
              color:      '#d97706',
              fontWeight: 700,
              fontSize:   '0.75rem',
              cursor:     'pointer',
              flexShrink: 0,
            }}
          >
            📋 Handle
          </button>
        )}
      </div>
    </div>
  );
}