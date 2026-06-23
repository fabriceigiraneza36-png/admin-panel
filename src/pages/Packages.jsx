// admin/src/pages/Packages.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Package, Plus, Eye, Pencil, Trash2, RefreshCw,
  Globe2, EyeOff, Star, DollarSign, Calendar,
  Users, MessageSquare, BookOpen, CheckCircle,
  XCircle, Clock, AlertCircle, Send, FileText,
  Palette, ChevronDown, ChevronUp, Image, Search,
  TrendingUp, BarChart3, ShoppingBag, Filter,
} from 'lucide-react'

// ── API — both named exports come from the same file ─────────────────────────
import { packagesAPI, getErrorMessage } from '@api/packages'

// ── Admin common components ───────────────────────────────────────────────────
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination                           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                                from '@components/common/Badge'
import Avatar                               from '@components/common/Avatar'
import ConfirmDialog                        from '@components/common/ConfirmDialog'
import ImageUpload                          from '@components/common/ImageUpload'
import TagInput                             from '@components/common/TagInput'

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useModal }      from '@hooks/useModal'
import { useToast }      from '@hooks/useToast'
import { usePagination } from '@hooks/usePagination'
import { useDebounce }   from '@hooks/useDebounce'

// ── Utils ─────────────────────────────────────────────────────────────────────
import { formatNumber, formatTimeAgo, formatDate } from '@utils/formatters'

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'TZS', 'UGX']

