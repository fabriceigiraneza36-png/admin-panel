// admin/src/pages/Packages.jsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  Package, Plus, Eye, Pencil, Trash2, RefreshCw,
  Globe2, EyeOff, Star, DollarSign, Calendar,
  Users, MessageSquare, BookOpen, CheckCircle,
  XCircle, Clock, AlertCircle, Send, FileText,
  Palette, ChevronDown, ChevronUp, Image,
} from 'lucide-react'

import { packagesAPI, getErrorMessage } from '@api/packages'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination                         from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                              from '@components/common/Badge'
import Avatar                             from '@components/common/Avatar'
import ConfirmDialog                      from '@components/common/ConfirmDialog'
import ImageUpload                        from '@components/common/ImageUpload'
import TagInput                           from '@components/common/TagInput'
import { useModal }                       from '@hooks/useModal'
import { useToast }                       from '@hooks/useToast'
import { usePagination }                  from '@hooks/usePagination'
import { useDebounce }                    from '@hooks/useDebounce'
import { formatNumber, formatTimeAgo }    from '@utils/formatters'

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'TZS', 'UGX']

const CATEGORIES = [
  'Safari', 'Beach & Coastal', 'Mountain & Trekking', 'Cultural & Heritage',
  'Wildlife', 'Adventure', 'Honeymoon', 'Family', 'Photography', 'Budget',
]

const CARD_THEMES = [
  { value: 'default', label: 'Default Green' },
  { value: 'dark',    label: 'Dark Luxury'   },
  { value: 'earth',   label: 'Earth Tones'   },
  { value: 'ocean',   label: 'Ocean Blue'    },
  { value: 'sunset',  label: 'Sunset Gold'   },
  { value: 'minimal', label: 'Minimal White' },
]

const MSG_TYPES = [
  { value: 'reply',             label: 'Reply'             },
  { value: 'booking_confirmed', label: 'Booking Confirmed' },
  { value: 'booking_cancelled', label: 'Booking Cancelled' },
  { value: 'info_request',      label: 'Info Request Form' },
  { value: 'system',            label: 'System Notice'     },
]

