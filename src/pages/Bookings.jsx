// admin/src/pages/Bookings.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  CalendarCheck, Eye, Pencil, Trash2, RefreshCw,
  CheckCircle, Download, Plus, User, ChevronRight,
  ChevronLeft, Check, Calendar, FileText,
  Bell, Shield, Ban, DollarSign, CheckCircle2,
  XCircle, ArrowLeft, MapPin, Phone, Mail,
  Users, Bed, ClipboardList, AlertTriangle,
  CheckSquare, Square, MessageSquare, Send,
} from 'lucide-react'
import { bookingsAPI }      from '@api/bookings'
import { notificationsAPI } from '@api/notifications'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Badge                from '@components/common/Badge'
import Avatar               from '@components/common/Avatar'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import BulkActionsToolbar   from '@components/common/BulkActionsToolbar'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate, formatBookingNumber, formatTimeAgo } from '@utils/formatters'
import { BOOKING_STATUSES } from '@utils/constants'
import { getErrorMessage }  from '@api/client'
import { downloadBlob }     from '@utils/helpers'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEWS = { LIST: 'list', VIEW: 'view', EDIT: 'edit', CREATE: 'create' }

const EMPTY_CREATE = {
  full_name: '', email: '', phone: '', whatsapp: '',
  nationality: '', country: '',
  travel_date: '', return_date: '',
  number_of_travelers: 1, number_of_adults: 1, number_of_children: 0,
  accommodation_type: '', special_requests: '',
  dietary_requirements: '', group_type: '',
  admin_notes: '', notify_user: true,
  booking_type: 'custom', source: 'admin_manual',
}

const CREATE_STEPS = [
  { id: 'guest',   label: 'Guest Info',   icon: User,         desc: 'Name, email & contact'      },
  { id: 'trip',    label: 'Trip Details', icon: Calendar,     desc: 'Dates & travelers'           },
  { id: 'notes',   label: 'Notes',        icon: FileText,     desc: 'Requests & admin notes'      },
  { id: 'confirm', label: 'Confirm',      icon: Shield,       desc: 'Review & send notification'  },
]

const BOOKING_TYPE_OPTIONS = [
  { value: 'custom',      label: 'Custom'      },
  { value: 'destination', label: 'Destination' },
  { value: 'service',     label: 'Service'     },
  { value: 'package',     label: 'Package'     },
]

