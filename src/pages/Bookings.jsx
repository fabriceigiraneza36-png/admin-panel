// admin/src/pages/Bookings.jsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  CalendarCheck, Eye, Pencil, Trash2, RefreshCw,
  CheckCircle, Download, Plus, User, ChevronRight,
  ChevronLeft, Check, Calendar, FileText,
  Bell, Shield, Ban, DollarSign, CheckCircle2, XCircle,
} from 'lucide-react'
import { bookingsAPI }      from '@api/bookings'
import { notificationsAPI } from '@api/notifications'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                from '@components/common/Badge'
import Avatar               from '@components/common/Avatar'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate, formatBookingNumber, formatTimeAgo } from '@utils/formatters'
import { BOOKING_STATUSES } from '@utils/constants'
import { getErrorMessage }  from '@api/client'
import { downloadBlob }     from '@utils/helpers'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractRows = (d) => {
  if (!d) return []
  if (Array.isArray(d))          return d
  if (Array.isArray(d.data))     return d.data
  if (Array.isArray(d.bookings)) return d.bookings
  return []
}

const extractTotal = (d) => {
  if (!d) return 0
  if (d.pagination?.total != null) return Number(d.pagination.total)
  if (d.total             != null) return Number(d.total)
  return 0
}

// ─── Create-form initial state ────────────────────────────────────────────────

const EMPTY_CREATE = {
  full_name: '', email: '', phone: '', user_id: '',
  travel_date: '', return_date: '',
  number_of_travelers: 1, accommodation_type: '',
  special_requests: '', admin_notes: '', notify_user: true,
}

