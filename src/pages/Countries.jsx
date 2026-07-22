// admin/src/pages/Countries.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Globe2, Plus, Eye, Pencil, Trash2, RefreshCw, Star,
  MapPin, DollarSign, Image, Info, Check,
  ChevronRight, ChevronLeft, AlertTriangle, Zap,
  Languages, Lightbulb, Heart, BookOpen, Camera, Shield,
  Clock, Phone, Users, Ruler, Thermometer, Plane,
} from 'lucide-react'
import { countriesAPI } from '@api/countries'
import Table from '@components/common/Table'
import Pagination from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge } from '@components/common/Badge'
import Avatar from '@components/common/Avatar'
import ImageUpload from '@components/common/ImageUpload'
import TagInput from '@components/common/TagInput'
import { useModal } from '@hooks/useModal'
import { useToast } from '@hooks/useToast'
import { usePagination } from '@hooks/usePagination'
import { useDebounce } from '@hooks/useDebounce'
import { formatDate, formatNumber } from '@utils/formatters'
import { CONTINENTS } from '@utils/constants'
import { getErrorMessage } from '@api/client'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Constants ────────────────────────────────────────────────────────────── */

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
  { id: 'identity', label: 'Identity', icon: Globe2, desc: 'Name, flag & region', color: 'emerald' },
  { id: 'geography', label: 'Geography', icon: MapPin, desc: 'Location & coordinates', color: 'green' },
  { id: 'practical', label: 'Practical', icon: DollarSign, desc: 'Currency, language & travel', color: 'teal' },
  { id: 'content', label: 'Content', icon: Info, desc: 'Descriptions & lists', color: 'emerald' },
  { id: 'media', label: 'Media', icon: Image, desc: 'Photos & visibility', color: 'green' },
]

const STEP_IDS = STEPS.map(s => s.id)

const CONTINENT_COLORS = {
  'Africa': 'bg-amber-50 text-amber-700 border-amber-300',
  'Europe': 'bg-blue-50 text-blue-700 border-blue-300',
  'Asia': 'bg-red-50 text-red-700 border-red-300',
  'North America': 'bg-green-50 text-green-700 border-green-300',
  'South America': 'bg-teal-50 text-teal-700 border-teal-300',
  'Oceania': 'bg-purple-50 text-purple-700 border-purple-300',
  'Antarctica': 'bg-slate-100 text-slate-600 border-slate-300',
}

/* ─── Confetti Component ────────────────────────────────────────────────────── */

function Confetti({ active }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particlesRef = useRef([])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#ffffff', '#059669', '#d1fae5']
    const shapes = ['circle', 'rect', 'triangle']

    particlesRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
      life: 1,
      decay: 0.005 + Math.random() * 0.01,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)

      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.rotation += p.rotationSpeed
        p.life -= p.decay
        p.opacity = p.life

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.moveTo(0, -p.size / 2)
          ctx.lineTo(p.size / 2, p.size / 2)
          ctx.lineTo(-p.size / 2, p.size / 2)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      })

      if (particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(draw)
      }
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[200]"
      style={{ mixBlendMode: 'multiply' }}
    />
  )
}

/* ─── Step Indicator ────────────────────────────────────────────────────────── */

