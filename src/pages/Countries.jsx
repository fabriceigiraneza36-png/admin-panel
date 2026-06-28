// admin/src/pages/Countries.jsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  Globe2, Plus, Eye, Pencil, Trash2, RefreshCw, Star,
  MapPin, DollarSign, Languages, Image, Settings,
  ChevronRight, ChevronLeft, Check, Mountain, Info,
} from 'lucide-react'
import { countriesAPI }    from '@api/countries'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination          from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge } from '@components/common/Badge'
import Avatar              from '@components/common/Avatar'
import ConfirmDialog       from '@components/common/ConfirmDialog'
import ImageUpload         from '@components/common/ImageUpload'
import TagInput            from '@components/common/TagInput'
import Dropdown            from '@components/common/Dropdown'
import { useModal }        from '@hooks/useModal'
import { useToast }        from '@hooks/useToast'
import { usePagination }   from '@hooks/usePagination'
import { useDebounce }     from '@hooks/useDebounce'
import { formatDate, formatNumber } from '@utils/formatters'
import { CONTINENTS }      from '@utils/constants'
import { getErrorMessage } from '@api/client'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  name: '', slug: '', official_name: '', capital: '', flag: '', flag_url: '',
  continent: '', region: '', sub_region: '', description: '', tagline: '',
  population: '', area: '', climate: '', best_time_to_visit: '', visa_info: '',
  health_info: '', currency: '', currency_symbol: '', timezone: '',
  calling_code: '', languages: [], official_languages: [], highlights: [],
  experiences: [], travel_tips: [], image_url: '', cover_image_url: '',
  latitude: '', longitude: '', is_featured: false, is_active: true,
}

const STEPS = [
  { id: 'identity',  label: 'Identity',  icon: Globe2,     desc: 'Name, flag & official info' },
  { id: 'geography', label: 'Geography', icon: MapPin,      desc: 'Location & coordinates'     },
  { id: 'practical', label: 'Practical', icon: DollarSign,  desc: 'Currency, language & travel' },
  { id: 'content',   label: 'Content',   icon: Info,        desc: 'Lists & descriptions'       },
  { id: 'media',     label: 'Media',     icon: Image,       desc: 'Photos & publish flags'     },
]

const CONTINENT_COLORS = {
  'Africa':        'bg-amber-50 text-amber-700 border-amber-300',
  'Europe':        'bg-blue-50 text-blue-700 border-blue-300',
  'Asia':          'bg-red-50 text-red-700 border-red-300',
  'North America': 'bg-green-50 text-green-700 border-green-300',
  'South America': 'bg-teal-50 text-teal-700 border-teal-300',
  'Oceania':       'bg-purple-50 text-purple-700 border-purple-300',
  'Antarctica':    'bg-slate-100 text-slate-600 border-slate-300',
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current, completed, onGoTo }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, idx) => {
        const isActive = step.id === current
        const isDone   = completed.includes(step.id)
        const isLast   = idx === steps.length - 1
        const Icon     = step.icon

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onGoTo(step.id)}
              className="flex flex-col items-center gap-1 flex-1 group"
            >
              <div className={`relative w-9 h-9 rounded-xl border-2 flex items-center
                justify-center transition-all duration-300
                ${isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                  : isActive
                    ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400 group-hover:border-emerald-300'
                }`}>
                {isDone ? <Check size={14} className="stroke-[2.5]" /> : <Icon size={13} />}
                {isActive && (
                  <span className="absolute -inset-1 rounded-2xl border-2
                    border-emerald-400/30 animate-pulse" />
                )}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wide whitespace-nowrap
                ${isActive ? 'text-emerald-700' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </button>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-0.5 rounded-full transition-all duration-500 max-w-8
                ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Field Helper ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, className = '', children }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-emerald-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── Flag Toggle ──────────────────────────────────────────────────────────────