const CREATE_STEPS = [
  { id: 'guest',   label: 'Guest Info',  icon: User,        desc: 'Name, email & contact'     },
  { id: 'trip',    label: 'Trip Details',icon: Calendar,    desc: 'Dates & travelers'          },
  { id: 'notes',   label: 'Notes',       icon: FileText,    desc: 'Requests & admin notes'     },
  { id: 'confirm', label: 'Confirm',     icon: Shield,      desc: 'Review & send notification' },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current, completed }) {
  return (
    <div className="flex items-center mb-6">
      {steps.map((step, idx) => {
        const isActive = step.id === current
        const isDone   = completed.includes(step.id)
        const isLast   = idx === steps.length - 1
        const Icon     = step.icon

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-9 h-9 rounded-xl border-2 flex items-center
                justify-center transition-all duration-300
                ${isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                  : isActive
                    ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                {isDone ? <Check size={14} className="stroke-[2.5]" /> : <Icon size={14} />}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wide whitespace-nowrap
                ${isActive ? 'text-emerald-700' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-1 max-w-10 rounded-full transition-all
                ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Field Helper ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-emerald-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

// ─── Cancellation / Refund Request Panel ──────────────────────────────────────

function CancellationRequestPanel({ booking, review, setReview, reviewing, onReview }) {
  if (!booking.cancel_request_status || booking.cancel_request_status === 'none') return null

  const isRefund   = booking.cancel_request_type === 'refund'
  const isPending  = booking.cancel_request_status === 'pending'
  const isApproved = booking.cancel_request_status === 'approved'

  const setDecision = (d) =>
    setReview(p => ({ ...p, decision: p.decision === d ? null : d }))

  return (
    <div style={{
      border: '1.5px solid #fde68a', borderRadius: 16, padding: 18,
      background: isPending ? '#fffbeb' : '#f8fafc', marginTop: 16,
    }}>
      <div className="flex items-center gap-2 mb-3">
        {isRefund ? <DollarSign size={18} className="text-amber-600" />
                  : <Ban size={18} className="text-amber-600" />}
        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#92400e' }}>
          {isRefund ? 'Refund' : 'Cancellation'} Request
        </h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ml-auto
          ${isPending ? 'bg-amber-200 text-amber-800'
            : isApproved ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'}`}>
          {booking.cancel_request_status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Requested At</p>
          <p className="font-semibold text-slate-700">
            {booking.cancel_requested_at ? new Date(booking.cancel_requested_at).toLocaleString() : '—'}
          </p>
        </div>
        {isRefund && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
            <p className="font-semibold text-slate-700">
              {booking.total_price != null ? `${booking.currency || ''} ${booking.total_price}` : '—'}
            </p>
          </div>
        )}
      </div>

      <div className="mb-3">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
        <p className="text-slate-700 bg-white border border-slate-200 rounded-xl p-3">
          {booking.cancel_request_reason || 'No reason provided.'}
        </p>
      </div>

      {isPending ? (
        <>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setDecision('approved')}
              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all
                ${review.decision === 'approved'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}>
              <CheckCircle2 size={15} className="inline mr-1" />
              {isRefund ? 'Approve Refund' : 'Approve Cancel'}
            </button>
            <button onClick={() => setDecision('rejected')}
              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all
                ${review.decision === 'rejected'
                  ? 'bg-rose-500 border-rose-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'}`}>
              <XCircle size={15} className="inline mr-1" /> Reject
            </button>
          </div>

          {isRefund && (
            <div className="mb-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Refund Amount ({booking.currency || 'USD'})
              </label>
              <input type="number" value={review.refund_amount}
                onChange={e => setReview(p => ({ ...p, refund_amount: e.target.value }))}
                placeholder="Leave blank for full"
                className="input" style={{ maxWidth: 220 }} />
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Response to Customer (optional)
            </label>
            <textarea value={review.response}
              onChange={e => setReview(p => ({ ...p, response: e.target.value }))}
              placeholder="Add a note the customer will see…"
              className="input min-h-[70px] resize-none" />
          </div>

          {review.decision && (
            <button onClick={() => onReview(booking, review.decision)}
              disabled={reviewing}
              className={`btn-primary ${reviewing ? 'opacity-60' : ''}`}>
              {reviewing
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                : <>Submit {review.decision === 'approved' ? 'Approval' : 'Rejection'}</>}
            </button>
          )}
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-sm font-bold mb-1" style={{ color: isApproved ? '#059669' : '#be123c' }}>
            {isApproved
              ? `✅ ${isRefund ? 'Refund' : 'Cancellation'} approved by admin`
              : '❌ Request rejected by admin'}
          </p>
          {booking.cancel_admin_response && (
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Admin note: </span>{booking.cancel_admin_response}
            </p>
          )}
          {isRefund && booking.refund_amount != null && (
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-semibold">Refund amount: </span>
              {booking.currency || ''} {booking.refund_amount}
            </p>
          )}
          {booking.cancel_reviewed_at && (
            <p className="text-[11px] text-slate-400 mt-1">
              Reviewed: {new Date(booking.cancel_reviewed_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Bookings() {
  const toast        = useToast()
  const pag          = usePagination()
  const viewModal    = useModal()
  const editModal    = useModal()
  const deleteModal  = useModal()
  const createModal  = useModal()

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [creating,   setCreating]   = useState(false)
  const [search,     setSearch]     = useState('')
  const [status,     setStatus]     = useState('')
  const [sortBy,     setSortBy]     = useState('created_at')
  const [sortOrder,  setSortOrder]  = useState('desc')
  const [editForm,   setEditForm]   = useState({ status: '', admin_notes: '' })
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [createStep, setCreateStep] = useState('guest')
  const [createDone, setCreateDone] = useState([])

  // ── Cancellation / refund requests ─────────────────────────────────────────
  const [requestFilter, setRequestFilter] = useState('')
  const [review,        setReview]        = useState({ decision: null, response: '', refund_amount: '' })
  const [reviewing,     setReviewing]     = useState(false)

  const openView = (b) => {
    setReview({ decision: null, response: '', refund_amount: '' })
    viewModal.open(b)
  }

  const dSearch = useDebounce(search, 400)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(dSearch && { search: dSearch }),
        ...(status  && { status }),
        ...(requestFilter && { cancel_request_status: requestFilter }),
      }
      const res  = await bookingsAPI.getAll(params)
      const body = res?.data ?? res
      setItems(extractRows(body))
      pag.setTotal(extractTotal(body))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, status])

  useEffect(() => { load() }, [load])

  // ── Review cancellation / refund ────────────────────────────────────────────

  const handleReviewRequest = async (booking, decision) => {
    setReviewing(true)
    try {
      const res = await bookingsAPI.reviewCancellation(booking.id, {
        decision,
        admin_response: review.response,
        refund_amount: review.refund_amount || null,
      })
      toast.success(`Request ${decision}! User has been notified.`)
      setReview({ decision: null, response: '', refund_amount: '' })
      load()
      const payload = res?.data ?? res
      const updated = payload?.data ?? payload
      if (viewModal.data?.id === booking.id) viewModal.open(updated)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setReviewing(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEdit = (b) => {
    setEditForm({ status: b.status || 'pending', admin_notes: b.admin_notes || '' })
    editModal.open(b)
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await bookingsAPI.update(editModal.data.id, editForm)
      toast.success('Booking updated')
      editModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  // ── Quick status ──────────────────────────────────────────────────────────

  const handleQuickStatus = async (b, newStatus) => {
    try {
      await bookingsAPI.updateStatus(b.id, { status: newStatus })
      toast.success(`Booking marked as ${newStatus}`)
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await bookingsAPI.remove(deleteModal.data.id)
      toast.success('Booking deleted')
      deleteModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Create booking ────────────────────────────────────────────────────────

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE)
    setCreateStep('guest')
    setCreateDone([])
    createModal.open()
  }

  const createStepIds   = CREATE_STEPS.map(s => s.id)
  const createStepIdx   = createStepIds.indexOf(createStep)

  const createGoNext = () => {
    // Validate per step
    if (createStep === 'guest') {
      if (!createForm.full_name.trim()) return toast.error('Full name is required')
      if (!createForm.email.trim())     return toast.error('Email is required')
    }
    if (createStep === 'trip') {
      if (!createForm.travel_date) return toast.error('Travel date is required')
    }
    if (!createDone.includes(createStep)) setCreateDone(p => [...p, createStep])
    const next = createStepIds[createStepIdx + 1]
    if (next) setCreateStep(next)
  }

  const createGoPrev = () => {
    const prev = createStepIds[createStepIdx - 1]
    if (prev) setCreateStep(prev)
  }

  const cUpd = (k, v) => setCreateForm(p => ({ ...p, [k]: v }))

  const handleAdminCreate = async () => {
    if (!createForm.full_name.trim()) return toast.error('Full name is required')
    if (!createForm.email.trim())     return toast.error('Email is required')
    if (!createForm.travel_date)      return toast.error('Travel date is required')

    setCreating(true)
    try {
      const res  = await bookingsAPI.adminCreate(createForm)
      const body = res?.data ?? res
      toast.success(`Booking ${body.data?.booking_number || ''} created!`)

      if (createForm.notify_user && createForm.admin_notes.trim()) {
        await notificationsAPI.create({
          user_email: createForm.email, type: 'booking_created',
          title: 'Your Booking Has Been Created', message: createForm.admin_notes,
          action_url: '/my-bookings', action_label: 'View Booking',
          priority: 'high', category: 'booking', send_email: true,
        }).catch(() => {})
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

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const res  = await bookingsAPI.exportAll({ status })
      const blob = res?.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: 'text/csv' })
      downloadBlob(blob, `bookings-${Date.now()}.csv`)
      toast.success('Export downloaded')
    } catch { toast.error('Export failed') }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'booking_number', label: 'Booking #', sortable: true,
      render: v => (
        <span className="font-mono font-bold text-emerald-700 text-sm">
          {formatBookingNumber(v)}
        </span>
      ),
    },
    {
      key: 'full_name', label: 'Guest', sortable: true,
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
      key: 'travel_date', label: 'Travel Date', sortable: true,
      render: v => <span className="text-sm text-slate-700">{formatDate(v)}</span>,
    },
    {
      key: 'number_of_travelers', label: 'Travelers', align: 'center',
      render: v => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl
          bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-200">
          {v || 1}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (v, r) => (
        <div className="flex flex-col items-start gap-1">
          <Badge status={v} label={v} />
          {r.cancel_request_status && r.cancel_request_status !== 'none' && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
              ${r.cancel_request_status === 'pending'
                ? 'bg-amber-100 text-amber-700'
                : r.cancel_request_status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'}`}>
              {r.cancel_request_type === 'refund' ? 'Refund' : 'Cancel'} · {r.cancel_request_status}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: v => <span className="text-sm text-slate-500">{formatTimeAgo(v)}</span>,
    },
    {
      key: 'actions', label: '', align: 'right', width: '140px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye} label="View" onClick={() => openView(r)} />
          {r.status === 'pending' && (
            <TableAction icon={CheckCircle} label="Confirm"
              onClick={() => handleQuickStatus(r, 'confirmed')} variant="success" />
          )}
          <TableAction icon={Pencil} label="Edit" onClick={() => openEdit(r)} />
          <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  // ── Create step content ───────────────────────────────────────────────────

  const renderCreateStep = () => {
    switch (createStep) {

      case 'guest': return (
        <motion.div key="guest" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 rounded-2xl
            bg-blue-50 border border-blue-200">
            <User size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Creating a booking on behalf of a user. They will receive an
              instant notification and it will appear in their dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <input className="input" placeholder="John Doe"
                value={createForm.full_name}
                onChange={e => cUpd('full_name', e.target.value)} />
            </Field>
            <Field label="Email Address" required>
              <input className="input" type="email" placeholder="john@example.com"
                value={createForm.email}
                onChange={e => cUpd('email', e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <input className="input" placeholder="+250 700 000 000"
                value={createForm.phone}
                onChange={e => cUpd('phone', e.target.value)} />
            </Field>
            <Field label="User ID" hint="Link to existing account (optional)">
              <input className="input" type="number" placeholder="Leave blank for guest"
                value={createForm.user_id}
                onChange={e => cUpd('user_id', e.target.value)} />
            </Field>
          </div>

          {/* Guest preview */}
          {createForm.full_name && (
            <div className="flex items-center gap-3 p-3 rounded-2xl
              bg-emerald-50 border border-emerald-200">
              <Avatar name={createForm.full_name} size="sm" rounded="lg" />
              <div>
                <p className="text-sm font-bold text-slate-800">{createForm.full_name}</p>
                <p className="text-xs text-slate-500">{createForm.email || 'No email yet'}</p>
              </div>
            </div>
          )}
        </motion.div>
      )

      case 'trip': return (
        <motion.div key="trip" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Travel Date" required>
              <input className="input" type="date"
                value={createForm.travel_date}
                onChange={e => cUpd('travel_date', e.target.value)} />
            </Field>
            <Field label="Return Date">
              <input className="input" type="date"
                value={createForm.return_date}
                onChange={e => cUpd('return_date', e.target.value)} />
            </Field>
            <Field label="Number of Travelers">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => cUpd('number_of_travelers', Math.max(1, createForm.number_of_travelers - 1))}
                  className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center
                    justify-center text-slate-600 hover:border-emerald-400 hover:bg-emerald-50
                    font-bold text-lg transition-all shrink-0"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-black text-slate-800">
                    {createForm.number_of_travelers}
                  </span>
                  <p className="text-xs text-slate-400">traveler{createForm.number_of_travelers !== 1 ? 's' : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => cUpd('number_of_travelers', createForm.number_of_travelers + 1)}
                  className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center
                    justify-center text-slate-600 hover:border-emerald-400 hover:bg-emerald-50
                    font-bold text-lg transition-all shrink-0"
                >
                  +
                </button>
              </div>
            </Field>
            <Field label="Accommodation Type">
              <input className="input" placeholder="e.g., Luxury Lodge"
                value={createForm.accommodation_type}
                onChange={e => cUpd('accommodation_type', e.target.value)} />
            </Field>
          </div>

          {/* Date summary */}
          {createForm.travel_date && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm">
              <p className="font-semibold text-emerald-800">
                📅 {createForm.full_name || 'Guest'} travels on{' '}
                <strong>{formatDate(createForm.travel_date)}</strong>
                {createForm.return_date && (
                  <> and returns <strong>{formatDate(createForm.return_date)}</strong></>
                )}
              </p>
            </div>
          )}
        </motion.div>
      )

      case 'notes': return (
        <motion.div key="notes" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          <Field label="Special Requests" hint="Guest dietary, mobility or other requirements">
            <textarea className="input min-h-[100px] resize-none"
              placeholder="Any special requirements or preferences…"
              value={createForm.special_requests}
              onChange={e => cUpd('special_requests', e.target.value)} />
          </Field>

          <Field
            label="Admin Notes"
            hint="Internal notes — also sent as a notification if 'Send notification' is enabled below"
          >
            <textarea className="input min-h-[100px] resize-none"
              placeholder="Notes visible to admin only (or sent as notification)…"
              value={createForm.admin_notes}
              onChange={e => cUpd('admin_notes', e.target.value)} />
          </Field>
        </motion.div>
      )

      case 'confirm': return (
        <motion.div key="confirm" className="space-y-5"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          {/* Summary card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
            border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-4">
              ✓ Booking Summary
            </p>
            <div className="space-y-2 text-sm">
              {[
                ['Guest',        createForm.full_name || '—'],
                ['Email',        createForm.email || '—'],
                ['Phone',        createForm.phone || '—'],
                ['Travel Date',  createForm.travel_date ? formatDate(createForm.travel_date) : '—'],
                ['Return Date',  createForm.return_date ? formatDate(createForm.return_date) : '—'],
                ['Travelers',    createForm.number_of_travelers],
                ['Accommodation',createForm.accommodation_type || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-slate-400 w-28 shrink-0 text-xs">{k}:</span>
                  <span className="font-semibold text-slate-800 truncate text-xs">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notify toggle */}
          <button
            type="button"
            onClick={() => cUpd('notify_user', !createForm.notify_user)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2
              cursor-pointer transition-all
              ${createForm.notify_user
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center
              transition-all shrink-0
              ${createForm.notify_user
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-slate-300'
              }`}>
              {createForm.notify_user && (
                <Check size={13} className="text-white stroke-[3]" />
              )}
            </div>
            <div className="text-left">
              <p className={`text-sm font-bold
                ${createForm.notify_user ? 'text-emerald-800' : 'text-slate-700'}`}>
                <Bell size={13} className="inline mr-1" />
                Send notification to user
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                User will receive an email + dashboard notification when this booking is created
              </p>
            </div>
          </button>
        </motion.div>
      )

      default: return null
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 page-enter">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarCheck size={28} className="text-emerald-600" /> Bookings
          </h1>
          <p className="page-subtitle">Manage booking requests ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreate} className="btn-primary btn-sm">
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

      {/* ── Filters ── */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch}
            placeholder="Search bookings…" className="max-w-sm" />
          <FilterSelect label="Status" value={status}
            onChange={v => { setStatus(v); pag.reset() }}
            options={[{ value: '', label: 'All Status' }, ...BOOKING_STATUSES]} />
          <FilterSelect label="Requests" value={requestFilter}
            onChange={v => { setRequestFilter(v); pag.reset() }}
            options={[
              { value: '', label: 'All Requests' },
              { value: 'pending',  label: '⏳ Pending Requests' },
              { value: 'approved', label: '✅ Approved' },
              { value: 'rejected', label: '❌ Rejected' },
              { value: 'none',     label: 'No Request' },
            ]} />
        </FilterBar>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <Table columns={columns} data={items} loading={loading}
          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
          onRowClick={r => openView(r)} />
        <Pagination
          page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          VIEW MODAL
          ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={`Booking ${formatBookingNumber(viewModal.data?.booking_number)}`}
        size="md"
        icon={<CalendarCheck size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">Close</button>
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
          <div className="space-y-5">
            <ModalSection title="Guest Information">
              <ModalGrid>
                <ModalField label="Full Name"   value={viewModal.data.full_name} />
                <ModalField label="Email"        value={viewModal.data.email} />
                <ModalField label="Phone"        value={viewModal.data.phone} />
                <ModalField label="WhatsApp"     value={viewModal.data.whatsapp} />
                <ModalField label="Nationality"  value={viewModal.data.nationality} />
                <ModalField label="Status"
                  value={<Badge status={viewModal.data.status} label={viewModal.data.status} />} />
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

            <ModalSection title="Cancellation / Refund">
              <CancellationRequestPanel
                booking={viewModal.data}
                review={review}
                setReview={setReview}
                reviewing={reviewing}
                onReview={handleReviewRequest}
              />
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          EDIT MODAL
          ════════════════════════════════════════════════════════════ */}
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
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white
                    rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <><Check size={14} /> Update</>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Status selector */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Booking Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BOOKING_STATUSES.map(opt => (
                <button key={opt.value || opt} type="button"
                  onClick={() => setEditForm(p => ({
                    ...p, status: opt.value || opt,
                  }))}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border-2
                    transition-all capitalize text-center
                    ${(editForm.status === (opt.value || opt))
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                    }`}>
                  {opt.label || opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Admin Notes
            </label>
            <textarea
              className="input min-h-[100px] resize-none"
              value={editForm.admin_notes}
              onChange={e => setEditForm(p => ({ ...p, admin_notes: e.target.value }))}
              placeholder="Internal notes about this booking…"
            />
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          MULTI-STEP CREATE BOOKING MODAL
          ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title="Create Booking for User"
        size="md"
        icon={<Plus size={20} />}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Step {createStepIdx + 1} of {CREATE_STEPS.length}
            </span>
            <div className="flex gap-2">
              {createStepIdx > 0 && (
                <button onClick={createGoPrev} className="btn-secondary btn-sm"
                  disabled={creating}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              {createStepIdx < CREATE_STEPS.length - 1 ? (
                <button onClick={createGoNext} className="btn-primary btn-sm">
                  Continue <ChevronRight size={15} />
                </button>
              ) : (
                <button onClick={handleAdminCreate} className="btn-primary"
                  disabled={creating}>
                  {creating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white
                        rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <><Check size={15} /> Create Booking</>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div>
          <StepIndicator
            steps={CREATE_STEPS}
            current={createStep}
            completed={createDone}
          />
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              {renderCreateStep()}
            </AnimatePresence>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this booking?"
        description="The user will be notified. This action cannot be undone."
      />
    </div>
  )
}