import React, { useEffect, useState, useCallback } from 'react'
import {
  Bell, Send, Trash2, RefreshCw, MessageSquare,
  Users, User, Globe, AlertTriangle, Info,
  CheckCircle, Filter, Eye, Reply,
} from 'lucide-react'
import { notificationsAPI }  from '@api/notifications'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination             from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                  from '@components/common/Badge'
import ConfirmDialog          from '@components/common/ConfirmDialog'
import Dropdown               from '@components/common/Dropdown'
import { useModal }           from '@hooks/useModal'
import { useToast }           from '@hooks/useToast'
import { usePagination }      from '@hooks/usePagination'
import { useDebounce }        from '@hooks/useDebounce'
import { formatTimeAgo, formatDate } from '@utils/formatters'
import { getErrorMessage }    from '@api/client'
import {
  PRIORITY_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
} from '@utils/constants'

// ─── Type icon map ─────────────────────────────────────────────────────────────
const TYPE_ICONS = {
  booking_created:   '📅',
  booking_updated:   '✏️',
  booking_confirmed: '✅',
  booking_cancelled: '❌',
  booking_deleted:   '🗑️',
  new_destination:   '🗺️',
  new_country:       '🌍',
  new_post:          '📝',
  new_package:       '📦',
  promotion:         '🎉',
  warning:           '⚠️',
  alert:             '🚨',
  system:            '⚙️',
  general:           '💬',
}

const SCOPE_OPTIONS = [
  { value: '',           label: 'All Scopes'   },
  { value: 'individual', label: 'Individual'   },
  { value: 'all',        label: 'All Users'    },
  { value: 'role',       label: 'By Role'      },
]

const SCOPE_SEND_OPTIONS = [
  { value: 'individual', label: 'Individual User'  },
  { value: 'all',        label: 'All Users'        },
  { value: 'role',       label: 'By Role'          },
]

