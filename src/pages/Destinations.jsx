// admin/src/pages/Destinations.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Eye, Pencil, Trash2, MapPin, RefreshCw,
  Star, Globe2, Image, ListOrdered, Check,
  ChevronRight, ChevronLeft, AlertTriangle, Navigation,
  Settings, Link, Upload, X, ZoomIn, ExternalLink,
  ImagePlus, Maximize2, ChevronDown, ChevronUp,
  Camera, Shield, BookOpen, Tag, Mountain,
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
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const INIT_FORM = {
  name: '', slug: '', country_id: '', tagline: '', description: '',
  short_description: '', category: '', difficulty: '', destination_type: '',
  region: '', nearest_city: '', nearest_airport: '', best_time_to_visit: '',
  highlights: [], activities: [], wildlife: [],
  image_url: '', hero_image: '', thumbnail_url: '',
  gallery: [], // [{ url, caption }]
  duration_days: '', min_group_size: 1, max_group_size: '', min_age: '',
  fitness_level: '', latitude: '', longitude: '', altitude_meters: '',
  status: 'draft', is_featured: false, is_popular: false,
  is_eco_friendly: false, is_family_friendly: false, is_active: true,
  meta_title: '', meta_description: '',
}

const STEPS = [
  { id: 'basic',    label: 'Basic Info',    icon: MapPin      },
  { id: 'location', label: 'Location',      icon: Globe2      },
  { id: 'details',  label: 'Details',       icon: ListOrdered },
  { id: 'media',    label: 'Media',         icon: Image       },
  { id: 'flags',    label: 'Flags & SEO',   icon: Settings    },
]

const STEP_IDS = STEPS.map(s => s.id)

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function isValidUrl(str) {
  try { new URL(str); return true } catch { return false }
}

function getQualityLabel(url) {
  if (!url) return null
  const l = url.toLowerCase()
  if (l.includes('original') || l.includes('raw') || l.includes('4k') || l.includes('hd')) return 'HD'
  if (l.includes('thumb') || l.includes('small') || l.includes('xs')) return 'Low'
  return 'Standard'
}

/* ─── Lightbox ───────────────────────────────────────────────────────────────── */