function StepIndicator({ steps, current, completed, onGoTo }) {
  const currentIdx = steps.findIndex(s => s.id === current)

  return (
    <div className="relative mb-8">
      {/* Progress bar background */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 mx-8" />
      {/* Progress bar fill */}
      <div
        className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700 ease-out"
        style={{ width: `calc(${(currentIdx / (steps.length - 1)) * 100}% - 4rem * ${currentIdx / (steps.length - 1)})` }}
      />

      <div className="relative flex items-start justify-between">
        {steps.map((step, idx) => {
          const isActive = step.id === current
          const isDone = completed.includes(step.id)
          const isAccessible = isDone || isActive || idx <= currentIdx
          const Icon = step.icon

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isAccessible && onGoTo(step.id)}
              disabled={!isAccessible}
              className="flex flex-col items-center gap-2 group flex-1 disabled:cursor-not-allowed"
            >
              <div className={`
                relative w-10 h-10 rounded-2xl border-2 flex items-center justify-center
                transition-all duration-300 shadow-sm
                ${isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-md'
                  : isActive
                    ? 'bg-white border-emerald-500 text-emerald-600 shadow-emerald-100 shadow-md scale-110'
                    : 'bg-white border-gray-200 text-gray-300 group-hover:border-emerald-300 group-hover:text-emerald-400'
                }
              `}>
                {isDone ? (
                  <Check size={15} className="stroke-[2.5]" />
                ) : (
                  <Icon size={14} />
                )}
                {isActive && (
                  <motion.span
                    className="absolute -inset-1.5 rounded-3xl border-2 border-emerald-400/40"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="text-center hidden sm:block">
                <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${isActive ? 'text-emerald-700' : isDone ? 'text-emerald-500' : 'text-gray-400'
                  }`}>
                  {step.label}
                </p>
                <p className={`text-[9px] leading-tight mt-0.5 ${isActive ? 'text-emerald-500' : 'text-gray-300'}`}>
                  {step.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Field Component ───────────────────────────────────────────────────────── */

function Field({ label, required, hint, className = '', icon: Icon, children }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
        {Icon && <Icon size={11} className="text-emerald-500" />}
        {label}
        {required && <span className="text-emerald-500 text-sm">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 italic">{hint}</p>}
    </div>
  )
}

/* ─── Input Styles ──────────────────────────────────────────────────────────── */

const inputClass = `
  w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white
  text-sm text-gray-800 placeholder-gray-300
  focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50
  transition-all duration-200 hover:border-gray-300
`

const textareaClass = `
  w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white
  text-sm text-gray-800 placeholder-gray-300 resize-none
  focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50
  transition-all duration-200 hover:border-gray-300
`

/* ─── Toggle Component ──────────────────────────────────────────────────────── */

function FlagToggle({ checked, onChange, label, desc, icon: Icon }) {
  return (
    <label className={`
      flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
      ${checked
        ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm shadow-emerald-100'
        : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'
      }
    `}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />

      <div className={`
        relative w-12 h-6 rounded-full transition-all duration-300 shrink-0
        ${checked ? 'bg-emerald-500' : 'bg-gray-200'}
      `}>
        <div className={`
          absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300
          ${checked ? 'left-7' : 'left-1'}
        `} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={13} className={checked ? 'text-emerald-600' : 'text-gray-400'} />}
          <p className={`text-sm font-semibold ${checked ? 'text-emerald-800' : 'text-gray-700'}`}>
            {label}
          </p>
        </div>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

/* ─── Spinner ───────────────────────────────────────────────────────────────── */

function Spinner({ size = 'sm' }) {
  return (
    <span className={`
      border-2 border-current border-t-transparent rounded-full animate-spin shrink-0
      ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}
    `} />
  )
}

/* ─── Delete Dialog ─────────────────────────────────────────────────────────── */

function DeleteDialog({ isOpen, onClose, target, onDeleted }) {
  const toast = useToast()
  const [stage, setStage] = useState('confirm')
  const [destCount, setDestCount] = useState(0)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStage('confirm')
      setDestCount(0)
      setErrMsg('')
    }
  }, [isOpen, target?.id])

  if (!isOpen || !target) return null

  const doDelete = async (force) => {
    setStage('deleting')
    try {
      const { data } = await countriesAPI.remove(target.id, { force })
      toast.success(data?.message || `"${target.name}" deleted`)
      onDeleted()
      onClose()
    } catch (err) {
      const status = err?.response?.status
      const body = err?.response?.data || {}
      const code = body?.code
      const count = body?.destination_count ?? 0
      const serverMsg = body?.error || getErrorMessage(err)

      if (status === 409 && code === 'HAS_DESTINATIONS' && !force) {
        setDestCount(count)
        setErrMsg(serverMsg)
        setStage('conflict')
      } else {
        toast.error(serverMsg)
        setStage(force ? 'conflict' : 'confirm')
      }
    }
  }

  const isDeleting = stage === 'deleting'

  if (stage === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
          <div className="p-7">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Country</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You're about to delete <strong className="text-gray-800">"{target.name}"</strong>
                </p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <p className="text-sm text-red-700">
                This will permanently remove the country and all associated data. This action <strong>cannot be undone</strong>.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={() => doDelete(false)}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-200"
              >
                {isDeleting ? <><Spinner /> Deleting…</> : <><Trash2 size={15} /> Delete</>}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isDeleting ? undefined : onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />
        <div className="p-7">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Linked Destinations Found</h3>
              <p className="text-sm text-gray-500 mt-1">
                <strong>"{target.name}"</strong> has <strong className="text-amber-600">{destCount} destination(s)</strong> attached
              </p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle size={12} /> Force delete will also remove:
            </p>
            <ul className="space-y-2">
              {[
                `All ${destCount} destination(s) in "${target.name}"`,
                'All bookings linked to those destinations',
                'Any other data referencing these records',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 font-bold mt-3 pt-3 border-t border-amber-200">
              ⚠ This cannot be undone. Proceed only if you are certain.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onClose} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={() => doDelete(true)}
              disabled={isDeleting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-bold hover:from-red-700 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-red-200"
            >
              {isDeleting ? <><Spinner /> Deleting everything…</> : <><Zap size={15} /> Force Delete Everything</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Success Celebration ───────────────────────────────────────────────────── */

function SuccessCelebration({ show, message, onDone }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDone, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onDone])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -30 }}
          transition={{ type: 'spring', damping: 15 }}
          className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
        >
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-200 p-8 text-center max-w-sm mx-4">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200"
            >
              <Check size={36} className="text-white stroke-[3]" />
            </motion.div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Success! 🎉</h3>
            <p className="text-gray-500 text-sm">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Main Component ────────────────────────────────────────────────────────── */

export default function Countries() {
  const toast = useToast()
  const pag = usePagination()
  const viewModal = useModal()
  const formModal = useModal()

  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [continent, setContinent] = useState('')
  const [featured, setFeatured] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [form, setForm] = useState(INITIAL_FORM)
  const [editing, setEditing] = useState(null)
  const [step, setStep] = useState('identity')
  const [completed, setCompleted] = useState([])
  const [errors, setErrors] = useState({})
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationMsg, setCelebrationMsg] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  /* ── Load ──────────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(continent && { continent }),
        ...(featured && { featured: featured === 'true' }),
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

  /* ── Form helpers ──────────────────────────────────────────────────────── */

  const openCreate = () => {
    setForm(INITIAL_FORM)
    setEditing(null)
    setStep('identity')
    setCompleted([])
    setErrors({})
    formModal.open()
  }

  const openEdit = (c) => {
    setForm({
      name: c.name || '', slug: c.slug || '', official_name: c.official_name || '',
      capital: c.capital || '', flag: c.flag || '', flag_url: c.flag_url || '',
      continent: c.continent || '', region: c.region || '', sub_region: c.sub_region || '',
      description: c.description || '', tagline: c.tagline || '',
      population: c.population || '', area: c.area || '', climate: c.climate || '',
      best_time_to_visit: c.best_time_to_visit || '', visa_info: c.visa_info || '',
      health_info: c.health_info || '', currency: c.currency || '',
      currency_symbol: c.currency_symbol || '', timezone: c.timezone || '',
      calling_code: c.calling_code || '', languages: c.languages || [],
      official_languages: c.official_languages || [], highlights: c.highlights || [],
      experiences: c.experiences || [], travel_tips: c.travel_tips || [],
      image_url: c.image_url || '', cover_image_url: c.cover_image_url || '',
      latitude: c.latitude || '', longitude: c.longitude || '',
      is_featured: !!c.is_featured, is_active: c.is_active !== false,
    })
    setEditing(c)
    setStep('identity')
    setCompleted(['identity', 'geography', 'practical', 'content'])
    setErrors({})
    formModal.open()
  }

  const upd = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }))
  }

  /* ── Validation ────────────────────────────────────────────────────────── */

  const validateStep = (stepId) => {
    const newErrors = {}
    if (stepId === 'identity') {
      if (!form.name.trim()) newErrors.name = 'Country name is required'
      if (!form.continent) newErrors.continent = 'Please select a continent'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* ── Step navigation ───────────────────────────────────────────────────── */

  const stepIndex = STEP_IDS.indexOf(step)

  const goNext = () => {
    if (!validateStep(step)) return
    if (!completed.includes(step)) setCompleted(p => [...p, step])
    const next = STEP_IDS[stepIndex + 1]
    if (next) setStep(next)
  }

  const goPrev = () => {
    const prev = STEP_IDS[stepIndex - 1]
    if (prev) setStep(prev)
  }

  /* ── Save ──────────────────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!validateStep('identity')) {
      setStep('identity')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        population: form.population ? Number(form.population) : null,
        area: form.area ? Number(form.area) : null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      }

      if (editing) {
        await countriesAPI.update(editing.id, payload)
        setCelebrationMsg(`"${form.name}" has been updated successfully!`)
      } else {
        await countriesAPI.create(payload)
        setCelebrationMsg(`"${form.name}" has been created successfully!`)
      }

      setShowConfetti(true)
      setShowCelebration(true)
      formModal.close()
      load()

      setTimeout(() => {
        setShowConfetti(false)
        setShowCelebration(false)
      }, 3500)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ────────────────────────────────────────────────────────────── */

  const openDelete = (row) => {
    setDeleteTarget(row)
    setDeleteDialogOpen(true)
  }

  const handleDeleteDone = () => {
    setDeleteTarget(null)
    setDeleteDialogOpen(false)
    load()
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  /* ── Table columns ─────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'name', label: 'Country', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3 min-w-0">
          {row.flag
            ? <span className="text-2xl leading-none shrink-0">{row.flag}</span>
            : <Avatar name={row.name} size="sm" rounded="lg" />
          }
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{row.name}</p>
            <p className="text-xs text-gray-400 truncate">{row.capital || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'continent', label: 'Continent', sortable: true,
      render: v => v ? (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${CONTINENT_COLORS[v] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {v}
        </span>
      ) : '—',
    },
    {
      key: 'population', label: 'Population', sortable: true, align: 'right',
      render: v => <span className="text-sm text-gray-600 tabular-nums">{formatNumber(v)}</span>,
    },
    {
      key: 'destination_count', label: 'Destinations', align: 'center',
      render: v => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-200">
          {v || 0}
        </span>
      ),
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: v => v
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-gray-300 block text-center">—</span>,
    },
    {
      key: 'is_active', label: 'Status',
      render: v => <Badge status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Inactive'} />,
    },
  ]

  /* ── Step content ──────────────────────────────────────────────────────── */

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
  }

  const renderStep = () => {
    const transition = { duration: 0.22, ease: 'easeInOut' }

    switch (step) {

      case 'identity': return (
        <motion.div
          key="identity"
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="space-y-5"
        >
          {/* Section header */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Globe2 size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-800">Country Identity</h3>
              <p className="text-xs text-emerald-600">Basic information and regional classification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Country Name" required icon={Globe2}>
              <input
                className={`${inputClass} ${errors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-50' : ''}`}
                value={form.name}
                onChange={e => upd('name', e.target.value)}
                placeholder="e.g., Rwanda"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> {errors.name}</p>}
            </Field>

            <Field label="URL Slug" hint="Auto-generated if blank" icon={Globe2}>
              <input
                className={`${inputClass} font-mono text-xs`}
                value={form.slug}
                onChange={e => upd('slug', e.target.value)}
                placeholder="rwanda"
              />
            </Field>

            <Field label="Official Name" icon={Info}>
              <input
                className={inputClass}
                value={form.official_name}
                onChange={e => upd('official_name', e.target.value)}
                placeholder="Republic of Rwanda"
              />
            </Field>

            <Field label="Capital City" icon={MapPin}>
              <input
                className={inputClass}
                value={form.capital}
                onChange={e => upd('capital', e.target.value)}
                placeholder="Kigali"
              />
            </Field>

            <Field label="Flag Emoji" hint="Paste the country flag emoji" icon={Globe2}>
              <div className="flex gap-2.5">
                <input
                  className={`${inputClass} flex-1 text-xl`}
                  value={form.flag}
                  onChange={e => upd('flag', e.target.value)}
                  placeholder="🇷🇼"
                />
                <div className={`
                  w-12 h-11 rounded-xl border-2 flex items-center justify-center text-2xl shrink-0 transition-all
                  ${form.flag ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}
                `}>
                  {form.flag || <Globe2 size={16} className="text-gray-300" />}
                </div>
              </div>
            </Field>

            <Field label="Tagline" icon={Heart}>
              <input
                className={inputClass}
                value={form.tagline}
                onChange={e => upd('tagline', e.target.value)}
                placeholder="Land of a thousand hills"
              />
            </Field>
          </div>

          <Field label="Continent" required icon={Globe2}>
            <div className={`
              p-4 rounded-2xl border-2 transition-all
              ${errors.continent ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50/50'}
            `}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CONTINENTS.map(c => (
                  <motion.button
                    key={c}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { upd('continent', c); setErrors(p => ({ ...p, continent: undefined })) }}
                    className={`
                      px-2.5 py-2.5 rounded-xl text-xs font-semibold border-2
                      transition-all duration-200 text-center leading-tight
                      ${form.continent === c
                        ? (CONTINENT_COLORS[c] || 'border-emerald-400 bg-emerald-50 text-emerald-700') + ' shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-300 hover:text-emerald-600'
                      }
                    `}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
              {errors.continent && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertTriangle size={10} /> {errors.continent}</p>}
            </div>
          </Field>
        </motion.div>
      )

      case 'geography': return (
        <motion.div
          key="geography"
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="space-y-5"
        >
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-teal-50 border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <MapPin size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-green-800">Geographic Details</h3>
              <p className="text-xs text-green-600">Location, size, and coordinates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Region" icon={MapPin}>
              <input className={inputClass} value={form.region} onChange={e => upd('region', e.target.value)} placeholder="East Africa" />
            </Field>
            <Field label="Sub-Region" icon={MapPin}>
              <input className={inputClass} value={form.sub_region} onChange={e => upd('sub_region', e.target.value)} placeholder="Great Lakes" />
            </Field>
            <Field label="Population" icon={Users}>
              <div className="relative">
                <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input className={`${inputClass} pl-9`} type="number" value={form.population} onChange={e => upd('population', e.target.value)} placeholder="13,000,000" />
              </div>
            </Field>
            <Field label="Area (km²)" icon={Ruler}>
              <div className="relative">
                <Ruler size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input className={`${inputClass} pl-9`} type="number" value={form.area} onChange={e => upd('area', e.target.value)} placeholder="26,338" />
              </div>
            </Field>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-cyan-50/40 border-2 border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-blue-500" />
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">GPS Coordinates</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude" icon={MapPin}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">LAT</span>
                  <input className={`${inputClass} pl-10`} type="number" step="any" value={form.latitude} onChange={e => upd('latitude', e.target.value)} placeholder="-1.9403" />
                </div>
              </Field>
              <Field label="Longitude" icon={MapPin}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">LNG</span>
                  <input className={`${inputClass} pl-10`} type="number" step="any" value={form.longitude} onChange={e => upd('longitude', e.target.value)} placeholder="29.8739" />
                </div>
              </Field>
            </div>
            {form.latitude && form.longitude && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-2.5 rounded-xl bg-blue-100/60 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium text-center">
                  📍 {Number(form.latitude).toFixed(4)}°, {Number(form.longitude).toFixed(4)}°
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )

      case 'practical': return (
        <motion.div
          key="practical"
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="space-y-5"
        >
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <DollarSign size={18} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-teal-800">Practical Information</h3>
              <p className="text-xs text-teal-600">Currency, travel requirements & climate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Currency" icon={DollarSign}>
              <input className={inputClass} value={form.currency} onChange={e => upd('currency', e.target.value)} placeholder="Rwandan Franc" />
            </Field>
            <Field label="Currency Symbol" icon={DollarSign}>
              <input className={inputClass} value={form.currency_symbol} onChange={e => upd('currency_symbol', e.target.value)} placeholder="RWF" />
            </Field>
            <Field label="Timezone" icon={Clock}>
              <div className="relative">
                <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input className={`${inputClass} pl-9`} value={form.timezone} onChange={e => upd('timezone', e.target.value)} placeholder="Africa/Kigali (UTC+2)" />
              </div>
            </Field>
            <Field label="Calling Code" icon={Phone}>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input className={`${inputClass} pl-9`} value={form.calling_code} onChange={e => upd('calling_code', e.target.value)} placeholder="+250" />
              </div>
            </Field>
            <Field label="Best Time to Visit" icon={Plane}>
              <input className={inputClass} value={form.best_time_to_visit} onChange={e => upd('best_time_to_visit', e.target.value)} placeholder="Jun–Sep, Dec–Feb" />
            </Field>
            <Field label="Climate" icon={Thermometer}>
              <input className={inputClass} value={form.climate} onChange={e => upd('climate', e.target.value)} placeholder="Tropical highland" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Visa Information" icon={Shield}>
              <textarea
                className={`${textareaClass} min-h-[100px]`}
                value={form.visa_info}
                onChange={e => upd('visa_info', e.target.value)}
                placeholder="Visa requirements and entry details…"
              />
            </Field>
            <Field label="Health & Safety" icon={Heart}>
              <textarea
                className={`${textareaClass} min-h-[100px]`}
                value={form.health_info}
                onChange={e => upd('health_info', e.target.value)}
                placeholder="Vaccinations, health advisories…"
              />
            </Field>
          </div>
        </motion.div>
      )

      case 'content': return (
        <motion.div
          key="content"
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="space-y-5"
        >
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Info size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-800">Content & Descriptions</h3>
              <p className="text-xs text-emerald-600">Rich content for travelers</p>
            </div>
          </div>

          <Field label="Description" icon={BookOpen}>
            <textarea
              className={`${textareaClass} min-h-[100px]`}
              value={form.description}
              onChange={e => upd('description', e.target.value)}
              placeholder="Describe this country for travelers — its character, culture, and what makes it special…"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Languages size={11} className="text-emerald-500" /> Languages
              </label>
              <TagInput value={form.languages} onChange={v => upd('languages', v)} placeholder="Add language…" />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Star size={11} className="text-emerald-500" /> Highlights
              </label>
              <TagInput value={form.highlights} onChange={v => upd('highlights', v)} placeholder="Add highlight…" />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Heart size={11} className="text-emerald-500" /> Experiences
              </label>
              <TagInput value={form.experiences} onChange={v => upd('experiences', v)} placeholder="Add experience…" />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Lightbulb size={11} className="text-emerald-500" /> Travel Tips
              </label>
              <TagInput value={form.travel_tips} onChange={v => upd('travel_tips', v)} placeholder="Add tip…" />
            </div>
          </div>
        </motion.div>
      )

      case 'media': return (
        <motion.div
          key="media"
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="space-y-5"
        >
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Camera size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-green-800">Media & Visibility</h3>
              <p className="text-xs text-green-600">Photos and publication settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Image size={11} className="text-emerald-500" /> Country Photo
              </label>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30 overflow-hidden">
                <ImageUpload label="" value={form.image_url} onChange={v => upd('image_url', v)} folder="countries" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Image size={11} className="text-emerald-500" /> Cover / Banner
              </label>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30 overflow-hidden">
                <ImageUpload label="" value={form.cover_image_url} onChange={v => upd('cover_image_url', v)} folder="countries" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <Shield size={11} className="text-emerald-500" /> Visibility Settings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FlagToggle
                checked={form.is_featured}
                onChange={v => upd('is_featured', v)}
                label="Featured Country"
                desc="Showcase in featured sections"
                icon={Star}
              />
              <FlagToggle
                checked={form.is_active}
                onChange={v => upd('is_active', v)}
                label="Active & Published"
                desc="Visible on the public site"
                icon={Globe2}
              />
            </div>
          </div>

          {/* Summary card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Check size={14} className="text-emerald-200" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Ready to Save — Summary</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Country', form.name || '—'],
                ['Capital', form.capital || '—'],
                ['Continent', form.continent || '—'],
                ['Region', form.region || '—'],
                ['Currency', form.currency ? `${form.currency} ${form.currency_symbol || ''}`.trim() : '—'],
                ['Status', form.is_active ? '✓ Active' : '○ Draft'],
              ].map(([k, v]) => (
                <div key={k} className="bg-white/10 rounded-xl p-2.5">
                  <p className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">{k}</p>
                  <p className="text-sm font-bold text-white truncate mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )

      default: return null
    }
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 page-enter">
      {/* Confetti */}
      <Confetti active={showConfetti} />

      {/* Success celebration */}
      <SuccessCelebration
        show={showCelebration}
        message={celebrationMsg}
        onDone={() => setShowCelebration(false)}
      />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Globe2 size={28} className="text-emerald-600" />
            Countries
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

      {/* Filters */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search countries…" className="max-w-sm" />
          <FilterSelect
            label="Continent"
            value={continent}
            onChange={v => { setContinent(v); pag.reset() }}
            options={[{ value: '', label: 'All Continents' }, ...CONTINENTS.map(c => ({ value: c, label: c }))]}
          />
          <FilterSelect
            label="Featured"
            value={featured}
            onChange={v => { setFeatured(v); pag.reset() }}
            options={[{ value: '', label: 'All' }, { value: 'true', label: 'Featured' }, { value: 'false', label: 'Not Featured' }]}
          />
        </FilterBar>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={countries}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={row => viewModal.open(row)}
          emptyMessage="No countries found"
          hoverActions={[
            { label: 'View', icon: Eye, onClick: row => viewModal.open(row) },
            { label: 'Edit', icon: Pencil, onClick: row => openEdit(row) },
            { label: 'Delete', icon: Trash2, variant: 'danger', onClick: row => openDelete(row) },
          ]}
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
        title={viewModal.data?.name}
        subtitle={viewModal.data?.official_name}
        size="lg"
        icon={viewModal.data?.flag ? <span className="text-2xl">{viewModal.data.flag}</span> : <Globe2 size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">Close</button>
            <button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary">
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
                <ModalField label="Capital" value={viewModal.data.capital} />
                <ModalField label="Continent" value={viewModal.data.continent} />
                <ModalField label="Region" value={viewModal.data.region} />
                <ModalField label="Population" value={formatNumber(viewModal.data.population)} />
                <ModalField label="Area" value={viewModal.data.area ? `${formatNumber(viewModal.data.area)} km²` : '—'} />
                <ModalField label="Currency" value={`${viewModal.data.currency || ''} ${viewModal.data.currency_symbol || ''}`.trim() || '—'} />
                <ModalField label="Timezone" value={viewModal.data.timezone} />
                <ModalField label="Calling Code" value={viewModal.data.calling_code} />
              </ModalGrid>
            </ModalSection>
            <ModalSection title="Travel Info">
              <ModalGrid>
                <ModalField label="Best Time" value={viewModal.data.best_time_to_visit} />
                <ModalField label="Climate" value={viewModal.data.climate} />
              </ModalGrid>
              <ModalField label="Languages" value={viewModal.data.languages?.join(', ')} />
              <ModalField label="Description" value={viewModal.data.description} />
            </ModalSection>
            {viewModal.data.highlights?.length > 0 && (
              <ModalSection title="Highlights">
                <div className="flex flex-wrap gap-2">
                  {viewModal.data.highlights.map((h, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{h}</span>
                  ))}
                </div>
              </ModalSection>
            )}
            <ModalSection title="Status">
              <ModalGrid>
                <ModalField label="Featured" value={<BooleanBadge value={viewModal.data.is_featured} />} />
                <ModalField label="Active" value={<BooleanBadge value={viewModal.data.is_active} trueLabel="Active" falseLabel="Inactive" />} />
                <ModalField label="Destinations" value={viewModal.data.destination_count} />
                <ModalField label="Views" value={formatNumber(viewModal.data.view_count)} />
              </ModalGrid>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ── Form Modal ── */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? `Edit: ${editing.name}` : 'Add New Country'}
        size="xl"
        icon={<Globe2 size={20} />}
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              {STEP_IDS.map((id, i) => (
                <div
                  key={id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${id === step ? 'w-8 bg-emerald-500' : completed.includes(id) ? 'w-4 bg-emerald-300' : 'w-4 bg-gray-200'}`}
                />
              ))}
              <span className="text-xs text-gray-400 ml-1">{stepIndex + 1}/{STEPS.length}</span>
            </div>
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button onClick={goPrev} className="btn-secondary btn-sm" disabled={saving}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              {stepIndex < STEPS.length - 1 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goNext}
                  className="btn-primary btn-sm"
                >
                  Continue <ChevronRight size={15} />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <><Spinner /> Saving…</>
                  ) : editing ? (
                    <><Check size={15} /> Update Country</>
                  ) : (
                    <><Check size={15} /> Create Country</>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        }
      >
        <div>
          <StepIndicator steps={STEPS} current={step} completed={completed} onGoTo={id => setStep(id)} />
          <div className="min-h-[380px]">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
        </div>
      </Modal>

      {/* ── Delete Dialog ── */}
      <AnimatePresence>
        {deleteDialogOpen && (
          <DeleteDialog
            isOpen={deleteDialogOpen}
            target={deleteTarget}
            onClose={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }}
            onDeleted={handleDeleteDone}
          />
        )}
      </AnimatePresence>
    </div>
  )
}