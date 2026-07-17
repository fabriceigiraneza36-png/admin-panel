import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus, Eye, Pencil, Trash2, MapPin, RefreshCw,
  Star, Globe2, Image, ListOrdered, HelpCircle,
  ChevronRight, ChevronLeft, Check,
} from 'lucide-react'
import { destinationsAPI }  from '@api/destinations'
import { countriesAPI }     from '@api/countries'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge } from '@components/common/Badge'
import Avatar               from '@components/common/Avatar'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import ImageUpload          from '@components/common/ImageUpload'
import TagInput             from '@components/common/TagInput'
import Dropdown             from '@components/common/Dropdown'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate, formatNumber, formatRating } from '@utils/formatters'
import { DESTINATION_CATEGORIES, DIFFICULTY_LEVELS, DESTINATION_STATUSES } from '@utils/constants'
import { getErrorMessage }  from '@api/client'

const INIT_FORM = {
  name: '', slug: '', country_id: '', tagline: '', description: '',
  short_description: '', category: '', difficulty: '', destination_type: '',
  region: '', nearest_city: '', nearest_airport: '', best_time_to_visit: '',
  highlights: [], activities: [], wildlife: [], image_url: '', cover_image_url: '',
  duration_days: '', min_group_size: 1, max_group_size: '', min_age: '',
  fitness_level: '', latitude: '', longitude: '', altitude_meters: '',
  status: 'draft', is_featured: false, is_popular: false,
  is_eco_friendly: false, is_family_friendly: false, is_active: true,
  meta_title: '', meta_description: '',
}

const STEPS = [
  { id: 1, label: 'Basic Info',   icon: MapPin      },
  { id: 2, label: 'Location',     icon: Globe2      },
  { id: 3, label: 'Media & Lists',icon: Image       },
  { id: 4, label: 'Flags & SEO',  icon: ListOrdered },
]