function Lightbox({ images, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const current = images[idx]

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   setIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight')  setIdx(i => Math.min(images.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
        <span className="text-white/70 text-sm font-medium">
          {idx + 1} / {images.length}
          {current?.caption && <span className="ml-3 text-white/50">{current.caption}</span>}
        </span>
        <div className="flex items-center gap-2">
          {current?.url && (
            <a href={current.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white text-xs transition-all">
              <ExternalLink size={12} /> Open original
            </a>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
        {idx > 0 && (
          <button onClick={() => setIdx(i => i - 1)}
            className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all">
            <ChevronLeft size={20} />
          </button>
        )}
        <img src={current?.url} alt={current?.caption || 'Destination image'}
          className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
          onError={e => { e.target.src = 'https://placehold.co/800x500?text=Image+not+found' }} />
        {idx < images.length - 1 && (
          <button onClick={() => setIdx(i => i + 1)}
            className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all">
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 bg-black/60 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-emerald-400 scale-105' : 'border-white/10 hover:border-white/40'}`}>
              <img src={img.url} alt="" className="w-full h-full object-cover"
                onError={e => { e.target.src = 'https://placehold.co/64x48?text=?' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Image Manager Panel ────────────────────────────────────────────────────── */

function ImageManagerPanel({ label, value, onChange, folder, allImages = [], onLightbox }) {
  const [mode, setMode]         = useState('upload')
  const [urlInput, setUrlInput] = useState(value || '')
  const [urlValid, setUrlValid] = useState(true)
  const [preview, setPreview]   = useState(value || '')
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError]   = useState(false)
  const quality = getQualityLabel(value)

  useEffect(() => {
    setUrlInput(value || '')
    setPreview(value || '')
    setImgLoaded(false)
    setImgError(false)
  }, [value])

  const applyUrl = () => {
    if (!urlInput.trim()) { onChange(''); setPreview(''); return }
    if (!isValidUrl(urlInput.trim())) { setUrlValid(false); return }
    setUrlValid(true)
    onChange(urlInput.trim())
    setPreview(urlInput.trim())
  }

  const clear = () => {
    onChange(''); setUrlInput(''); setPreview('')
    setImgLoaded(false); setImgError(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Image size={11} className="text-emerald-500" /> {label}
        </label>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {[['upload', Upload, 'Upload'], ['url', Link, 'URL']].map(([m, Icon, lbl]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${mode === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Icon size={10} /> {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative group rounded-2xl overflow-hidden border-2 border-emerald-200 bg-slate-50">
          <img src={preview} alt={label}
            className={`w-full h-44 object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => { setImgLoaded(true); setImgError(false) }}
            onError={() => { setImgError(true); setImgLoaded(true) }}
          />
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-400 gap-2">
              <AlertTriangle size={20} />
              <p className="text-xs font-medium">Image failed to load</p>
            </div>
          )}
          {imgLoaded && !imgError && (
            <>
              {quality && (
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
                  ${quality === 'HD' ? 'bg-emerald-500 text-white' : quality === 'Low' ? 'bg-amber-500 text-white' : 'bg-gray-700 text-white'}`}>
                  {quality}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                <button type="button"
                  onClick={() => onLightbox(allImages, allImages.findIndex(i => i.url === preview) >= 0 ? allImages.findIndex(i => i.url === preview) : 0)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-bold shadow-lg hover:bg-emerald-50 transition-all">
                  <Maximize2 size={12} /> View Full
                </button>
                <a href={preview} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-bold shadow-lg hover:bg-blue-50 transition-all">
                  <ExternalLink size={12} /> Original
                </a>
                <button type="button" onClick={clear}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-red-500 text-xs font-bold shadow-lg hover:bg-red-50 transition-all">
                  <X size={12} /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Input */}
      <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'upload' ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ImageUpload label="" value={value} onChange={v => { onChange(v); setPreview(v) }} folder={folder} />
            </motion.div>
          ) : (
            <motion.div key="url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-2">
              <p className="text-xs text-slate-500 font-medium">Paste a direct image URL</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="url"
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl border-2 text-sm transition-all focus:outline-none focus:ring-4 bg-white
                      ${!urlValid ? 'border-red-400 focus:ring-red-50' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-50'}`}
                    value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setUrlValid(true) }}
                    onKeyDown={e => e.key === 'Enter' && applyUrl()}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
                <button type="button" onClick={applyUrl}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all shrink-0">
                  Apply
                </button>
              </div>
              {!urlValid && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> Enter a valid URL</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {value && (
        <button type="button" onClick={clear}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
          <X size={11} /> Clear image
        </button>
      )}
    </div>
  )
}

/* ─── Gallery Manager ────────────────────────────────────────────────────────── */

function GalleryManager({ gallery = [], onChange, onLightbox }) {
  const [addMode, setAddMode]       = useState('upload')
  const [urlInput, setUrlInput]     = useState('')
  const [captionInput, setCaptionInput] = useState('')
  const [urlValid, setUrlValid]     = useState(true)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const [editCaption, setEditCaption] = useState('')

  const addFromUrl = () => {
    if (!urlInput.trim()) return
    if (!isValidUrl(urlInput.trim())) { setUrlValid(false); return }
    setUrlValid(true)
    onChange([...gallery, { url: urlInput.trim(), caption: captionInput.trim(), source: 'url' }])
    setUrlInput(''); setCaptionInput('')
  }

  const addFromUpload = () => {
    if (!uploadedUrl) return
    onChange([...gallery, { url: uploadedUrl, caption: captionInput.trim(), source: 'upload' }])
    setUploadedUrl(''); setCaptionInput('')
  }

  const remove   = (i) => onChange(gallery.filter((_, idx) => idx !== i))
  const moveUp   = (i) => { if (i === 0) return; const g = [...gallery]; [g[i-1],g[i]] = [g[i],g[i-1]]; onChange(g) }
  const moveDown = (i) => { if (i === gallery.length - 1) return; const g = [...gallery]; [g[i],g[i+1]] = [g[i+1],g[i]]; onChange(g) }
  const saveCaption = (i) => { const g = [...gallery]; g[i] = { ...g[i], caption: editCaption }; onChange(g); setEditingIdx(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Camera size={11} className="text-emerald-500" /> Gallery ({gallery.length} photos)
        </p>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {[['upload', Upload, 'Upload'], ['url', Link, 'URL']].map(([m, Icon, lbl]) => (
            <button key={m} type="button" onClick={() => setAddMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${addMode === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Icon size={10} /> {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {gallery.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {gallery.map((img, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 aspect-[4/3]">
              <img src={img.url} alt={img.caption || `Photo ${i+1}`}
                className="w-full h-full object-cover"
                onError={e => { e.target.src = 'https://placehold.co/200x150?text=?' }} />
              <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase
                ${img.source === 'upload' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                {img.source === 'upload' ? 'Upload' : 'URL'}
              </div>
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-[10px] text-white truncate">{img.caption}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                <button type="button" onClick={() => onLightbox(gallery, i)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-slate-800 text-[10px] font-bold hover:bg-emerald-50">
                  <Maximize2 size={10} /> View
                </button>
                <button type="button" onClick={() => { setEditingIdx(i); setEditCaption(img.caption || '') }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-slate-800 text-[10px] font-bold hover:bg-blue-50">
                  <Pencil size={10} /> Caption
                </button>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveUp(i)} disabled={i === 0}
                    className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-slate-600 disabled:opacity-30">
                    <ChevronUp size={11} />
                  </button>
                  <button type="button" onClick={() => moveDown(i)} disabled={i === gallery.length - 1}
                    className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-slate-600 disabled:opacity-30">
                    <ChevronDown size={11} />
                  </button>
                  <button type="button" onClick={() => remove(i)}
                    className="w-6 h-6 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center text-white">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caption editor */}
      {editingIdx !== null && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
          <input className="flex-1 px-3 py-1.5 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-400"
            value={editCaption} onChange={e => setEditCaption(e.target.value)} placeholder="Add a caption…" autoFocus />
          <button type="button" onClick={() => saveCaption(editingIdx)}
            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600">Save</button>
          <button type="button" onClick={() => setEditingIdx(null)}
            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300">Cancel</button>
        </motion.div>
      )}

      {/* Add new */}
      <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
          <ImagePlus size={13} /> Add photo to gallery
        </p>
        <AnimatePresence mode="wait">
          {addMode === 'url' ? (
            <motion.div key="url-g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="relative">
                <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="url"
                  className={`w-full pl-8 pr-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none focus:ring-4 bg-white transition-all
                    ${!urlValid ? 'border-red-400 focus:ring-red-50' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-50'}`}
                  value={urlInput} onChange={e => { setUrlInput(e.target.value); setUrlValid(true) }}
                  placeholder="https://example.com/photo.jpg" />
              </div>
              {!urlValid && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> Enter a valid URL</p>}
            </motion.div>
          ) : (
            <motion.div key="up-g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ImageUpload label="" value={uploadedUrl} onChange={setUploadedUrl} folder="destinations/gallery" />
            </motion.div>
          )}
        </AnimatePresence>

        <input className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all"
          value={captionInput} onChange={e => setCaptionInput(e.target.value)} placeholder="Caption (optional)" />

        <button type="button"
          onClick={addMode === 'url' ? addFromUrl : addFromUpload}
          disabled={addMode === 'url' ? !urlInput.trim() : !uploadedUrl}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <Plus size={14} /> Add to Gallery
        </button>
      </div>

      {gallery.length === 0 && (
        <div className="text-center py-6 text-slate-400">
          <Camera size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No gallery images yet</p>
          <p className="text-xs">Upload or link photos above</p>
        </div>
      )}
    </div>
  )
}

/* ─── Step Indicator ─────────────────────────────────────────────────────────── */

function StepIndicator({ steps, current, completed, onGoTo }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const isDone = completed?.includes(s.id)
        const active = s.id === current
        const isLast = i === steps.length - 1
        const Icon   = s.icon
        return (
          <React.Fragment key={s.id}>
            <button type="button" onClick={() => onGoTo(s.id)}
              className="flex flex-col items-center gap-1.5 group transition-all flex-1 focus:outline-none">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm
                ${isDone   ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200'
                : active   ? 'bg-white border-emerald-500 text-emerald-600 shadow-emerald-100'
                :            'bg-white border-slate-200 text-slate-400 group-hover:border-emerald-300 group-hover:text-emerald-400'}`}>
                {isDone ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
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

/* ─── Step Card ──────────────────────────────────────────────────────────────── */

function StepCard({ title, desc, icon: Icon, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-emerald-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
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

/* ─── Field ──────────────────────────────────────────────────────────────────── */

function Field({ label, required, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
        {label}{required && <span className="text-emerald-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

/* ─── Input styles ───────────────────────────────────────────────────────────── */

const inputCls = `w-full px-3.5 py-2.5 text-sm rounded-xl border-2 border-slate-200
  bg-white text-slate-800 placeholder-slate-400
  focus:outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400
  transition-all duration-200 hover:border-slate-300`

/* ─── Flag Toggle ────────────────────────────────────────────────────────────── */

function FlagToggle({ checked, onChange, label, desc, icon: Icon }) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 group
      ${checked ? 'border-emerald-400 bg-emerald-50/80' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'}`}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all
        ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'}`}>
        {checked && <Check size={12} className="text-white stroke-[3]" />}
      </div>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={13} className={checked ? 'text-emerald-600' : 'text-slate-400'} />}
          <p className={`text-sm font-semibold ${checked ? 'text-emerald-800' : 'text-slate-700'}`}>{label}</p>
        </div>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

/* ─── Spinner ────────────────────────────────────────────────────────────────── */

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function Destinations() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,     setItems]     = useState([])
  const [countries, setCountries] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState('')
  const [status,    setStatus]    = useState('')
  const [sortBy,    setSortBy]    = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [form,      setForm]      = useState(INIT_FORM)
  const [editing,   setEditing]   = useState(null)
  const [currentStep, setCurrentStep] = useState('basic')
  const [completed,   setCompleted]   = useState([])
  const [lightboxImages, setLightboxImages] = useState(null)
  const [lightboxStart,  setLightboxStart]  = useState(0)

  const dSearch = useDebounce(search, 400)

  /* ── helpers ──────────────────────────────────────────────────────── */

  const getAllFormImages = useCallback(() => {
    const imgs = []
    if (form.hero_image)   imgs.push({ url: form.hero_image,   caption: 'Cover / Banner' })
    if (form.image_url)    imgs.push({ url: form.image_url,    caption: 'Main Image'     })
    if (form.thumbnail_url) imgs.push({ url: form.thumbnail_url, caption: 'Thumbnail'     })
    ;(form.gallery || []).forEach(g => imgs.push(g))
    return imgs
  }, [form.hero_image, form.image_url, form.thumbnail_url, form.gallery])

  const getViewImages = (d) => {
    if (!d) return []
    const imgs = []
    if (d.heroImage || d.coverImageUrl) imgs.push({ url: d.heroImage || d.coverImageUrl, caption: 'Cover / Banner' })
    if (d.imageUrl)       imgs.push({ url: d.imageUrl,       caption: 'Main Image'     })
    if (d.thumbnailUrl)   imgs.push({ url: d.thumbnailUrl,   caption: 'Thumbnail'      })
    ;(d.gallery || []).forEach(g => imgs.push(g))
    return imgs
  }

  const openLightbox = (images, startIndex = 0) => {
    setLightboxImages(images)
    setLightboxStart(startIndex)
  }

  /* ── Load ─────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        includeUnpublished: true,
        ...(dSearch   && { search: dSearch }),
        ...(category  && { category }),
        ...(status    && { status }),
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
    { value: '', label: 'Select country…' },
    ...countries.map(c => ({ value: String(c.id), label: `${c.flag || ''} ${c.name}` })),
  ]

  /* ── Step navigation ──────────────────────────────────────────────── */

  const stepIndex = STEP_IDS.indexOf(currentStep)

  const goNext = () => {
    if (!completed.includes(currentStep)) setCompleted(p => [...p, currentStep])
    const next = STEP_IDS[stepIndex + 1]
    if (next) setCurrentStep(next)
  }

  const goPrev = () => {
    const prev = STEP_IDS[stepIndex - 1]
    if (prev) setCurrentStep(prev)
  }

  /* ── Form helpers ─────────────────────────────────────────────────── */

  const openCreate = () => {
    setForm(INIT_FORM); setEditing(null)
    setCurrentStep('basic'); setCompleted([])
    formModal.open()
  }

  const openEdit = (d) => {
    const f = { ...INIT_FORM }
    Object.keys(f).forEach(k => { if (d[k] !== undefined && d[k] !== null) f[k] = d[k] })
    f.country_id = String(d.country_id || '')
    f.hero_image = d.heroImage || d.coverImageUrl || ''
    f.gallery    = d.gallery || []
    setForm(f); setEditing(d)
    setCurrentStep('basic')
    setCompleted(['basic', 'location', 'details', 'media'])
    formModal.open()
  }

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  /* ── Save ─────────────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.country_id)  return toast.error('Country is required')
    setSaving(true)
    try {
      const { gallery, ...rest } = form
      const payload = {
        ...rest,
        country_id:      Number(form.country_id),
        duration_days:   form.duration_days   ? Number(form.duration_days)   : null,
        max_group_size:  form.max_group_size  ? Number(form.max_group_size)  : null,
        min_age:         form.min_age         ? Number(form.min_age)         : null,
        altitude_meters: form.altitude_meters ? Number(form.altitude_meters) : null,
        latitude:        form.latitude        ? Number(form.latitude)        : null,
        longitude:       form.longitude       ? Number(form.longitude)       : null,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      }

      let savedDest
      if (editing) {
        const res = await destinationsAPI.update(editing.id, payload)
        savedDest = res.data?.data || res.data
        toast.success('Destination updated')
      } else {
        const res = await destinationsAPI.create(payload)
        savedDest = res.data?.data || res.data
        toast.success('Destination created')
      }

      const destId = savedDest?.id || editing?.id
      const galleryItems = (gallery || []).filter(g => g?.url)
      if (destId && galleryItems.length > 0) {
        const fd = new FormData()
        galleryItems.forEach(g => fd.append('image_urls', g.url))
        if (galleryItems[0]?.caption) fd.append('caption', galleryItems[0].caption)
        await destinationsAPI.addImages(destId, fd)
        toast.success('Gallery images saved')
      }

      setForm(INIT_FORM)
      formModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ───────────────────────────────────────────────────────── */

  const handleDelete = async () => {
    try {
      await destinationsAPI.remove(deleteModal.data.id)
      toast.success('Destination deleted')
      deleteModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  /* ── Table columns ────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'name', label: 'Destination', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={row.image_url || row.thumbnail_url} name={row.name} size="sm" rounded="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate max-w-[180px]">{row.name}</p>
            <p className="text-xs text-slate-400 truncate">{row.region || row.category || '—'}</p>
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
        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">{v}</span>
        : '—',
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
    { key: 'status', label: 'Status', render: v => <Badge status={v} label={v} /> },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: v => v
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-slate-300 block text-center">—</span>,
    },
  ]

  /* ── Step content ─────────────────────────────────────────────────── */

  const renderStep = () => {
    const allImgs = getAllFormImages()

    switch (currentStep) {

      /* ── BASIC ── */
      case 'basic': return (
        <StepCard title="Basic Information" desc="Core details about this destination" icon={MapPin}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Destination Name" required className="sm:col-span-2">
              <input className={inputCls} value={form.name}
                onChange={e => upd('name', e.target.value)} placeholder="e.g., Volcanoes National Park" />
            </Field>
            <Field label="Slug" hint="Auto-generated if blank">
              <input className={inputCls} value={form.slug}
                onChange={e => upd('slug', e.target.value)} placeholder="auto-generated" />
            </Field>
            <Field label="Tagline">
              <input className={inputCls} value={form.tagline}
                onChange={e => upd('tagline', e.target.value)} placeholder="A short inspiring phrase" />
            </Field>
            <Field label="Country" required>
              <Dropdown value={form.country_id} onChange={v => upd('country_id', v)} options={countryOpts} searchable />
            </Field>
            <Field label="Category">
              <Dropdown value={form.category} onChange={v => upd('category', v)}
                options={[{ value: '', label: 'Select…' }, ...DESTINATION_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
            </Field>
            <Field label="Difficulty">
              <Dropdown value={form.difficulty} onChange={v => upd('difficulty', v)}
                options={[{ value: '', label: 'Select…' }, ...DIFFICULTY_LEVELS]} />
            </Field>
            <Field label="Status">
              <Dropdown value={form.status} onChange={v => upd('status', v)} options={DESTINATION_STATUSES} />
            </Field>
            <Field label="Destination Type">
              <input className={inputCls} value={form.destination_type}
                onChange={e => upd('destination_type', e.target.value)} placeholder="e.g., National Park" />
            </Field>
            <Field label="Short Description" className="sm:col-span-2">
              <textarea className={`${inputCls} min-h-[80px] resize-none`} value={form.short_description}
                onChange={e => upd('short_description', e.target.value)} placeholder="Brief overview shown on cards…" />
            </Field>
            <Field label="Full Description" className="sm:col-span-2">
              <textarea className={`${inputCls} min-h-[110px] resize-none`} value={form.description}
                onChange={e => upd('description', e.target.value)} placeholder="Detailed description of this destination…" />
            </Field>
          </div>
        </StepCard>
      )

      /* ── LOCATION ── */
      case 'location': return (
        <StepCard title="Location & Logistics" desc="Geographic details and practical info" icon={Globe2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Region">
              <input className={inputCls} value={form.region}
                onChange={e => upd('region', e.target.value)} placeholder="e.g., North Province" />
            </Field>
            <Field label="Nearest City">
              <input className={inputCls} value={form.nearest_city}
                onChange={e => upd('nearest_city', e.target.value)} placeholder="e.g., Musanze" />
            </Field>
            <Field label="Nearest Airport">
              <input className={inputCls} value={form.nearest_airport}
                onChange={e => upd('nearest_airport', e.target.value)} placeholder="e.g., Kigali International" />
            </Field>
            <Field label="Best Time to Visit">
              <input className={inputCls} value={form.best_time_to_visit}
                onChange={e => upd('best_time_to_visit', e.target.value)} placeholder="e.g., Jun–Sep, Dec–Feb" />
            </Field>

            {/* GPS */}
            <div className="sm:col-span-2 p-4 rounded-2xl bg-blue-50/60 border-2 border-blue-100 space-y-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={11} /> GPS Coordinates
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">LAT</span>
                    <input className={`${inputCls} pl-10`} type="number" step="any" value={form.latitude}
                      onChange={e => upd('latitude', e.target.value)} placeholder="-1.4938" />
                  </div>
                </Field>
                <Field label="Longitude">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">LNG</span>
                    <input className={`${inputCls} pl-10`} type="number" step="any" value={form.longitude}
                      onChange={e => upd('longitude', e.target.value)} placeholder="29.5348" />
                  </div>
                </Field>
              </div>
              {form.latitude && form.longitude && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-xl bg-blue-100/60 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium text-center">
                    📍 {Number(form.latitude).toFixed(4)}°, {Number(form.longitude).toFixed(4)}°
                  </p>
                </motion.div>
              )}
            </div>

            <Field label="Altitude (meters)">
              <div className="relative">
                <Mountain size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input className={`${inputCls} pl-9`} type="number" value={form.altitude_meters}
                  onChange={e => upd('altitude_meters', e.target.value)} placeholder="3000" />
              </div>
            </Field>
            <Field label="Duration (days)">
              <input className={inputCls} type="number" min="1" value={form.duration_days}
                onChange={e => upd('duration_days', e.target.value)} />
            </Field>
            <Field label="Min Group Size">
              <input className={inputCls} type="number" min="1" value={form.min_group_size}
                onChange={e => upd('min_group_size', e.target.value)} />
            </Field>
            <Field label="Max Group Size">
              <input className={inputCls} type="number" min="1" value={form.max_group_size}
                onChange={e => upd('max_group_size', e.target.value)} />
            </Field>
            <Field label="Minimum Age">
              <input className={inputCls} type="number" value={form.min_age}
                onChange={e => upd('min_age', e.target.value)} />
            </Field>
            <Field label="Fitness Level">
              <input className={inputCls} value={form.fitness_level}
                onChange={e => upd('fitness_level', e.target.value)} placeholder="e.g., Moderate" />
            </Field>
          </div>
        </StepCard>
      )

      /* ── DETAILS ── */
      case 'details': return (
        <StepCard title="Highlights & Activities" desc="What makes this destination special" icon={ListOrdered}>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Star size={11} className="text-emerald-500" /> Highlights
              </label>
              <TagInput value={form.highlights} onChange={v => upd('highlights', v)} placeholder="Add a highlight and press Enter…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={11} className="text-emerald-500" /> Activities
              </label>
              <TagInput value={form.activities} onChange={v => upd('activities', v)} placeholder="Add an activity and press Enter…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mountain size={11} className="text-emerald-500" /> Wildlife
              </label>
              <TagInput value={form.wildlife} onChange={v => upd('wildlife', v)} placeholder="Add wildlife and press Enter…" />
            </div>

            {/* SEO */}
            <div className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Globe2 size={11} /> SEO / Meta
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Meta Title">
                  <input className={inputCls} value={form.meta_title}
                    onChange={e => upd('meta_title', e.target.value)} placeholder="SEO page title…" />
                </Field>
                <Field label="Meta Description">
                  <input className={inputCls} value={form.meta_description}
                    onChange={e => upd('meta_description', e.target.value)} placeholder="SEO description…" />
                </Field>
              </div>
            </div>
          </div>
        </StepCard>
      )

      /* ── MEDIA ── */
      case 'media': return (
        <StepCard title="Photos & Media" desc="Manage all images for this destination" icon={Image}>
          <div className="space-y-6">
            {/* All images strip */}
            {allImgs.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={11} /> All Images ({allImgs.length})
                  </p>
                  <button type="button" onClick={() => openLightbox(allImgs, 0)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                    <Maximize2 size={11} /> View all
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                  {allImgs.map((img, i) => (
                    <button key={i} type="button" onClick={() => openLightbox(allImgs, i)}
                      className="shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-emerald-400 transition-all group relative">
                      <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'https://placehold.co/80x56?text=?' }} />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <ZoomIn size={12} className="text-white" />
                      </div>
                      {img.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                          <p className="text-[8px] text-white truncate">{img.caption}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ImageManagerPanel
                label="Main Image"
                value={form.image_url}
                onChange={v => upd('image_url', v)}
                folder="destinations"
                allImages={allImgs}
                onLightbox={openLightbox}
              />
              <ImageManagerPanel
                label="Cover / Banner"
                value={form.hero_image}
                onChange={v => upd('hero_image', v)}
                folder="destinations"
                allImages={allImgs}
                onLightbox={openLightbox}
              />
            </div>

            {/* Thumbnail */}
            <ImageManagerPanel
              label="Thumbnail (card preview)"
              value={form.thumbnail_url}
              onChange={v => upd('thumbnail_url', v)}
              folder="destinations"
              allImages={allImgs}
              onLightbox={openLightbox}
            />

            {/* Gallery */}
            <div className="p-5 rounded-2xl border-2 border-slate-100 bg-white">
              <GalleryManager
                gallery={form.gallery || []}
                onChange={v => upd('gallery', v)}
                onLightbox={openLightbox}
              />
            </div>
          </div>
        </StepCard>
      )

      /* ── FLAGS ── */
      case 'flags': return (
        <StepCard title="Visibility & Status" desc="Control how this destination appears" icon={Settings}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FlagToggle checked={form.is_featured}       onChange={v => upd('is_featured', v)}
                label="Featured"        desc="Show in featured sections & homepage"    icon={Star}    />
              <FlagToggle checked={form.is_popular}        onChange={v => upd('is_popular', v)}
                label="Popular"         desc="Mark as a popular destination"           icon={Globe2}  />
              <FlagToggle checked={form.is_eco_friendly}   onChange={v => upd('is_eco_friendly', v)}
                label="Eco-Friendly"    desc="Sustainable & eco-conscious destination" icon={Shield}  />
              <FlagToggle checked={form.is_family_friendly} onChange={v => upd('is_family_friendly', v)}
                label="Family Friendly" desc="Suitable for families with children"    icon={Camera}  />
              <FlagToggle checked={form.is_active}         onChange={v => upd('is_active', v)}
                label="Active & Visible" desc="Show this destination to users"        icon={Eye}     />
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Check size={12} /> Review Summary
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Name',     form.name || '—'],
                  ['Country',  countryOpts.find(c => c.value === form.country_id)?.label || '—'],
                  ['Category', form.category   || '—'],
                  ['Status',   form.status     || '—'],
                  ['Region',   form.region     || '—'],
                  ['Duration', form.duration_days ? `${form.duration_days} days` : '—'],
                  ['Images',   `${getAllFormImages().length} photo(s)`],
                  ['Featured', form.is_featured ? '⭐ Yes' : 'No'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white rounded-xl p-2.5 border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">{k}</p>
                    <p className="text-sm font-bold text-slate-800 truncate mt-0.5 capitalize">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </StepCard>
      )

      default: return null
    }
  }

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 page-enter">

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImages && (
          <Lightbox images={lightboxImages} startIndex={lightboxStart} onClose={() => setLightboxImages(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
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

      {/* Filters */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search destinations…" className="max-w-sm" />
          <FilterSelect label="Category" value={category}
            onChange={v => { setCategory(v); pag.reset() }}
            options={[{ value: '', label: 'All Categories' }, ...DESTINATION_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
          <FilterSelect label="Status" value={status}
            onChange={v => { setStatus(v); pag.reset() }}
            options={[{ value: '', label: 'All Status' }, ...DESTINATION_STATUSES]} />
        </FilterBar>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns} data={items} loading={loading}
          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
          onRowClick={r => viewModal.open(r)}
          emptyMessage="No destinations found"
          hoverActions={[
            { icon: Eye,    label: 'View',   onClick: r => viewModal.open(r)   },
            { icon: Pencil, label: 'Edit',   onClick: r => openEdit(r)         },
            { icon: Trash2, label: 'Delete', onClick: r => deleteModal.open(r), variant: 'danger' },
          ]}
        />
        <Pagination
          page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ── View Modal ── */}
      <Modal
        isOpen={viewModal.isOpen} onClose={viewModal.close}
        title={viewModal.data?.name} size="lg" icon={<MapPin size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">Close</button>
            <button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary">
              <Pencil size={14} /> Edit
            </button>
          </div>
        }
      >
        {viewModal.data && (() => {
          const viewImgs = getViewImages(viewModal.data)
          return (
            <div className="space-y-5">
              {/* Image section */}
              {viewImgs.length > 0 && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden group cursor-pointer"
                    onClick={() => openLightbox(viewImgs, 0)}>
                    <img src={viewImgs[0].url} alt={viewModal.data.name}
                      className="w-full h-52 object-cover"
                      onError={e => { e.target.src = 'https://placehold.co/800x400?text=No+Image' }} />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-800 text-sm font-bold shadow-lg">
                        <Maximize2 size={14} /> View Full Size
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium">
                      {viewImgs[0].caption}
                    </div>
                    {viewImgs.length > 1 && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium">
                        {viewImgs.length} photos
                      </div>
                    )}
                  </div>
                  {viewImgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                      {viewImgs.map((img, i) => (
                        <button key={i} type="button" onClick={() => openLightbox(viewImgs, i)}
                          className="shrink-0 relative group w-20 h-14 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-emerald-400 transition-all">
                          <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover"
                            onError={e => { e.target.src = 'https://placehold.co/80x56?text=?' }} />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <ZoomIn size={12} className="text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ModalSection title="Overview">
                <ModalGrid>
                  <ModalField label="Country"    value={countries.find(c => c.id === viewModal.data.country_id)?.name} />
                  <ModalField label="Category"   value={viewModal.data.category} />
                  <ModalField label="Difficulty" value={viewModal.data.difficulty} />
                  <ModalField label="Type"       value={viewModal.data.destination_type} />
                  <ModalField label="Duration"   value={viewModal.data.duration_days ? `${viewModal.data.duration_days} days` : '—'} />
                  <ModalField label="Region"     value={viewModal.data.region} />
                  <ModalField label="Status"     value={<Badge status={viewModal.data.status} label={viewModal.data.status} />} />
                  <ModalField label="Rating"     value={
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                      {formatRating(viewModal.data.rating)}
                      {viewModal.data.review_count > 0 && ` (${viewModal.data.review_count} reviews)`}
                    </span>
                  } />
                </ModalGrid>
                {viewModal.data.tagline && (
                  <p className="text-sm italic text-slate-500 mt-2">"{viewModal.data.tagline}"</p>
                )}
                <ModalField label="Description" value={viewModal.data.description} />
              </ModalSection>

              <ModalSection title="Location">
                <ModalGrid>
                  <ModalField label="Nearest City"    value={viewModal.data.nearest_city} />
                  <ModalField label="Nearest Airport" value={viewModal.data.nearest_airport} />
                  <ModalField label="Best Time"       value={viewModal.data.best_time_to_visit} />
                  <ModalField label="Altitude"        value={viewModal.data.altitude_meters ? `${viewModal.data.altitude_meters}m` : '—'} />
                  <ModalField label="Coordinates"     value={viewModal.data.latitude ? `${viewModal.data.latitude}°, ${viewModal.data.longitude}°` : '—'} />
                  <ModalField label="Fitness Level"   value={viewModal.data.fitness_level} />
                </ModalGrid>
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

              {viewModal.data.activities?.length > 0 && (
                <ModalSection title="Activities">
                  <div className="flex flex-wrap gap-2">
                    {viewModal.data.activities.map((a, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{a}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              {viewModal.data.wildlife?.length > 0 && (
                <ModalSection title="Wildlife">
                  <div className="flex flex-wrap gap-2">
                    {viewModal.data.wildlife.map((w, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">{w}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              <ModalSection title="Visibility">
                <ModalGrid>
                  <ModalField label="Featured"       value={<BooleanBadge value={viewModal.data.is_featured} />} />
                  <ModalField label="Popular"        value={<BooleanBadge value={viewModal.data.is_popular} />} />
                  <ModalField label="Eco-Friendly"   value={<BooleanBadge value={viewModal.data.is_eco_friendly} />} />
                  <ModalField label="Family Friendly" value={<BooleanBadge value={viewModal.data.is_family_friendly} />} />
                  <ModalField label="Active"         value={<BooleanBadge value={viewModal.data.is_active} trueLabel="Active" falseLabel="Inactive" />} />
                  <ModalField label="Gallery"        value={`${(viewModal.data.gallery || []).length} photo(s)`} />
                </ModalGrid>
              </ModalSection>

              <ModalSection title="Stats">
                <ModalGrid cols={4}>
                  <ModalField label="Views"     value={formatNumber(viewModal.data.view_count)} />
                  <ModalField label="Bookings"  value={formatNumber(viewModal.data.booking_count)} />
                  <ModalField label="Wishlists" value={formatNumber(viewModal.data.wishlist_count)} />
                  <ModalField label="Created"   value={formatDate(viewModal.data.created_at)} />
                </ModalGrid>
              </ModalSection>
            </div>
          )
        })()}
      </Modal>

      {/* ── Form Modal ── */}
      <Modal
        isOpen={formModal.isOpen} onClose={formModal.close}
        title={editing ? 'Edit Destination' : 'Add New Destination'}
        size="xl" icon={<MapPin size={20} />}
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              {STEP_IDS.map(id => (
                <div key={id} className={`h-1.5 rounded-full transition-all duration-300
                  ${id === currentStep ? 'w-8 bg-emerald-500' : completed.includes(id) ? 'w-4 bg-emerald-300' : 'w-4 bg-slate-200'}`} />
              ))}
              <span className="text-xs text-slate-400 ml-1">{stepIndex + 1}/{STEPS.length}</span>
            </div>
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button onClick={goPrev} className="btn-secondary btn-sm" disabled={saving}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              {stepIndex < STEPS.length - 1 ? (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={goNext} className="btn-primary btn-sm">
                  Continue <ChevronRight size={15} />
                </motion.button>
              ) : (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? <><Spinner /> Saving…</>
                  : editing ? <><Check size={15} /> Update Destination</>
                  : <><Check size={15} /> Create Destination</>}
                </motion.button>
              )}
            </div>
          </div>
        }
      >
        <div>
          <StepIndicator steps={STEPS} current={currentStep} completed={completed} onGoTo={id => setCurrentStep(id)} />
          <div className="min-h-[380px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen} onClose={deleteModal.close}
        onConfirm={handleDelete} type="delete"
        title={`Delete ${deleteModal.data?.name}?`}
        description="This will permanently remove the destination and all associated data."
      />
    </div>
  )
}