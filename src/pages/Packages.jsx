// admin/src/pages/Packages.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Package, Plus, Eye, Pencil, Trash2, RefreshCw,
  Globe2, EyeOff, Star, DollarSign, Calendar, MapPin,
  Users, MessageSquare, BookOpen, CheckCircle,
  XCircle, X, Clock, AlertCircle, Send, FileText,
  Palette, ChevronDown, ChevronUp, Image, Search,
  TrendingUp, BarChart3, ShoppingBag, Filter, Database, Tag, ClipboardList, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react'

// ── API — both named exports come from the same file ─────────────────────────
import { packagesAPI, getErrorMessage } from '@api/packages'
import apiClient from '@api/client'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

// ── Admin common components ───────────────────────────────────────────────────
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination                           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField, DetailValue } from '@components/common/Modal'
import Badge                                from '@components/common/Badge'
import Avatar                               from '@components/common/Avatar'
import ConfirmDialog                        from '@components/common/ConfirmDialog'
import ImageUpload                          from '@components/common/ImageUpload'
import TagInput                             from '@components/common/TagInput'
import ReviewQuestionsEditor                 from '@components/common/ReviewQuestionsEditor'

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useModal }      from '@hooks/useModal'
import { useToast }      from '@hooks/useToast'
import { usePagination } from '@hooks/usePagination'
import { useDebounce }   from '@hooks/useDebounce'

// ── Utils ─────────────────────────────────────────────────────────────────────
import { formatNumber, formatTimeAgo, formatDate } from '@utils/formatters'

const normalizePackageValue = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || /^(?:null|undefined|n\/a|none)$/i.test(trimmed)) return null;
  // API JSONB columns can arrive either as parsed values or JSON-encoded strings.
  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    try { return JSON.parse(trimmed); } catch { /* keep ordinary text unchanged */ }
  }
  return trimmed;
};

const hasPackageValue = (rawValue) => {
  const value = normalizePackageValue(rawValue);
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasPackageValue);
  if (typeof value === 'object') return Object.values(value).some(hasPackageValue);
  // Explicit false and zero are values, not empty fields.
  return true;
};

const PACKAGE_VIEW_HIDDEN_FIELDS = new Set([
  'id', 'slug', 'destination_id', 'created_at', 'updated_at',
  'poster_mode', 'cover_image_url', 'poster_image_url', 'thumbnail_url',
  'card_bg_image', 'card_theme', 'accent_color', 'sort_order',
  'meta_title', 'meta_description', 'booking_count', 'view_count',
  'booking_count', 'view_count', 'inquiry_count', 'author_id', 'author_name', 'published_at',
  'badge_label', 'badge_color', 'is_price_visible',
  'title', 'destination_name', 'destination', 'country_name', 'country',
  'description', 'short_description', 'price', 'currency',
  'duration_days', 'duration_nights', 'category',
  'min_travelers', 'max_travelers', 'is_published', 'is_featured', 'is_sold_out',
  'images', 'gallery', 'image_gallery', 'highlights', 'features',
  'inclusions', 'exclusions', 'itinerary', 'faqs', 'tags',
  'available_months', 'departure_dates', 'availability_note',
]);

const isVisiblePackageDetail = ([key, value]) =>
  !PACKAGE_VIEW_HIDDEN_FIELDS.has(String(key).toLowerCase()) && hasPackageValue(value);

const formatPackageDetailValue = (rawValue, depth = 0) => {
  const value = normalizePackageValue(rawValue);
  if (Array.isArray(value)) {
    return value.filter(hasPackageValue)
      .map((item) => formatPackageDetailValue(item, depth + 1))
      .filter(Boolean).join(' · ');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).filter(([, item]) => hasPackageValue(item))
      .map(([key, item]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
        return label + ': ' + formatPackageDetailValue(item, depth + 1);
      }).join(' · ');
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value === null || value === undefined ? '' : String(value);
};

const getPackageCollection = (value) => {
  const normalized = normalizePackageValue(value);
  if (Array.isArray(normalized)) return normalized.filter(hasPackageValue);
  return hasPackageValue(normalized) ? [normalized] : [];
};

const getPackageItemLabel = (item) => {
  const value = normalizePackageValue(item);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return formatPackageDetailValue(value);
  }
  const day = value.day_number ?? value.day ?? null;
  const heading = value.title || value.name || value.label || value.question || value.subject || '';
  const detail = value.description || value.answer || value.details || value.text || value.content || '';
  const dayLabel = day !== null && day !== undefined && day !== '' ? 'Day ' + day : '';
  if (heading || detail || dayLabel) return [dayLabel, heading, detail].filter(Boolean).join(' · ');
  return formatPackageDetailValue(value);
};

const isPackageImageUrl = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return false;
  if (/^data:image\//i.test(value)) return true;
  try {
    const parsed = new URL(value, 'https://altuverasafaris.com');
    const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
    const imageExtension = /\.(?:avif|gif|jpe?g|png|webp|svg)$/i.test(pathname);
    const imageHost = /(^|\.)((res\.)?cloudinary\.com|images\.unsplash\.com|images\.pexels\.com|images\.ctfassets\.net|lh3\.googleusercontent\.com|storage\.googleapis\.com)$/i.test(parsed.hostname);
    return imageExtension || imageHost || pathname.includes('/image/upload/');
  } catch {
    return false;
  }
};