/* â”€â”€â”€ Step indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StepIndicator({ steps, current, completed, onGoTo }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const isDone   = completed?.includes(s.id)
        const active   = s.id === current
        const isLast   = i === steps.length - 1
        const Icon    = s.icon
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => onGoTo(s.id)}
              className={`flex flex-col items-center gap-1.5 group transition-all
                flex-1 focus:outline-none`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center
                border-2 transition-all duration-300 shadow-sm
                ${isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200'
                  : active
                  ? 'bg-white border-emerald-500 text-emerald-600 shadow-emerald-100'
                  : 'bg-white border-slate-200 text-slate-400'}`}>
                {isDone
                  ? <Check size={16} strokeWidth={3} />
                  : <Icon size={16} />}
              </div>
              <span className={`text-[11px] font-semibold hidden sm:block transition-colors
                ${active ? 'text-emerald-600' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </button>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-500
                ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* â”€â”€â”€ Field wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* â”€â”€â”€ Styled input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const inputCls = `w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200
  bg-white text-slate-800 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
  transition-all duration-200`

/* â”€â”€â”€ Toggle switch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Toggle({ label, desc, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 p-3 rounded-xl
      border border-slate-100 bg-slate-50 hover:bg-emerald-50/50
      hover:border-emerald-100 cursor-pointer transition-all group">
      <div>
        <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">
          {label}
        </p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0
        ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm
          transition-all duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          className="sr-only" />
      </div>
    </label>
  )
}

function StepCard({ title, desc, icon: Icon, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-emerald-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600
          flex items-center justify-center shadow-sm shadow-emerald-200">
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// â”€â”€â”€ Reusable Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Field({ label, required, children, className = '' }) {
  return (
    <div className={`input-group ${className}`}>
      <label className="input-label">
        {label}
        {required && <span className="text-emerald-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// â”€â”€â”€ Toggle Flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FlagToggle({ checked, onChange, label, desc }) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer
      transition-all duration-200 group
      ${checked
        ? 'border-emerald-400 bg-emerald-50/80'
        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
      }`}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
        shrink-0 mt-0.5 transition-all
        ${checked
          ? 'bg-emerald-500 border-emerald-500'
          : 'border-slate-300 group-hover:border-emerald-400'
        }`}>
        {checked && <Check size={12} className="text-white stroke-[3]" />}
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div>
        <p className={`text-sm font-semibold ${checked ? 'text-emerald-800' : 'text-slate-700'}`}>
          {label}
        </p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}
export default function Destinations() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,     setItems]      = useState([])
  const [countries, setCountries]  = useState([])
  const [loading,   setLoading]    = useState(true)
  const [saving,    setSaving]     = useState(false)
  const [search,    setSearch]     = useState('')
  const [category,  setCategory]   = useState('')
  const [status,    setStatus]     = useState('')
  const [sortBy,    setSortBy]     = useState('name')
  const [sortOrder, setSortOrder]  = useState('asc')
  const [form,      setForm]       = useState(INIT_FORM)
  const [editing,   setEditing]    = useState(null)
  const [currentStep, setCurrentStep] = useState('basic')
  const [completed,   setCompleted]   = useState([])

  const dSearch = useDebounce(search, 400)

  // â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(dSearch  && { search: dSearch }),
        ...(category && { category }),
        ...(status   && { status }),
      }
      const { data } = await destinationsAPI.getAll(params)
      setItems(data.data || data.destinations || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, category, status])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    countriesAPI.getAll({ limit: 300 }).then(({ data }) => {
      setCountries(data.data || data.countries || [])
    }).catch(() => {})
  }, [])

  const countryOpts = [
    { value: '', label: 'Select countryâ€¦' },
    ...countries.map(c => ({ value: String(c.id), label: `${c.flag || ''} ${c.name}` })),
  ]

  // â”€â”€ Step navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const stepIds   = STEPS.map(s => s.id)
  const stepIndex = stepIds.indexOf(currentStep)

  const goNext = () => {
    if (!completed.includes(currentStep)) setCompleted(p => [...p, currentStep])
    const next = stepIds[stepIndex + 1]
    if (next) setCurrentStep(next)
  }

  const goPrev = () => {
    const prev = stepIds[stepIndex - 1]
    if (prev) setCurrentStep(prev)
  }

  const goTo = (id) => setCurrentStep(id)

  // â”€â”€ Form helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openCreate = () => {
    setForm(INIT_FORM)
    setEditing(null)
    setCurrentStep('basic')
    setCompleted([])
    formModal.open()
  }

  const openEdit = (d) => {
    const f = { ...INIT_FORM }
    Object.keys(f).forEach(k => { if (d[k] !== undefined && d[k] !== null) f[k] = d[k] })
    f.country_id = String(d.country_id || '')
    setForm(f)
    setEditing(d)
    setCurrentStep('basic')
    setCompleted(['basic', 'location', 'details', 'media'])
    formModal.open()
  }

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSave = async () => {
    if (!form.name.trim())  return toast.error('Name is required')
    if (!form.country_id)   return toast.error('Country is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        country_id:      Number(form.country_id),
        duration_days:   form.duration_days   ? Number(form.duration_days)   : null,
        max_group_size:  form.max_group_size  ? Number(form.max_group_size)  : null,
        min_age:         form.min_age         ? Number(form.min_age)         : null,
        altitude_meters: form.altitude_meters ? Number(form.altitude_meters) : null,
        latitude:        form.latitude        ? Number(form.latitude)        : null,
        longitude:       form.longitude       ? Number(form.longitude)       : null,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      }
      if (editing) {
        await destinationsAPI.update(editing.id, payload)
        toast.success('Destination updated')
      } else {
        await destinationsAPI.create(payload)
        toast.success('Destination created')
      }
      formModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleDelete = async () => {
    try {
      await destinationsAPI.remove(deleteModal.data.id)
      toast.success('Destination deleted')
      deleteModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  // â”€â”€ Table columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const columns = [
    {
      key: 'name', label: 'Destination', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.image_url || row.thumbnail_url} name={row.name} size="sm" rounded="lg" />
          <div>
            <p className="font-semibold text-slate-800 max-w-[180px] truncate">{row.name}</p>
            <p className="text-xs text-slate-400">{row.region || row.category || 'â€”'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'country_name', label: 'Country', sortable: false,
      render: (_, row) => {
        const c = countries.find(x => x.id === row.country_id)
        return <span className="text-sm text-slate-600">{c?.flag} {c?.name || `#${row.country_id}`}</span>
      },
    },
    {
      key: 'category', label: 'Category',
      render: v => v
        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold
            bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">{v}</span>
        : 'â€”',
    },
    {
      key: 'rating', label: 'Rating', sortable: true, align: 'center',
      render: v => (
        <span className="flex items-center gap-1 justify-center">
          <Star size={12} className="text-amber-500 fill-amber-500" />
          <span className="font-bold text-sm">{formatRating(v)}</span>
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: v => <Badge status={v} label={v} />,
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: v => v
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-slate-300">â€”</span>,
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

  // â”€â”€ Step content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const renderStep = () => {
    switch (currentStep) {

      case 'basic': return (
        <StepCard title="Basic Information" desc="Core details about this destination" icon={MapPin}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Destination Name" required className="sm:col-span-2">
              <input
                className="input"
                value={form.name}
                onChange={e => upd('name', e.target.value)}
                placeholder="e.g., Volcanoes National Park"
              />
            </Field>
            <Field label="Slug">
              <input
                className="input"
                value={form.slug}
                onChange={e => upd('slug', e.target.value)}
                placeholder="auto-generated"
              />
            </Field>
            <Field label="Tagline">
              <input
                className="input"
                value={form.tagline}
                onChange={e => upd('tagline', e.target.value)}
                placeholder="A short inspiring phrase"
              />
            </Field>
            <Field label="Country" required>
              <Dropdown
                value={form.country_id}
                onChange={v => upd('country_id', v)}
                options={countryOpts}
                searchable
              />
            </Field>
            <Field label="Category">
              <Dropdown
                value={form.category}
                onChange={v => upd('category', v)}
                options={[
                  { value: '', label: 'Selectâ€¦' },
                  ...DESTINATION_CATEGORIES.map(c => ({
                    value: c, label: c.charAt(0).toUpperCase() + c.slice(1),
                  })),
                ]}
              />
            </Field>
            <Field label="Difficulty">
              <Dropdown
                value={form.difficulty}
                onChange={v => upd('difficulty', v)}
                options={[{ value: '', label: 'Selectâ€¦' }, ...DIFFICULTY_LEVELS]}
              />
            </Field>
            <Field label="Status">
              <Dropdown
                value={form.status}
                onChange={v => upd('status', v)}
                options={DESTINATION_STATUSES}
              />
            </Field>
            <Field label="Short Description" className="sm:col-span-2">
              <textarea
                className="input min-h-[80px] resize-none"
                value={form.short_description}
                onChange={e => upd('short_description', e.target.value)}
                placeholder="Brief overview shown on cardsâ€¦"
              />
            </Field>
            <Field label="Full Description" className="sm:col-span-2">
              <textarea
                className="input min-h-[110px] resize-none"
                value={form.description}
                onChange={e => upd('description', e.target.value)}
                placeholder="Detailed description of this destinationâ€¦"
              />
            </Field>
          </div>
        </StepCard>
      )

      case 'location': return (
        <StepCard title="Location & Logistics" desc="Geographic details and practical info" icon={Navigation}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Region">
              <input className="input" value={form.region}
                onChange={e => upd('region', e.target.value)}
                placeholder="e.g., North Province" />
            </Field>
            <Field label="Nearest City">
              <input className="input" value={form.nearest_city}
                onChange={e => upd('nearest_city', e.target.value)}
                placeholder="e.g., Musanze" />
            </Field>
            <Field label="Nearest Airport">
              <input className="input" value={form.nearest_airport}
                onChange={e => upd('nearest_airport', e.target.value)}
                placeholder="e.g., Kigali International" />
            </Field>
            <Field label="Best Time to Visit">
              <input className="input" value={form.best_time_to_visit}
                onChange={e => upd('best_time_to_visit', e.target.value)}
                placeholder="e.g., Junâ€“Sep, Decâ€“Feb" />
            </Field>
            <Field label="Latitude">
              <input className="input" type="number" step="any"
                value={form.latitude}
                onChange={e => upd('latitude', e.target.value)}
                placeholder="-1.4938" />
            </Field>
            <Field label="Longitude">
              <input className="input" type="number" step="any"
                value={form.longitude}
                onChange={e => upd('longitude', e.target.value)}
                placeholder="29.5348" />
            </Field>
            <Field label="Altitude (meters)">
              <input className="input" type="number"
                value={form.altitude_meters}
                onChange={e => upd('altitude_meters', e.target.value)} />
            </Field>
            <Field label="Duration (days)">
              <input className="input" type="number" min="1"
                value={form.duration_days}
                onChange={e => upd('duration_days', e.target.value)} />
            </Field>
            <Field label="Min Group Size">
              <input className="input" type="number" min="1"
                value={form.min_group_size}
                onChange={e => upd('min_group_size', e.target.value)} />
            </Field>
            <Field label="Max Group Size">
              <input className="input" type="number" min="1"
                value={form.max_group_size}
                onChange={e => upd('max_group_size', e.target.value)} />
            </Field>
            <Field label="Minimum Age">
              <input className="input" type="number"
                value={form.min_age}
                onChange={e => upd('min_age', e.target.value)} />
            </Field>
            <Field label="Fitness Level">
              <input className="input" value={form.fitness_level}
                onChange={e => upd('fitness_level', e.target.value)}
                placeholder="e.g., Moderate" />
            </Field>
          </div>
        </StepCard>
      )

      case 'details': return (
        <StepCard title="Highlights & Activities" desc="What makes this destination special" icon={ListOrdered}>
          <div className="space-y-5">
            <TagInput
              label="Highlights"
              value={form.highlights}
              onChange={v => upd('highlights', v)}
              placeholder="Add a highlight and press Enterâ€¦"
            />
            <TagInput
              label="Activities"
              value={form.activities}
              onChange={v => upd('activities', v)}
              placeholder="Add an activity and press Enterâ€¦"
            />
            <TagInput
              label="Wildlife"
              value={form.wildlife}
              onChange={v => upd('wildlife', v)}
              placeholder="Add wildlife and press Enterâ€¦"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Field label="Meta Title">
                <input className="input" value={form.meta_title}
                  onChange={e => upd('meta_title', e.target.value)} />
              </Field>
              <Field label="Meta Description">
                <input className="input" value={form.meta_description}
                  onChange={e => upd('meta_description', e.target.value)} />
              </Field>
            </div>
          </div>
        </StepCard>
      )

      case 'media': return (
        <StepCard title="Photos & Media" desc="Upload images for this destination" icon={Image}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Main Image
              </p>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl
                bg-emerald-50/30 p-2">
                <ImageUpload
                  label=""
                  value={form.image_url}
                  onChange={v => upd('image_url', v)}
                  folder="destinations"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cover / Banner Image
              </p>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl
                bg-emerald-50/30 p-2">
                <ImageUpload
                  label=""
                  value={form.cover_image_url}
                  onChange={v => upd('cover_image_url', v)}
                  folder="destinations"
                />
              </div>
            </div>
          </div>
        </StepCard>
      )

      case 'flags': return (
        <StepCard title="Visibility & Status" desc="Control how this destination appears" icon={Settings}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FlagToggle
              checked={form.is_featured}
              onChange={v => upd('is_featured', v)}
              label="Featured"
              desc="Show in featured sections & homepage"
            />
            <FlagToggle
              checked={form.is_popular}
              onChange={v => upd('is_popular', v)}
              label="Popular"
              desc="Mark as a popular destination"
            />
            <FlagToggle
              checked={form.is_eco_friendly}
              onChange={v => upd('is_eco_friendly', v)}
              label="Eco-Friendly"
              desc="Sustainable & eco-conscious destination"
            />
            <FlagToggle
              checked={form.is_family_friendly}
              onChange={v => upd('is_family_friendly', v)}
              label="Family Friendly"
              desc="Suitable for families with children"
            />
            <FlagToggle
              checked={form.is_active}
              onChange={v => upd('is_active', v)}
              label="Active & Visible"
              desc="Show this destination to users"
            />
          </div>

          {/* Summary preview */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
            border border-emerald-200">
            <p className="text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wider">
              âœ“ Review Summary
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Name',     form.name       || 'â€”'],
                ['Country',  countryOpts.find(c => c.value === form.country_id)?.label || 'â€”'],
                ['Category', form.category   || 'â€”'],
                ['Status',   form.status     || 'â€”'],
                ['Region',   form.region     || 'â€”'],
                ['Duration', form.duration_days ? `${form.duration_days} days` : 'â€”'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <span className="text-slate-400 shrink-0">{k}:</span>
                  <span className="font-semibold text-slate-700 truncate capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </StepCard>
      )

      default: return null
    }
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-5 page-enter">

      {/* â”€â”€ Page Header â”€â”€ */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MapPin size={28} className="text-emerald-600" /> Destinations
          </h1>
          <p className="page-subtitle">Manage destinations ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Destination
          </button>
        </div>
      </div>

      {/* â”€â”€ Filters â”€â”€ */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch}
            placeholder="Search destinationsâ€¦" className="max-w-sm" />
          <FilterSelect label="Category" value={category}
            onChange={v => { setCategory(v); pag.reset() }}
            options={[
              { value: '', label: 'All Categories' },
              ...DESTINATION_CATEGORIES.map(c => ({
                value: c, label: c.charAt(0).toUpperCase() + c.slice(1),
              })),
            ]} />
          <FilterSelect label="Status" value={status}
            onChange={v => { setStatus(v); pag.reset() }}
            options={[{ value: '', label: 'All Status' }, ...DESTINATION_STATUSES]} />
        </FilterBar>
      </div>

      {/* â”€â”€ Table â”€â”€ */}
      <div className="card">
        <Table
          columns={columns.filter(c => c.key !== 'actions')}
          data={items} loading={loading}
          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
          onRowClick={r => viewModal.open(r)}
          hoverActions={[
            { icon: Eye,    label: "View",   onClick: (r) => viewModal.open(r), alwaysVisible: true },
            { icon: Pencil, label: "Edit",   onClick: (r) => openEdit(r),      alwaysVisible: true },
            { icon: Trash2, label: "Delete", onClick: (r) => deleteModal.open(r), variant: "danger", alwaysVisible: true },
          ]}
        />
        <Pagination
          page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          VIEW MODAL
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={viewModal.data?.name}
        size="lg"
        icon={<MapPin size={20} />}
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
            <ModalSection title="Overview">
              <ModalGrid>
                <ModalField label="Country"
                  value={countries.find(c => c.id === viewModal.data.country_id)?.name} />
                <ModalField label="Category"   value={viewModal.data.category} />
                <ModalField label="Difficulty" value={viewModal.data.difficulty} />
                <ModalField label="Duration"
                  value={viewModal.data.duration_days ? `${viewModal.data.duration_days} days` : 'â€”'} />
                <ModalField label="Rating"
                  value={
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                      {formatRating(viewModal.data.rating)}
                      ({viewModal.data.review_count} reviews)
                    </span>
                  }
                />
                <ModalField label="Status"
                  value={<Badge status={viewModal.data.status} label={viewModal.data.status} />} />
              </ModalGrid>
              <ModalField label="Description" value={viewModal.data.description} />
            </ModalSection>

            {viewModal.data.highlights?.length > 0 && (
              <ModalSection title="Highlights">
                <div className="flex flex-wrap gap-2">
                  {viewModal.data.highlights.map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1
                      rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700
                      border border-emerald-200">
                      {h}
                    </span>
                  ))}
                </div>
              </ModalSection>
            )}

            <ModalSection title="Stats">
              <ModalGrid cols={4}>
                <ModalField label="Views"     value={formatNumber(viewModal.data.view_count)} />
                <ModalField label="Bookings"  value={formatNumber(viewModal.data.booking_count)} />
                <ModalField label="Wishlists" value={formatNumber(viewModal.data.wishlist_count)} />
                <ModalField label="Created"   value={formatDate(viewModal.data.created_at)} />
              </ModalGrid>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          CREATE / EDIT MULTI-STEP MODAL
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? 'Edit Destination' : 'Add New Destination'}
        size="xl"
        icon={<MapPin size={20} />}
        footer={
          <div className="flex items-center justify-between gap-3">
            {/* Step counter */}
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
                      Savingâ€¦
                    </>
                  ) : editing ? (
                    <><Check size={15} /> Update Destination</>
                  ) : (
                    <><Check size={15} /> Create Destination</>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-1">
          <StepIndicator
            steps={STEPS}
            current={currentStep}
            onGoTo={goTo}
            completed={completed}
          />
          <div className="min-h-[340px]">
            {renderStep()}
          </div>
        </div>
      </Modal>

      {/* â”€â”€ Delete Confirm â”€â”€ */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title={`Delete ${deleteModal.data?.name}?`}
        description="This will permanently remove the destination and all associated data."
      />
    </div>
  )
}
