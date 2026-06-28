import React, { useEffect, useState, useCallback } from 'react'
import {
  CalendarCheck, Eye, Pencil, Trash2, RefreshCw,
  CheckCircle, Download, Plus, User,
} from 'lucide-react'
import { bookingsAPI }    from '@api/bookings'
import { notificationsAPI } from '@api/notifications'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination         from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge              from '@components/common/Badge'
import Avatar             from '@components/common/Avatar'
import ConfirmDialog      from '@components/common/ConfirmDialog'
import Dropdown           from '@components/common/Dropdown'
import { useModal }       from '@hooks/useModal'
import { useToast }       from '@hooks/useToast'
import { usePagination }  from '@hooks/usePagination'
import { useDebounce }    from '@hooks/useDebounce'
import { formatDate, formatBookingNumber, formatTimeAgo } from '@utils/formatters'
import { BOOKING_STATUSES } from '@utils/constants'
import { getErrorMessage } from '@api/client'
import { downloadBlob }   from '@utils/helpers'

// ─── helpers ──────────────────────────────────────────────────────────────────
const extractRows = (axiosData) => {
  if (!axiosData) return []
  if (Array.isArray(axiosData))          return axiosData
  if (Array.isArray(axiosData.data))     return axiosData.data
  if (Array.isArray(axiosData.bookings)) return axiosData.bookings
  return []
}

const extractTotal = (axiosData) => {
  if (!axiosData) return 0
  if (axiosData.pagination?.total != null) return Number(axiosData.pagination.total)
  if (axiosData.total             != null) return Number(axiosData.total)
  return 0
}