const getPackageImageUrl = (item) => {
  const candidate = typeof item === 'string'
    ? item.trim()
    : item && typeof item === 'object'
      ? String(item.url || item.image_url || item.imageUrl || item.src || '').trim()
      : '';
  return isPackageImageUrl(candidate) ? candidate : '';
};

function PackageDetailSection ({ title, icon: Icon, items }) {
  if (!items?.length) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-white text-emerald-700 shadow-sm">
          <Icon size={17} strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
          <p className="text-[11px] text-slate-400">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={index} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle size={13} />
            </span>
            <span className="min-w-0 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
              {getPackageItemLabel(item)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
   // Primary fields for image-based package creation
   title: '', 
   poster_mode: 'poster',
   cover_image_url: '', 
   destination_id: '',
   destination_name: '',
   country_name: '', 
   thumbnail_url: '',
   
   // Secondary fields (optional for basic image-based packages)
   slug: '', short_description: '', description: '', content: '',
   category: '', destination: '', country: '',
   price: '', price_label: 'per person', currency: 'USD',
   pricing_tiers: [], discount_percent: 0, is_price_visible: true,
   duration_days: '', duration_nights: '',
   max_travelers: '', min_travelers: 1, group_size_label: '',
   images: [], video_url: '',
   gallery: [], features: [], inclusions: [], exclusions: [],
   highlights: [], itinerary: [], faqs: [], tags: [],
   review_questions: [
     { id: 'package-itinerary-match', prompt: 'Did the itinerary match the experience described before you booked?', type: 'yes_no', help_text: 'Consider the activities, timing and overall experience.', options: [] },
     { id: 'package-inclusions-delivered', prompt: 'Were the services and inclusions delivered as described?', type: 'yes_no', help_text: 'You may consider accommodation, transport, meals and activities.', options: [] },
     { id: 'package-organization-rating', prompt: 'How would you rate the overall organisation of this trip?', type: 'rating', help_text: '1 means poor; 5 means excellent.', options: [] },
     { id: 'package-improvement', prompt: 'What could make this package even better for future travellers?', type: 'long_text', help_text: 'Share any suggestions you feel comfortable providing.', options: [] },
   ],
   available_months: [], departure_dates: [], availability_note: '',
   is_published: true, is_featured: false, is_sold_out: false,
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
            {['select', 'radio', 'checkbox'].includes(field.type) && (
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

function BookingRow({ booking, onUpdate, onConfirm, onCancel, onInfoRequest, onOpenBookings }) {
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
        <button type="button" title={expanded ? 'Hide booking details' : 'View booking details'} aria-label={expanded ? 'Hide booking details' : 'View booking details'}
          onClick={(event) => { event.stopPropagation(); setExpanded(value => !value) }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <StatusIcon status={booking.status} size={16} />
        </button>
        <Avatar src={booking.user_avatar_url || booking.user_avatar || booking.avatar_url} name={booking.full_name || booking.user_name || booking.user_full_name} size="sm" rounded="full" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {booking.full_name || booking.user_name || booking.user_full_name || '—'}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {booking.email || '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-600">
            {fmtPrice(booking.total_price, booking.currency)}
          </p>
          <p className="text-xs text-slate-400">{booking.booking_number || '—'}</p>
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
              { label: 'Return Date', value: booking.return_date   || '—' },
              { label: 'Travelers',   value: booking.number_of_travelers || booking.number_of_adults || '—' },
              { label: 'Phone',       value: booking.phone   || '—' },
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
            <button type="button" onClick={() => onOpenBookings?.(booking)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
              <ExternalLink size={13} /> Open in Bookings
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
    media: false, pkgdetails: false, feedback: false, design: false, seo: false,
  })

  // ── Detail tab state ───────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState('details')
  const [previewGalleryIndex, setPreviewGalleryIndex] = useState(0)
  const [failedPreviewImages, setFailedPreviewImages] = useState([])
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
  const [destinations, setDestinations] = useState([])

  const dSearch = useDebounce(search, 400)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const pageTitle = viewModal.isOpen && viewModal.data?.title
      ? `${viewModal.data.title} | Package Preview | Altuvera Admin`
      : 'Packages | Altuvera Admin';
    document.title = pageTitle;
  }, [viewModal.isOpen, viewModal.data?.title])
  const deepLinkHandled = useRef(false)
  const [focusedBookingId, setFocusedBookingId] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/destinations', { params: { limit: 500 } })
        const body = res.data || {}
        setDestinations(body.data || body.destinations || body.rows || [])
      } catch { setDestinations([]) }
    })()
  }, [])

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
      // The API responds with { success, data: { packages, bookings, messages } }.
      // Axios adds its own response.data layer around that JSON body.
      const payload = res?.data?.data || res?.data || res
      setStats(payload?.data || payload)
    } catch (error) {
      console.warn('[Packages] Live statistics could not be refreshed:', getErrorMessage(error))
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    loadStats()
    const interval = window.setInterval(loadStats, 30000)
    const onFocus = () => loadStats()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadStats])

  // ── Load sub-data ──────────────────────────────────────────────────────────

  const loadSubData = useCallback(async (pkg, tab) => {
    if (!pkg?.id) return
    setSubLoading(true)
    try {
      if (tab === 'messages') {
        // Use the same registered-user resource-support conversations as the
        // Messages portal. Package-only legacy endpoints are not part of the
        // live messaging system and caused the old "Resource not found" error.
        const bookingResponse = await packagesAPI.getBookings(pkg.id)
        const bookingBody = bookingResponse?.data ?? bookingResponse
        let bookingRows = bookingBody
        for (let depth = 0; depth < 4 && bookingRows && !Array.isArray(bookingRows); depth += 1) {
          bookingRows = bookingRows.data ?? bookingRows.bookings ?? bookingRows.rows ?? bookingRows.results ?? bookingRows.result ?? bookingRows.items
        }
        const bookings = Array.isArray(bookingRows) ? bookingRows : []
        const userIds = [...new Set(bookings.map(row => row.user_id).filter(Boolean).map(String))]
        if (!userIds.length) {
          setPkgMessages([])
        } else {
          const listResponse = await apiClient.get('/messages/conversations', {
            params: { active: 'all', limit: 500, adminView: true },
          })
          const listBody = listResponse?.data ?? listResponse
          const conversations = Array.isArray(listBody?.data) ? listBody.data : []
          const relevant = conversations.filter(conversation =>
            userIds.includes(String(conversation.user_id || conversation.userId || conversation.u_id || '')) &&
            !conversation.group_id &&
            (!conversation.conversation_type || ['resource_support', 'booking_support'].includes(String(conversation.conversation_type).toLowerCase()))
          )
          const details = await Promise.all(relevant.map(async conversation => {
            const conversationId = conversation.id || conversation.conversation_id
            if (!conversationId) return null
            const response = await apiClient.get('/messages/conversations/' + encodeURIComponent(conversationId), { params: { limit: 100 } })
            const payload = response?.data ?? response
            return payload?.data ? { ...payload.data, id: conversationId } : null
          }))
          const rows = details.filter(Boolean).flatMap(conversation =>
            (conversation.messages || []).map(message => ({
              ...message,
              conversation_id: conversation.id,
              user_id: conversation.user_id,
              sender_type: message.sender_type || message.senderType,
              sender_name: message.sender_name || message.senderName,
              body: message.body || message.content || '',
              message_type: message.message_type || message.msg_type || 'message',
            }))
          )
          setPkgMessages(rows.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)))
        }
      } else if (tab === 'bookings') {
        const res = await packagesAPI.getBookings(pkg.id)
        const body = res?.data ?? res
        // API responses may be wrapped more than once by the backend/client.
        // Unwrap known envelopes without treating a single booking object as a list.
        let rows = body
        for (let depth = 0; depth < 4 && rows && !Array.isArray(rows); depth += 1) {
          rows = rows.data ?? rows.bookings ?? rows.rows ?? rows.results ?? rows.result ?? rows.items
        }
        setPkgBookings(Array.isArray(rows) ? rows : [])
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
    setPreviewGalleryIndex(0)
    setFailedPreviewImages([])
    setPkgMessages([])
    setPkgBookings([])
    setPkgInfoReqs([])
  }, [viewModal])

  const switchTab = useCallback((tab) => {
    setActiveTab(tab)
    loadSubData(viewModal.data, tab)
  }, [viewModal.data, loadSubData])

  // Deep-link support for instant package-request notifications.
  // Example: /packages?packageId=12&requestId=87
  // If the package is not on the current paginated/filter view, fetch it
  // directly so an admin email/notification always opens the correct package.
  useEffect(() => {
    if (loading || deepLinkHandled.current) return
    const packageId = searchParams.get('packageId')
    const requestId = searchParams.get('requestId') || searchParams.get('bookingId')
    if (!packageId) return

    let cancelled = false

    const openRequestedPackage = async () => {
      try {
        let pkg = items.find(item => String(item.id) === String(packageId))

        if (!pkg) {
          const res = await packagesAPI.getById(packageId)
          const payload = res?.data ?? res
          pkg = payload?.data?.package ?? payload?.data ?? payload?.package ?? payload
        }

        if (!pkg?.id || cancelled) return

        deepLinkHandled.current = true
        openView(pkg)

        if (requestId) {
          setFocusedBookingId(String(requestId))
          setActiveTab('bookings')
          await loadSubData(pkg, 'bookings')
        }

        setSearchParams({}, { replace: true })
      } catch (e) {
        if (!cancelled) toast.error(getErrorMessage(e))
      }
    }

    openRequestedPackage()
    return () => { cancelled = true }
  }, [items, loading, searchParams, setSearchParams, openView, loadSubData, toast])



  // ── Form ───────────────────────────────────────────────────────────────────

  const toggleSec = useCallback((k) =>
    setOpenSecs(p => ({ ...p, [k]: !p[k] })), [])

  const upd = useCallback((k, v) =>
    setForm(p => ({ ...p, [k]: v })), [])

   const openCreate = useCallback(() => {
     // Initialize with focus on image-based creation
     setForm({
       ...INIT_PACKAGE,
       title: '',
       cover_image_url: '',
       thumbnail_url: '',
     })
     setEditing(null)
     // Open media section by default to emphasize image upload
     setOpenSecs({ 
       media: true, 
       basic: false, 
       pricing: false, 
       duration: false,
       pkgdetails: false, 
       feedback: true,
       design: false, 
       seo: false 
     })
     formModal.open()
   }, [formModal, destinations])

   const openEdit = useCallback((p) => {
     const f = { ...INIT_PACKAGE }
     Object.keys(f).forEach(k => {
       if (p[k] !== undefined && p[k] !== null) f[k] = p[k]
     })
     const jsonKeys = [
       'pricing_tiers', 'images', 'gallery', 'features', 'inclusions',
       'exclusions', 'highlights', 'itinerary', 'faqs',
       'available_months', 'departure_dates', 'review_questions',
     ]
     jsonKeys.forEach(k => { f[k] = parseJson(f[k]) })
     setForm(f)
     setEditing(p)
     // Emphasize media section when editing to maintain focus on images
     setOpenSecs({ 
       media: true, 
       basic: !!p.title || !!p.short_description, 
       pricing: !!p.price || !!p.pricing_tiers.length, 
       duration: !!p.duration_days || !!p.duration_nights,
       pkgdetails: !!p.features.length || !!p.inclusions.length || !!p.exclusions.length,
       feedback: true,
       design: !!p.card_theme || !!p.accent_color || !!p.badge_label,
       seo: !!p.meta_title || !!p.meta_description || !!p.is_published || !!p.is_featured 
     })
     formModal.open()
   }, [formModal])

  // ── Save ───────────────────────────────────────────────────────────────────

   const handleSave = async () => {
     const imageUrlOf = (item) => {
       if (typeof item === 'string') return item.trim()
       if (!item || typeof item !== 'object') return ''
       return String(item.url || item.imageUrl || item.image_url || item.imageURL || item.src || '').trim()
     }
     const coverImage = imageUrlOf(form.cover_image_url || form.thumbnail_url || form.poster_image_url)
     if (!coverImage) {
       toast.error('Please add a valid package poster image URL before saving.')
       return
     }
     if (!form.destination_id) {
       toast.error('Please select the destination this package belongs to')
       return
     }
     const imageGallery = [...new Set([
       ...(Array.isArray(form.images) ? form.images : []),
       ...(Array.isArray(form.gallery) ? form.gallery : []),
       ...(Array.isArray(form.image_gallery) ? form.image_gallery : []),
       coverImage,
     ].map(imageUrlOf).filter(Boolean))]
     const mode = form.poster_mode === 'manual' ? 'manual' : 'poster'
     if (mode === 'manual' && imageGallery.length < 2) {
       toast.error(`Manual packages need at least 2 valid, unique images. You currently have ${imageGallery.length}; add ${2 - imageGallery.length} more in the Gallery section.`)
       return
     }

     setSaving(true)
     try {
       const payload = {
         title: form.title, description: form.description, short_description: form.short_description,
         poster_mode: mode, cover_image_url: coverImage,
         poster_image_url: mode === 'poster' ? coverImage : '',
         image_gallery: mode === 'poster' ? [coverImage] : imageGallery,
         destination_id: form.destination_id ? Number(form.destination_id) : null,
         price: form.price === '' ? null : Number(form.price), currency: form.currency || 'USD',
         duration_days: form.duration_days === '' ? null : Number(form.duration_days),
         duration_nights: form.duration_nights === '' ? null : Number(form.duration_nights),
         category: form.category, highlights: form.highlights || form.features || [],
         inclusions: form.inclusions || [], exclusions: form.exclusions || [],
         review_questions: (form.review_questions || []).filter(question => String(question.prompt || '').trim()).map(question => ({ ...question, id: String(question.id || '').trim() || `package-question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, prompt: String(question.prompt).trim(), type: question.type || 'long_text', options: Array.isArray(question.options) ? question.options : [] })),
         is_published: form.is_published, is_featured: form.is_featured,
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
    const conversationId = msg?.conversation_id || pkgMessages.find(item => item.conversation_id)?.conversation_id
    if (!conversationId) {
      toast.error('This traveller does not have an active Messages portal conversation yet.')
      return
    }
    setReplyBody('')
    setReplyType('reply')
    setReplyTarget({ conversation_id: conversationId, parent_id: msg?.id || null })
    replyModal.open(viewModal.data)
  }, [replyModal, viewModal.data, pkgMessages, toast])

  const handleSendReply = async () => {
    if (!replyBody.trim()) { toast.error('Message is required'); return }
    if (!replyTarget?.conversation_id) { toast.error('No Messages portal conversation is assigned to this traveller.'); return }
    setReplySending(true)
    try {
      await apiClient.post('/messages/conversations/' + encodeURIComponent(replyTarget.conversation_id) + '/messages', {
        body: replyBody.trim(),
        replyToId: replyTarget.parent_id || null,
      })
      toast.success('Reply delivered to the traveller Messages portal')
      replyModal.close()
      setReplyBody('')
      await loadSubData(viewModal.data, 'messages')
      loadStats()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setReplySending(false)
    }
  }

  // ── Booking actions ────────────────────────────────────────────────────────

  const openBookingInBookings = (booking) => {
    if (!booking?.id || !viewModal.data?.id) return
    const params = new URLSearchParams({
      bookingId: String(booking.id),
      bookingType: 'package',
      packageId: String(viewModal.data.id),
    })
    if (booking.source_table) params.set('bookingSource', booking.source_table)
    window.location.assign('/bookings?' + params.toString())
  }

  const handleBookingUpdate = async (booking, changes) => {
    try {
      await packagesAPI.updateBooking(viewModal.data.id, booking.id, {
        ...changes,
        source_table: booking.source_table || 'bookings',
      })
      toast.success('Booking updated')
      loadSubData(viewModal.data, 'bookings')
      loadStats()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleBookingConfirm = async (booking) => {
    await handleBookingUpdate(booking, { status: 'confirmed' })
  }

  const handleBookingCancel = async (booking) => {
    await handleBookingUpdate(booking, { status: 'cancelled' })
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
      toast.success('Info request sent to traveler')
      infoModal.close()
      setActiveTab('info')
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
      key: 'cover_image_url', label: 'Package poster',
      render: (_, r) => (
        <div className="w-24 sm:w-32 h-14 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
          {r.cover_image_url
            ? <img src={r.cover_image_url} alt="Package poster" className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20} /></div>}
        </div>
      ),
    },
    {
      key: 'is_published', label: 'Status',
      render: (v) => <Badge status={v ? 'published' : 'draft'} label={v ? 'Published' : 'Draft'} />,
    },
    {
      key: 'booking_count', label: 'Requests', align: 'right', sortable: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1.5 text-slate-700 text-sm font-semibold">
          <BookOpen size={13} className="text-emerald-500" />
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
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => loadSubData(viewModal.data, 'messages')} className="btn-secondary btn-sm">
            <RefreshCw size={13}/> Refresh
          </button>
          <button onClick={() => openReply()} className="btn-primary btn-sm">
            <Send size={13} /> Send Reply
          </button>
        </div>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
          <BookOpen size={16} className="text-blue-500" />
          Bookings ({pkgBookings.length})
        </h4>
        <button type="button" onClick={() => loadSubData(viewModal.data, 'bookings')} className="btn-secondary btn-sm">
          <RefreshCw size={13}/> Refresh bookings
        </button>
      </div>
      {subLoading
        ? <SubLoader />
        : !pkgBookings.length
        ? <EmptyTab message="No bookings yet for this package." />
        : (
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {pkgBookings.map(bk => (
              <div
                key={String(bk.source_table || 'bookings') + ':' + bk.id}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  if (event.target.closest('button, a, input, select, textarea')) return
                  openBookingInBookings(bk)
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openBookingInBookings(bk)
                  }
                }}
                className={'rounded-2xl p-1 cursor-pointer transition-colors hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ' + (
                  String(bk.id) === String(focusedBookingId)
                    ? 'ring-2 ring-emerald-400 ring-offset-2 bg-emerald-50/40'
                    : ''
                )}
              >
              <BookingRow
                booking={bk}
                onUpdate={handleBookingUpdate}
                onConfirm={handleBookingConfirm}
                onCancel={handleBookingCancel}
                onInfoRequest={(b) => openInfoRequest({
                  booking_id:  b.id,
                  user_id:     b.user_id,
                  guest_email: b.email,
                  guest_name:  b.full_name,
                })}
                onOpenBookings={openBookingInBookings}
              />
              <div className="flex justify-end px-1 pt-2">
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); openBookingInBookings(bk) }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <Eye size={13} /> Open in Bookings
                </button>
              </div>
              </div>
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
    <div className="admin-page premium-page space-y-5 page-enter">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <Package size={28} className="text-primary-600" />
            Packages
          </h1>
          <p className="page-subtitle flex items-center gap-1.5">
            <Database size={13} className="text-emerald-600" aria-hidden="true" />
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
      <div className="management-filter-panel card p-4">
        <div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-sm font-extrabold text-slate-800">Package catalogue</p><p className="text-xs text-slate-400">Control visibility, category and travel-product content</p></div><span className="badge badge-green">{pag.total.toLocaleString()} packages</span></div><FilterBar>
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
      <div className="management-table-shell card">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">Travel product inventory</p><p className="text-xs text-slate-400 hidden sm:block">Open a package to inspect messages, bookings and information requests</p></div><span className="text-xs font-semibold text-slate-400">{loading ? "Loading…" : `${items.length} shown`}</span></div>
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
        title="Package preview"
        size="2xl"
        icon={<Package size={19} strokeWidth={2.1} />}

      >
        {viewModal.data && (() => {
          const pkg = viewModal.data;
          const rawDestination = pkg.destination_name || pkg.destination;
          const destinationName = typeof rawDestination === 'string'
            ? rawDestination.trim()
            : String(rawDestination?.name || rawDestination?.title || rawDestination?.slug || '').trim();
          const rawCountry = pkg.country_name || pkg.country;
          const countryNameForPreview = typeof rawCountry === 'string'
            ? rawCountry.trim()
            : String(rawCountry?.name || rawCountry?.title || rawCountry?.slug || '').trim();
          const shortDescription = String(pkg.short_description || '').trim();
          const fullDescription = String(pkg.description || '').trim();
          const coverImage = [
            pkg.cover_image_url, pkg.poster_image_url, pkg.thumbnail_url, pkg.image_url,
          ].map(getPackageImageUrl).find(Boolean) || '';
          const durationParts = [
            hasPackageValue(pkg.duration_days) ? String(pkg.duration_days) + ' days' : '',
            hasPackageValue(pkg.duration_nights) ? String(pkg.duration_nights) + ' nights' : '',
          ].filter(Boolean);
          const travelerParts = [
            hasPackageValue(pkg.min_travelers) ? 'Min ' + pkg.min_travelers : '',
            hasPackageValue(pkg.max_travelers) ? 'Max ' + pkg.max_travelers : '',
          ].filter(Boolean);
          const stats = [
            { label: 'Starting price', icon: DollarSign, value: hasPackageValue(pkg.price) ? fmtPrice(pkg.price, pkg.currency || 'USD') : null },
            { label: 'Duration', icon: Calendar, value: durationParts.length ? durationParts.join(' / ') : null },
            { label: 'Category', icon: Tag, value: hasPackageValue(pkg.category) ? formatPackageDetailValue(pkg.category) : null },
            { label: 'Travellers', icon: Users, value: travelerParts.length ? travelerParts.join(' · ') : null },
            { label: 'Country', icon: Globe2, value: hasPackageValue(pkg.country_name || pkg.country) ? formatPackageDetailValue(pkg.country_name || pkg.country) : null },
            { label: 'Publication', icon: CheckCircle, value: typeof pkg.is_published === 'boolean' ? (pkg.is_published ? 'Published' : 'Draft / unpublished') : null },
            { label: 'Sales status', icon: AlertCircle, value: pkg.is_sold_out === true ? 'Sold out' : null },
          ].filter((item) => hasPackageValue(item.value));

          const contentSections = [
            { title: 'Experience highlights', icon: Star, value: pkg.highlights },
            { title: 'Features', icon: CheckCircle, value: pkg.features },
            { title: "What's included", icon: CheckCircle, value: pkg.inclusions },
            { title: "What's not included", icon: XCircle, value: pkg.exclusions },
            { title: 'Trip itinerary', icon: Calendar, value: pkg.itinerary },
            { title: 'Frequently asked questions', icon: MessageSquare, value: pkg.faqs },
            { title: 'Tags', icon: Tag, value: pkg.tags },
            { title: 'Available months', icon: Calendar, value: pkg.available_months },
            { title: 'Departure dates', icon: Clock, value: pkg.departure_dates },
            { title: 'Availability note', icon: AlertCircle, value: pkg.availability_note },
          ].map((section) => ({ ...section, items: getPackageCollection(section.value) }))
            .filter((section) => section.items.length > 0);

          const heroImages = [...new Set([
            coverImage,
            ...getPackageCollection(pkg.images),
            ...getPackageCollection(pkg.gallery),
            ...getPackageCollection(pkg.image_gallery),
          ].map(getPackageImageUrl).filter((url) => url && !failedPreviewImages.includes(url)))];
          const safeHeroIndex = Math.min(previewGalleryIndex, Math.max(0, heroImages.length - 1));
          const activeHeroImage = heroImages[safeHeroIndex] || '';
          const galleryUrls = heroImages.filter((url) => url !== coverImage);

          const additionalDetails = Object.entries(pkg).filter(isVisiblePackageDetail);
          const statusLabels = [
            typeof pkg.is_published === 'boolean' ? (pkg.is_published ? 'Published' : 'Unpublished') : '',
            pkg.is_featured === true ? 'Featured' : '',
            pkg.is_sold_out === true ? 'Sold out' : '',
          ].filter(Boolean);

          return (
            <div className="space-y-5 pb-1">
              <section className="relative isolate min-h-[220px] overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-slate-900 shadow-lg sm:min-h-[270px]">
                {coverImage && (
                  <img
                    src={coverImage}
                    alt={pkg.title || 'Package cover'}
                    className="absolute inset-0 -z-20 h-full w-full object-cover"
                    loading="eager"
                  />
                )}
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-emerald-950/60 to-slate-950/20" />
                <div className="relative flex min-h-[220px] flex-col justify-end gap-3 p-5 sm:min-h-[270px] sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white backdrop-blur-sm">
                      <Package size={12} /> Safari package
                    </span>
                    {statusLabels.map((label) => (
                      <span key={label} className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] font-semibold text-white/95 backdrop-blur-sm">
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="max-w-3xl">
                    <h2 className="break-words text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                      {pkg.title || 'Package overview'}
                    </h2>
                    {destinationName && (
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100">
                        <MapPin size={15} /> {destinationName}
                      </p>
                    )}
                    {shortDescription && (
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
                        {shortDescription}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex gap-1 overflow-x-auto border-b border-slate-200 -mx-1 px-1" role="tablist" aria-label="Package workspace">
                {[
                  { id: 'details', label: 'Overview', icon: Eye },
                  { id: 'messages', label: 'Messages', icon: MessageSquare },
                  { id: 'bookings', label: 'Bookings', icon: Calendar },
                  { id: 'info', label: 'Info forms', icon: ClipboardList },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchTab(tab.id)}
                    className={'-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ' + (
                      activeTab === tab.id
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                    )}
                  >
                    <tab.icon size={16} strokeWidth={2.1} />
                    {tab.label}
                    {tab.id === 'bookings' && hasPackageValue(pkg.booking_count) && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{pkg.booking_count}</span>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'details' && (
                <div className="space-y-5">
                  <section className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => handleTogglePublish(pkg)}
                      className={pkg.is_published
                        ? 'inline-flex min-h-9 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100'
                        : 'inline-flex min-h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100'}>
                      {pkg.is_published ? <EyeOff size={14}/> : <Globe2 size={14}/>}
                      {pkg.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => { viewModal.close(); openEdit(pkg) }}
                      className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                      <Pencil size={14}/> Edit package
                    </button>
                    <button type="button" onClick={() => { viewModal.close(); deleteModal.open(pkg) }}
                      className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                      <Trash2 size={14}/> Delete
                    </button>
                  </section>
                  {stats.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.map(({ label, icon: Icon, value }, index) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: .2, delay: Math.min(index * .04, .2) }}
                          className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Icon size={18} strokeWidth={2.1} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">{label}</p>
                            <p className="mt-1 break-words text-sm font-bold text-slate-800">{String(value)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {fullDescription && fullDescription !== shortDescription && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText size={17} className="text-emerald-700" />
                        <h3 className="text-sm font-extrabold text-slate-800">About this experience</h3>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{fullDescription}</p>
                    </section>
                  )}

                  {contentSections.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {contentSections.map((section) => (
                        <PackageDetailSection
                          key={section.title}
                          title={section.title}
                          icon={section.icon}
                          items={section.items}
                        />
                      ))}
                    </div>
                  )}

                  {galleryUrls.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-100 bg-white text-emerald-700 shadow-sm"><Image size={17}/></span>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800">Package gallery</h3>
                          <p className="text-[11px] text-slate-400">{galleryUrls.length} {galleryUrls.length === 1 ? 'image' : 'images'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                        {galleryUrls.map((url, index) => (
                          <button type="button" key={url} onClick={() => setPreviewGalleryIndex(heroImages.indexOf(url))}
                            className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-left shadow-sm transition hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                            <img src={url} alt={(pkg.title || 'Package') + ' gallery image ' + (index + 1)} loading="lazy"
                              onError={() => setFailedPreviewImages((current) => current.includes(url) ? current : [...current, url])}
                              className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-36" />
                            <span className="absolute bottom-2 right-2 rounded-lg bg-slate-950/65 px-2 py-1 text-[10px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">View photo</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {pkg.is_featured === true && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs font-semibold text-amber-800">
                      <Star size={15} /> Featured package
                    </div>
                  )}

                  {additionalDetails.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-100 bg-white text-emerald-700 shadow-sm"><FileText size={17}/></span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-800">Additional package details</h3>
                          <p className="text-[11px] text-slate-400">{additionalDetails.length} saved {additionalDetails.length === 1 ? 'detail' : 'details'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                        {additionalDetails.map(([key, value], index) => {
                          const Icon = /image|photo|gallery|poster|cover/i.test(key) ? Image
                            : /price|cost|currency|discount/i.test(key) ? DollarSign
                              : /date|duration|month|time/i.test(key) ? Calendar
                                : /destination|country|location|region|address/i.test(key) ? MapPin
                                  : /traveler|group|people|booking/i.test(key) ? Users
                                    : /description|content|itinerary|inclusion|exclusion|faq|highlight|feature|tag/i.test(key) ? BookOpen
                                      : /published|active|sold_out|featured/i.test(key) ? CheckCircle : FileText;
                          return (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, y: 7 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: .18, delay: Math.min(index * .02, .2) }}
                              className="min-w-0 rounded-xl border border-slate-100 bg-white p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon size={15}/></span>
                                <span className="break-words text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-500">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                                </span>
                              </div>
                              <div className="min-w-0 break-words text-xs leading-5 text-slate-700">
                                <DetailValue label={key} value={normalizePackageValue(value)} />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'messages' && <TabMessages />}
              {activeTab === 'bookings' && <TabBookings />}
              {activeTab === 'info' && <TabInfoRequests />}
            </div>
          );
        })()}
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

           {/* Media - PRIMARY FOCUS FOR IMAGE-BASED PACKAGE CREATION */}
           <Section id="basic" title="Package creation method" icon={Package} open={openSecs.basic} onToggle={toggleSec}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => upd('poster_mode', 'poster')} className={`rounded-2xl border-2 p-4 text-left transition-all ${form.poster_mode !== 'manual' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <strong className="block text-sm text-slate-800">Designed poster image</strong><span className="mt-1 block text-xs text-slate-500">One finished poster image; it fills the public package card.</span>
              </button>
              <button type="button" onClick={() => upd('poster_mode', 'manual')} className={`rounded-2xl border-2 p-4 text-left transition-all ${form.poster_mode === 'manual' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <strong className="block text-sm text-slate-800">Manual package details</strong><span className="mt-1 block text-xs text-slate-500">At least two gallery images plus separate details.</span>
              </button>
            </div>
            <div className="input-group mt-4"><label className="input-label">Package title</label><input className="input" value={form.title} onChange={e => upd('title', e.target.value)} placeholder="8-Day Volcanoes & Gorilla Trekking" /></div>
            <div className="input-group mt-3"><label className="input-label">Short description</label><textarea className="input min-h-[75px] resize-y" value={form.short_description} onChange={e => upd('short_description', e.target.value)} placeholder="Short summary for the package card" /></div>
            <div className="input-group mt-3"><label className="input-label">Full description</label><textarea className="input min-h-[120px] resize-y" value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Full trip description and experience" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="input-group"><label className="input-label">Starting price (USD)</label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">$</span><input className="input pl-7" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={e => upd('price', e.target.value)} placeholder="0.00" aria-label="Package starting price in US dollars" /></div><p className="mt-1 text-xs text-slate-500">Enter the amount only; the system displays the $ currency symbol automatically.</p></div>
              <div className="input-group"><label className="input-label">Category</label><input className="input" value={form.category} onChange={e => upd('category', e.target.value)} placeholder="Wildlife, hiking, culture…" /></div>
              <div className="input-group"><label className="input-label">Duration (days)</label><input className="input" type="number" min="1" value={form.duration_days} onChange={e => upd('duration_days', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Duration (nights)</label><input className="input" type="number" min="0" value={form.duration_nights} onChange={e => upd('duration_nights', e.target.value)} /></div>
            </div>
            {form.poster_mode === 'manual' && <div className="input-group mt-4"><label className="input-label">Gallery image URLs (at least 2)</label><textarea className="input min-h-[100px] resize-y" value={(form.images || []).map(item => typeof item === 'string' ? item : item?.url || item?.image_url || '').join('\n')} onChange={e => upd('images', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} placeholder={'Paste one image URL per line\nhttps://…/adventure-1.jpg\nhttps://…/adventure-2.jpg'} /><p className="text-xs text-slate-500 mt-1">The first image is the cover; all images appear in the slideshow.</p></div>}
          </Section>

          <Section id="media" title="Package Image"
             icon={Image} open={openSecs.media} onToggle={toggleSec}>
             <div className="text-center mb-4">
               <p className="text-sm text-slate-500">
                 Upload the package poster only. Travellers will see this poster and can submit a request with their own special requirements.
               </p>
             </div>
             <ImageUpload
               label="Package Poster Image"
               value={form.cover_image_url}
               onChange={v => upd('cover_image_url', v)}
               folder="packages"
             />
             <div className="input-group mt-5">
               <label className="input-label">
                 Destination <span className="text-red-500">*</span>
               </label>
               <select
                 className="input"
                 value={form.destination_id || ''}
                 onChange={e => upd('destination_id', e.target.value)}
                 required
               >
                 <option value="">Select the destination this package belongs to</option>
                 {destinations.map(d => (
                   <option key={d.id} value={d.id}>
                      {typeof d.name === 'string' ? d.name : String(d.name?.name || d.name?.title || d.slug || d.id)}
                   </option>
                 ))}
               </select>
               {!destinations.length && (
                 <p className="text-xs text-amber-600 mt-2">
                   No destinations are available. Create a destination first, then return here.
                 </p>
               )}
               <p className="text-xs text-slate-400 mt-2">
                 This links the package to the destination page and makes the package requestable.
               </p>
             </div>
           </Section>

           <Section id="feedback" title="Traveller Feedback Questions" icon={MessageSquare} open={openSecs.feedback} onToggle={toggleSec}>
             <ReviewQuestionsEditor
               value={form.review_questions || []}
               onChange={value => upd('review_questions', value)}
             />
           </Section>

           {/* Basic Info */}
           {false && (
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
           )}

          {false && (<>
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
          </>)}

        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          REPLY MODAL
          ════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={replyModal.isOpen}
        onClose={replyModal.close}
        title="Reply to End User"
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
              Replying to end-user message{' '}
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
              placeholder="Write your message to the traveler…"
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
                : <><Send size={14} /> Send Form to Traveler</>}
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
                placeholder="Explain to the traveler why you need this information…" />
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
                  placeholder="Optional if email matches an account" />
              </div>
              <div className="input-group">
                <label className="input-label">Email *</label>
                <input className="input" type="email"
                  value={infoForm.target_email}
                  onChange={e => infoUpd('target_email', e.target.value)}
                  placeholder="Traveller account email" />
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