const INFO_FIELD_TYPES = [
  { value: 'text',     label: 'Text Input'    },
  { value: 'email',    label: 'Email'         },
  { value: 'tel',      label: 'Phone'         },
  { value: 'number',   label: 'Number'        },
  { value: 'textarea', label: 'Long Text'     },
  { value: 'select',   label: 'Dropdown'      },
  { value: 'radio',    label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkbox'      },
  { value: 'date',     label: 'Date Picker'   },
  { value: 'file',     label: 'File Upload'   },
]

const BOOKING_STATUSES = ['pending', 'needs_info', 'confirmed', 'cancelled', 'completed']

const INFO_REQUEST_THEMES = [
  { value: 'default', label: 'Default'      },
  { value: 'elegant', label: 'Elegant Dark' },
  { value: 'nature',  label: 'Nature Green' },
  { value: 'ocean',   label: 'Ocean Blue'   },
  { value: 'sunset',  label: 'Warm Sunset'  },
]

// ── Initial form states ───────────────────────────────────────────────────────

const INIT_PACKAGE = {
  title: '', slug: '', short_description: '', description: '', content: '',
  category: '', destination: '', country: '',
  price: '', price_label: 'per person', currency: 'USD',
  pricing_tiers: [], discount_percent: 0, is_price_visible: true,
  duration_days: '', duration_nights: '', max_travelers: '', min_travelers: 1,
  group_size_label: '',
  images: [], cover_image_url: '', thumbnail_url: '', video_url: '',
  gallery: [],
  features: [], inclusions: [], exclusions: [], highlights: [],
  itinerary: [], faqs: [], tags: [],
  available_months: [], departure_dates: [], availability_note: '',
  is_published: false, is_featured: false, is_sold_out: false,
  badge_label: '', badge_color: '#047857',
  meta_title: '', meta_description: '',
  card_theme: 'default', accent_color: '#047857', card_bg_image: '',
  sort_order: 0,
}

const INIT_INFO_REQUEST = {
  title: '', description: '',
  fields: [],
  theme: 'default', accent_color: '#047857',
  header_image: '', custom_css: '',
  user_id: '', target_email: '', target_name: '',
  booking_id: '', expires_hours: 72,
}

// ── Helper: parse JSON fields safely ─────────────────────────────────────────

const parseJsonField = (val, fallback = []) => {
  if (!val) return fallback
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return fallback
}

// ── Status icon helper ────────────────────────────────────────────────────────

function StatusIcon({ status, size = 14 }) {
  const map = {
    pending:    <Clock       size={size} className="text-amber-500"   />,
    confirmed:  <CheckCircle size={size} className="text-emerald-500" />,
    cancelled:  <XCircle     size={size} className="text-red-500"     />,
    completed:  <CheckCircle size={size} className="text-blue-500"    />,
    needs_info: <AlertCircle size={size} className="text-orange-500"  />,
  }
  return map[status] || null
}

// ── JsonListEditor ────────────────────────────────────────────────────────────

function JsonListEditor({ label, value = [], onChange, placeholder = 'Add item…' }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    if (!draft.trim()) return
    onChange([...value, draft.trim()])
    setDraft('')
  }

  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          className="input flex-1"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button type="button" onClick={add} className="btn-primary btn-sm px-3">
          <Plus size={14} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {value.map((item, i) => (
            <div key={i}
              className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
              <span className="flex-1 text-sm text-slate-700">{item}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <XCircle size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ItineraryEditor ───────────────────────────────────────────────────────────

function ItineraryEditor({ value = [], onChange }) {
  const add    = () => onChange([...value, { day: value.length + 1, title: '', description: '' }])
  const upd    = (i, k, v) => onChange(value.map((d, j) => j === i ? { ...d, [k]: v } : d))
  const remove = (i)       => onChange(value.filter((_, j) => j !== i))

  return (
    <div className="input-group">
      <div className="flex items-center justify-between mb-2">
        <label className="input-label mb-0">Itinerary</label>
        <button type="button" onClick={add} className="btn-secondary btn-sm">
          <Plus size={13} /> Add Day
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {value.map((day, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50
                px-2 py-1 rounded-lg shrink-0">
                Day {day.day || i + 1}
              </span>
              <input
                className="input flex-1 text-sm"
                placeholder="Day title"
                value={day.title}
                onChange={e => upd(i, 'title', e.target.value)}
              />
              <button type="button" onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-500 shrink-0 transition-colors">
                <XCircle size={14} />
              </button>
            </div>
            <textarea
              className="input text-sm min-h-[60px] resize-none"
              placeholder="Description…"
              value={day.description}
              onChange={e => upd(i, 'description', e.target.value)}
            />
          </div>
        ))}
        {!value.length && (
          <p className="text-center text-slate-400 text-sm py-4">
            No itinerary days yet. Click "Add Day" to start.
          </p>
        )}
      </div>
    </div>
  )
}

// ── PricingTierEditor ─────────────────────────────────────────────────────────

function PricingTierEditor({ value = [], onChange, currency = 'USD' }) {
  const add    = () => onChange([...value, { label: '', price: '', description: '' }])
  const upd    = (i, k, v) => onChange(value.map((t, j) => j === i ? { ...t, [k]: v } : t))
  const remove = (i)       => onChange(value.filter((_, j) => j !== i))

  return (
    <div className="input-group">
      <div className="flex items-center justify-between mb-2">
        <label className="input-label mb-0">Pricing Tiers</label>
        <button type="button" onClick={add} className="btn-secondary btn-sm">
          <Plus size={13} /> Add Tier
        </button>
      </div>
      <div className="space-y-2">
        {value.map((tier, i) => (
          <div key={i}
            className="grid grid-cols-3 gap-2 items-start border border-slate-200
              rounded-xl p-3 bg-slate-50">
            <input
              className="input text-sm"
              placeholder="Label (e.g. Budget)"
              value={tier.label}
              onChange={e => upd(i, 'label', e.target.value)}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2
                text-slate-400 text-xs font-bold pointer-events-none">
                {currency}
              </span>
              <input
                className="input text-sm pl-10"
                type="number"
                placeholder="0"
                value={tier.price}
                onChange={e => upd(i, 'price', e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              <input
                className="input text-sm flex-1"
                placeholder="Description"
                value={tier.description}
                onChange={e => upd(i, 'description', e.target.value)}
              />
              <button type="button" onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-500 shrink-0 transition-colors">
                <XCircle size={14} />
              </button>
            </div>
          </div>
        ))}
        {!value.length && (
          <p className="text-xs text-slate-400 italic">
            No pricing tiers. The base price above will be used.
          </p>
        )}
      </div>
    </div>
  )
}

// ── InfoFieldBuilder ──────────────────────────────────────────────────────────

function InfoFieldBuilder({ value = [], onChange }) {
  const add = () =>
    onChange([...value, {
      id: `field_${Date.now()}`, label: '', type: 'text',
      required: false, placeholder: '', options: [],
    }])
  const upd    = (i, k, v) => onChange(value.map((f, j) => j === i ? { ...f, [k]: v } : f))
  const remove = (i)       => onChange(value.filter((_, j) => j !== i))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="input-label mb-0 font-semibold">Form Fields *</label>
        <button type="button" onClick={add} className="btn-primary btn-sm">
          <Plus size={13} /> Add Field
        </button>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {value.map((field, i) => (
          <div key={field.id || i}
            className="border border-slate-200 rounded-xl p-3
              bg-gradient-to-r from-slate-50 to-white">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Label *</label>
                <input
                  className="input text-sm"
                  placeholder="Field label"
                  value={field.label}
                  onChange={e => upd(i, 'label', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Type</label>
                <select
                  className="input text-sm"
                  value={field.type}
                  onChange={e => upd(i, 'type', e.target.value)}
                >
                  {INFO_FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                className="input text-sm"
                placeholder="Placeholder text"
                value={field.placeholder}
                onChange={e => upd(i, 'placeholder', e.target.value)}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => upd(i, 'required', e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600"
                  />
                  Required
                </label>
                <button type="button" onClick={() => remove(i)}
                  className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {['select', 'radio'].includes(field.type) && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Options (comma-separated)
                </label>
                <input
                  className="input text-sm"
                  placeholder="Option 1, Option 2, Option 3"
                  value={(field.options || []).join(', ')}
                  onChange={e =>
                    upd(i, 'options',
                      e.target.value.split(',').map(o => o.trim()).filter(Boolean))
                  }
                />
              </div>
            )}
          </div>
        ))}
        {!value.length && (
          <div className="text-center py-6 border-2 border-dashed
            border-slate-200 rounded-xl">
            <FileText size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              No fields yet. Click "Add Field" above.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── BookingRow ────────────────────────────────────────────────────────────────

function BookingRow({ booking, onUpdate, onConfirm, onCancel, onInfoRequest }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer
          hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <StatusIcon status={booking.status} size={16} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {booking.guest_name || booking.user_full_name || '—'}
          </p>
          <p className="text-xs text-slate-400">{booking.guest_email || '—'}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-600">
            {booking.currency || 'USD'} {formatNumber(booking.total_price || 0)}
          </p>
          <p className="text-xs text-slate-400">{booking.booking_ref || '—'}</p>
        </div>
        <Badge status={booking.status} label={booking.status} />
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-3 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-400">Travel Date: </span>
              <span className="font-medium">{booking.travel_date || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400">Travelers: </span>
              <span className="font-medium">
                {booking.travelers_count || booking.adults || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Phone: </span>
              <span className="font-medium">{booking.guest_phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400">Priority: </span>
              <span className="font-medium capitalize">
                {booking.priority || 'normal'}
              </span>
            </div>
          </div>

          {booking.special_requests && (
            <div className="text-sm">
              <span className="text-slate-400">Requests: </span>
              <p className="text-slate-600 mt-0.5">{booking.special_requests}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {booking.status === 'pending' && (
              <button
                onClick={() => onConfirm(booking)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold
                  bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                <CheckCircle size={12} /> Confirm
              </button>
            )}
            {['pending', 'needs_info', 'confirmed'].includes(booking.status) && (
              <button
                onClick={() => onCancel(booking)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold
                  bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <XCircle size={12} /> Cancel
              </button>
            )}
            <button
              onClick={() => onInfoRequest(booking)}
              className="btn-secondary btn-sm text-xs flex items-center gap-1"
            >
              <FileText size={12} /> Request Info
            </button>
            <select
              className="text-xs border border-slate-200 rounded-lg
                px-2 py-1.5 bg-white cursor-pointer"
              value={booking.status}
              onChange={e => onUpdate(booking, { status: e.target.value })}
            >
              {BOOKING_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section accordion ─────────────────────────────────────────────────────────

function Section({ id, title, icon: SectionIcon, children, openSections, onToggle }) {
  const isOpen = openSections[id]
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-3.5
          bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-slate-700">
          {SectionIcon && <SectionIcon size={16} className="text-emerald-600" />}
          {title}
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && (
        <div className="p-5 space-y-4">{children}</div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function Packages() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()
  const replyModal  = useModal()
  const infoModal   = useModal()

  // ── List state ─────────────────────────────────────────────────────────────
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [pubFilter, setPub]       = useState('')
  const [catFilter, setCat]       = useState('')
  const [sortBy,    setSortBy]    = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form,    setForm]    = useState(INIT_PACKAGE)
  const [editing, setEditing] = useState(null)
  const [openSections, setOpenSections] = useState({ basic: true, pricing: true })

  // ── Detail tabs ────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState('details')
  const [pkgMessages, setPkgMessages] = useState([])
  const [pkgBookings, setPkgBookings] = useState([])
  const [pkgInfoReqs, setPkgInfoReqs] = useState([])
  const [subLoading,  setSubLoading]  = useState(false)

  // ── Reply state ────────────────────────────────────────────────────────────
  const [replyBody,    setReplyBody]    = useState('')
  const [replyType,    setReplyType]    = useState('reply')
  const [replyTarget,  setReplyTarget]  = useState(null)
  const [replySending, setReplySending] = useState(false)

  // ── Info request state ─────────────────────────────────────────────────────
  const [infoForm, setInfoForm] = useState(INIT_INFO_REQUEST)

  const dSearch = useDebounce(search, 400)

  // ── Load packages ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page:  pag.page,
        limit: pag.limit,
        sortBy,
        order: sortOrder,
        ...(dSearch    && { search:    dSearch }),
        ...(pubFilter  && { published: pubFilter }),
        ...(catFilter  && { category:  catFilter }),
      }
      // axios returns { data: responseBody } — responseBody has { data: rows, pagination }
      const res  = await packagesAPI.getAll(params)
      const body = res.data
      setItems(body.data || body.packages || [])
      pag.setTotal(body.pagination?.total ?? body.total ?? 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, pubFilter, catFilter]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  // ── Sub-data loader ────────────────────────────────────────────────────────

  const loadSubData = useCallback(async (pkg, tab) => {
    if (!pkg?.id) return
    setSubLoading(true)
    try {
      if (tab === 'messages') {
        const res = await packagesAPI.getMessages(pkg.id)
        setPkgMessages(res.data?.data || [])
      } else if (tab === 'bookings') {
        const res = await packagesAPI.getBookings(pkg.id)
        setPkgBookings(res.data?.data || [])
      } else if (tab === 'info') {
        const res = await packagesAPI.getInfoRequests(pkg.id)
        setPkgInfoReqs(res.data?.data || [])
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSubLoading(false)
    }
  }, [toast])

  // ── View modal ─────────────────────────────────────────────────────────────

  const openView = useCallback((pkg) => {
    viewModal.open(pkg)
    setActiveTab('details')
    setPkgMessages([])
    setPkgBookings([])
    setPkgInfoReqs([])
  }, [viewModal])

  const switchTab = useCallback((tab) => {
    setActiveTab(tab)
    loadSubData(viewModal.data, tab)
  }, [viewModal.data, loadSubData])

  // ── Form helpers ───────────────────────────────────────────────────────────

  const toggleSection = useCallback((k) =>
    setOpenSections(p => ({ ...p, [k]: !p[k] })), [])

  const openCreate = useCallback(() => {
    setForm(INIT_PACKAGE)
    setEditing(null)
    setOpenSections({ basic: true, pricing: true })
    formModal.open()
  }, [formModal])

  const openEdit = useCallback((p) => {
    const f = { ...INIT_PACKAGE }
    Object.keys(f).forEach(k => {
      if (p[k] !== undefined && p[k] !== null) f[k] = p[k]
    })
    // Parse JSON string fields
    const jsonFields = [
      'pricing_tiers', 'images', 'gallery', 'features', 'inclusions',
      'exclusions', 'highlights', 'itinerary', 'faqs',
      'available_months', 'departure_dates',
    ]
    jsonFields.forEach(k => { f[k] = parseJsonField(f[k]) })
    setForm(f)
    setEditing(p)
    setOpenSections({ basic: true, pricing: true })
    formModal.open()
  }, [formModal])

  const upd = useCallback((k, v) =>
    setForm(p => ({ ...p, [k]: v })), [])

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        slug:  form.slug || form.title.toLowerCase()
          .replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        price: parseFloat(form.price) || 0,
      }
      if (editing) {
        await packagesAPI.update(editing.id, payload)
        toast.success('Package updated')
      } else {
        await packagesAPI.create(payload)
        toast.success('Package created')
      }
      formModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Publish toggle ─────────────────────────────────────────────────────────

  const handleTogglePublish = async (pkg) => {
    try {
      if (pkg.is_published) {
        await packagesAPI.unpublish(pkg.id)
        toast.success('Package unpublished')
      } else {
        await packagesAPI.publish(pkg.id)
        toast.success('Package published')
      }
      load()
      // Update view modal if open for same package
      if (viewModal.isOpen && viewModal.data?.id === pkg.id) {
        viewModal.open({ ...viewModal.data, is_published: !pkg.is_published })
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await packagesAPI.remove(deleteModal.data.id)
      toast.success('Package deleted')
      deleteModal.close()
      if (viewModal.isOpen) viewModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // ── Reply ──────────────────────────────────────────────────────────────────

  const openReply = useCallback((msg = null) => {
    setReplyBody('')
    setReplyType('reply')
    setReplyTarget(msg ? { user_id: msg.sender_id, parent_id: msg.id } : null)
    replyModal.open(viewModal.data)
  }, [replyModal, viewModal.data])

  const handleSendReply = async () => {
    if (!replyBody.trim()) { toast.error('Message required'); return }
    setReplySending(true)
    try {
      await packagesAPI.adminReply(viewModal.data.id, {
        body:           replyBody.trim(),
        message_type:   replyType,
        parent_id:      replyTarget?.parent_id || null,
        target_user_id: replyTarget?.user_id   || null,
      })
      toast.success('Reply sent')
      replyModal.close()
      setReplyBody('')
      loadSubData(viewModal.data, 'messages')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setReplySending(false)
    }
  }

  // ── Booking actions ────────────────────────────────────────────────────────

  const handleBookingUpdate = async (booking, changes) => {
    try {
      await packagesAPI.updateBooking(viewModal.data.id, booking.id, changes)
      toast.success('Booking updated')
      loadSubData(viewModal.data, 'bookings')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleBookingConfirm = async (booking) => {
    try {
      await packagesAPI.confirmBooking(viewModal.data.id, booking.id)
      toast.success('Booking confirmed')
      loadSubData(viewModal.data, 'bookings')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleBookingCancel = async (booking) => {
    try {
      await packagesAPI.cancelBooking(viewModal.data.id, booking.id, {})
      toast.success('Booking cancelled')
      loadSubData(viewModal.data, 'bookings')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Info requests ──────────────────────────────────────────────────────────

  const openInfoRequest = useCallback((context = null) => {
    const base = { ...INIT_INFO_REQUEST }
    if (context) {
      base.booking_id   = context.booking_id  || ''
      base.user_id      = context.user_id     || ''
      base.target_email = context.guest_email || ''
      base.target_name  = context.guest_name  || ''
    }
    setInfoForm(base)
    infoModal.open(viewModal.data)
  }, [infoModal, viewModal.data])

  const infoUpd = useCallback((k, v) =>
    setInfoForm(p => ({ ...p, [k]: v })), [])

  const handleSendInfoRequest = async () => {
    if (!infoForm.title?.trim())   { toast.error('Title required');              return }
    if (!infoForm.fields?.length)  { toast.error('Add at least one field');      return }
    setSaving(true)
    try {
      await packagesAPI.createInfoRequest(infoModal.data.id, infoForm)
      toast.success('Info request sent to user')
      infoModal.close()
      loadSubData(viewModal.data, 'info')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Sort ───────────────────────────────────────────────────────────────────

  const handleSort = useCallback((k, o) => {
    setSortBy(k)
    setSortOrder(o)
    pag.reset()
  }, [pag])

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'title', label: 'Package', sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={r.thumbnail_url || r.cover_image_url}
            name={r.title}
            size="sm"
            rounded="lg"
          />
          <div>
            <p className="font-semibold text-slate-800 max-w-[180px] truncate">
              {r.title}
            </p>
            <p className="text-xs text-slate-400">
              {r.category || '—'} · {r.destination || r.country || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'price', label: 'Price', sortable: true, align: 'right',
      render: (v, r) => (
        <div className="text-right">
          <p className="font-bold text-emerald-700">
            {r.currency} {formatNumber(v || 0)}
          </p>
          <p className="text-xs text-slate-400">{r.price_label}</p>
        </div>
      ),
    },
    {
      key: 'duration_days', label: 'Duration',
      render: (v, r) =>
        v ? `${v}D / ${r.duration_nights ?? Math.max(0, v - 1)}N` : '—',
    },
    {
      key: 'is_published', label: 'Status',
      render: (v) => (
        <Badge
          status={v ? 'published' : 'draft'}
          label={v ? 'Published' : 'Draft'}
        />
      ),
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: (v) => v
        ? <Star size={15} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'booking_count', label: 'Bookings', align: 'right', sortable: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-slate-600">
          <BookOpen size={12} /> {formatNumber(v || 0)}
        </span>
      ),
    },
    {
      key: 'inquiry_count', label: 'Inquiries', align: 'right',
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-slate-600">
          <MessageSquare size={12} /> {formatNumber(v || 0)}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (v) => formatTimeAgo(v),
    },
    {
      key: 'actions', label: '', align: 'right', width: '160px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"   onClick={() => openView(r)} />
          <TableAction
            icon={r.is_published ? EyeOff : Globe2}
            label={r.is_published ? 'Unpublish' : 'Publish'}
            onClick={() => handleTogglePublish(r)}
            variant={r.is_published ? 'warning' : 'success'}
          />
          <TableAction icon={Pencil} label="Edit"   onClick={() => openEdit(r)} />
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

  // ── Sub-components (defined inside to access state) ────────────────────────

  const TabMessages = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-700">
          Messages ({pkgMessages.length})
        </h4>
        <button onClick={() => openReply()} className="btn-primary btn-sm">
          <Send size={13} /> Reply All
        </button>
      </div>

      {subLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500
            border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!subLoading && !pkgMessages.length && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No messages yet for this package.
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {pkgMessages.map(msg => (
          <div key={msg.id}
            className={`rounded-xl p-3 border ${
              msg.sender_type === 'admin'
                ? 'bg-emerald-50 border-emerald-100 ml-8'
                : 'bg-white border-slate-200'
            }`}>
            <div className="flex items-start gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold shrink-0 ${
                msg.sender_type === 'admin'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {(msg.sender_name || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700">
                    {msg.sender_name || 'Unknown'}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    msg.sender_type === 'admin'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {msg.message_type}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {formatTimeAgo(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {msg.body}
                </p>
              </div>
            </div>
            {msg.sender_type !== 'admin' && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => openReply(msg)}
                  className="btn-secondary btn-sm text-xs"
                >
                  <Send size={11} /> Reply
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const TabBookings = () => (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-700">
        Bookings ({pkgBookings.length})
      </h4>
      {subLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500
            border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!subLoading && !pkgBookings.length && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No bookings yet.
        </div>
      )}
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {pkgBookings.map(bk => (
          <BookingRow
            key={bk.id}
            booking={bk}
            onUpdate={handleBookingUpdate}
            onConfirm={handleBookingConfirm}
            onCancel={handleBookingCancel}
            onInfoRequest={(b) => openInfoRequest({
              booking_id:   b.id,
              user_id:      b.user_id,
              guest_email:  b.guest_email,
              guest_name:   b.guest_name,
            })}
          />
        ))}
      </div>
    </div>
  )

  const TabInfoRequests = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-700">
          Info Requests ({pkgInfoReqs.length})
        </h4>
        <button onClick={() => openInfoRequest()} className="btn-primary btn-sm">
          <FileText size={13} /> New Form
        </button>
      </div>
      {subLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500
            border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!subLoading && !pkgInfoReqs.length && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No info requests sent yet.
        </div>
      )}
      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {pkgInfoReqs.map(ir => (
          <div key={ir.id}
            className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{ir.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  To: {ir.target_name || ir.target_email || 'All'} ·{' '}
                  {parseJsonField(ir.fields).length} fields ·{' '}
                  {formatTimeAgo(ir.created_at)}
                </p>
              </div>
              <Badge
                status={ir.status === 'responded' ? 'success' : 'warning'}
                label={ir.status}
              />
            </div>
            {ir.status === 'responded' && ir.response && (
              <div className="mt-3 p-3 bg-emerald-50 border
                border-emerald-100 rounded-lg">
                <p className="text-xs font-semibold text-emerald-700 mb-1">
                  Response received:
                </p>
                <div className="space-y-1">
                  {Object.entries(
                    typeof ir.response === 'string'
                      ? JSON.parse(ir.response)
                      : ir.response
                  ).map(([k, v]) => (
                    <div key={k} className="text-xs text-slate-600">
                      <span className="font-medium">{k}:</span> {String(v)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 page-enter">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package size={28} className="text-primary-600" /> Packages
          </h1>
          <p className="page-subtitle">
            Manage travel packages ({pag.total} total)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary btn-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Package
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search packages…"
            className="max-w-sm"
          />
          <FilterSelect
            label="Status"
            value={pubFilter}
            onChange={v => { setPub(v); pag.reset() }}
            options={[
              { value: '',      label: 'All' },
              { value: 'true',  label: 'Published' },
              { value: 'false', label: 'Drafts' },
            ]}
          />
          <FilterSelect
            label="Category"
            value={catFilter}
            onChange={v => { setCat(v); pag.reset() }}
            options={[
              { value: '', label: 'All Categories' },
              ...CATEGORIES.map(c => ({ value: c, label: c })),
            ]}
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
          onRowClick={openView}
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

      {/* ── VIEW MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={viewModal.data?.title}
        size="xl"
        icon={<Package size={20} />}
        footer={
          <div className="flex justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => handleTogglePublish(viewModal.data)}
                className={
                  viewModal.data?.is_published
                    ? 'btn-warning btn-sm'
                    : 'btn-success btn-sm'
                }
              >
                {viewModal.data?.is_published
                  ? <><EyeOff size={13} /> Unpublish</>
                  : <><Globe2 size={13} /> Publish</>}
              </button>
              <button
                onClick={() => { viewModal.close(); openEdit(viewModal.data) }}
                className="btn-primary btn-sm"
              >
                <Pencil size={13} /> Edit
              </button>
            </div>
            <button onClick={viewModal.close} className="btn-secondary btn-sm">
              Close
            </button>
          </div>
        }
      >
        {viewModal.data && (
          <div className="space-y-4">
            {viewModal.data.cover_image_url && (
              <img
                src={viewModal.data.cover_image_url}
                alt={viewModal.data.title}
                className="w-full h-44 object-cover rounded-2xl"
              />
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
              {[
                { id: 'details',  label: 'Details',       icon: Package       },
                { id: 'messages', label: 'Messages',      icon: MessageSquare },
                { id: 'bookings', label: 'Bookings',      icon: BookOpen      },
                { id: 'info',     label: 'Info Requests', icon: FileText      },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm
                    font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <ModalSection title="Overview">
                  <ModalGrid>
                    <ModalField label="Category"    value={viewModal.data.category}    />
                    <ModalField label="Destination" value={viewModal.data.destination} />
                    <ModalField label="Country"     value={viewModal.data.country}     />
                    <ModalField
                      label="Duration"
                      value={
                        viewModal.data.duration_days
                          ? `${viewModal.data.duration_days} days / ${
                              viewModal.data.duration_nights ?? ''
                            } nights`
                          : '—'
                      }
                    />
                    <ModalField
                      label="Price"
                      value={
                        <span className="font-bold text-emerald-600">
                          {viewModal.data.currency}{' '}
                          {formatNumber(viewModal.data.price)}
                          <span className="text-slate-400 font-normal text-xs ml-1">
                            {viewModal.data.price_label}
                          </span>
                        </span>
                      }
                    />
                    <ModalField
                      label="Max Travelers"
                      value={viewModal.data.max_travelers || '—'}
                    />
                    <ModalField
                      label="Status"
                      value={
                        <Badge
                          status={viewModal.data.is_published ? 'published' : 'draft'}
                          label={viewModal.data.is_published ? 'Published' : 'Draft'}
                        />
                      }
                    />
                    <ModalField
                      label="Views"
                      value={formatNumber(viewModal.data.view_count)}
                    />
                  </ModalGrid>
                </ModalSection>

                {viewModal.data.short_description && (
                  <ModalField
                    label="Short Description"
                    value={viewModal.data.short_description}
                  />
                )}

                {parseJsonField(viewModal.data.features).length > 0 && (
                  <ModalSection title="Features">
                    <div className="flex flex-wrap gap-2">
                      {parseJsonField(viewModal.data.features).map((f, i) => (
                        <span key={i} className="badge-green text-xs">{f}</span>
                      ))}
                    </div>
                  </ModalSection>
                )}

                {parseJsonField(viewModal.data.pricing_tiers).length > 0 && (
                  <ModalSection title="Pricing Tiers">
                    <div className="space-y-2">
                      {parseJsonField(viewModal.data.pricing_tiers).map((t, i) => (
                        <div key={i}
                          className="flex items-center justify-between
                            bg-slate-50 px-3 py-2 rounded-lg">
                          <span className="font-medium text-sm">{t.label}</span>
                          <span className="font-bold text-emerald-600">
                            {viewModal.data.currency} {formatNumber(t.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ModalSection>
                )}
              </div>
            )}

            {activeTab === 'messages' && <TabMessages />}
            {activeTab === 'bookings' && <TabBookings />}
            {activeTab === 'info'     && <TabInfoRequests />}
          </div>
        )}
      </Modal>

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? 'Edit Package' : 'New Package'}
        size="2xl"
        icon={<Package size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={formModal.close}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editing ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">

          {/* Basic Info */}
          <Section
            id="basic"
            title="Basic Info"
            icon={Package}
            openSections={openSections}
            onToggle={toggleSection}
          >
            <ModalGrid>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Title *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={e => upd('title', e.target.value)}
                  placeholder="Package title"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Slug</label>
                <input
                  className="input"
                  value={form.slug}
                  onChange={e => upd('slug', e.target.value)}
                  placeholder="auto-generated"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={e => upd('category', e.target.value)}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Destination</label>
                <input
                  className="input"
                  value={form.destination}
                  onChange={e => upd('destination', e.target.value)}
                  placeholder="e.g. Serengeti"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Country</label>
                <input
                  className="input"
                  value={form.country}
                  onChange={e => upd('country', e.target.value)}
                  placeholder="e.g. Tanzania"
                />
              </div>
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Short Description</label>
              <textarea
                className="input min-h-[70px] resize-none"
                value={form.short_description}
                onChange={e => upd('short_description', e.target.value)}
                placeholder="Brief summary shown on cards…"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Full Description</label>
              <textarea
                className="input min-h-[120px] resize-none"
                value={form.description}
                onChange={e => upd('description', e.target.value)}
              />
            </div>
          </Section>

          {/* Pricing */}
          <Section
            id="pricing"
            title="Pricing"
            icon={DollarSign}
            openSections={openSections}
            onToggle={toggleSection}
          >
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Base Price *</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={e => upd('price', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Currency</label>
                <select
                  className="input"
                  value={form.currency}
                  onChange={e => upd('currency', e.target.value)}
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Price Label</label>
                <input
                  className="input"
                  value={form.price_label}
                  onChange={e => upd('price_label', e.target.value)}
                  placeholder="per person"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Discount %</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={form.discount_percent}
                  onChange={e => upd('discount_percent', e.target.value)}
                />
              </div>
            </ModalGrid>
            <PricingTierEditor
              value={form.pricing_tiers}
              onChange={v => upd('pricing_tiers', v)}
              currency={form.currency}
            />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_price_visible}
                onChange={e => upd('is_price_visible', e.target.checked)}
                className="w-4 h-4 rounded text-primary-600"
              />
              Show price publicly
            </label>
          </Section>

          {/* Duration & Capacity */}
          <Section
            id="duration"
            title="Duration & Capacity"
            icon={Calendar}
            openSections={openSections}
            onToggle={toggleSection}
          >
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Duration (Days)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.duration_days}
                  onChange={e => upd('duration_days', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Duration (Nights)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.duration_nights}
                  onChange={e => upd('duration_nights', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Min Travelers</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.min_travelers}
                  onChange={e => upd('min_travelers', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Max Travelers</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.max_travelers}
                  onChange={e => upd('max_travelers', e.target.value)}
                />
              </div>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Group Size Label</label>
                <input
                  className="input"
                  value={form.group_size_label}
                  onChange={e => upd('group_size_label', e.target.value)}
                  placeholder="e.g. Small group (max 12)"
                />
              </div>
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Availability Note</label>
              <input
                className="input"
                value={form.availability_note}
                onChange={e => upd('availability_note', e.target.value)}
                placeholder="e.g. Best Jan–Mar, Oct–Nov"
              />
            </div>
          </Section>

          {/* Media */}
          <Section
            id="media"
            title="Media"
            icon={Image}
            openSections={openSections}
            onToggle={toggleSection}
          >
            <ModalGrid>
              <ImageUpload
                label="Thumbnail"
                value={form.thumbnail_url}
                onChange={v => upd('thumbnail_url', v)}
                folder="packages"
              />
              <ImageUpload
                label="Cover Image"
                value={form.cover_image_url}
                onChange={v => upd('cover_image_url', v)}
                folder="packages"
              />
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Video URL</label>
              <input
                className="input"
                value={form.video_url}
                onChange={e => upd('video_url', e.target.value)}
                placeholder="YouTube or Vimeo URL"
              />
            </div>
          </Section>

          {/* Package Details */}
          <Section
            id="pkgdetails"
            title="Package Details"
            icon={FileText}
            openSections={openSections}
            onToggle={toggleSection}
          >
            <JsonListEditor
              label="Features / Highlights"
              value={form.features}
              onChange={v => upd('features', v)}
              placeholder="Add a feature…"
            />
            <JsonListEditor
              label="Inclusions"
              value={form.inclusions}
              onChange={v => upd('inclusions', v)}
              placeholder="What's included…"
            />
            <JsonListEditor
              label="Exclusions"
              value={form.exclusions}
              onChange={v => upd('exclusions', v)}
              placeholder="What's NOT included…"
            />
            <ItineraryEditor
              value={form.itinerary}
              onChange={v => upd('itinerary', v)}
            />
            <TagInput
              label="Tags"
              value={form.tags}
              onChange={v => upd('tags', v)}
            />
          </Section>

          {/* Card Design */}
          <Section
            id="design"
            title="Card Design"
            icon={Palette}
            openSections={openSections}
            onToggle={toggleSection}
          >
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Card Theme</label>
                <select
                  className="input"
                  value={form.card_theme}
                  onChange={e => upd('card_theme', e.target.value)}
                >
                  {CARD_THEMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={e => upd('accent_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200
                      cursor-pointer p-1 shrink-0"
                  />
                  <input
                    className="input flex-1"
                    value={form.accent_color}
                    onChange={e => upd('accent_color', e.target.value)}
                    placeholder="#047857"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Badge Label</label>
                <input
                  className="input"
                  value={form.badge_label}
                  onChange={e => upd('badge_label', e.target.value)}
                  placeholder="e.g. Best Seller, New, Limited"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Badge Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.badge_color}
                    onChange={e => upd('badge_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200
                      cursor-pointer p-1 shrink-0"
                  />
                  <input
                    className="input flex-1"
                    value={form.badge_color}
                    onChange={e => upd('badge_color', e.target.value)}
                  />
                </div>
              </div>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Card Background Image URL</label>
                <input
                  className="input"
                  value={form.card_bg_image}
                  onChange={e => upd('card_bg_image', e.target.value)}
                  placeholder="Optional background image for the card"
                />
              </div>
            </ModalGrid>
          </Section>

          {/* SEO & Options */}
          <Section
            id="seo"
            title="SEO & Options"
            icon={Globe2}
            openSections={openSections}
            onToggle={toggleSection}
          >
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Meta Title</label>
                <input
                  className="input"
                  value={form.meta_title}
                  onChange={e => upd('meta_title', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Meta Description</label>
                <input
                  className="input"
                  value={form.meta_description}
                  onChange={e => upd('meta_description', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Sort Order</label>
                <input
                  className="input"
                  type="number"
                  value={form.sort_order}
                  onChange={e => upd('sort_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </ModalGrid>
            <div className="flex flex-wrap gap-6">
              {[
                { k: 'is_published', label: 'Published' },
                { k: 'is_featured',  label: 'Featured'  },
                { k: 'is_sold_out',  label: 'Sold Out'  },
              ].map(({ k, label }) => (
                <label key={k}
                  className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[k]}
                    onChange={e => upd(k, e.target.checked)}
                    className="w-5 h-5 rounded-lg text-primary-600
                      border-surface-300 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </Section>

        </div>
      </Modal>

      {/* ── REPLY MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={replyModal.isOpen}
        onClose={replyModal.close}
        title="Send Reply"
        size="md"
        icon={<Send size={18} />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={replyModal.close}
              className="btn-secondary"
              disabled={replySending}
            >
              Cancel
            </button>
            <button
              onClick={handleSendReply}
              className="btn-primary"
              disabled={replySending}
            >
              {replySending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {replyTarget && (
            <div className="bg-slate-50 border border-slate-200
              rounded-xl px-4 py-2 text-sm text-slate-500">
              Replying to user ID: {replyTarget.user_id || 'Guest'}
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Message Type</label>
            <select
              className="input"
              value={replyType}
              onChange={e => setReplyType(e.target.value)}
            >
              {MSG_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Message *</label>
            <textarea
              className="input min-h-[140px] resize-none"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Type your message to the user…"
            />
          </div>
        </div>
      </Modal>

      {/* ── INFO REQUEST MODAL ───────────────────────────────────────────────── */}
      <Modal
        isOpen={infoModal.isOpen}
        onClose={infoModal.close}
        title="Create Info Request Form"
        size="xl"
        icon={<FileText size={18} />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={infoModal.close}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSendInfoRequest}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Sending…' : 'Send Form to User'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Form meta */}
          <div className="space-y-3">
            <div className="input-group">
              <label className="input-label">Form Title *</label>
              <input
                className="input"
                value={infoForm.title}
                onChange={e => infoUpd('title', e.target.value)}
                placeholder="e.g. Booking Details Required"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea
                className="input min-h-[60px] resize-none"
                value={infoForm.description}
                onChange={e => infoUpd('description', e.target.value)}
                placeholder="Tell the user why you need this information…"
              />
            </div>
          </div>

          {/* Target user */}
          <div className="bg-amber-50 border border-amber-200
            rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-amber-800">Send To</h4>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">User ID (if known)</label>
                <input
                  className="input"
                  value={infoForm.user_id}
                  onChange={e => infoUpd('user_id', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  className="input"
                  value={infoForm.target_email}
                  onChange={e => infoUpd('target_email', e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Name</label>
                <input
                  className="input"
                  value={infoForm.target_name}
                  onChange={e => infoUpd('target_name', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Expires In (hours)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={infoForm.expires_hours}
                  onChange={e => infoUpd('expires_hours', e.target.value)}
                />
              </div>
            </ModalGrid>
          </div>

          {/* Field builder */}
          <InfoFieldBuilder
            value={infoForm.fields}
            onChange={v => infoUpd('fields', v)}
          />

          {/* Design */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700
              flex items-center gap-1.5">
              <Palette size={14} /> Form Design
            </h4>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Theme</label>
                <select
                  className="input"
                  value={infoForm.theme}
                  onChange={e => infoUpd('theme', e.target.value)}
                >
                  {INFO_REQUEST_THEMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={infoForm.accent_color}
                    onChange={e => infoUpd('accent_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200
                      cursor-pointer p-1 shrink-0"
                  />
                  <input
                    className="input flex-1"
                    value={infoForm.accent_color}
                    onChange={e => infoUpd('accent_color', e.target.value)}
                  />
                </div>
              </div>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Header Image URL</label>
                <input
                  className="input"
                  value={infoForm.header_image}
                  onChange={e => infoUpd('header_image', e.target.value)}
                />
              </div>
            </ModalGrid>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this package?"
        description="This will soft-delete the package and hide it from users."
      />
    </div>
  )
}