// ─── Empty create-form state ───────────────────────────────────────────────────
const EMPTY_CREATE = {
  full_name:           '',
  email:               '',
  phone:               '',
  user_id:             '',
  travel_date:         '',
  return_date:         '',
  number_of_travelers: 1,
  accommodation_type:  '',
  special_requests:    '',
  admin_notes:         '',
  notify_user:         true,
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Bookings() {
  const toast        = useToast()
  const pag          = usePagination()
  const viewModal    = useModal()
  const editModal    = useModal()
  const deleteModal  = useModal()
  const createModal  = useModal()   // ← NEW

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [creating,   setCreating]   = useState(false)  // ← NEW
  const [search,     setSearch]     = useState('')
  const [status,     setStatus]     = useState('')
  const [sortBy,     setSortBy]     = useState('created_at')
  const [sortOrder,  setSortOrder]  = useState('desc')
  const [editForm,   setEditForm]   = useState({ status: '', admin_notes: '' })
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)  // ← NEW

  const dSearch = useDebounce(search, 400)

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(dSearch && { search: dSearch }),
        ...(status  && { status }),
      }
      const res  = await bookingsAPI.getAll(params)
      const body = res?.data ?? res
      setItems(extractRows(body))
      pag.setTotal(extractTotal(body))
    } catch (e) {
      console.error('[Bookings] load error:', e)
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, status])

  useEffect(() => { load() }, [load])

  // ── Open edit ──────────────────────────────────────────────────────────────
  const openEdit = (b) => {
    setEditForm({ status: b.status || 'pending', admin_notes: b.admin_notes || '' })
    editModal.open(b)
  }

  // ── Update booking ─────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    setSaving(true)
    try {
      await bookingsAPI.update(editModal.data.id, editForm)
      toast.success('Booking updated')
      editModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Quick status ───────────────────────────────────────────────────────────
  const handleQuickStatus = async (b, newStatus) => {
    try {
      await bookingsAPI.updateStatus(b.id, { status: newStatus })
      toast.success(`Booking marked as ${newStatus}`)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // ── Delete booking (with user notification) ────────────────────────────────
  const handleDelete = async () => {
    try {
      await bookingsAPI.remove(deleteModal.data.id)
      toast.success('Booking deleted and user notified')
      deleteModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // ── Admin Create Booking ───────────────────────────────────────────────────
  const handleAdminCreate = async () => {
    if (!createForm.full_name.trim())
      return toast.error('Full name is required')
    if (!createForm.email.trim())
      return toast.error('Email address is required')
    if (!createForm.travel_date)
      return toast.error('Travel date is required')

    setCreating(true)
    try {
      // Call the admin-create endpoint (POST /api/bookings/admin)
      const res  = await bookingsAPI.adminCreate(createForm)
      const body = res?.data ?? res

      toast.success(
        `Booking ${body.data?.booking_number || ''} created successfully!`
      )

      // Extra: if notify_user is true and we have a user, 
      // the backend already sends it — but we can also send
      // a custom notification if admin wrote custom notes
      if (createForm.notify_user && createForm.admin_notes.trim()) {
        await notificationsAPI.create({
          user_email:   createForm.email,
          type:         'booking_created',
          title:        'Your Booking Has Been Created',
          message:      createForm.admin_notes,
          action_url:   '/my-bookings',
          action_label: 'View Booking',
          priority:     'high',
          category:     'booking',
          send_email:   true,
        }).catch(() => {}) // non-fatal
      }

      createModal.close()
      setCreateForm(EMPTY_CREATE)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setCreating(false)
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res  = await bookingsAPI.exportAll({ status })
      const blob = res?.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: 'text/csv' })
      downloadBlob(blob, `bookings-${Date.now()}.csv`)
      toast.success('Export downloaded')
    } catch (e) {
      toast.error('Export failed')
    }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      key:      'booking_number',
      label:    'Booking #',
      sortable: true,
      render:   (v) => (
        <span className="font-mono font-bold text-primary-700">
          {formatBookingNumber(v)}
        </span>
      ),
    },
    {
      key:   'full_name',
      label: 'Guest',
      sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.full_name} size="sm" rounded="lg" />
          <div>
            <p className="font-semibold text-slate-800 text-sm">{r.full_name}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key:      'travel_date',
      label:    'Travel Date',
      sortable: true,
      render:   (v) => formatDate(v),
    },
    {
      key:    'number_of_travelers',
      label:  'Travelers',
      align:  'center',
      render: (v) => <span className="font-bold">{v || 1}</span>,
    },
    {
      key:    'status',
      label:  'Status',
      render: (v) => <Badge status={v} label={v} />,
    },
    {
      key:      'created_at',
      label:    'Created',
      sortable: true,
      render:   (v) => formatTimeAgo(v),
    },
    {
      key:    'actions',
      label:  '',
      align:  'right',
      width:  '140px',
      render: (_, r) => (
        <TableActions>
          <TableAction
            icon={Eye}
            label="View"
            onClick={() => viewModal.open(r)}
          />
          {r.status === 'pending' && (
            <TableAction
              icon={CheckCircle}
              label="Confirm"
              onClick={() => handleQuickStatus(r, 'confirmed')}
              variant="success"
            />
          )}
          <TableAction
            icon={Pencil}
            label="Edit"
            onClick={() => openEdit(r)}
          />
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 page-enter">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarCheck size={28} className="text-primary-600" />
            Bookings
          </h1>
          <p className="page-subtitle">
            Manage booking requests ({pag.total} total)
          </p>
        </div>
        <div className="flex gap-2">
          {/* NEW: Admin Create Booking button */}
          <button
            onClick={() => { setCreateForm(EMPTY_CREATE); createModal.open() }}
            className="btn-primary btn-sm"
          >
            <Plus size={14} /> Create Booking
          </button>
          <button onClick={handleExport} className="btn-secondary btn-sm">
            <Download size={14} /> Export
          </button>
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search bookings…"
            className="max-w-sm"
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => { setStatus(v); pag.reset() }}
            options={[{ value: '', label: 'All Status' }, ...BOOKING_STATUSES]}
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
        title={`Booking ${formatBookingNumber(viewModal.data?.booking_number)}`}
        size="md"
        icon={<CalendarCheck size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">
              Close
            </button>
            <button
              onClick={() => { viewModal.close(); openEdit(viewModal.data) }}
              className="btn-primary"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        }
      >
        {viewModal.data && (
          <div className="space-y-6">
            <ModalSection title="Guest Information">
              <ModalGrid>
                <ModalField label="Full Name"   value={viewModal.data.full_name} />
                <ModalField label="Email"        value={viewModal.data.email} />
                <ModalField label="Phone"        value={viewModal.data.phone} />
                <ModalField label="WhatsApp"     value={viewModal.data.whatsapp} />
                <ModalField label="Nationality"  value={viewModal.data.nationality} />
                <ModalField
                  label="Status"
                  value={<Badge status={viewModal.data.status} label={viewModal.data.status} />}
                />
              </ModalGrid>
            </ModalSection>
            <ModalSection title="Trip Details">
              <ModalGrid>
                <ModalField label="Travel Date"   value={formatDate(viewModal.data.travel_date)} />
                <ModalField label="Return Date"   value={formatDate(viewModal.data.return_date)} />
                <ModalField label="Travelers"     value={viewModal.data.number_of_travelers} />
                <ModalField label="Accommodation" value={viewModal.data.accommodation_type} />
                <ModalField label="Destination"   value={viewModal.data.destination_name} />
                <ModalField label="Service"       value={viewModal.data.service_name} />
              </ModalGrid>
              <ModalField label="Special Requests" value={viewModal.data.special_requests} />
              <ModalField label="Admin Notes"      value={viewModal.data.admin_notes} />
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Update Booking"
        size="sm"
        icon={<Pencil size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={editModal.close} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button onClick={handleUpdate} className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Dropdown
            label="Status"
            value={editForm.status}
            onChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
            options={BOOKING_STATUSES}
          />
          <div className="input-group">
            <label className="input-label">Admin Notes</label>
            <textarea
              className="input min-h-[100px]"
              value={editForm.admin_notes}
              onChange={(e) => setEditForm((p) => ({ ...p, admin_notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── Admin Create Booking Modal ── */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title="Create Booking for User"
        size="md"
        icon={<Plus size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={createModal.close}
              className="btn-secondary"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleAdminCreate}
              className="btn-primary"
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create Booking'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">

          {/* Info banner */}
          <div style={{
            background:   '#eff6ff',
            border:       '1px solid #bfdbfe',
            borderRadius: 12,
            padding:      '12px 16px',
            display:      'flex',
            gap:          10,
            alignItems:   'flex-start',
          }}>
            <User size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
              This booking will be created on behalf of the user and they will
              receive an instant notification. If the user has an account, their
              booking will appear in their dashboard.
            </p>
          </div>

          {/* Guest info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Full Name *</label>
              <input
                className="input"
                placeholder="John Doe"
                value={createForm.full_name}
                onChange={(e) => setCreateForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address *</label>
              <input
                className="input"
                type="email"
                placeholder="john@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Phone</label>
              <input
                className="input"
                placeholder="+250 700 000 000"
                value={createForm.phone}
                onChange={(e) => setCreateForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">User ID (if known)</label>
              <input
                className="input"
                type="number"
                placeholder="Link to existing account"
                value={createForm.user_id}
                onChange={(e) => setCreateForm(p => ({ ...p, user_id: e.target.value }))}
              />
            </div>
          </div>

          {/* Travel dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Travel Date *</label>
              <input
                className="input"
                type="date"
                value={createForm.travel_date}
                onChange={(e) => setCreateForm(p => ({ ...p, travel_date: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Return Date</label>
              <input
                className="input"
                type="date"
                value={createForm.return_date}
                onChange={(e) => setCreateForm(p => ({ ...p, return_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Travelers & accommodation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Number of Travelers</label>
              <input
                className="input"
                type="number"
                min={1}
                max={500}
                value={createForm.number_of_travelers}
                onChange={(e) => setCreateForm(p => ({
                  ...p, number_of_travelers: parseInt(e.target.value, 10) || 1,
                }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Accommodation Type</label>
              <input
                className="input"
                placeholder="e.g. Luxury Lodge"
                value={createForm.accommodation_type}
                onChange={(e) => setCreateForm(p => ({ ...p, accommodation_type: e.target.value }))}
              />
            </div>
          </div>

          {/* Special requests */}
          <div className="input-group">
            <label className="input-label">Special Requests</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Any special requirements…"
              value={createForm.special_requests}
              onChange={(e) => setCreateForm(p => ({ ...p, special_requests: e.target.value }))}
            />
          </div>

          {/* Admin notes / notification message */}
          <div className="input-group">
            <label className="input-label">
              Admin Notes
              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                (also sent as notification message if checked below)
              </span>
            </label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Internal notes or message for the user…"
              value={createForm.admin_notes}
              onChange={(e) => setCreateForm(p => ({ ...p, admin_notes: e.target.value }))}
            />
          </div>

          {/* Notify user toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', userSelect: 'none',
            padding: '10px 14px', background: '#f0fdf4',
            borderRadius: 10, border: '1px solid #bbf7d0',
          }}>
            <input
              type="checkbox"
              checked={createForm.notify_user}
              onChange={(e) => setCreateForm(p => ({ ...p, notify_user: e.target.checked }))}
            />
            <span style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>
              Send notification to user when booking is created
            </span>
          </label>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this booking?"
        description="The user will be notified that their booking has been removed. This action cannot be undone."
      />
    </div>
  )
}