const GROUP_TYPE_OPTIONS = [
  { value: '',         label: 'Select…'  },
  { value: 'solo',     label: 'Solo'     },
  { value: 'couple',   label: 'Couple'   },
  { value: 'family',   label: 'Family'   },
  { value: 'friends',  label: 'Friends'  },
  { value: 'business', label: 'Business' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractRows  = (d) => {
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

const getFutureDateString = (daysAhead = 90) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageBreadcrumb({ view, booking, onBack }) {
  const crumbs = [{ label: 'Bookings', view: VIEWS.LIST }]
  if (view === VIEWS.VIEW)   crumbs.push({ label: formatBookingNumber(booking?.booking_number) })
  if (view === VIEWS.EDIT)   crumbs.push({ label: formatBookingNumber(booking?.booking_number) }, { label: 'Edit' })
  if (view === VIEWS.CREATE) crumbs.push({ label: 'New Booking' })

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-1">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={13} className="text-slate-300" />}
          {c.view ? (
            <button onClick={onBack}
              className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
              {c.label}
            </button>
          ) : (
            <span className={i === crumbs.length - 1
              ? 'text-slate-800 font-bold'
              : 'text-slate-400'}>
              {c.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          {Icon && <Icon size={16} className="text-emerald-600" />}
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

function InfoGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{children}</div>
}

function InfoItem({ label, value, full = false }) {
  return (
    <div className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">
        {value || <span className="text-slate-300 font-normal">—</span>}
      </p>
    </div>
  )
}

function StepIndicator({ steps, current, completed }) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((step, idx) => {
        const isActive = step.id === current
        const isDone   = completed.includes(step.id)
        const isLast   = idx === steps.length - 1
        const Icon     = step.icon
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center
                transition-all duration-300 shadow-sm
                ${isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200'
                  : isActive
                    ? 'bg-white border-emerald-500 text-emerald-600'
                    : 'bg-white border-slate-200 text-slate-400'}`}>
                {isDone
                  ? <Check size={15} className="stroke-[2.5]" />
                  : <Icon size={15} />}
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-bold uppercase tracking-wide
                  ${isActive ? 'text-emerald-700' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {step.label}
                </p>
                <p className="text-[9px] text-slate-400 hidden sm:block">{step.desc}</p>
              </div>
            </div>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-2 max-w-16 rounded-full transition-all duration-500
                ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function FormField({ label, required, hint, error, children, span = 1 }) {
  const spanClass = span === 2 ? 'sm:col-span-2' : ''
  return (
    <div className={`space-y-1.5 ${spanClass}`}>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  )
}

function CancellationRequestPanel({ booking, review, setReview, reviewing, onReview }) {
  if (!booking?.cancel_request_status || booking.cancel_request_status === 'none') return null

  const isRefund   = booking.cancel_request_type === 'refund'
  const isPending  = booking.cancel_request_status === 'pending'
  const isApproved = booking.cancel_request_status === 'approved'

  const toggleDecision = (d) =>
    setReview(p => ({ ...p, decision: p.decision === d ? null : d }))

  return (
    <div className={`rounded-2xl border-2 p-5
      ${isPending ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-2 mb-4">
        {isRefund
          ? <DollarSign size={18} className="text-amber-600" />
          : <Ban        size={18} className="text-amber-600" />}
        <h4 className="font-bold text-amber-900 text-sm">
          {isRefund ? 'Refund' : 'Cancellation'} Request
        </h4>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ml-auto
          ${isPending  ? 'bg-amber-200 text-amber-800'
          : isApproved ? 'bg-emerald-100 text-emerald-700'
                       : 'bg-rose-100 text-rose-700'}`}>
          {booking.cancel_request_status}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested At</p>
          <p className="font-semibold text-slate-700">
            {booking.cancel_requested_at
              ? new Date(booking.cancel_requested_at).toLocaleString()
              : '—'}
          </p>
        </div>
        {isRefund && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
            <p className="font-semibold text-slate-700">
              {booking.total_price != null
                ? `${booking.currency || 'USD'} ${booking.total_price}`
                : '—'}
            </p>
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Customer Reason</p>
        <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl p-3 leading-relaxed">
          {booking.cancel_request_reason || 'No reason provided.'}
        </p>
      </div>

      {isPending ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={() => toggleDecision('approved')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                ${review.decision === 'approved'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`}>
              <CheckCircle2 size={15} className="inline mr-1.5" />
              {isRefund ? 'Approve Refund' : 'Approve Cancel'}
            </button>
            <button onClick={() => toggleDecision('rejected')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                ${review.decision === 'rejected'
                  ? 'bg-rose-500 border-rose-500 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700'}`}>
              <XCircle size={15} className="inline mr-1.5" /> Reject
            </button>
          </div>

          {isRefund && (
            <FormField label={`Refund Amount (${booking.currency || 'USD'})`}
              hint="Leave blank for full refund">
              <input type="number" className="input" style={{ maxWidth: 200 }}
                value={review.refund_amount}
                placeholder="e.g. 450"
                onChange={e => setReview(p => ({ ...p, refund_amount: e.target.value }))} />
            </FormField>
          )}

          <FormField label="Response to Customer" hint="Optional — customer will see this">
            <textarea className="input min-h-[80px] resize-none"
              value={review.response}
              placeholder="Add a note the customer will see…"
              onChange={e => setReview(p => ({ ...p, response: e.target.value }))} />
          </FormField>

          {review.decision && (
            <button onClick={() => onReview(booking, review.decision)}
              disabled={reviewing}
              className={`btn-primary w-full justify-center
                ${review.decision === 'rejected' ? 'bg-rose-600 hover:bg-rose-700 border-rose-600' : ''}`}>
              {reviewing
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                : <>Submit {review.decision === 'approved' ? 'Approval' : 'Rejection'}</>}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className={`text-sm font-bold mb-1 ${isApproved ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isApproved
              ? `✅ ${isRefund ? 'Refund' : 'Cancellation'} approved`
              : '❌ Request rejected'}
          </p>
          {booking.cancel_admin_response && (
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-semibold">Admin note: </span>{booking.cancel_admin_response}
            </p>
          )}
          {isRefund && booking.refund_amount != null && (
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-semibold">Refund amount: </span>
              {booking.currency || 'USD'} {booking.refund_amount}
            </p>
          )}
          {booking.cancel_reviewed_at && (
            <p className="text-[11px] text-slate-400 mt-2">
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
  const toast = useToast()
  const pag   = usePagination()

  // ── View state ────────────────────────────────────────────────────────────
  const [view,        setView]        = useState(VIEWS.LIST)
  const [selected,    setSelected]    = useState(null)   // booking being viewed/edited

  // ── List state ────────────────────────────────────────────────────────────
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [status,      setStatus]      = useState('')
  const [sortBy,      setSortBy]      = useState('created_at')
  const [sortOrder,   setSortOrder]   = useState('desc')
  const [requestFilter, setRequestFilter] = useState('')

  // ── Selection / bulk actions ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())
  const MAX_SELECT = 50

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editForm,    setEditForm]    = useState({ status: '', admin_notes: '', notify_customer: true })
  const [saving,      setSaving]      = useState(false)

  // ── Create state ──────────────────────────────────────────────────────────
  const [createForm,  setCreateForm]  = useState(EMPTY_CREATE)
  const [createStep,  setCreateStep]  = useState('guest')
  const [createDone,  setCreateDone]  = useState([])
  const [creating,    setCreating]    = useState(false)
  const [createErrors,setCreateErrors]= useState({})

  // ── Cancellation review ───────────────────────────────────────────────────
  const [review,      setReview]      = useState({ decision: null, response: '', refund_amount: '' })
  const [reviewing,   setReviewing]   = useState(false)

  // ── Quick message modal ───────────────────────────────────────────────────
  const [msgBooking,  setMsgBooking]  = useState(null)
  const [msgConvo,    setMsgConvo]    = useState(null)
  const [msgMessages, setMsgMessages] = useState([])
  const [msgLoading,  setMsgLoading]  = useState(false)
  const [msgSending,  setMsgSending]  = useState(false)
  const [msgDraft,    setMsgDraft]     = useState('')
  const [msgError,    setMsgError]     = useState(null)
  const msgScrollRef = useRef(null)

  const dSearch = useDebounce(search, 400)

  // ── Navigation helpers ────────────────────────────────────────────────────

  const goList = () => {
    setView(VIEWS.LIST)
    setSelected(null)
  }

  const goView = (b) => {
    setSelected(b)
    setReview({ decision: null, response: '', refund_amount: '' })
    setView(VIEWS.VIEW)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goEdit = (b) => {
    setSelected(b)
    setEditForm({
      status:            b.status        || 'pending',
      admin_notes:       b.admin_notes   || '',
      notify_customer:   true,
    })
    setView(VIEWS.EDIT)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goCreate = () => {
    // Set travel_date to ~3 months from now by default
    setCreateForm({
      ...EMPTY_CREATE,
      travel_date: getFutureDateString(90),
      return_date: getFutureDateString(100),
    })
    setCreateStep('guest')
    setCreateDone([])
    setCreateErrors({})
    setView(VIEWS.CREATE)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit,
        sortBy, order: sortOrder,
        ...(dSearch        && { search: dSearch }),
        ...(status         && { status }),
        ...(requestFilter  && { cancel_request_status: requestFilter }),
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
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, status, requestFilter])

  useEffect(() => { load() }, [load])

  // ── Update status quick-action ─────────────────────────────────────────

  const handleQuickStatus = async (b, newStatus) => {
    try {
      await bookingsAPI.updateStatus(b.id, { status: newStatus })
      toast.success(`Booking marked as ${newStatus}`)
      load()
      if (selected?.id === b.id) setSelected(s => ({ ...s, status: newStatus }))
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Selection helpers ────────────────────────────────────────────────────

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_SELECT) next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === items.length && items.length < MAX_SELECT) return new Set()
      const pageIds = items.slice(0, MAX_SELECT).map(i => i.id)
      return new Set(pageIds)
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const isAllSelected = items.length > 0 && selectedIds.size === items.length && items.length <= MAX_SELECT
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected

  const bulkSetStatus = async (newStatus) => {
    if (!selectedIds.size) return
    const ids = Array.from(selectedIds)
    setSaving(true)
    try {
      await bookingsAPI.bulkStatus({ booking_ids: ids, status: newStatus })
      toast.success(`Updated ${ids.length} booking${ids.length > 1 ? 's' : ''} to ${newStatus}`)
      clearSelection()
      load()
      if (selected?.id && selectedIds.has(selected.id)) {
        setSelected(s => ({ ...s, status: newStatus }))
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const bulkDelete = async () => {
    if (!selectedIds.size) return
    const ids = Array.from(selectedIds)
    setDeleteTarget({ id: ids[0], bulk: ids })
  }

  // ── Quick message helpers ────────────────────────────────────────────────

  const openMsgModal = async (booking) => {
    setMsgBooking(booking)
    setMsgConvo(null)
    setMsgMessages([])
    setMsgDraft('')
    setMsgError(null)
    setMsgLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/messages/conversations/by-booking/${booking.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` },
        }
      )
      if (res.ok) {
        const data = await res.json()
        setMsgConvo(data.data)
        setMsgMessages(data.data?.messages || [])
      } else {
        const data = await res.json().catch(() => ({}))
        if (res.status === 404) {
          const createRes = await fetch(`${API_BASE}/messages/admin/conversations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`,
            },
            body: JSON.stringify({
              bookingId: booking.id,
              bookingNumber: booking.booking_number,
              subject: `Booking ${booking.booking_number || booking.id}`,
              firstMessage: '',
            }),
          })
          const created = await createRes.json()
          if (created.success) {
            setMsgConvo(created.data)
            setMsgMessages([])
          } else {
            setMsgError(created.message || 'Failed to open conversation')
          }
        } else {
          setMsgError(data.message || 'Failed to load conversation')
        }
      }
    } catch (e) {
      setMsgError('Network error')
    } finally {
      setMsgLoading(false)
      setTimeout(() => msgScrollRef.current?.scrollTo({ top: msgScrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }

  const closeMsgModal = () => {
    setMsgBooking(null)
    setMsgConvo(null)
    setMsgMessages([])
    setMsgDraft('')
    setMsgError(null)
    setMsgSending(false)
  }

  const sendQuickMessage = async () => {
    const text = msgDraft.trim()
    if (!text || !msgConvo?.id || msgSending) return
    setMsgSending(true)
    setMsgError(null)
    const optimistic = {
      id: `tmp-${Date.now()}`,
      conversationId: msgConvo.id,
      senderType: 'admin',
      senderName: 'You',
      body: text,
      isRead: false,
      reactions: {},
      replyToId: null,
      createdAt: new Date().toISOString(),
    }
    setMsgMessages(prev => [...prev, optimistic])
    setMsgDraft('')
    setTimeout(() => msgScrollRef.current?.scrollTo({ top: msgScrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    try {
      const res = await fetch(`${API_BASE}/messages/conversations/${msgConvo.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`,
        },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send')
      setMsgMessages(prev => prev.map(m => m.id === optimistic.id ? { ...data.data, senderType: 'admin', senderName: 'You' } : m))
      setMsgConvo(prev => prev ? { ...prev, last_message: text, last_message_at: new Date().toISOString() } : prev)
    } catch (e) {
      setMsgMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setMsgError(e.message)
      setMsgDraft(text)
    } finally {
      setMsgSending(false)
    }
  }

  // ── Edit / save ────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    setSaving(true)
    try {
      // Update status via dedicated endpoint for valid transitions
      if (editForm.status !== selected.status) {
        await bookingsAPI.updateStatus(selected.id, {
          status: editForm.status,
          notify_customer: editForm.notify_customer,
        })
      }
      // Update notes via general update
      if (editForm.admin_notes !== selected.admin_notes) {
        await bookingsAPI.update(selected.id, {
          admin_notes: editForm.admin_notes,
        })
      }
      toast.success('Booking updated successfully')
      // Refresh selected booking
      const fresh = await bookingsAPI.getOne(selected.id)
      const b     = fresh?.data?.data ?? fresh?.data ?? fresh
      setSelected(b)
      load()
      setView(VIEWS.VIEW)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      if (deleteTarget.bulk && deleteTarget.bulk.length > 1) {
        for (const id of deleteTarget.bulk) {
          await bookingsAPI.remove(id)
        }
        toast.success(`${deleteTarget.bulk.length} bookings deleted`)
        clearSelection()
      } else {
        await bookingsAPI.remove(deleteTarget.id)
        toast.success('Booking deleted')
      }
      setDeleteTarget(null)
      if (view !== VIEWS.LIST) goList()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Review cancellation ────────────────────────────────────────────────────

  const handleReviewRequest = async (booking, decision) => {
    setReviewing(true)
    try {
      const res = await bookingsAPI.reviewCancellation(booking.id, {
        decision,
        admin_response: review.response,
        refund_amount:  review.refund_amount || null,
      })
      toast.success(`Request ${decision}! Customer has been notified.`)
      setReview({ decision: null, response: '', refund_amount: '' })
      const updated = res?.data?.data ?? res?.data ?? res
      setSelected(updated)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setReviewing(false)
    }
  }

  // ── Create booking ─────────────────────────────────────────────────────────

  const cUpd = (k, v) => {
    setCreateForm(p => ({ ...p, [k]: v }))
    if (createErrors[k]) setCreateErrors(p => ({ ...p, [k]: null }))
  }

  const validateStep = (step) => {
    const errs = {}
    if (step === 'guest') {
      if (!createForm.full_name.trim()) errs.full_name = 'Full name is required'
      if (!createForm.email.trim())     errs.email     = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email))
        errs.email = 'Invalid email address'
    }
    if (step === 'trip') {
      if (!createForm.travel_date) errs.travel_date = 'Travel date is required'
      else {
        const td    = new Date(createForm.travel_date)
        const today = new Date(); today.setHours(0,0,0,0)
        if (td < today) errs.travel_date = 'Travel date cannot be in the past'
      }
      if (createForm.return_date && createForm.travel_date) {
        if (new Date(createForm.return_date) < new Date(createForm.travel_date))
          errs.return_date = 'Return date must be after travel date'
      }
      const n = parseInt(createForm.number_of_travelers, 10)
      if (!n || n < 1) errs.number_of_travelers = 'At least 1 traveler required'
    }
    return errs
  }

  const createStepIds = CREATE_STEPS.map(s => s.id)
  const createStepIdx = createStepIds.indexOf(createStep)

  const createGoNext = () => {
    const errs = validateStep(createStep)
    if (Object.keys(errs).length) {
      setCreateErrors(errs)
      return
    }
    setCreateErrors({})
    if (!createDone.includes(createStep)) setCreateDone(p => [...p, createStep])
    const next = createStepIds[createStepIdx + 1]
    if (next) setCreateStep(next)
  }

  const createGoPrev = () => {
    const prev = createStepIds[createStepIdx - 1]
    if (prev) setCreateStep(prev)
  }

  const handleAdminCreate = async () => {
    // Final validation across all steps
    const guestErrs = validateStep('guest')
    const tripErrs  = validateStep('trip')
    const allErrs   = { ...guestErrs, ...tripErrs }
    if (Object.keys(allErrs).length) {
      setCreateErrors(allErrs)
      toast.error('Please fix the errors before submitting')
      return
    }

    setCreating(true)
    try {
      const payload = {
        full_name:            createForm.full_name.trim(),
        email:                createForm.email.trim().toLowerCase(),
        phone:                createForm.phone       || null,
        whatsapp:             createForm.whatsapp    || null,
        nationality:          createForm.nationality || null,
        country:              createForm.country     || null,
        travel_date:          createForm.travel_date,
        return_date:          createForm.return_date || null,
        number_of_travelers:  parseInt(createForm.number_of_travelers, 10) || 1,
        number_of_adults:     parseInt(createForm.number_of_adults,    10) || 1,
        number_of_children:   parseInt(createForm.number_of_children,  10) || 0,
        accommodation_type:   createForm.accommodation_type   || null,
        special_requests:     createForm.special_requests     || null,
        dietary_requirements: createForm.dietary_requirements || null,
        group_type:           createForm.group_type           || null,
        admin_notes:          createForm.admin_notes          || null,
        booking_type:         createForm.booking_type         || 'custom',
        source:               'admin_manual',
      }

      const res  = await bookingsAPI.adminCreate(payload)
      const body = res?.data ?? res
      const bn   = body?.data?.booking_number || body?.booking_number || ''

      toast.success(`✅ Booking ${bn} created successfully!`)

      // Optional: send notification to user
      if (createForm.notify_user && createForm.email) {
        await notificationsAPI.create({
          user_email:   createForm.email,
          type:         'booking_created',
          title:        'Your Booking Has Been Created',
          message:      createForm.admin_notes?.trim()
            || `Your booking ${bn} has been created and is pending review.`,
          action_url:   '/my-bookings',
          action_label: 'View Booking',
          priority:     'high',
          category:     'booking',
          send_email:   true,
        }).catch(() => {})
      }

      load()
      goList()
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
        : new Blob([res.data ?? JSON.stringify(res)], { type: 'text/csv' })
      downloadBlob(blob, `bookings-${Date.now()}.csv`)
      toast.success('Export downloaded')
    } catch { toast.error('Export failed') }
  }

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns = [
    {
      key: '_select',
      label: '',
      width: '44px',
      align: 'center',
      render: (_, r) => {
        const checked = selectedIds.has(r.id)
        const disabled = !checked && selectedIds.size >= MAX_SELECT
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSelect(r.id) }}
            disabled={disabled}
            className={`inline-flex items-center justify-center
              w-5 h-5 rounded-md border-2 transition-all
              ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white hover:border-emerald-400'}
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            title={disabled ? `Max ${MAX_SELECT} selections` : (checked ? 'Deselect' : 'Select')}
          >
            {checked && <Check size={12} strokeWidth={3} />}
          </button>
        )
      },
    },
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
            <p className="font-semibold text-slate-800 text-sm leading-tight">{r.full_name}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'destination_name', label: 'Destination',
      render: (v, r) => (
        <div className="min-w-0">
          <span className="text-sm text-slate-600 block truncate">
            {v || r.service_name || r.package_name || '—'}
          </span>
          {r.attraction_name && <span className="text-xs text-emerald-700 block truncate">Attraction: {r.attraction_name}</span>}
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
      key: 'email_verified', label: 'Verified',
      render: v => v
        ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Verified</span>
        : <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⏳ Pending</span>,
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: v => <span className="text-sm text-slate-500">{formatTimeAgo(v)}</span>,
    },
    {
      key: 'actions', label: '', align: 'right', width: '160px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={MessageSquare} label="Message"
            onClick={(e) => { e.stopPropagation(); openMsgModal(r) }} />
          <TableAction icon={Eye}    label="View"    onClick={() => goView(r)} />
          {r.status === 'pending' && (
            <TableAction icon={CheckCircle} label="Confirm"
              onClick={() => handleQuickStatus(r, 'confirmed')} variant="success" />
          )}
          <TableAction icon={Pencil}  label="Edit"   onClick={() => goEdit(r)} />
          <TableAction icon={Trash2}  label="Delete" onClick={() => setDeleteTarget(r)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  // ─── Create step renderer ─────────────────────────────────────────────────

  const renderCreateStep = () => {
    switch (createStep) {

      /* ── STEP 1: Guest Info ── */
      case 'guest': return (
        <motion.div key="guest"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200 mb-6">
            <User size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              You are creating a booking on behalf of a customer.
              They will receive a confirmation email and the booking will appear
              in their dashboard if they have an account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Full Name" required error={createErrors.full_name}>
              <input className={`input ${createErrors.full_name ? 'border-rose-400' : ''}`}
                placeholder="Jane Smith"
                value={createForm.full_name}
                onChange={e => cUpd('full_name', e.target.value)} />
            </FormField>

            <FormField label="Email Address" required error={createErrors.email}>
              <input className={`input ${createErrors.email ? 'border-rose-400' : ''}`}
                type="email" placeholder="jane@example.com"
                value={createForm.email}
                onChange={e => cUpd('email', e.target.value)} />
            </FormField>

            <FormField label="Phone Number">
              <input className="input" placeholder="+250 780 000 000"
                value={createForm.phone}
                onChange={e => cUpd('phone', e.target.value)} />
            </FormField>

            <FormField label="WhatsApp">
              <input className="input" placeholder="+250 780 000 000"
                value={createForm.whatsapp}
                onChange={e => cUpd('whatsapp', e.target.value)} />
            </FormField>

            <FormField label="Nationality">
              <input className="input" placeholder="e.g. Rwandan"
                value={createForm.nationality}
                onChange={e => cUpd('nationality', e.target.value)} />
            </FormField>

            <FormField label="Country of Residence">
              <input className="input" placeholder="e.g. Rwanda"
                value={createForm.country}
                onChange={e => cUpd('country', e.target.value)} />
            </FormField>
          </div>

          {/* Live preview */}
          {createForm.full_name && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50
                border border-emerald-200 mt-6">
              <Avatar name={createForm.full_name} size="md" rounded="lg" />
              <div>
                <p className="font-bold text-slate-800">{createForm.full_name}</p>
                <p className="text-sm text-slate-500">
                  {createForm.email || 'No email yet'}
                  {createForm.phone && ` · ${createForm.phone}`}
                </p>
                {createForm.nationality && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    🌍 {createForm.nationality}
                    {createForm.country && `, ${createForm.country}`}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )

      /* ── STEP 2: Trip Details ── */
      case 'trip': return (
        <motion.div key="trip"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Travel Date" required error={createErrors.travel_date}>
              <input className={`input ${createErrors.travel_date ? 'border-rose-400' : ''}`}
                type="date"
                value={createForm.travel_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => cUpd('travel_date', e.target.value)} />
            </FormField>

            <FormField label="Return Date" error={createErrors.return_date}>
              <input className={`input ${createErrors.return_date ? 'border-rose-400' : ''}`}
                type="date"
                value={createForm.return_date}
                min={createForm.travel_date || new Date().toISOString().split('T')[0]}
                onChange={e => cUpd('return_date', e.target.value)} />
            </FormField>

            <FormField label="Booking Type">
              <select className="input"
                value={createForm.booking_type}
                onChange={e => cUpd('booking_type', e.target.value)}>
                {BOOKING_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Group Type">
              <select className="input"
                value={createForm.group_type}
                onChange={e => cUpd('group_type', e.target.value)}>
                {GROUP_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            {/* Traveler counter */}
            <FormField label="Total Travelers" required error={createErrors.number_of_travelers}>
              <div className="flex items-center gap-4">
                <button type="button"
                  onClick={() => cUpd('number_of_travelers', Math.max(1, createForm.number_of_travelers - 1))}
                  className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center
                    justify-center text-slate-600 hover:border-emerald-400 hover:bg-emerald-50
                    font-bold text-xl transition-all shrink-0">
                  −
                </button>
                <div className="text-center min-w-[48px]">
                  <span className="text-3xl font-black text-slate-800">
                    {createForm.number_of_travelers}
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                    traveler{createForm.number_of_travelers !== 1 ? 's' : ''}
                  </p>
                </div>
                <button type="button"
                  onClick={() => cUpd('number_of_travelers', createForm.number_of_travelers + 1)}
                  className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center
                    justify-center text-slate-600 hover:border-emerald-400 hover:bg-emerald-50
                    font-bold text-xl transition-all shrink-0">
                  +
                </button>
              </div>
            </FormField>

            <FormField label="Accommodation Type">
              <input className="input" placeholder="e.g. Luxury Lodge, Tented Camp"
                value={createForm.accommodation_type}
                onChange={e => cUpd('accommodation_type', e.target.value)} />
            </FormField>

            <FormField label="Adults">
              <input className="input" type="number" min="1"
                value={createForm.number_of_adults}
                onChange={e => cUpd('number_of_adults', parseInt(e.target.value) || 1)} />
            </FormField>

            <FormField label="Children">
              <input className="input" type="number" min="0"
                value={createForm.number_of_children}
                onChange={e => cUpd('number_of_children', parseInt(e.target.value) || 0)} />
            </FormField>
          </div>

          {/* Trip summary */}
          {createForm.travel_date && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-800">
                📅 <strong>{createForm.full_name || 'Guest'}</strong> travels on{' '}
                <strong>{formatDate(createForm.travel_date)}</strong>
                {createForm.return_date && (
                  <> → returns <strong>{formatDate(createForm.return_date)}</strong></>
                )}
                {' '}with{' '}
                <strong>{createForm.number_of_travelers}</strong> traveler
                {createForm.number_of_travelers !== 1 ? 's' : ''}
              </p>
            </motion.div>
          )}
        </motion.div>
      )

      /* ── STEP 3: Notes ── */
      case 'notes': return (
        <motion.div key="notes" className="space-y-5"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          <FormField label="Special Requests"
            hint="Dietary needs, mobility requirements, room preferences, etc.">
            <textarea className="input min-h-[120px] resize-none"
              placeholder="Any special requirements or preferences…"
              value={createForm.special_requests}
              onChange={e => cUpd('special_requests', e.target.value)} />
          </FormField>

          <FormField label="Dietary Requirements">
            <input className="input" placeholder="e.g. Vegetarian, Halal, No nuts"
              value={createForm.dietary_requirements}
              onChange={e => cUpd('dietary_requirements', e.target.value)} />
          </FormField>

          <FormField label="Admin / Internal Notes"
            hint="Only visible to admin — also sent as user notification if enabled on next step">
            <textarea className="input min-h-[120px] resize-none"
              placeholder="Internal notes, pricing details, or custom message to send…"
              value={createForm.admin_notes}
              onChange={e => cUpd('admin_notes', e.target.value)} />
          </FormField>
        </motion.div>
      )

      /* ── STEP 4: Confirm ── */
      case 'confirm': return (
        <motion.div key="confirm" className="space-y-5"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          {/* Summary */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
            border border-emerald-200 overflow-hidden">
            <div className="px-5 py-3 bg-emerald-100/60 border-b border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                ✓ Booking Summary — Review Before Submitting
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                ['Guest',           createForm.full_name        || '—'],
                ['Email',           createForm.email            || '—'],
                ['Phone',           createForm.phone            || '—'],
                ['Nationality',     createForm.nationality      || '—'],
                ['Country',         createForm.country          || '—'],
                ['Booking Type',    createForm.booking_type     || 'custom'],
                ['Travel Date',     createForm.travel_date ? formatDate(createForm.travel_date) : '—'],
                ['Return Date',     createForm.return_date ? formatDate(createForm.return_date) : '—'],
                ['Travelers',       createForm.number_of_travelers],
                ['Adults',          createForm.number_of_adults],
                ['Children',        createForm.number_of_children],
                ['Accommodation',   createForm.accommodation_type   || '—'],
                ['Group Type',      createForm.group_type           || '—'],
                ['Dietary',         createForm.dietary_requirements || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-24 shrink-0 mt-0.5">{k}</span>
                  <span className="text-xs font-semibold text-slate-800">{v}</span>
                </div>
              ))}
              {createForm.special_requests && (
                <div className="sm:col-span-2 flex gap-3 items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-24 shrink-0 mt-0.5">Requests</span>
                  <span className="text-xs text-slate-700 leading-relaxed">{createForm.special_requests}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notify toggle */}
          <button type="button"
            onClick={() => cUpd('notify_user', !createForm.notify_user)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2
              cursor-pointer transition-all text-left
              ${createForm.notify_user
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center
              transition-all shrink-0
              ${createForm.notify_user
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-slate-300 bg-white'}`}>
              {createForm.notify_user && <Check size={13} className="text-white stroke-[3]" />}
            </div>
            <div>
              <p className={`text-sm font-bold flex items-center gap-1.5
                ${createForm.notify_user ? 'text-emerald-800' : 'text-slate-700'}`}>
                <Bell size={14} /> Send email notification to customer
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer receives a booking confirmation email + dashboard notification
              </p>
            </div>
          </button>

          {/* Warning if no notes */}
          {!createForm.admin_notes?.trim() && createForm.notify_user && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl
              bg-amber-50 border border-amber-200">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                No admin notes added. Customer notification will use a default message.
              </p>
            </div>
          )}
        </motion.div>
      )

      default: return null
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 page-enter">

      {/* ════════════════════════════════════════════════════════════════
          LIST VIEW
          ════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
      {view === VIEWS.LIST && (
        <motion.div key="list"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-5">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title flex items-center gap-2.5">
                <CalendarCheck size={28} className="text-emerald-600" /> Bookings
              </h1>
              <p className="page-subtitle">
                Manage all booking requests · {pag.total} total
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={goCreate} className="btn-primary btn-sm">
                <Plus size={14} /> New Booking
              </button>
              <button onClick={handleExport} className="btn-secondary btn-sm">
                <Download size={14} /> Export CSV
              </button>
              <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card p-4">
            <FilterBar>
              <SearchBar value={search} onChange={setSearch}
                placeholder="Search by name, email, booking #…" className="max-w-sm" />
              <FilterSelect label="Status" value={status}
                onChange={v => { setStatus(v); pag.reset() }}
                options={[{ value: '', label: 'All Statuses' }, ...BOOKING_STATUSES]} />
              <FilterSelect label="Requests" value={requestFilter}
                onChange={v => { setRequestFilter(v); pag.reset() }}
                options={[
                  { value: '',         label: 'All Requests'      },
                  { value: 'pending',  label: '⏳ Pending Requests' },
                  { value: 'approved', label: '✅ Approved'          },
                  { value: 'rejected', label: '❌ Rejected'          },
                  { value: 'none',     label: 'No Request'          },
                ]} />
            </FilterBar>
          </div>

          {/* Table */}
          <div className="card">
            {!!selectedIds.size && (
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
                <BulkActionsToolbar
                  selectedCount={selectedIds.size}
                  maxSelect={MAX_SELECT}
                  onClear={clearSelection}
                  onBulkStatus={bulkSetStatus}
                  onBulkDelete={bulkDelete}
                  disabled={saving}
                />
              </div>
            )}
            <Table columns={columns} data={items} loading={loading}
              sortBy={sortBy} sortOrder={sortOrder}
              onSort={(k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }}
              onRowClick={goView} />
            <Pagination
              page={pag.page} totalPages={pag.totalPages} total={pag.total}
              limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
              onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
              onPageSizeChange={pag.setPageSize}
            />
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          VIEW (DETAIL) PAGE
          ════════════════════════════════════════════════════════════ */}
      {view === VIEWS.VIEW && selected && (
        <motion.div key="view"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="space-y-5">

          {/* Top bar */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <PageBreadcrumb view={view} booking={selected} onBack={goList} />
              <h1 className="page-title flex items-center gap-2 mt-1">
                <CalendarCheck size={26} className="text-emerald-600" />
                {formatBookingNumber(selected.booking_number)}
              </h1>
              <p className="page-subtitle">
                Submitted {formatTimeAgo(selected.created_at)}
                {selected.email_verified
                  ? ' · ✅ Email verified'
                  : ' · ⏳ Awaiting email verification'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.status === 'pending' && (
                <button
                  onClick={() => handleQuickStatus(selected, 'confirmed')}
                  className="btn-primary btn-sm">
                  <CheckCircle size={14} /> Confirm
                </button>
              )}
              <button onClick={() => openMsgModal(selected)}
                className="btn-secondary btn-sm">
                <MessageSquare size={14} /> Message
              </button>
              <button onClick={() => goEdit(selected)} className="btn-secondary btn-sm">
                <Pencil size={14} /> Edit
              </button>
              <button onClick={() => setDeleteTarget(selected)}
                className="btn-sm border border-rose-200 text-rose-600
                  hover:bg-rose-50 rounded-xl px-3 py-2 text-xs font-semibold
                  flex items-center gap-1.5 transition-all">
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={goList} className="btn-secondary btn-sm">
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left / main */}
            <div className="lg:col-span-2 space-y-5">

              <SectionCard title="Guest Information" icon={User}>
                <InfoGrid>
                  <InfoItem label="Full Name"  value={selected.full_name} />
                  <InfoItem label="Email"       value={selected.email} />
                  <InfoItem label="Phone"       value={selected.phone} />
                  <InfoItem label="WhatsApp"    value={selected.whatsapp} />
                  <InfoItem label="Nationality" value={selected.nationality} />
                  <InfoItem label="Country"     value={selected.country} />
                </InfoGrid>
              </SectionCard>

              <SectionCard title="Trip Details" icon={MapPin}>
                <InfoGrid>
                  <InfoItem label="Travel Date"   value={formatDate(selected.travel_date)} />
                  <InfoItem label="Return Date"   value={formatDate(selected.return_date)} />
                  <InfoItem label="Booking Type"  value={selected.booking_type} />
                  <InfoItem label="Group Type"    value={selected.group_type} />
                  <InfoItem label="Travelers"     value={selected.number_of_travelers} />
                  <InfoItem label="Adults"        value={selected.number_of_adults} />
                  <InfoItem label="Children"      value={selected.number_of_children} />
                  <InfoItem label="Accommodation" value={selected.accommodation_type} />
                  <InfoItem label="Destination"   value={selected.destination_name} />
                  <InfoItem label="Booked Attraction" value={selected.attraction_name} />
                  <InfoItem label="Country"       value={selected.country_name} />
                  <InfoItem label="Service"       value={selected.service_name} />
                  <InfoItem label="Package"       value={selected.package_name} />
                </InfoGrid>
                {selected.special_requests && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Special Requests
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50
                      border border-slate-200 rounded-xl p-3">
                      {selected.special_requests}
                    </p>
                  </div>
                )}
                {selected.dietary_requirements && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Dietary Requirements
                    </p>
                    <p className="text-sm text-slate-700">{selected.dietary_requirements}</p>
                  </div>
                )}
              </SectionCard>

              {/* Admin notes */}
              {selected.admin_notes && (
                <SectionCard title="Admin Notes" icon={ClipboardList}>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selected.admin_notes}
                  </p>
                </SectionCard>
              )}

              {/* Cancellation / Refund */}
              {selected.cancel_request_status &&
               selected.cancel_request_status !== 'none' && (
                <SectionCard title="Cancellation / Refund Request" icon={Ban}>
                  <CancellationRequestPanel
                    booking={selected}
                    review={review}
                    setReview={setReview}
                    reviewing={reviewing}
                    onReview={handleReviewRequest}
                  />
                </SectionCard>
              )}
            </div>

            {/* Right / sidebar */}
            <div className="space-y-5">

              <SectionCard title="Status">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Current Status</span>
                    <Badge status={selected.status} label={selected.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Email Verified</span>
                    <span className={`text-xs font-bold
                      ${selected.email_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selected.email_verified ? '✓ Yes' : '⏳ No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Payment</span>
                    <span className="text-xs font-semibold text-slate-700 capitalize">
                      {selected.payment_status || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Source</span>
                    <span className="text-xs font-semibold text-slate-700 capitalize">
                      {selected.source || '—'}
                    </span>
                  </div>
                </div>

                {/* Quick status buttons */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Quick Actions
                  </p>
                  {selected.status === 'pending' && (
                    <button
                      onClick={() => handleQuickStatus(selected, 'confirmed')}
                      className="w-full btn-primary btn-sm justify-center">
                      <CheckCircle size={13} /> Confirm Booking
                    </button>
                  )}
                  {['pending', 'confirmed', 'on-hold'].includes(selected.status) && (
                    <button
                      onClick={() => handleQuickStatus(selected, 'cancelled')}
                      className="w-full btn-sm border border-rose-200 text-rose-600
                        hover:bg-rose-50 rounded-xl px-3 py-2 text-xs font-semibold
                        flex items-center justify-center gap-1.5 transition-all">
                      <Ban size={13} /> Cancel Booking
                    </button>
                  )}
                  {selected.status === 'confirmed' && (
                    <button
                      onClick={() => handleQuickStatus(selected, 'completed')}
                      className="w-full btn-sm border border-blue-200 text-blue-600
                        hover:bg-blue-50 rounded-xl px-3 py-2 text-xs font-semibold
                        flex items-center justify-center gap-1.5 transition-all">
                      <CheckCircle2 size={13} /> Mark Completed
                    </button>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Timestamps">
                <div className="space-y-3 text-xs">
                  {[
                    ['Created',    selected.created_at],
                    ['Updated',    selected.updated_at],
                    ['Confirmed',  selected.confirmed_at],
                    ['Cancelled',  selected.cancelled_at],
                    ['Completed',  selected.completed_at],
                    ['Verified',   selected.email_verified_at],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-medium shrink-0">{label}</span>
                      <span className="text-slate-700 font-semibold text-right">
                        {new Date(val).toLocaleString()}
                      </span>
                    </div>
                  ) : null)}
                </div>
              </SectionCard>

              {selected.user_name && (
                <SectionCard title="Linked Account">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.user_name} size="sm" rounded="lg" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selected.user_name}</p>
                      <p className="text-xs text-slate-500">{selected.user_email}</p>
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          EDIT PAGE
          ════════════════════════════════════════════════════════════ */}
      {view === VIEWS.EDIT && selected && (
        <motion.div key="edit"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="space-y-5">

          {/* Top bar */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <PageBreadcrumb view={view} booking={selected} onBack={goList} />
              <h1 className="page-title mt-1 flex items-center gap-2">
                <Pencil size={24} className="text-emerald-600" />
                Edit Booking
              </h1>
              <p className="page-subtitle">{formatBookingNumber(selected.booking_number)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView(VIEWS.VIEW)} className="btn-secondary btn-sm">
                <ArrowLeft size={14} /> Cancel
              </button>
              <button onClick={handleUpdate} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                  : <><Check size={15} /> Save Changes</>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">

              {/* Status selector */}
              <SectionCard title="Booking Status" icon={Shield}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BOOKING_STATUSES.map(opt => {
                    const val = opt.value || opt
                    const lbl = opt.label || opt
                    return (
                      <button key={val} type="button"
                        onClick={() => setEditForm(p => ({ ...p, status: val }))}
                        className={`px-4 py-3 rounded-xl text-sm font-bold border-2
                          transition-all capitalize text-center
                          ${editForm.status === val
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'}`}>
                        {lbl}
                      </button>
                    )
                  })}
                </div>

                {editForm.status !== selected.status && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium">
                      ⚠️ Status will change from{' '}
                      <strong className="capitalize">{selected.status}</strong> to{' '}
                      <strong className="capitalize">{editForm.status}</strong>
                    </p>
                  </div>
                )}
              </SectionCard>

              {/* Admin notes */}
              <SectionCard title="Admin Notes" icon={ClipboardList}>
                <textarea
                  className="input min-h-[160px] resize-none w-full"
                  value={editForm.admin_notes}
                  onChange={e => setEditForm(p => ({ ...p, admin_notes: e.target.value }))}
                  placeholder="Internal notes about this booking…" />
              </SectionCard>
            </div>

            {/* Sidebar — current info */}
            <div className="space-y-5">
              <SectionCard title="Current Info">
                <div className="space-y-3 text-sm">
                  <InfoItem label="Guest"     value={selected.full_name} />
                  <InfoItem label="Email"     value={selected.email} />
                  <InfoItem label="Travel"    value={formatDate(selected.travel_date)} />
                  <InfoItem label="Travelers" value={selected.number_of_travelers} />
                  <InfoItem label="Status"
                    value={<Badge status={selected.status} label={selected.status} />} />
                </div>
              </SectionCard>

              {/* Notify toggle */}
              <SectionCard title="Notification">
                <button type="button"
                  onClick={() => setEditForm(p => ({ ...p, notify_customer: !p.notify_customer }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2
                    cursor-pointer transition-all text-left
                    ${editForm.notify_customer
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center
                    transition-all shrink-0
                    ${editForm.notify_customer
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 bg-white'}`}>
                    {editForm.notify_customer && (
                      <Check size={11} className="text-white stroke-[3]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Bell size={12} /> Notify customer of changes
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Send status update email
                    </p>
                  </div>
                </button>
              </SectionCard>
            </div>
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CREATE PAGE  (multi-step)
          ════════════════════════════════════════════════════════════ */}
      {view === VIEWS.CREATE && (
        <motion.div key="create"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="space-y-5">

          {/* Top bar */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <PageBreadcrumb view={view} onBack={goList} />
              <h1 className="page-title mt-1 flex items-center gap-2">
                <Plus size={26} className="text-emerald-600" /> New Booking
              </h1>
              <p className="page-subtitle">Create a booking on behalf of a customer</p>
            </div>
            <button onClick={goList} className="btn-secondary btn-sm">
              <ArrowLeft size={14} /> Back to List
            </button>
          </div>

          {/* Step card */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Step indicator header */}
              <div className="px-8 pt-8 pb-0 border-b border-slate-100">
                <StepIndicator
                  steps={CREATE_STEPS}
                  current={createStep}
                  completed={createDone}
                />
              </div>

              {/* Step content */}
              <div className="px-8 py-6 min-h-[360px]">
                <AnimatePresence mode="wait">
                  {renderCreateStep()}
                </AnimatePresence>
              </div>

              {/* Footer navigation */}
              <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100
                flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400 font-medium">
                  Step {createStepIdx + 1} of {CREATE_STEPS.length} —{' '}
                  {CREATE_STEPS[createStepIdx]?.desc}
                </span>
                <div className="flex gap-2">
                  {createStepIdx > 0 && (
                    <button onClick={createGoPrev} disabled={creating}
                      className="btn-secondary btn-sm">
                      <ChevronLeft size={15} /> Back
                    </button>
                  )}
                  {createStepIdx < CREATE_STEPS.length - 1 ? (
                    <button onClick={createGoNext} className="btn-primary btn-sm">
                      Continue <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button onClick={handleAdminCreate} disabled={creating}
                      className="btn-primary px-6">
                      {creating
                        ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
                        : <><Check size={15} /> Create Booking</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="delete"
        title={deleteTarget?.bulk ? 'Delete selected bookings?' : 'Delete this booking?'}
        description={
          deleteTarget?.bulk
            ? `${deleteTarget.bulk.length} bookings will be permanently deleted. This cannot be undone.`
            : `Booking ${formatBookingNumber(deleteTarget?.booking_number)} will be permanently deleted. The customer will be notified.`
        }
        confirmLabel={deleteTarget?.bulk ? `Delete ${deleteTarget.bulk.length}` : 'Delete'}
      />

      {/* ── Quick Message Modal ── */}
      {msgBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeMsgModal} />
          <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl
                          shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Message {msgBooking.full_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Booking {msgBooking.booking_number || `#${msgBooking.id}`} · {msgBooking.email}
                </p>
              </div>
              <button onClick={closeMsgModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           hover:bg-slate-100 text-slate-400 transition">
                <X size={16} />
              </button>
            </div>

            {/* Messages area */}
            <div ref={msgScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px] max-h-[50vh]">
              {msgLoading ? (
                <div className="text-center text-slate-400 text-sm py-10">
                  Loading conversation...
                </div>
              ) : msgError ? (
                <div className="text-center text-rose-500 text-sm py-6 bg-rose-50 rounded-xl">
                  {msgError}
                </div>
              ) : msgMessages.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-10">
                  No messages yet. Start the conversation below.
                </div>
              ) : (
                msgMessages.map(m => {
                  const mine = m.sender_type === 'admin'
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed
                        ${mine
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                        {!mine && (
                          <p className="text-[10px] font-bold text-emerald-600 mb-0.5">
                            {m.sender_name || 'Customer'}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-slate-100 px-4 py-3 bg-white">
              {msgConvo?.status === 'closed' && (
                <div className="mb-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg
                                text-[11px] text-slate-500 text-center">
                  This conversation is closed. Sending a message will reopen it.
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={msgDraft}
                  onChange={e => setMsgDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendQuickMessage()
                    }
                  }}
                  rows={1}
                  placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                  className="flex-1 resize-none text-sm px-3.5 py-2.5 rounded-xl border
                             border-slate-200 bg-slate-50 outline-none max-h-32
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                             focus:bg-white transition placeholder:text-slate-400"
                />
                <button
                  onClick={sendQuickMessage}
                  disabled={!msgDraft.trim() || msgSending}
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm
                             flex items-center gap-1.5 flex-shrink-0
                             hover:bg-emerald-700 transition shadow-sm shadow-emerald-200
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={15} />
                  <span className="hidden sm:inline">
                    {msgSending ? 'Sending…' : 'Send'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}