const CATEGORIES = [
  'Safari', 'Beach & Coastal', 'Mountain & Trekking',
  'Cultural & Heritage', 'Wildlife', 'Adventure',
  'Honeymoon', 'Family', 'Photography', 'Budget',
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

const BOOKING_STATUSES = [
  'pending', 'needs_info', 'confirmed', 'cancelled', 'completed',
]

const INFO_REQUEST_THEMES = [
  { value: 'default', label: 'Default'      },
  { value: 'elegant', label: 'Elegant Dark' },
  { value: 'nature',  label: 'Nature Green' },
  { value: 'ocean',   label: 'Ocean Blue'   },
  { value: 'sunset',  label: 'Warm Sunset'  },
]

// ══════════════════════════════════════════════════════════════════════════════
// INITIAL FORM STATES
// ══════════════════════════════════════════════════════════════════════════════

const INIT_PACKAGE = {
  title: '', slug: '', short_description: '', description: '', content: '',
  category: '', destination: '', country: '',
  price: '', price_label: 'per person', currency: 'USD',
  pricing_tiers: [], discount_percent: 0, is_price_visible: true,
  duration_days: '', duration_nights: '',
  max_travelers: '', min_travelers: 1, group_size_label: '',
  images: [], cover_image_url: '', thumbnail_url: '', video_url: '',
  gallery: [], features: [], inclusions: [], exclusions: [],
  highlights: [], itinerary: [], faqs: [], tags: [],
  available_months: [], departure_dates: [], availability_note: '',
  is_published: false, is_featured: false, is_sold_out: false,
  badge_label: '', badge_color: '#047857',
  meta_title: '', meta_description: '',
  card_theme: 'default', accent_color: '#047857',
  card_bg_image: '', sort_order: 0,
}

const INIT_INFO_REQUEST = {
  title: '', description: '', fields: [],
  theme: 'default', accent_color: '#047857',
  header_image: '', custom_css: '',
  user_id: '', target_email: '', target_name: '',
  booking_id: '', expires_hours: 72,
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const parseJson = (val, fallback = []) => {
  if (!val) return fallback
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return fallback
}

const fmtPrice = (price, currency = 'USD') => {
  if (!price && price !== 0) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `${currency} ${Number(price).toLocaleString()}`
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status, size = 14 }) {
  const cfg = {
    pending:    { icon: Clock,        cls: 'text-amber-500'   },
    confirmed:  { icon: CheckCircle,  cls: 'text-emerald-500' },
    cancelled:  { icon: XCircle,      cls: 'text-red-500'     },
    completed:  { icon: CheckCircle,  cls: 'text-blue-500'    },
    needs_info: { icon: AlertCircle,  cls: 'text-orange-500'  },
  }
  const c = cfg[status]
  if (!c) return null
  const Icon = c.icon
  return <Icon size={size} className={c.cls} />
}

// ── Accordion section ─────────────────────────────────────────────────────────

function Section({ id, title, icon: SectionIcon, open, onToggle, children }) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4
          bg-gradient-to-r from-slate-50 to-white hover:from-slate-100
          transition-colors group"
      >
        <span className="flex items-center gap-2.5 font-semibold text-slate-700
          group-hover:text-slate-900 text-sm">
          {SectionIcon && (
            <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100
              flex items-center justify-center shrink-0">
              <SectionIcon size={14} className="text-emerald-600" />
            </span>
          )}
          {title}
        </span>
        {open
          ? <ChevronUp  size={16} className="text-slate-400" />
          : <ChevronDown size={16} className="text-slate-400" />
        }
      </button>
      {open && (
        <div className="p-5 space-y-4 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  )
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
        <button type="button" onClick={add}
          className="btn-primary btn-sm px-3 shrink-0">
          <Plus size={14} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-xl
          border border-slate-100 p-2 bg-slate-50">
          {value.map((item, i) => (
            <div key={i}
              className="flex items-center gap-2 bg-white rounded-lg
                px-3 py-2 border border-slate-100 shadow-sm">
              <span className="flex-1 text-sm text-slate-700 truncate">{item}</span>
              <button type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
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
  const remove = (i) => onChange(value.filter((_, j) => j !== i))

  return (
    <div className="input-group">
      <div className="flex items-center justify-between mb-2">
        <label className="input-label mb-0">Itinerary</label>
        <button type="button" onClick={add} className="btn-secondary btn-sm">
          <Plus size={13} /> Add Day
        </button>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {value.map((day, i) => (
          <div key={i}
            className="border border-slate-200 rounded-xl p-3 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-emerald-700
                bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                Day {day.day || i + 1}
              </span>
              <input
                className="input flex-1 text-sm"
                placeholder="Day title"
                value={day.title}
                onChange={e => upd(i, 'title', e.target.value)}
              />
              <button type="button" onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
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
          <div className="text-center py-6 border-2 border-dashed
            border-slate-200 rounded-xl">
            <Calendar size={20} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              No itinerary days. Click "Add Day" to start.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PricingTierEditor ─────────────────────────────────────────────────────────

function PricingTierEditor({ value = [], onChange, currency = 'USD' }) {
  const add    = () => onChange([...value, { label: '', price: '', description: '' }])
  const upd    = (i, k, v) => onChange(value.map((t, j) => j === i ? { ...t, [k]: v } : t))
  const remove = (i) => onChange(value.filter((_, j) => j !== i))

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
            className="grid grid-cols-3 gap-2 items-center border
              border-slate-200 rounded-xl p-3 bg-slate-50">
            <input className="input text-sm" placeholder="Label (e.g. Budget)"
              value={tier.label} onChange={e => upd(i, 'label', e.target.value)} />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2
                text-slate-400 text-xs font-bold pointer-events-none">
                {currency}
              </span>
              <input className="input text-sm pl-10" type="number" placeholder="0"
                value={tier.price} onChange={e => upd(i, 'price', e.target.value)} />
            </div>
            <div className="flex gap-1">
              <input className="input text-sm flex-1" placeholder="Description"
                value={tier.description}
                onChange={e => upd(i, 'description', e.target.value)} />
              <button type="button" onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-500 shrink-0 transition-colors">
                <XCircle size={14} />
              </button>
            </div>
          </div>
        ))}
        {!value.length && (
          <p className="text-xs text-slate-400 italic px-1">
            No tiers — the base price above will be used.
          </p>
        )}
      </div>
    </div>
  )
}

// ── InfoFieldBuilder ──────────────────────────────────────────────────────────

function InfoFieldBuilder({ value = [], onChange }) {
  const add = () => onChange([...value, {
    id: `field_${Date.now()}`, label: '', type: 'text',
    required: false, placeholder: '', options: [],
  }])
  const upd    = (i, k, v) => onChange(value.map((f, j) => j === i ? { ...f, [k]: v } : f))
  const remove = (i) => onChange(value.filter((_, j) => j !== i))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="input-label mb-0 font-semibold">
          Form Fields *
        </label>
        <button type="button" onClick={add} className="btn-primary btn-sm">
          <Plus size={13} /> Add Field
        </button>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-0.5">
        {value.map((field, i) => (
          <div key={field.id || i}
            className="border border-slate-200 rounded-xl p-3
              bg-gradient-to-br from-slate-50 to-white">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">
                  Label *
                </label>
                <input className="input text-sm" placeholder="Field label"
                  value={field.label}
                  onChange={e => upd(i, 'label', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">
                  Type
                </label>
                <select className="input text-sm" value={field.type}
                  onChange={e => upd(i, 'type', e.target.value)}>
                  {INFO_FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="input text-sm" placeholder="Placeholder text"
                value={field.placeholder}
                onChange={e => upd(i, 'placeholder', e.target.value)} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer
                  text-sm text-slate-600">
                  <input type="checkbox" checked={field.required}
                    onChange={e => upd(i, 'required', e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600" />
                  Required
                </label>
                <button type="button" onClick={() => remove(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {['select', 'radio'].includes(field.type) && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">
                  Options (comma-separated)
                </label>
                <input className="input text-sm"
                  placeholder="Option 1, Option 2, Option 3"
                  value={(field.options || []).join(', ')}
                  onChange={e =>
                    upd(i, 'options',
                      e.target.value.split(',').map(o => o.trim()).filter(Boolean))
                  } />
              </div>
            )}
          </div>
        ))}
        {!value.length && (
          <div className="text-center py-8 border-2 border-dashed
            border-slate-200 rounded-xl bg-slate-50">
            <FileText size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              No fields yet. Click "Add Field" to begin.
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

  const statusColors = {
    pending:    'bg-amber-50 border-amber-200 text-amber-700',
    confirmed:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    cancelled:  'bg-red-50 border-red-200 text-red-700',
    completed:  'bg-blue-50 border-blue-200 text-blue-700',
    needs_info: 'bg-orange-50 border-orange-200 text-orange-700',
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden
      hover:border-slate-300 transition-colors">
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
          <p className="text-xs text-slate-400 truncate">
            {booking.guest_email || '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-600">
            {fmtPrice(booking.total_price, booking.currency)}
          </p>
          <p className="text-xs text-slate-400">{booking.booking_ref || '—'}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border
          capitalize shrink-0 ${statusColors[booking.status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          {booking.status}
        </span>
        {expanded
          ? <ChevronUp size={14} className="text-slate-400 shrink-0" />
          : <ChevronDown size={14} className="text-slate-400 shrink-0" />
        }
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Travel Date', value: booking.travel_date   || '—' },
              { label: 'Travelers',   value: booking.travelers_count || booking.adults || '—' },
              { label: 'Phone',       value: booking.guest_phone   || '—' },
              { label: 'Priority',    value: booking.priority      || 'normal' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg p-2.5 border border-slate-100">
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-700 capitalize">{value}</p>
              </div>
            ))}
          </div>

          {booking.special_requests && (
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Special Requests</p>
              <p className="text-sm text-slate-600">{booking.special_requests}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {booking.status === 'pending' && (
              <button onClick={() => onConfirm(booking)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold
                  bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl
                  transition-colors shadow-sm">
                <CheckCircle size={13} /> Confirm Booking
              </button>
            )}
            {['pending', 'needs_info', 'confirmed'].includes(booking.status) && (
              <button onClick={() => onCancel(booking)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold
                  bg-red-500 hover:bg-red-600 text-white rounded-xl
                  transition-colors shadow-sm">
                <XCircle size={13} /> Cancel
              </button>
            )}
            <button onClick={() => onInfoRequest(booking)}
              className="btn-secondary btn-sm text-xs flex items-center gap-1.5">
              <FileText size={13} /> Request Info
            </button>
            <div className="ml-auto">
              <select
                className="text-xs border border-slate-200 rounded-xl
                  px-3 py-2 bg-white cursor-pointer font-medium
                  focus:ring-2 focus:ring-primary-300 outline-none"
                value={booking.status}
                onChange={e => onUpdate(booking, { status: e.target.value })}
              >
                {BOOKING_STATUSES.map(s => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STATS BAR
// ══════════════════════════════════════════════════════════════════════════════

function StatsBar({ stats }) {
  if (!stats) return null
  const items = [
    {
      label: 'Total',
      value: stats.packages?.total || 0,
      icon: Package,
      color: 'text-slate-600',
      bg:    'bg-slate-100',
    },
    {
      label: 'Published',
      value: stats.packages?.published || 0,
      icon: Globe2,
      color: 'text-emerald-600',
      bg:    'bg-emerald-100',
    },
    {
      label: 'Bookings',
      value: stats.bookings?.total || 0,
      icon: BookOpen,
      color: 'text-blue-600',
      bg:    'bg-blue-100',
    },
    {
      label: 'Pending',
      value: stats.bookings?.pending || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg:    'bg-amber-100',
    },
    {
      label: 'Unread Msgs',
      value: stats.messages?.unread || 0,
      icon: MessageSquare,
      color: 'text-purple-600',
      bg:    'bg-purple-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label}
          className="card p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center
            justify-center shrink-0`}>
            <Icon size={16} className={color} />
          </div>
          <div>
            <p className="text-xl font-black text-slate-800">
              {formatNumber(value)}
            </p>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function Packages() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()
  const replyModal  = useModal()
  const infoModal   = useModal()

  // ── State ──────────────────────────────────────────────────────────────────
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [stats,     setStats]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [pubFilter, setPub]       = useState('')
  const [catFilter, setCat]       = useState('')
  const [sortBy,    setSortBy]    = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [form,      setForm]      = useState(INIT_PACKAGE)
  const [editing,   setEditing]   = useState(null)
  const [openSecs,  setOpenSecs]  = useState({
    basic: true, pricing: true, duration: false,
    media: false, pkgdetails: false, design: false, seo: false,
  })

  // ── Detail tab state ───────────────────────────────────────────────────────
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
        ...(dSearch   && { search:    dSearch   }),
        ...(pubFilter && { published: pubFilter }),
        ...(catFilter && { category:  catFilter }),
      }
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

  // ── Load stats ─────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const res = await packagesAPI.getStats()
      setStats(res.data)
    } catch {
      // Stats are non-critical — fail silently
    }
  }, [])

  useEffect(() => { load() },      [load])
  useEffect(() => { loadStats() }, [loadStats])

  // ── Load sub-data ──────────────────────────────────────────────────────────

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

  // ── Form ───────────────────────────────────────────────────────────────────

  const toggleSec = useCallback((k) =>
    setOpenSecs(p => ({ ...p, [k]: !p[k] })), [])

  const upd = useCallback((k, v) =>
    setForm(p => ({ ...p, [k]: v })), [])

  const openCreate = useCallback(() => {
    setForm(INIT_PACKAGE)
    setEditing(null)
    setOpenSecs({ basic: true, pricing: true, duration: false,
      media: false, pkgdetails: false, design: false, seo: false })
    formModal.open()
  }, [formModal])

  const openEdit = useCallback((p) => {
    const f = { ...INIT_PACKAGE }
    Object.keys(f).forEach(k => {
      if (p[k] !== undefined && p[k] !== null) f[k] = p[k]
    })
    const jsonKeys = [
      'pricing_tiers', 'images', 'gallery', 'features', 'inclusions',
      'exclusions', 'highlights', 'itinerary', 'faqs',
      'available_months', 'departure_dates',
    ]
    jsonKeys.forEach(k => { f[k] = parseJson(f[k]) })
    setForm(f)
    setEditing(p)
    setOpenSecs({ basic: true, pricing: true, duration: false,
      media: false, pkgdetails: false, design: false, seo: false })
    formModal.open()
  }, [formModal])

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
        toast.success('Package updated successfully')
      } else {
        await packagesAPI.create(payload)
        toast.success('Package created successfully')
      }
      formModal.close()
      load()
      loadStats()
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
      loadStats()
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
      loadStats()
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
    if (!replyBody.trim()) { toast.error('Message is required'); return }
    setReplySending(true)
    try {
      await packagesAPI.adminReply(viewModal.data.id, {
        body:           replyBody.trim(),
        message_type:   replyType,
        parent_id:      replyTarget?.parent_id || null,
        target_user_id: replyTarget?.user_id   || null,
      })
      toast.success('Reply sent successfully')
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
    if (!infoForm.title?.trim())  { toast.error('Title is required'); return }
    if (!infoForm.fields?.length) { toast.error('Add at least one field'); return }
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
    setSortBy(k); setSortOrder(o); pag.reset()
  }, [pag])

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns = useMemo(() => [
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
            <p className="font-semibold text-slate-800 max-w-[200px] truncate">
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
          <p className="font-bold text-emerald-700 text-sm">
            {fmtPrice(v, r.currency)}
          </p>
          <p className="text-xs text-slate-400">{r.price_label || 'per person'}</p>
        </div>
      ),
    },
    {
      key: 'duration_days', label: 'Duration',
      render: (v, r) =>
        v ? (
          <span className="text-sm text-slate-600">
            {v}D / {r.duration_nights ?? Math.max(0, v - 1)}N
          </span>
        ) : '—',
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
        : <span className="text-slate-200 text-lg mx-auto block text-center">—</span>,
    },
    {
      key: 'booking_count', label: 'Bookings', align: 'right', sortable: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-slate-600 text-sm">
          <BookOpen size={12} className="text-blue-400" />
          {formatNumber(v || 0)}
        </span>
      ),
    },
    {
      key: 'inquiry_count', label: 'Inquiries', align: 'right',
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-slate-600 text-sm">
          <MessageSquare size={12} className="text-purple-400" />
          {formatNumber(v || 0)}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (v) => (
        <span className="text-sm text-slate-500">{formatTimeAgo(v)}</span>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', width: '160px',
      render: (_, r) => (
        <TableActions>
          <TableAction
            icon={Eye} label="View"
            onClick={() => openView(r)}
          />
          <TableAction
            icon={r.is_published ? EyeOff : Globe2}
            label={r.is_published ? 'Unpublish' : 'Publish'}
            onClick={() => handleTogglePublish(r)}
            variant={r.is_published ? 'warning' : 'success'}
          />
          <TableAction
            icon={Pencil} label="Edit"
            onClick={() => openEdit(r)}
          />
          <TableAction
            icon={Trash2} label="Delete"
            onClick={() => deleteModal.open(r)}
            variant="danger"
          />
        </TableActions>
      ),
    },
  ], [openView, openEdit, deleteModal]) // eslint-disable-line

  // ── Tab content components ─────────────────────────────────────────────────

  const SubLoader = () => (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-2 border-emerald-500
        border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const EmptyTab = ({ message }) => (
    <div className="text-center py-12 text-slate-400">
      <Package size={32} className="mx-auto mb-3 text-slate-200" />
      <p className="text-sm">{message}</p>
    </div>
  )

  const TabMessages = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
          <MessageSquare size={16} className="text-purple-500" />
          Messages ({pkgMessages.length})
        </h4>
        <button onClick={() => openReply()} className="btn-primary btn-sm">
          <Send size={13} /> Send Reply
        </button>
      </div>
      {subLoading
        ? <SubLoader />
        : !pkgMessages.length
        ? <EmptyTab message="No messages yet for this package." />
        : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {pkgMessages.map(msg => (
              <div key={msg.id}
                className={`rounded-xl p-3.5 border transition-colors ${
                  msg.sender_type === 'admin'
                    ? 'bg-emerald-50 border-emerald-100 ml-6'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center
                    justify-center text-xs font-bold shrink-0 ${
                    msg.sender_type === 'admin'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {(msg.sender_name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">
                        {msg.sender_name || 'Unknown'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5
                        rounded-full uppercase tracking-wide ${
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
                    <p className="text-sm text-slate-700 whitespace-pre-wrap
                      leading-relaxed">
                      {msg.body}
                    </p>
                  </div>
                </div>
                {msg.sender_type !== 'admin' && (
                  <div className="mt-2.5 flex justify-end">
                    <button onClick={() => openReply(msg)}
                      className="btn-secondary btn-sm text-xs flex items-center gap-1">
                      <Send size={11} /> Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )

  const TabBookings = () => (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-700 flex items-center gap-2">
        <BookOpen size={16} className="text-blue-500" />
        Bookings ({pkgBookings.length})
      </h4>
      {subLoading
        ? <SubLoader />
        : !pkgBookings.length
        ? <EmptyTab message="No bookings yet for this package." />
        : (
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {pkgBookings.map(bk => (
              <BookingRow
                key={bk.id}
                booking={bk}
                onUpdate={handleBookingUpdate}
                onConfirm={handleBookingConfirm}
                onCancel={handleBookingCancel}
                onInfoRequest={(b) => openInfoRequest({
                  booking_id:  b.id,
                  user_id:     b.user_id,
                  guest_email: b.guest_email,
                  guest_name:  b.guest_name,
                })}
              />
            ))}
          </div>
        )
      }
    </div>
  )

  const TabInfoRequests = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
          <FileText size={16} className="text-amber-500" />
          Info Requests ({pkgInfoReqs.length})
        </h4>
        <button onClick={() => openInfoRequest()} className="btn-primary btn-sm">
          <FileText size={13} /> New Form
        </button>
      </div>
      {subLoading
        ? <SubLoader />
        : !pkgInfoReqs.length
        ? <EmptyTab message="No info requests sent yet." />
        : (
          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {pkgInfoReqs.map(ir => (
              <div key={ir.id}
                className="border border-slate-200 rounded-xl p-4 bg-white
                  hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {ir.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      To: {ir.target_name || ir.target_email || 'All'} ·{' '}
                      {parseJson(ir.fields).length} fields ·{' '}
                      {formatTimeAgo(ir.created_at)}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                    border shrink-0 capitalize ${
                    ir.status === 'responded'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {ir.status}
                  </span>
                </div>
                {ir.status === 'responded' && ir.response && (
                  <div className="mt-3 p-3 bg-emerald-50 border
                    border-emerald-100 rounded-xl">
                    <p className="text-xs font-bold text-emerald-700 mb-2">
                      ✓ Response received
                    </p>
                    <div className="space-y-1">
                      {Object.entries(
                        typeof ir.response === 'string'
                          ? JSON.parse(ir.response)
                          : ir.response
                      ).map(([k, v]) => (
                        <div key={k}
                          className="text-xs text-slate-600 flex gap-2">
                          <span className="font-semibold shrink-0 text-slate-500">
                            {k}:
                          </span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 page-enter">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <Package size={28} className="text-primary-600" />
            Packages
          </h1>
          <p className="page-subtitle">
            Manage travel packages · {pag.total} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { load(); loadStats() }}
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

      {/* ── Stats bar ── */}
      <StatsBar stats={stats} />

      {/* ── Filters ── */}
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
              { value: '',      label: 'All Status'  },
              { value: 'true',  label: 'Published'   },
              { value: 'false', label: 'Drafts Only' },
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

      {/* ── Table ── */}
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

      {/* ════════════════════════════════════════════════════════════════════
          VIEW MODAL
          ════════════════════════════════════════════════════════════════ */}
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
                className={viewModal.data?.is_published
                  ? 'btn-warning btn-sm'
                  : 'btn-success btn-sm'}
              >
                {viewModal.data?.is_published
                  ? <><EyeOff size={13} /> Unpublish</>
                  : <><Globe2  size={13} /> Publish</>}
              </button>
              <button
                onClick={() => { viewModal.close(); openEdit(viewModal.data) }}
                className="btn-primary btn-sm"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => {
                  viewModal.close()
                  deleteModal.open(viewModal.data)
                }}
                className="btn-danger btn-sm"
              >
                <Trash2 size={13} /> Delete
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
            {/* Cover image */}
            {viewModal.data.cover_image_url && (
              <img
                src={viewModal.data.cover_image_url}
                alt={viewModal.data.title}
                className="w-full h-48 object-cover rounded-2xl"
              />
            )}

            {/* Tabs */}
            <div className="flex gap-0.5 border-b border-slate-200
              overflow-x-auto pb-0">
              {[
                { id: 'details',  label: 'Details',       icon: Package       },
                { id: 'messages', label: 'Messages',      icon: MessageSquare },
                { id: 'bookings', label: 'Bookings',      icon: BookOpen      },
                { id: 'info',     label: 'Info Requests', icon: FileText      },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm
                    font-semibold whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Details tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <ModalSection title="Overview">
                  <ModalGrid>
                    <ModalField label="Category"     value={viewModal.data.category}    />
                    <ModalField label="Destination"  value={viewModal.data.destination} />
                    <ModalField label="Country"      value={viewModal.data.country}     />
                    <ModalField
                      label="Duration"
                      value={
                        viewModal.data.duration_days
                          ? `${viewModal.data.duration_days}D / ${viewModal.data.duration_nights ?? ''}N`
                          : '—'
                      }
                    />
                    <ModalField
                      label="Price"
                      value={
                        <span className="font-bold text-emerald-600">
                          {fmtPrice(viewModal.data.price, viewModal.data.currency)}
                          <span className="text-slate-400 font-normal text-xs ml-1.5">
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
                      value={formatNumber(viewModal.data.view_count || 0)}
                    />
                  </ModalGrid>
                </ModalSection>

                {viewModal.data.short_description && (
                  <ModalField
                    label="Short Description"
                    value={viewModal.data.short_description}
                  />
                )}

                {parseJson(viewModal.data.features).length > 0 && (
                  <ModalSection title="Features">
                    <div className="flex flex-wrap gap-2">
                      {parseJson(viewModal.data.features).map((f, i) => (
                        <span key={i} className="badge-green text-xs">{f}</span>
                      ))}
                    </div>
                  </ModalSection>
                )}

                {parseJson(viewModal.data.pricing_tiers).length > 0 && (
                  <ModalSection title="Pricing Tiers">
                    <div className="space-y-2">
                      {parseJson(viewModal.data.pricing_tiers).map((t, i) => (
                        <div key={i}
                          className="flex items-center justify-between
                            bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="font-semibold text-sm text-slate-700">
                              {t.label}
                            </span>
                            {t.description && (
                              <span className="text-xs text-slate-400 ml-2">
                                {t.description}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-emerald-600">
                            {fmtPrice(t.price, viewModal.data.currency)}
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

      {/* ════════════════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
          ════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? `Edit: ${editing.title}` : 'New Package'}
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
              {saving
                ? 'Saving…'
                : editing ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">

          {/* Basic Info */}
          <Section id="basic" title="Basic Information"
            icon={Package} open={openSecs.basic} onToggle={toggleSec}>
            <ModalGrid>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Title *</label>
                <input className="input" value={form.title}
                  onChange={e => upd('title', e.target.value)}
                  placeholder="e.g. 7-Day Serengeti Safari" />
              </div>
              <div className="input-group">
                <label className="input-label">Slug</label>
                <input className="input" value={form.slug}
                  onChange={e => upd('slug', e.target.value)}
                  placeholder="auto-generated from title" />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="input" value={form.category}
                  onChange={e => upd('category', e.target.value)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Destination</label>
                <input className="input" value={form.destination}
                  onChange={e => upd('destination', e.target.value)}
                  placeholder="e.g. Serengeti National Park" />
              </div>
              <div className="input-group">
                <label className="input-label">Country</label>
                <input className="input" value={form.country}
                  onChange={e => upd('country', e.target.value)}
                  placeholder="e.g. Tanzania" />
              </div>
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Short Description</label>
              <textarea className="input min-h-[70px] resize-none"
                value={form.short_description}
                onChange={e => upd('short_description', e.target.value)}
                placeholder="One-line summary shown on package cards…" />
            </div>
            <div className="input-group">
              <label className="input-label">Full Description</label>
              <textarea className="input min-h-[120px] resize-none"
                value={form.description}
                onChange={e => upd('description', e.target.value)}
                placeholder="Detailed description (HTML supported)…" />
            </div>
          </Section>

          {/* Pricing */}
          <Section id="pricing" title="Pricing & Currency"
            icon={DollarSign} open={openSecs.pricing} onToggle={toggleSec}>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Base Price *</label>
                <input className="input" type="number" min="0"
                  value={form.price}
                  onChange={e => upd('price', e.target.value)}
                  placeholder="0" />
              </div>
              <div className="input-group">
                <label className="input-label">Currency</label>
                <select className="input" value={form.currency}
                  onChange={e => upd('currency', e.target.value)}>
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Price Label</label>
                <input className="input" value={form.price_label}
                  onChange={e => upd('price_label', e.target.value)}
                  placeholder="per person" />
              </div>
              <div className="input-group">
                <label className="input-label">Discount %</label>
                <input className="input" type="number" min="0" max="100"
                  value={form.discount_percent}
                  onChange={e => upd('discount_percent', e.target.value)} />
              </div>
            </ModalGrid>
            <PricingTierEditor
              value={form.pricing_tiers}
              onChange={v => upd('pricing_tiers', v)}
              currency={form.currency}
            />
            <label className="flex items-center gap-2.5 cursor-pointer
              text-sm text-slate-700">
              <input type="checkbox" checked={form.is_price_visible}
                onChange={e => upd('is_price_visible', e.target.checked)}
                className="w-4 h-4 rounded text-primary-600" />
              Show price publicly on the package card
            </label>
          </Section>

          {/* Duration & Capacity */}
          <Section id="duration" title="Duration & Capacity"
            icon={Calendar} open={openSecs.duration} onToggle={toggleSec}>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Days</label>
                <input className="input" type="number" min="1"
                  value={form.duration_days}
                  onChange={e => upd('duration_days', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Nights</label>
                <input className="input" type="number" min="0"
                  value={form.duration_nights}
                  onChange={e => upd('duration_nights', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Min Travelers</label>
                <input className="input" type="number" min="1"
                  value={form.min_travelers}
                  onChange={e => upd('min_travelers', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Max Travelers</label>
                <input className="input" type="number" min="1"
                  value={form.max_travelers}
                  onChange={e => upd('max_travelers', e.target.value)} />
              </div>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Group Size Label</label>
                <input className="input" value={form.group_size_label}
                  onChange={e => upd('group_size_label', e.target.value)}
                  placeholder="e.g. Small group (max 12 people)" />
              </div>
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Availability Note</label>
              <input className="input" value={form.availability_note}
                onChange={e => upd('availability_note', e.target.value)}
                placeholder="e.g. Best Jan–Mar and Oct–Nov" />
            </div>
          </Section>

          {/* Media */}
          <Section id="media" title="Media"
            icon={Image} open={openSecs.media} onToggle={toggleSec}>
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
              <input className="input" value={form.video_url}
                onChange={e => upd('video_url', e.target.value)}
                placeholder="YouTube or Vimeo URL" />
            </div>
          </Section>

          {/* Package Details */}
          <Section id="pkgdetails" title="Package Details"
            icon={FileText} open={openSecs.pkgdetails} onToggle={toggleSec}>
            <JsonListEditor
              label="Features / Highlights"
              value={form.features}
              onChange={v => upd('features', v)}
              placeholder="Add a feature or highlight…"
            />
            <JsonListEditor
              label="Inclusions (What's Included)"
              value={form.inclusions}
              onChange={v => upd('inclusions', v)}
              placeholder="e.g. Accommodation, Meals, Park fees…"
            />
            <JsonListEditor
              label="Exclusions (Not Included)"
              value={form.exclusions}
              onChange={v => upd('exclusions', v)}
              placeholder="e.g. International flights, Visa fees…"
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
          <Section id="design" title="Card Design"
            icon={Palette} open={openSecs.design} onToggle={toggleSec}>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Card Theme</label>
                <select className="input" value={form.card_theme}
                  onChange={e => upd('card_theme', e.target.value)}>
                  {CARD_THEMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Accent Color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.accent_color}
                    onChange={e => upd('accent_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200
                      cursor-pointer p-1 shrink-0" />
                  <input className="input flex-1" value={form.accent_color}
                    onChange={e => upd('accent_color', e.target.value)}
                    placeholder="#047857" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Badge Label</label>
                <input className="input" value={form.badge_label}
                  onChange={e => upd('badge_label', e.target.value)}
                  placeholder="e.g. Best Seller, New, Limited" />
              </div>
              <div className="input-group">
                <label className="input-label">Badge Color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.badge_color}
                    onChange={e => upd('badge_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200
                      cursor-pointer p-1 shrink-0" />
                  <input className="input flex-1" value={form.badge_color}
                    onChange={e => upd('badge_color', e.target.value)} />
                </div>
              </div>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Card Background Image URL</label>
                <input className="input" value={form.card_bg_image}
                  onChange={e => upd('card_bg_image', e.target.value)}
                  placeholder="Optional background image behind the card content" />
              </div>
            </ModalGrid>
          </Section>

          {/* SEO & Options */}
          <Section id="seo" title="SEO & Publishing"
            icon={Globe2} open={openSecs.seo} onToggle={toggleSec}>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Meta Title</label>
                <input className="input" value={form.meta_title}
                  onChange={e => upd('meta_title', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Meta Description</label>
                <input className="input" value={form.meta_description}
                  onChange={e => upd('meta_description', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Sort Order</label>
                <input className="input" type="number" value={form.sort_order}
                  onChange={e => upd('sort_order', parseInt(e.target.value) || 0)} />
              </div>
            </ModalGrid>
            <div className="flex flex-wrap gap-6 pt-1">
              {[
                { k: 'is_published', label: 'Published',              desc: 'Visible to users' },
                { k: 'is_featured',  label: 'Featured',               desc: 'Show in featured section' },
                { k: 'is_sold_out',  label: 'Mark as Sold Out',       desc: 'Disable new bookings' },
              ].map(({ k, label, desc }) => (
                <label key={k}
                  className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={form[k]}
                    onChange={e => upd(k, e.target.checked)}
                    className="w-5 h-5 rounded-lg text-primary-600
                      border-surface-300 focus:ring-primary-500
                      cursor-pointer mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-slate-700
                      group-hover:text-slate-900 block">
                      {label}
                    </span>
                    <span className="text-xs text-slate-400">{desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </Section>

        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          REPLY MODAL
          ════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={replyModal.isOpen}
        onClose={replyModal.close}
        title="Send Message to User"
        size="md"
        icon={<Send size={18} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={replyModal.close} className="btn-secondary"
              disabled={replySending}>
              Cancel
            </button>
            <button onClick={handleSendReply} className="btn-primary"
              disabled={replySending}>
              {replySending
                ? <><RefreshCw size={14} className="animate-spin" /> Sending…</>
                : <><Send size={14} /> Send Message</>}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {replyTarget && (
            <div className="flex items-center gap-2 bg-blue-50 border
              border-blue-100 rounded-xl px-4 py-2.5 text-sm text-blue-700">
              <MessageSquare size={14} />
              Replying to message from user{' '}
              {replyTarget.user_id ? `#${replyTarget.user_id}` : '(guest)'}
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Message Type</label>
            <select className="input" value={replyType}
              onChange={e => setReplyType(e.target.value)}>
              {MSG_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Message *</label>
            <textarea
              className="input min-h-[160px] resize-none"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write your message to the user…"
            />
            <p className="text-xs text-slate-400 mt-1">
              {replyBody.length} characters
            </p>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          INFO REQUEST MODAL
          ════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={infoModal.isOpen}
        onClose={infoModal.close}
        title="Create Information Request Form"
        size="xl"
        icon={<FileText size={18} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={infoModal.close} className="btn-secondary"
              disabled={saving}>
              Cancel
            </button>
            <button onClick={handleSendInfoRequest} className="btn-primary"
              disabled={saving}>
              {saving
                ? <><RefreshCw size={14} className="animate-spin" /> Sending…</>
                : <><Send size={14} /> Send Form to User</>}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Form meta */}
          <div className="space-y-3">
            <div className="input-group">
              <label className="input-label">Form Title *</label>
              <input className="input" value={infoForm.title}
                onChange={e => infoUpd('title', e.target.value)}
                placeholder="e.g. Additional Booking Information Required" />
            </div>
            <div className="input-group">
              <label className="input-label">Description / Instructions</label>
              <textarea className="input min-h-[70px] resize-none"
                value={infoForm.description}
                onChange={e => infoUpd('description', e.target.value)}
                placeholder="Explain to the user why you need this information…" />
            </div>
          </div>

          {/* Target user */}
          <div className="bg-amber-50 border border-amber-200
            rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-amber-800
              flex items-center gap-2">
              <Users size={14} /> Send To
            </h4>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">User ID</label>
                <input className="input" value={infoForm.user_id}
                  onChange={e => infoUpd('user_id', e.target.value)}
                  placeholder="Optional — leave blank for guest" />
              </div>
              <div className="input-group">
                <label className="input-label">Email *</label>
                <input className="input" type="email"
                  value={infoForm.target_email}
                  onChange={e => infoUpd('target_email', e.target.value)}
                  placeholder="user@example.com" />
              </div>
              <div className="input-group">
                <label className="input-label">Name</label>
                <input className="input" value={infoForm.target_name}
                  onChange={e => infoUpd('target_name', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Expires In (hours)</label>
                <input className="input" type="number" min="1" max="720"
                  value={infoForm.expires_hours}
                  onChange={e => infoUpd('expires_hours', e.target.value)} />
              </div>
            </ModalGrid>
          </div>

          {/* Field builder */}
          <InfoFieldBuilder
            value={infoForm.fields}
            onChange={v => infoUpd('fields', v)}
          />

          {/* Form design */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            <h4 className="text-sm font-bold text-slate-700
              flex items-center gap-2">
              <Palette size={14} className="text-emerald-600" />
              Form Design
            </h4>
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Theme</label>
                <select className="input" value={infoForm.theme}
                  onChange={e => infoUpd('theme', e.target.value)}>
                  {INFO_REQUEST_THEMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Accent Color</label>
                <div className="flex gap-2">
                  <input type="color" value={infoForm.accent_color}
                    onChange={e => infoUpd('accent_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200
                      cursor-pointer p-1 shrink-0" />
                  <input className="input flex-1" value={infoForm.accent_color}
                    onChange={e => infoUpd('accent_color', e.target.value)} />
                </div>
              </div>
              <div className="input-group sm:col-span-2">
                <label className="input-label">Header Image URL</label>
                <input className="input" value={infoForm.header_image}
                  onChange={e => infoUpd('header_image', e.target.value)}
                  placeholder="Optional banner image shown at the top of the form" />
              </div>
            </ModalGrid>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this package?"
        description="This will permanently hide the package from all users. This action cannot be undone."
      />

    </div>
  )
}