function FlagToggle({ checked, onChange, label, desc }) {
  return (
    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer
      transition-all duration-200
      ${checked
        ? 'border-emerald-400 bg-emerald-50/70'
        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
      }`}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
        shrink-0 mt-0.5 transition-all
        ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
        {checked && <Check size={11} className="text-white stroke-[3]" />}
      </div>
      <input type="checkbox" className="sr-only"
        checked={checked} onChange={e => onChange(e.target.checked)} />
      <div>
        <p className={`text-sm font-semibold ${checked ? 'text-emerald-800' : 'text-slate-700'}`}>
          {label}
        </p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Countries() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [countries, setCountries]  = useState([])
  const [loading,   setLoading]    = useState(true)
  const [saving,    setSaving]     = useState(false)
  const [search,    setSearch]     = useState('')
  const [continent, setContinent]  = useState('')
  const [featured,  setFeatured]   = useState('')
  const [sortBy,    setSortBy]     = useState('name')
  const [sortOrder, setSortOrder]  = useState('asc')
  const [form,      setForm]       = useState(INITIAL_FORM)
  const [editing,   setEditing]    = useState(null)
  const [step,      setStep]       = useState('identity')
  const [completed, setCompleted]  = useState([])

  const debouncedSearch = useDebounce(search, 400)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(continent       && { continent }),
        ...(featured        && { featured: featured === 'true' }),
      }
      const { data } = await countriesAPI.getAll(params)
      setCountries(data.data || data.countries || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, debouncedSearch, continent, featured])

  useEffect(() => { load() }, [load])

  // ── Form helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(INITIAL_FORM)
    setEditing(null)
    setStep('identity')
    setCompleted([])
    formModal.open()
  }

  const openEdit = (c) => {
    setForm({
      name:               c.name               || '',
      slug:               c.slug               || '',
      official_name:      c.official_name      || '',
      capital:            c.capital            || '',
      flag:               c.flag               || '',
      flag_url:           c.flag_url           || '',
      continent:          c.continent          || '',
      region:             c.region             || '',
      sub_region:         c.sub_region         || '',
      description:        c.description        || '',
      tagline:            c.tagline            || '',
      population:         c.population         || '',
      area:               c.area               || '',
      climate:            c.climate            || '',
      best_time_to_visit: c.best_time_to_visit || '',
      visa_info:          c.visa_info          || '',
      health_info:        c.health_info        || '',
      currency:           c.currency           || '',
      currency_symbol:    c.currency_symbol    || '',
      timezone:           c.timezone           || '',
      calling_code:       c.calling_code       || '',
      languages:          c.languages          || [],
      official_languages: c.official_languages || [],
      highlights:         c.highlights         || [],
      experiences:        c.experiences        || [],
      travel_tips:        c.travel_tips        || [],
      image_url:          c.image_url          || '',
      cover_image_url:    c.cover_image_url    || '',
      latitude:           c.latitude           || '',
      longitude:          c.longitude          || '',
      is_featured:        !!c.is_featured,
      is_active:          c.is_active !== false,
    })
    setEditing(c)
    setStep('identity')
    setCompleted(['identity', 'geography', 'practical', 'content'])
    formModal.open()
  }

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Step navigation ───────────────────────────────────────────────────────

  const stepIds   = STEPS.map(s => s.id)
  const stepIndex = stepIds.indexOf(step)

  const goNext = () => {
    if (step === 'identity' && !form.name.trim())
      return toast.error('Country name is required')
    if (step === 'identity' && !form.continent)
      return toast.error('Continent is required')
    if (!completed.includes(step)) setCompleted(p => [...p, step])
    const next = stepIds[stepIndex + 1]
    if (next) setStep(next)
  }

  const goPrev = () => {
    const prev = stepIds[stepIndex - 1]
    if (prev) setStep(prev)
  }

  const goTo = (id) => setStep(id)

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim())  return toast.error('Country name is required')
    if (!form.continent)    return toast.error('Continent is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        population: form.population ? Number(form.population) : null,
        area:       form.area       ? Number(form.area)       : null,
        latitude:   form.latitude   ? Number(form.latitude)   : null,
        longitude:  form.longitude  ? Number(form.longitude)  : null,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      }
      if (editing) {
        await countriesAPI.update(editing.id, payload)
        toast.success('Country updated')
      } else {
        await countriesAPI.create(payload)
        toast.success('Country created')
      }
      formModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await countriesAPI.remove(deleteModal.data.id)
      toast.success('Country deleted')
      deleteModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'name', label: 'Country', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.flag
            ? <span className="text-2xl leading-none">{row.flag}</span>
            : <Avatar name={row.name} size="sm" rounded="lg" />
          }
          <div>
            <p className="font-semibold text-slate-800">{row.name}</p>
            <p className="text-xs text-slate-400">{row.capital || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'continent', label: 'Continent', sortable: true,
      render: v => v ? (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs
          font-semibold border ${CONTINENT_COLORS[v] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {v}
        </span>
      ) : '—',
    },
    {
      key: 'population', label: 'Population', sortable: true, align: 'right',
      render: v => <span className="text-sm text-slate-600">{formatNumber(v)}</span>,
    },
    {
      key: 'destination_count', label: 'Destinations', align: 'center',
      render: v => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl
          bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-200">
          {v || 0}
        </span>
      ),
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: v => v
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'is_active', label: 'Status',
      render: v => <Badge status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'actions', label: '', align: 'right', width: '100px',
      render: (_, row) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"   onClick={() => viewModal.open(row)} />
          <TableAction icon={Pencil} label="Edit"   onClick={() => openEdit(row)} />
          <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(row)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      case 'identity': return (
        <motion.div key="identity" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Country Name" required>
              <input className="input" value={form.name}
                onChange={e => upd('name', e.target.value)}
                placeholder="e.g., Rwanda" />
            </Field>
            <Field label="Slug" hint="Auto-generated from name if blank">
              <input className="input font-mono text-sm" value={form.slug}
                onChange={e => upd('slug', e.target.value)}
                placeholder="rwanda" />
            </Field>
            <Field label="Official Name">
              <input className="input" value={form.official_name}
                onChange={e => upd('official_name', e.target.value)}
                placeholder="Republic of Rwanda" />
            </Field>
            <Field label="Capital City">
              <input className="input" value={form.capital}
                onChange={e => upd('capital', e.target.value)}
                placeholder="Kigali" />
            </Field>
            <Field label="Flag Emoji" hint="Paste the country flag emoji">
              <div className="flex gap-2">
                <input className="input flex-1 text-2xl" value={form.flag}
                  onChange={e => upd('flag', e.target.value)}
                  placeholder="🇷🇼" />
                {form.flag && (
                  <div className="w-12 h-10 rounded-lg bg-slate-100 border border-slate-200
                    flex items-center justify-center text-2xl shrink-0">
                    {form.flag}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Tagline">
              <input className="input" value={form.tagline}
                onChange={e => upd('tagline', e.target.value)}
                placeholder="Land of a thousand hills" />
            </Field>
          </div>

          {/* Continent selector */}
          <Field label="Continent" required>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONTINENTS.map(c => (
                <button key={c} type="button"
                  onClick={() => upd('continent', c)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border-2
                    transition-all text-center capitalize
                    ${form.continent === c
                      ? `${CONTINENT_COLORS[c] || 'border-emerald-400 bg-emerald-50 text-emerald-700'} border-2`
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                    }`}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </motion.div>
      )

      case 'geography': return (
        <motion.div key="geography" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Region">
              <input className="input" value={form.region}
                onChange={e => upd('region', e.target.value)}
                placeholder="e.g., East Africa" />
            </Field>
            <Field label="Sub-Region">
              <input className="input" value={form.sub_region}
                onChange={e => upd('sub_region', e.target.value)}
                placeholder="e.g., Great Lakes" />
            </Field>
            <Field label="Population">
              <input className="input" type="number" value={form.population}
                onChange={e => upd('population', e.target.value)}
                placeholder="13,000,000" />
            </Field>
            <Field label="Area (km²)">
              <input className="input" type="number" value={form.area}
                onChange={e => upd('area', e.target.value)}
                placeholder="26,338" />
            </Field>
          </div>

          {/* Coordinates */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
            <p className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1.5">
              <MapPin size={13} /> GPS Coordinates
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude">
                <input className="input" type="number" step="any" value={form.latitude}
                  onChange={e => upd('latitude', e.target.value)}
                  placeholder="-1.9403" />
              </Field>
              <Field label="Longitude">
                <input className="input" type="number" step="any" value={form.longitude}
                  onChange={e => upd('longitude', e.target.value)}
                  placeholder="29.8739" />
              </Field>
            </div>
          </div>
        </motion.div>
      )

      case 'practical': return (
        <motion.div key="practical" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Currency">
              <input className="input" value={form.currency}
                onChange={e => upd('currency', e.target.value)}
                placeholder="Rwandan Franc" />
            </Field>
            <Field label="Currency Symbol">
              <input className="input" value={form.currency_symbol}
                onChange={e => upd('currency_symbol', e.target.value)}
                placeholder="RWF" />
            </Field>
            <Field label="Timezone">
              <input className="input" value={form.timezone}
                onChange={e => upd('timezone', e.target.value)}
                placeholder="Africa/Kigali (UTC+2)" />
            </Field>
            <Field label="Calling Code">
              <input className="input" value={form.calling_code}
                onChange={e => upd('calling_code', e.target.value)}
                placeholder="+250" />
            </Field>
            <Field label="Best Time to Visit">
              <input className="input" value={form.best_time_to_visit}
                onChange={e => upd('best_time_to_visit', e.target.value)}
                placeholder="Jun–Sep, Dec–Feb" />
            </Field>
            <Field label="Climate">
              <input className="input" value={form.climate}
                onChange={e => upd('climate', e.target.value)}
                placeholder="Tropical highland" />
            </Field>
          </div>

          <Field label="Visa Information">
            <textarea className="input min-h-[80px] resize-none text-sm"
              value={form.visa_info}
              onChange={e => upd('visa_info', e.target.value)}
              placeholder="Visa requirements and entry details…" />
          </Field>

          <Field label="Health & Safety Info">
            <textarea className="input min-h-[80px] resize-none text-sm"
              value={form.health_info}
              onChange={e => upd('health_info', e.target.value)}
              placeholder="Vaccinations, health advisories…" />
          </Field>
        </motion.div>
      )

      case 'content': return (
        <motion.div key="content" className="space-y-5"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          <Field label="Description">
            <textarea className="input min-h-[90px] resize-none text-sm"
              value={form.description}
              onChange={e => upd('description', e.target.value)}
              placeholder="Describe this country for travelers…" />
          </Field>

          <TagInput label="Languages"          value={form.languages}
            onChange={v => upd('languages', v)} />
          <TagInput label="Highlights"         value={form.highlights}
            onChange={v => upd('highlights', v)} />
          <TagInput label="Experiences"        value={form.experiences}
            onChange={v => upd('experiences', v)} />
          <TagInput label="Travel Tips"        value={form.travel_tips}
            onChange={v => upd('travel_tips', v)} />
        </motion.div>
      )

      case 'media': return (
        <motion.div key="media" className="space-y-5"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Country Image
              </p>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl
                bg-emerald-50/20 p-2">
                <ImageUpload label="" value={form.image_url}
                  onChange={v => upd('image_url', v)} folder="countries" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Cover / Banner Image
              </p>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl
                bg-emerald-50/20 p-2">
                <ImageUpload label="" value={form.cover_image_url}
                  onChange={v => upd('cover_image_url', v)} folder="countries" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Visibility Flags
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FlagToggle checked={form.is_featured} onChange={v => upd('is_featured', v)}
                label="Featured" desc="Show in featured destinations" />
              <FlagToggle checked={form.is_active} onChange={v => upd('is_active', v)}
                label="Active" desc="Visible on the public site" />
            </div>
          </div>

          {/* Final summary */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
            border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-3">
              ✓ Summary
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Name',      form.name       || '—'],
                ['Capital',   form.capital    || '—'],
                ['Continent', form.continent  || '—'],
                ['Region',    form.region     || '—'],
                ['Currency',  form.currency   || '—'],
                ['Status',    form.is_active ? '🟢 Active' : '⚪ Inactive'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <span className="text-slate-400 shrink-0">{k}:</span>
                  <span className="font-semibold text-slate-700 truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
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
            <Globe2 size={28} className="text-emerald-600" /> Countries
          </h1>
          <p className="page-subtitle">Manage all countries ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Country
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch}
            placeholder="Search countries…" className="max-w-sm" />
          <FilterSelect label="Continent" value={continent}
            onChange={v => { setContinent(v); pag.reset() }}
            options={[
              { value: '', label: 'All Continents' },
              ...CONTINENTS.map(c => ({ value: c, label: c })),
            ]} />
          <FilterSelect label="Featured" value={featured}
            onChange={v => { setFeatured(v); pag.reset() }}
            options={[
              { value: '',      label: 'All'         },
              { value: 'true',  label: 'Featured'    },
              { value: 'false', label: 'Not Featured' },
            ]} />
        </FilterBar>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <Table columns={columns} data={countries} loading={loading}
          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
          onRowClick={row => viewModal.open(row)} emptyMessage="No countries found" />
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
        title={viewModal.data?.name}
        subtitle={viewModal.data?.official_name}
        size="lg"
        icon={
          viewModal.data?.flag
            ? <span className="text-2xl">{viewModal.data.flag}</span>
            : <Globe2 size={20} />
        }
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
            {(viewModal.data.image_url || viewModal.data.cover_image_url) && (
              <img
                src={viewModal.data.cover_image_url || viewModal.data.image_url}
                alt={viewModal.data.name}
                className="w-full h-48 object-cover rounded-2xl"
              />
            )}
            <ModalSection title="General Information">
              <ModalGrid>
                <ModalField label="Capital"      value={viewModal.data.capital} />
                <ModalField label="Continent"    value={viewModal.data.continent} />
                <ModalField label="Region"       value={viewModal.data.region} />
                <ModalField label="Population"   value={formatNumber(viewModal.data.population)} />
                <ModalField label="Area"
                  value={viewModal.data.area ? `${formatNumber(viewModal.data.area)} km²` : '—'} />
                <ModalField label="Currency"
                  value={`${viewModal.data.currency || ''} ${viewModal.data.currency_symbol || ''}`} />
                <ModalField label="Timezone"      value={viewModal.data.timezone} />
                <ModalField label="Calling Code"  value={viewModal.data.calling_code} />
              </ModalGrid>
            </ModalSection>
            <ModalSection title="Travel Info">
              <ModalGrid>
                <ModalField label="Best Time" value={viewModal.data.best_time_to_visit} />
                <ModalField label="Climate"   value={viewModal.data.climate} />
              </ModalGrid>
              <ModalField label="Languages"
                value={viewModal.data.languages?.join(', ')} />
              <ModalField label="Description" value={viewModal.data.description} />
            </ModalSection>
            {viewModal.data.highlights?.length > 0 && (
              <ModalSection title="Highlights">
                <div className="flex flex-wrap gap-2">
                  {viewModal.data.highlights.map((h, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg
                      text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {h}
                    </span>
                  ))}
                </div>
              </ModalSection>
            )}
            <ModalSection title="Status">
              <ModalGrid>
                <ModalField label="Featured"
                  value={<BooleanBadge value={viewModal.data.is_featured} />} />
                <ModalField label="Active"
                  value={
                    <BooleanBadge value={viewModal.data.is_active}
                      trueLabel="Active" falseLabel="Inactive" />
                  }
                />
                <ModalField label="Destinations" value={viewModal.data.destination_count} />
                <ModalField label="Views"         value={formatNumber(viewModal.data.view_count)} />
              </ModalGrid>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          MULTI-STEP FORM MODAL
          ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? `Edit: ${editing.name}` : 'Add New Country'}
        size="xl"
        icon={<Globe2 size={20} />}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button onClick={goPrev} className="btn-secondary btn-sm" disabled={saving}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              {stepIndex < STEPS.length - 1 ? (
                <button onClick={goNext} className="btn-primary btn-sm">
                  Continue <ChevronRight size={15} />
                </button>
              ) : (
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white
                        rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : editing ? (
                    <><Check size={15} /> Update Country</>
                  ) : (
                    <><Check size={15} /> Create Country</>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div>
          <StepIndicator
            steps={STEPS}
            current={step}
            completed={completed}
            onGoTo={goTo}
          />
          <div className="min-h-[340px]">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title={`Delete ${deleteModal.data?.name}?`}
        description="This will permanently remove the country and all associated data."
      />
    </div>
  )
}