const ROLE_OPTIONS = [
  { value: 'user',      label: 'Regular Users' },
  { value: 'admin',     label: 'Admins'        },
  { value: 'moderator', label: 'Moderators'    },
  { value: 'editor',    label: 'Editors'       },
]

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatBox = ({ label, value, icon, color = '#059669' }) => (
  <div
    style={{
      background:   '#fff',
      borderRadius: 16,
      padding:      '20px 24px',
      display:      'flex',
      alignItems:   'center',
      gap:          16,
      boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
      border:       '1px solid #f1f5f9',
    }}
  >
    <div
      style={{
        width:        48,
        height:       48,
        borderRadius: 12,
        background:   `${color}18`,
        color,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     22,
        flexShrink:   0,
      }}
    >
      {icon}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
        {value ?? '—'}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 2 }}>
        {label}
      </p>
    </div>
  </div>
)

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Notifications() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const sendModal   = useModal()
  const replyModal  = useModal()
  const deleteModal = useModal()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [stats,   setStats]   = useState(null)
  const [sending, setSending] = useState(false)
  const [replying,setReplying]= useState(false)
  const [search,  setSearch]  = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [sortBy,  setSortBy]  = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [replyText, setReplyText] = useState('')

  const dSearch = useDebounce(search, 400)

  // ── Send form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    target_scope: 'individual',
    user_id:      '',
    user_email:   '',
    target_role:  'user',
    type:         'general',
    title:        '',
    message:      '',
    action_url:   '',
    action_label: '',
    priority:     'normal',
    category:     'general',
    send_email:   false,
  })

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }))

  // ── Load notifications ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page:    pag.page,
        limit:   pag.limit,
        sortBy,
        order:   sortOrder,
        ...(dSearch    && { search: dSearch }),
        ...(typeFilter && { type:   typeFilter }),
        ...(scopeFilter && { scope: scopeFilter }),
      }
      const res  = await notificationsAPI.getAll(params)
      const body = res?.data ?? res
      setItems(body.data || [])
      pag.setTotal(body.pagination?.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, typeFilter, scopeFilter])

  // ── Load stats ───────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res  = await notificationsAPI.getStats()
      const body = res?.data ?? res
      setStats(body.data || body)
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { load() },      [load])
  useEffect(() => { loadStats() }, [loadStats])

  // ── Send notification ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!form.title.trim())   return toast.error('Title is required')
    if (!form.message.trim()) return toast.error('Message is required')

    if (form.target_scope === 'individual' && !form.user_id && !form.user_email)
      return toast.error('Provide a user ID or email for individual notifications')

    setSending(true)
    try {
      await notificationsAPI.create({
        ...form,
        user_id:    form.user_id    ? parseInt(form.user_id, 10) : undefined,
        user_email: form.user_email || undefined,
        target_role: form.target_scope === 'role' ? form.target_role : undefined,
      })
      toast.success('Notification sent successfully!')
      sendModal.close()
      setForm({
        target_scope: 'individual', user_id: '', user_email: '',
        target_role: 'user', type: 'general', title: '', message: '',
        action_url: '', action_label: '', priority: 'normal',
        category: 'general', send_email: false,
      })
      load()
      loadStats()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  // ── Admin reply ──────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!replyText.trim()) return toast.error('Reply text is required')
    setReplying(true)
    try {
      await notificationsAPI.adminReply(replyModal.data?.id, { reply: replyText })
      toast.success('Reply sent!')
      replyModal.close()
      setReplyText('')
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setReplying(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await notificationsAPI.adminDelete(deleteModal.data?.id)
      toast.success('Notification deleted')
      deleteModal.close()
      load()
      loadStats()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    {
      key:    'type',
      label:  '',
      width:  '48px',
      render: (v) => (
        <span style={{ fontSize: 20 }} title={v}>
          {TYPE_ICONS[v] || '💬'}
        </span>
      ),
    },
    {
      key:   'title',
      label: 'Title',
      sortable: true,
      render: (v, r) => (
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
            {v}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {String(r.message || '').slice(0, 60)}
            {(r.message || '').length > 60 ? '…' : ''}
          </p>
        </div>
      ),
    },
    {
      key:    'target_scope',
      label:  'Scope',
      render: (v, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Badge
            label={v === 'all' ? 'All Users' : v === 'role' ? `Role: ${r.target_role}` : 'Individual'}
            status={v === 'all' ? 'confirmed' : v === 'role' ? 'pending' : 'default'}
          />
          {r.recipient_name && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {r.recipient_name}
            </span>
          )}
        </div>
      ),
    },
    {
      key:    'priority',
      label:  'Priority',
      render: (v) => (
        <Badge
          label={v}
          status={
            v === 'urgent' ? 'cancelled' :
            v === 'high'   ? 'pending'   :
            v === 'normal' ? 'confirmed' : 'default'
          }
        />
      ),
    },
    {
      key:    'is_read',
      label:  'Read',
      render: (v) => (
        <span style={{ color: v ? '#22c55e' : '#f59e0b', fontWeight: 600, fontSize: 13 }}>
          {v ? '✓ Read' : '● Unread'}
        </span>
      ),
    },
    {
      key:    'reply_text',
      label:  'User Reply',
      render: (v) => v ? (
        <span style={{
          fontSize: 12, color: '#0369a1',
          background: '#e0f2fe', padding: '2px 8px',
          borderRadius: 6, fontWeight: 600,
        }}>
          Has Reply
        </span>
      ) : (
        <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
      ),
    },
    {
      key:      'created_at',
      label:    'Sent',
      sortable: true,
      render:   (v) => formatTimeAgo(v),
    },
    {
      key:    'actions',
      label:  '',
      align:  'right',
      width:  '120px',
      render: (_, r) => (
        <TableActions>
          <TableAction
            icon={Eye}
            label="View"
            onClick={() => viewModal.open(r)}
          />
          {r.reply_text && !r.admin_reply && (
            <TableAction
              icon={Reply}
              label="Reply"
              onClick={() => { replyModal.open(r); setReplyText('') }}
              variant="success"
            />
          )}
          <TableAction
            icon={Trash2}
            label="Delete"
            onClick={() => deleteModal.open(r)}
            variant="danger"
          />
        </TableActions>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 page-enter">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell size={28} className="text-primary-600" />
            Notifications
          </h1>
          <p className="page-subtitle">
            Send and manage user notifications ({pag.total} total)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => sendModal.open()}
            className="btn-primary btn-sm"
          >
            <Send size={14} /> Send Notification
          </button>
          <button
            onClick={() => { load(); loadStats() }}
            disabled={loading}
            className="btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}>
          <StatBox label="Total Sent"     value={stats.total}          icon="📤" color="#059669" />
          <StatBox label="Unread"         value={stats.unread}         icon="🔔" color="#f59e0b" />
          <StatBox label="Broadcasts"     value={stats.broadcasts}     icon="📡" color="#6366f1" />
          <StatBox label="User Replies"   value={stats.with_replies}   icon="💬" color="#0ea5e9" />
          <StatBox label="Admin Replied"  value={stats.admin_replied}  icon="✅" color="#22c55e" />
          <StatBox label="Last 24h"       value={stats.last_24h}       icon="⏱️" color="#ec4899" />
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search notifications…"
            className="max-w-sm"
          />
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); pag.reset() }}
            options={[{ value: '', label: 'All Types' }, ...NOTIFICATION_TYPE_OPTIONS]}
          />
          <FilterSelect
            label="Scope"
            value={scopeFilter}
            onChange={(v) => { setScopeFilter(v); pag.reset() }}
            options={SCOPE_OPTIONS}
          />
        </FilterBar>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={(r) => viewModal.open(r)}
        />
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          total={pag.total}
          limit={pag.limit}
          hasNext={pag.hasNext}
          hasPrev={pag.hasPrev}
          onNext={pag.next}
          onPrev={pag.prev}
          onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ── View Modal ── */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title="Notification Detail"
        size="md"
        icon={<Bell size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">
              Close
            </button>
            {viewModal.data?.reply_text && !viewModal.data?.admin_reply && (
              <button
                onClick={() => {
                  viewModal.close()
                  replyModal.open(viewModal.data)
                  setReplyText('')
                }}
                className="btn-primary"
              >
                <Reply size={14} /> Reply to User
              </button>
            )}
          </div>
        }
      >
        {viewModal.data && (
          <div className="space-y-6">
            <ModalSection title="Notification">
              <ModalGrid>
                <ModalField
                  label="Type"
                  value={`${TYPE_ICONS[viewModal.data.type] || '💬'} ${viewModal.data.type}`}
                />
                <ModalField label="Priority"   value={<Badge label={viewModal.data.priority} status={viewModal.data.priority === 'urgent' ? 'cancelled' : 'confirmed'} />} />
                <ModalField label="Scope"      value={viewModal.data.target_scope} />
                <ModalField label="Read"       value={viewModal.data.is_read ? '✓ Yes' : '✗ No'} />
                <ModalField label="Sent"       value={formatDate(viewModal.data.created_at)} />
                <ModalField label="Sender"     value={viewModal.data.sender_name || 'System'} />
              </ModalGrid>
              <ModalField label="Title"   value={viewModal.data.title} />
              <ModalField label="Message" value={viewModal.data.message} />
              {viewModal.data.action_url && (
                <ModalField
                  label="Action"
                  value={
                    <a
                      href={viewModal.data.action_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#059669', fontWeight: 600 }}
                    >
                      {viewModal.data.action_label || viewModal.data.action_url}
                    </a>
                  }
                />
              )}
            </ModalSection>

            {viewModal.data.recipient_name && (
              <ModalSection title="Recipient">
                <ModalGrid>
                  <ModalField label="Name"  value={viewModal.data.recipient_name} />
                  <ModalField label="Email" value={viewModal.data.recipient_email} />
                </ModalGrid>
              </ModalSection>
            )}

            {viewModal.data.reply_text && (
              <ModalSection title="User Reply">
                <div style={{
                  background: '#f0f9ff', border: '1px solid #bae6fd',
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <p style={{ margin: 0, color: '#0369a1', lineHeight: 1.6 }}>
                    {viewModal.data.reply_text}
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {formatDate(viewModal.data.replied_at)}
                  </p>
                </div>
              </ModalSection>
            )}

            {viewModal.data.admin_reply && (
              <ModalSection title="Admin Reply">
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <p style={{ margin: 0, color: '#166534', lineHeight: 1.6 }}>
                    {viewModal.data.admin_reply}
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {formatDate(viewModal.data.admin_replied_at)}
                  </p>
                </div>
              </ModalSection>
            )}
          </div>
        )}
      </Modal>

      {/* ── Send Notification Modal ── */}
      <Modal
        isOpen={sendModal.isOpen}
        onClose={sendModal.close}
        title="Send Notification"
        size="md"
        icon={<Send size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={sendModal.close} className="btn-secondary" disabled={sending}>
              Cancel
            </button>
            <button onClick={handleSend} className="btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send Notification'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">

          {/* Target scope */}
          <Dropdown
            label="Send To"
            value={form.target_scope}
            onChange={(v) => setF('target_scope', v)}
            options={SCOPE_SEND_OPTIONS}
          />

          {/* Individual fields */}
          {form.target_scope === 'individual' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">User ID</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 42"
                  value={form.user_id}
                  onChange={(e) => setF('user_id', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">OR User Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="user@example.com"
                  value={form.user_email}
                  onChange={(e) => setF('user_email', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Role selector */}
          {form.target_scope === 'role' && (
            <Dropdown
              label="Target Role"
              value={form.target_role}
              onChange={(v) => setF('target_role', v)}
              options={ROLE_OPTIONS}
            />
          )}

          {/* Type & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Dropdown
              label="Notification Type"
              value={form.type}
              onChange={(v) => setF('type', v)}
              options={NOTIFICATION_TYPE_OPTIONS}
            />
            <Dropdown
              label="Priority"
              value={form.priority}
              onChange={(v) => setF('priority', v)}
              options={PRIORITY_OPTIONS}
            />
          </div>

          {/* Title */}
          <div className="input-group">
            <label className="input-label">Title *</label>
            <input
              className="input"
              placeholder="Notification title"
              value={form.title}
              onChange={(e) => setF('title', e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="input-group">
            <label className="input-label">Message *</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Write your message here…"
              value={form.message}
              onChange={(e) => setF('message', e.target.value)}
            />
          </div>

          {/* Action URL */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Action URL (optional)</label>
              <input
                className="input"
                placeholder="/my-bookings"
                value={form.action_url}
                onChange={(e) => setF('action_url', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Button Label</label>
              <input
                className="input"
                placeholder="View Booking"
                value={form.action_label}
                onChange={(e) => setF('action_label', e.target.value)}
              />
            </div>
          </div>

          {/* Send email toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', userSelect: 'none',
            padding: '10px 14px', background: '#f8fafc',
            borderRadius: 10, border: '1px solid #e2e8f0',
          }}>
            <input
              type="checkbox"
              checked={form.send_email}
              onChange={(e) => setF('send_email', e.target.checked)}
            />
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
              Also send via email
            </span>
          </label>
        </div>
      </Modal>

      {/* ── Reply Modal ── */}
      <Modal
        isOpen={replyModal.isOpen}
        onClose={replyModal.close}
        title="Reply to User"
        size="sm"
        icon={<Reply size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={replyModal.close} className="btn-secondary" disabled={replying}>
              Cancel
            </button>
            <button onClick={handleReply} className="btn-primary" disabled={replying}>
              {replying ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {replyModal.data?.reply_text && (
            <div style={{
              background: '#f0f9ff', border: '1px solid #bae6fd',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                User said:
              </p>
              <p style={{ margin: '6px 0 0', color: '#0c4a6e', lineHeight: 1.6 }}>
                {replyModal.data.reply_text}
              </p>
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Your Reply</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Write your reply to the user…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this notification?"
        description="This cannot be undone."
      />
    </div>
  )
}