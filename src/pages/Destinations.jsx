// admin/src/pages/Destinations.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapPin, Plus, Eye, Pencil, Trash2, RefreshCw, Star,
  DollarSign, Image, Info, Check, ChevronRight, ChevronLeft,
  AlertTriangle, Heart, BookOpen, Camera, Shield,
  Clock, Users, Ruler, Plane, Link, Upload,
  X, ZoomIn, ExternalLink, CheckCircle2, ImagePlus, Maximize2,
  ChevronDown, ChevronUp, Eye as EyeIcon, Globe2, Mountain,
  Hash, FileText, List, Tag, Flag,
  Globe, Calendar, TrendingUp, Award,
  Compass, TreePine, Coffee, Activity, Sparkles, Library,
  Layers, Palette, Sun,
} from 'lucide-react'
import { destinationsAPI } from '@api/destinations'
import { countriesAPI }    from '@api/countries'
import { galleryAPI }      from '@api/gallery'
import Table               from '@components/common/Table'
import Pagination          from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge } from '@components/common/Badge'
import Avatar              from '@components/common/Avatar'
import ImageUpload         from '@components/common/ImageUpload'
import TagInput            from '@components/common/TagInput'
import { useModal }        from '@hooks/useModal'
import { useToast }        from '@hooks/useToast'
import { usePagination }   from '@hooks/usePagination'
import { useDebounce }     from '@hooks/useDebounce'
import { formatDate, formatNumber } from '@utils/formatters'
import { getErrorMessage } from '@api/client'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DIFFICULTIES = ['easy', 'moderate', 'challenging', 'strenuous', 'expert']
const STATUSES     = ['draft', 'published', 'archived']
const CATEGORIES   = []
const HERO_IMAGE_COUNT = 4
const MIN_TOTAL_DESTINATION_IMAGES = 9
const MAX_GALLERY_IMAGES = 12   // uploaded/URL gallery images (excludes hero/cover/main + library imports)

const INITIAL_FORM = {
  // Identity
  name: '', slug: '', tagline: '', category: '', destination_type: '',
  classification: '', adventure_category: '', difficulty: '',
  status: 'published', region: '', nearest_city: '', nearest_airport: '',
  address: '', latitude: '', longitude: '', altitude_meters: '',
  distance_from_airport_km: '',

  // Country
  country_id: '',

  // Media - Primary/Hero
  image_url: '', hero_image: '', cover_image_url: '',
  video_url: '', virtual_tour_url: '',

  // Media - Galleries (separated)
  gallery: [],          // uploaded/URL — max 10
  library_images: [],   // legacy imported images
  hero_slides: [],      // ordered destination hero slideshow (4 required)
  banner_slides: [],    // optional card/banner slideshow (up to 4)

  // Arrays / lists
  activities: [], attractions: [], highlights: [], wildlife: [],
  local_tips: [], tags: [], faqs: [], itinerary: [],

  // Details
  description: '', short_description: '', overview: '', getting_there: '',
  what_to_expect: '', best_time_to_visit: '', safety_info: '',
  duration_days: '', duration_nights: '', duration_display: '',
  min_group_size: '', max_group_size: '', min_age: '', fitness_level: '',
  entrance_fee: '', operating_hours: '',

  // SEO / flags
  meta_title: '', meta_description: '',
  is_featured: false, is_active: true, is_popular: false,
  is_new: false, is_eco_friendly: false, is_family_friendly: false,
  is_sold_out: false,
}

const STEPS = [
  { id: 'identity',  label: 'Identity',  icon: MapPin,    desc: 'Name, category & type'   },
  { id: 'details',   label: 'Details',   icon: Info,      desc: 'Descriptions & practical'},
  { id: 'content',   label: 'Content',   icon: BookOpen,  desc: 'Highlights, tags & FAQs' },
  { id: 'media',     label: 'Media',     icon: Camera,    desc: 'Images & videos'         },
  { id: 'settings',  label: 'Settings',  icon: Shield,    desc: 'SEO, flags & visibility' },
]
const STEP_IDS = STEPS.map(s => s.id)

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const isValidUrl = (str) => {
  if (typeof str !== 'string' || !str.trim()) return false
  if (str.startsWith('/')) return str.startsWith('/uploads/') || str.startsWith('/media/')
  try { return ['http:', 'https:'].includes(new URL(str).protocol) } catch { return false }
}

const toSlug = (str = '') =>
  str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-')

/* ─── Confetti ───────────────────────────────────────────────────────────── */
function Confetti({ active }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const ptRef     = useRef([])
  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const colors = ['#10b981','#34d399','#6ee7b7','#a7f3d0','#fff','#059669']
    ptRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random()*canvas.width, y: -20-Math.random()*100,
      vx:(Math.random()-.5)*4, vy:2+Math.random()*4,
      color:colors[Math.floor(Math.random()*colors.length)],
      shape:['circle','rect','triangle'][Math.floor(Math.random()*3)],
      size:4+Math.random()*8, rotation:Math.random()*360,
      rotationSpeed:(Math.random()-.5)*8, opacity:1, life:1,
      decay:.005+Math.random()*.01,
    }))
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      ptRef.current = ptRef.current.filter(p=>p.life>0)
      ptRef.current.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.vy+=.08; p.rotation+=p.rotationSpeed
        p.life-=p.decay; p.opacity=p.life
        ctx.save(); ctx.globalAlpha=p.opacity; ctx.translate(p.x,p.y)
        ctx.rotate(p.rotation*Math.PI/180); ctx.fillStyle=p.color
        if(p.shape==='circle'){ctx.beginPath();ctx.arc(0,0,p.size/2,0,Math.PI*2);ctx.fill()}
        else if(p.shape==='rect'){ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2)}
        else{ctx.beginPath();ctx.moveTo(0,-p.size/2);ctx.lineTo(p.size/2,p.size/2);ctx.lineTo(-p.size/2,p.size/2);ctx.closePath();ctx.fill()}
        ctx.restore()
      })
      if(ptRef.current.length>0) animRef.current=requestAnimationFrame(draw)
    }
    animRef.current=requestAnimationFrame(draw)
    return()=>{if(animRef.current)cancelAnimationFrame(animRef.current)}
  },[active])
  if(!active) return null
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[200]" style={{mixBlendMode:'multiply'}}/>
}

/* ─── Lightbox ───────────────────────────────────────────────────────────── */
function Lightbox({ images, startIndex=0, onClose }) {
  const [idx,setIdx] = useState(startIndex)
  const cur = images[idx]
  useEffect(()=>{
    const fn=(e)=>{
      if(e.key==='Escape') onClose()
      if(e.key==='ArrowLeft')  setIdx(i=>Math.max(0,i-1))
      if(e.key==='ArrowRight') setIdx(i=>Math.min(images.length-1,i+1))
    }
    window.addEventListener('keydown',fn)
    return()=>window.removeEventListener('keydown',fn)
  },[images.length,onClose])
  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
        <span className="text-white/70 text-sm flex items-center gap-2">
          {idx+1}/{images.length}
          {cur?.source && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/80">
              {cur.source}
            </span>
          )}
          {cur?.caption && <span className="ml-2 text-white/50">{cur.caption}</span>}
        </span>
        <div className="flex gap-2">
          {cur?.url&&<a href={cur.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 text-xs transition-all"><ExternalLink size={12}/>Open original</a>}
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"><X size={16}/></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
        {idx>0&&<button onClick={()=>setIdx(i=>i-1)} className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all"><ChevronLeft size={20}/></button>}
        <img src={cur?.url} alt={cur?.caption||'Image'} className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" onError={e=>{e.target.src='https://placehold.co/800x500?text=Not+found'}}/>
        {idx<images.length-1&&<button onClick={()=>setIdx(i=>i+1)} className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all"><ChevronRight size={20}/></button>}
      </div>
      {images.length>1&&(
        <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 bg-black/60 scrollbar-thin scrollbar-thumb-white/20">
          {images.map((img,i)=>(
            <button key={i} onClick={()=>setIdx(i)} className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i===idx?'border-emerald-400 scale-105':'border-white/10 hover:border-white/40'}`}>
              <img src={img.url} alt="" className="w-full h-full object-cover" onError={e=>{e.target.src='https://placehold.co/64x48?text=?'}}/>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── HeroImagePanel ─────────────────────────────────────────────────────────
   Professional single-image manager with distinct theming per role.
──────────────────────────────────────────────────────────────────────────── */
function HeroImagePanel({ label, description, value, onChange, folder, allImages, onLightbox, theme = 'emerald', icon: Icon = Image }) {
  const [mode,setMode]       = useState('upload')
  const [urlInput,setUrlInput] = useState(value||'')
  const [urlValid,setUrlValid] = useState(true)
  const [preview,setPreview]   = useState(value||'')
  const [loaded,setLoaded]     = useState(false)
  const [error,setError]       = useState(false)

  useEffect(()=>{ setUrlInput(value||''); setPreview(value||''); setLoaded(false); setError(false) },[value])

  const themes = {
    emerald: { border: 'border-emerald-300', bg: 'bg-emerald-50/40', text: 'text-emerald-700', accent: 'bg-emerald-500', accentHover: 'hover:bg-emerald-600', chip: 'bg-emerald-100 text-emerald-700', ring: 'focus:ring-emerald-100', ringBorder: 'focus:border-emerald-400' },
    amber:   { border: 'border-amber-300',   bg: 'bg-amber-50/40',   text: 'text-amber-700',   accent: 'bg-amber-500',   accentHover: 'hover:bg-amber-600',   chip: 'bg-amber-100 text-amber-700',   ring: 'focus:ring-amber-100',   ringBorder: 'focus:border-amber-400'   },
    sky:     { border: 'border-sky-300',     bg: 'bg-sky-50/40',     text: 'text-sky-700',     accent: 'bg-sky-500',     accentHover: 'hover:bg-sky-600',     chip: 'bg-sky-100 text-sky-700',     ring: 'focus:ring-sky-100',     ringBorder: 'focus:border-sky-400'     },
  }
  const t = themes[theme]

  const applyUrl = () => {
    if(!urlInput.trim()){onChange('');setPreview('');return}
    if(!isValidUrl(urlInput.trim())){setUrlValid(false);return}
    setUrlValid(true); onChange(urlInput.trim()); setPreview(urlInput.trim())
  }
  const clear = () => { onChange(''); setUrlInput(''); setPreview(''); setLoaded(false); setError(false) }

  return (
    <div className={`rounded-2xl border-2 ${t.border} ${t.bg} overflow-hidden`}>
      <div className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b-2 ${t.border} bg-white`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg ${t.chip} flex items-center justify-center shrink-0`}>
            <Icon size={14}/>
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wider ${t.text}`}>{label}</p>
            {description && <p className="text-[10px] text-gray-500 truncate">{description}</p>}
          </div>
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
          {[['upload',Upload,'Upload'],['url',Link,'URL']].map(([m,I,lbl])=>(
            <button key={m} type="button" onClick={()=>setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${mode===m?`bg-white ${t.text} shadow-sm`:'text-gray-400 hover:text-gray-600'}`}>
              <I size={10}/> {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {preview && mode !== 'upload' && (
          <div className={`relative group rounded-xl overflow-hidden border-2 ${t.border} bg-gray-50`}>
            <img src={preview} alt={label}
              className={`w-full h-40 object-cover transition-opacity duration-300 ${loaded?'opacity-100':'opacity-0'}`}
              onLoad={()=>{setLoaded(true);setError(false)}}
              onError={()=>{setError(true);setLoaded(true)}}/>
            {!loaded&&!error&&<div className="absolute inset-0 flex items-center justify-center bg-gray-100"><div className={`w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin ${t.text}`}/></div>}
            {error&&<div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-400 gap-2"><AlertTriangle size={20}/><p className="text-xs">Failed to load</p></div>}
            {loaded&&!error&&(
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                <button type="button" onClick={()=>onLightbox(allImages,allImages.findIndex(i=>i.url===preview))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-gray-800 text-xs font-bold shadow hover:bg-gray-50"><Maximize2 size={11}/>View</button>
                <button type="button" onClick={clear}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-red-500 text-xs font-bold shadow hover:bg-red-50"><X size={11}/>Remove</button>
              </div>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode==='upload'
            ? <motion.div key="up" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <ImageUpload label="" value={value} onChange={v=>{onChange(v);setPreview(v)}} folder={folder}/>
              </motion.div>
            : <motion.div key="url" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/>
                    <input type="url"
                      className={`w-full pl-8 pr-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none focus:ring-4 bg-white transition-all ${!urlValid?'border-red-400':`border-gray-200 ${t.ringBorder} ${t.ring}`}`}
                      value={urlInput} onChange={e=>{setUrlInput(e.target.value);setUrlValid(true)}}
                      onKeyDown={e=>e.key==='Enter'&&applyUrl()} placeholder="https://example.com/photo.jpg"/>
                  </div>
                  <button type="button" onClick={applyUrl} className={`px-4 py-2.5 rounded-xl ${t.accent} ${t.accentHover} text-white text-xs font-bold transition-all shrink-0`}>Apply</button>
                </div>
                {!urlValid&&<p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>Enter a valid URL</p>}
              </motion.div>
          }
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── DestinationGallery (Upload/URL — max 10 with placeholders) ─────────── */
function DestinationGallery({ gallery=[], onChange, onLightbox }) {
  const [mode,setMode]           = useState('upload')
  const [urlInput,setUrlInput]   = useState('')
  const [caption,setCaption]     = useState('')
  const [urlValid,setUrlValid]   = useState(true)
  const [uploaded,setUploaded]   = useState('')
  const [editIdx,setEditIdx]     = useState(null)
  const [editCap,setEditCap]     = useState('')
  const [activeSlot,setActiveSlot] = useState(null)  // which placeholder is being filled
    const [isAdding, setIsAdding] = useState(false);

  const remaining = MAX_GALLERY_IMAGES - gallery.length
  const isFull = remaining <= 0
  const nextSlot = gallery.length  // index of next empty slot

const addUrl = () => {
      if (isAdding) return;
      setIsAdding(true);
      const url = urlInput.trim()
      if (!url || isFull) {
        setIsAdding(false);
        return
      }
      if (!isValidUrl(url)) { 
        setUrlValid(false);
        setIsAdding(false);
        return 
      }
      setUrlValid(true)
      
      // Check for duplicate URL in the current gallery
      const isDuplicate = gallery.some(image => image.url === url)
      if (isDuplicate) {
        // Ignore duplicate
        setUrlInput(''); setCaption(''); setActiveSlot(null)
        setIsAdding(false);
        return
      }
      
      // Create new gallery array with all existing images having is_primary: false
      const newGallery = gallery.map(image => ({ ...image, is_primary: false }))
      // Add the new image as primary
      newGallery.push({
        url,
        caption: caption.trim(),
        is_primary: true,
        sort_order: newGallery.length,
        source: 'url'
      })
      
      onChange(newGallery)
      setUrlInput(''); setCaption(''); setActiveSlot(null)
      setIsAdding(false);
    }
const addUpload = () => {
      if (isAdding) return;
      setIsAdding(true);
      if (!uploaded || isFull) {
        setIsAdding(false);
        return
      }
      
      // Check for duplicate URL in the current gallery
      const isDuplicate = gallery.some(image => image.url === uploaded)
      if (isDuplicate) {
        setUploaded(''); setCaption(''); setActiveSlot(null)
        setIsAdding(false);
        return
      }
      
      // Create new gallery array with all existing images having is_primary: false
      const newGallery = gallery.map(image => ({ ...image, is_primary: false }))
      // Add the new image as primary
      newGallery.push({
        url: uploaded,
        caption: caption.trim(),
        is_primary: true,
        sort_order: newGallery.length,
        source: 'upload'
      })
      
      onChange(newGallery)
      setUploaded(''); setCaption(''); setActiveSlot(null)
      setIsAdding(false);
    }
  const remove     = (i) => onChange(gallery.filter((_,idx)=>idx!==i))
  const moveUp     = (i) => { if(i===0) return; const g=[...gallery];[g[i-1],g[i]]=[g[i],g[i-1]];onChange(g) }
  const moveDown   = (i) => { if(i===gallery.length-1) return; const g=[...gallery];[g[i],g[i+1]]=[g[i+1],g[i]];onChange(g) }
  const setPrimary = (i) => onChange(gallery.map((img,idx)=>({...img,is_primary:idx===i})))
  const saveCaption= (i) => { const g=[...gallery]; g[i]={...g[i],caption:editCap}; onChange(g); setEditIdx(null) }

  // Build 10 slots — filled or empty
  const slots = Array.from({ length: MAX_GALLERY_IMAGES }, (_, i) => ({
    index: i,
    image: gallery[i] || null,
    isNext: i === nextSlot,
  }))

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-green-50/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white border-b-2 border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-200">
            <Camera size={18} className="text-white"/>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">Destination Gallery</p>
            <p className="text-[11px] text-emerald-600">Uploaded photos & external URLs — max {MAX_GALLERY_IMAGES}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm ${isFull?'bg-amber-100 text-amber-800 border border-amber-300':'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
            {gallery.length} / {MAX_GALLERY_IMAGES}
          </div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="px-5 pt-3">
        <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${(gallery.length/MAX_GALLERY_IMAGES)*100}%` }}
            transition={{ duration: 0.4 }}
            className={`h-full rounded-full ${isFull?'bg-gradient-to-r from-amber-400 to-amber-500':'bg-gradient-to-r from-emerald-400 to-green-500'}`}
          />
        </div>
      </div>

      {/* 10 Placeholder Slots Grid */}
      <div className="p-3 sm:p-5 space-y-4 min-w-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {slots.map(({ index, image, isNext }) => {
            if (image) {
              /* ── FILLED SLOT ── */
              return (
                <div key={index} className={`relative group rounded-xl overflow-hidden border-2 bg-gray-50 aspect-[4/3] transition-all ${image.is_primary?'border-emerald-500 ring-2 ring-emerald-200':'border-gray-200 hover:border-emerald-300'}`}>
                  <img src={image.url} alt={image.caption||`Photo ${index+1}`}
                    className="w-full h-full object-cover"
                    onError={e=>{e.target.src='https://placehold.co/200x150?text=?'}}/>

                  {/* Slot number badge */}
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold flex items-center justify-center">
                    {index+1}
                  </div>

                  {image.is_primary && (
                    <div className="absolute top-1.5 left-8 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-500 text-white flex items-center gap-1 shadow">
                      <Star size={9} className="fill-white"/>Primary
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase bg-black/60 text-white/90 backdrop-blur-sm">
                    {image.source==='upload'?'Upload':'URL'}
                  </div>
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                      <p className="text-[10px] text-white truncate font-medium">{image.caption}</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                    <button type="button" onClick={()=>onLightbox(gallery.map(g=>({url:g.url,caption:g.caption,source:g.source})),index)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-emerald-50"><Maximize2 size={10}/>View</button>
                    {!image.is_primary && (
                      <button type="button" onClick={()=>setPrimary(index)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600"><Star size={10}/>Set Primary</button>
                    )}
                    <button type="button" onClick={()=>{setEditIdx(index);setEditCap(image.caption||'')}}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-blue-50"><Pencil size={10}/>Caption</button>
                    <div className="flex gap-1">
                      <button type="button" onClick={()=>moveUp(index)} disabled={index===0}
                        className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 disabled:opacity-30"><ChevronUp size={11}/></button>
                      <button type="button" onClick={()=>moveDown(index)} disabled={index===gallery.length-1}
                        className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 disabled:opacity-30"><ChevronDown size={11}/></button>
                      <button type="button" onClick={()=>remove(index)}
                        className="w-6 h-6 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center text-white"><Trash2 size={10}/></button>
                    </div>
                  </div>
                </div>
              )
            }

            /* ── EMPTY PLACEHOLDER SLOT ── */
            const isActive = activeSlot === index
            return (
              <button
                key={index}
                type="button"
                onClick={() => isNext && setActiveSlot(isActive ? null : index)}
                disabled={!isNext}
                className={`relative rounded-xl border-2 border-dashed aspect-[4/3] flex flex-col items-center justify-center gap-1.5 transition-all group
                  ${isNext
                    ? isActive
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-inner cursor-pointer'
                      : 'border-emerald-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/70 cursor-pointer shadow-sm hover:shadow-md'
                    : 'border-gray-200 bg-gray-50/60 cursor-not-allowed opacity-60'
                  }`}
              >
                {/* Slot number */}
                <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md text-[9px] font-bold flex items-center justify-center
                  ${isNext?'bg-emerald-500 text-white':'bg-gray-200 text-gray-400'}`}>
                  {index+1}
                </div>

                {isNext ? (
                  <>
                    <motion.div
                      animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                      transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all
                        ${isActive?'bg-emerald-500 text-white shadow-md shadow-emerald-200':'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-200'}`}
                    >
                      <Plus size={18} className="stroke-[2.5]"/>
                    </motion.div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isActive?'text-emerald-700':'text-emerald-600'}`}>
                      {isActive ? 'Adding…' : 'Add Photo'}
                    </p>
                    <p className="text-[9px] text-emerald-400/70 font-medium">Slot {index+1}</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <ImagePlus size={16} className="text-gray-300"/>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Locked</p>
                    <p className="text-[9px] text-gray-300 font-medium">Slot {index+1}</p>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* Caption editor */}
        {editIdx!==null && (
          <motion.div initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}}
            className="flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <input className="flex-1 px-3 py-1.5 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-400"
              value={editCap} onChange={e=>setEditCap(e.target.value)} placeholder="Add a caption…" autoFocus/>
            <button type="button" onClick={()=>saveCaption(editIdx)}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600">Save</button>
            <button type="button" onClick={()=>setEditIdx(null)}
              className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300">Cancel</button>
          </motion.div>
        )}

        {/* Add new (only when a slot is active or hidden while full) */}
        <AnimatePresence>
          {activeSlot !== null && !isFull && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border-2 border-emerald-400 bg-white p-4 space-y-3 shadow-md shadow-emerald-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <ImagePlus size={13}/>
                    Filling slot #{activeSlot+1}
                    <span className="ml-1 text-[10px] text-emerald-500 font-medium">({remaining} slot{remaining!==1?'s':''} remaining after this)</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-emerald-50 rounded-lg p-0.5">
                      {[['upload',Upload,'Upload'],['url',Link,'URL']].map(([m,Icon,lbl])=>(
                        <button key={m} type="button" onClick={()=>setMode(m)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${mode===m?'bg-white text-emerald-700 shadow-sm':'text-emerald-500 hover:text-emerald-700'}`}>
                          <Icon size={10}/> {lbl}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={()=>{setActiveSlot(null);setUrlInput('');setUploaded('');setCaption('')}}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
                      <X size={12}/>
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {mode==='url'
                    ? <motion.div key="url" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-2">
                        <div className="relative">
                          <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/>
                          <input type="url"
                            className={`w-full pl-8 pr-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-50 bg-white transition-all ${!urlValid?'border-red-400':'border-gray-200 focus:border-emerald-400'}`}
                            value={urlInput} onChange={e=>{setUrlInput(e.target.value);setUrlValid(true)}} placeholder="https://example.com/photo.jpg"/>
                        </div>
                        {!urlValid && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>Enter a valid URL</p>}
                      </motion.div>
                    : <motion.div key="up" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <ImageUpload label="" value={uploaded} onChange={setUploaded} folder="destinations/gallery"/>
                      </motion.div>
                  }
                </AnimatePresence>

                <input className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption (optional)"/>

<button type="button"
                   onClick={mode==='url'?addUrl:addUpload}
                   disabled={mode==='url'?!urlInput.trim():!uploaded || isAdding}
                   className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold hover:from-emerald-600 hover:to-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-200">
                  <Plus size={14}/> Add to Slot #{activeSlot+1}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isFull && (
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-bold text-amber-800">All 10 slots filled</p>
              <p className="text-xs text-amber-700 mt-0.5">You've reached the maximum of {MAX_GALLERY_IMAGES} gallery photos. Remove one to add another, or use the Library Import section for unlimited images.</p>
            </div>
          </div>
        )}

        {gallery.length === 0 && activeSlot === null && (
<p className="text-center text-xs text-emerald-600 py-1 font-medium">
             👆 Click on <span className="font-bold">Slot #1</span> to add your first photo
           </p>
         )}
       </div>
     </div>
   );
}

/* ─── LibraryImportPanel (from central gallery — unlimited) ──────────────── */
function LibraryImportPanel({ libraryImages=[], onChange, onLightbox }) {
  const [library,setLibrary]         = useState([])
  const [loading,setLoading]         = useState(false)
  const [search,setSearch]           = useState('')
  const [showBrowser,setShowBrowser] = useState(false)

  useEffect(() => {
    if (!showBrowser || library.length) return
    setLoading(true)
    galleryAPI.getAll({ limit: 200 }).then(({ data }) => {
      setLibrary(data.data || data.gallery || [])
    }).catch(() => setLibrary([])).finally(() => setLoading(false))
  }, [showBrowser, library.length])

  const filtered = library.filter(item => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (item.title||'').toLowerCase().includes(q) || (item.description||'').toLowerCase().includes(q)
  })

  const toggleImport = (item) => {
    const url = item.image_url || item.url || item.imageUrl
    if (!url) return
    const exists = libraryImages.findIndex(img => img.url === url)
    if (exists >= 0) {
      onChange(libraryImages.filter((_,i) => i !== exists))
    } else {
      onChange([...libraryImages, {
        url,
        caption: item.title || item.description || '',
        library_id: item.id,
        source: 'library',
      }])
    }
  }

  const removeImport = (i) => onChange(libraryImages.filter((_,idx) => idx !== i))

  const isImported = (item) => {
    const url = item.image_url || item.url || item.imageUrl
    return libraryImages.some(img => img.url === url)
  }

  return (
    <div className="w-full min-w-0 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-green-50/30 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 sm:p-4 lg:px-5 lg:py-3.5 bg-white border-b-2 border-emerald-100 min-w-0 w-full">
        <div className="flex items-start sm:items-center gap-3 min-w-0 w-full lg:flex-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Library size={18}/>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-emerald-800 break-words">Gallery Library Imports</p>
            <p className="text-[11px] leading-relaxed text-emerald-700 break-words">Reuse images from your central gallery — unlimited</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] lg:flex lg:items-center gap-2 w-full lg:w-auto min-w-0">
          <div className="w-full sm:w-auto px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs shadow-sm text-center whitespace-nowrap">
            {libraryImages.length} imported
          </div>
          <button type="button" onClick={()=>setShowBrowser(v=>!v)}
            className="w-full sm:w-auto min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all whitespace-normal break-words"> 
            <Library size={12} className="shrink-0"/> {showBrowser?'Hide Library':'Browse Library'}
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-5 space-y-4 min-w-0">
        {/* Currently imported */}
        {libraryImages.length>0 ? (
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={11}/>Imported from library
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {libraryImages.map((img,i)=>(
                <div key={i} className="relative group rounded-xl overflow-hidden border-2 border-emerald-200 bg-white aspect-square">
                  <img src={img.url} alt={img.caption||''} className="w-full h-full object-cover"
                    onError={e=>{e.target.src='https://placehold.co/150x150?text=?'}}/>
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase bg-emerald-600 text-white shadow">
                    Lib
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                    <button type="button"
                      onClick={()=>onLightbox(libraryImages.map(li=>({url:li.url,caption:li.caption,source:'library'})),i)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-violet-50"><Maximize2 size={10}/>View</button>
                    <button type="button" onClick={()=>removeImport(i)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold"><X size={10}/>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 rounded-xl bg-white border-2 border-dashed border-emerald-200 text-emerald-400">
            <Library size={32} className="mx-auto mb-2 opacity-40"/>
            <p className="text-sm font-medium text-gray-500">No library images imported</p>
            <p className="text-xs text-gray-400 mt-1">Click "Browse Library" above to select images</p>
          </div>
        )}

        {/* Browser */}
        <AnimatePresence>
          {showBrowser && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              className="overflow-hidden">
              <div className="pt-4 border-t-2 border-emerald-100 space-y-3">
                <div className="relative">
                  <Sparkles size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"/>
                  <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="Search library images by title or description…"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-emerald-200 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"/>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : filtered.length ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2 max-h-80 overflow-y-auto p-2 rounded-xl bg-white border border-emerald-100">
                    {filtered.map(item=>{
                      const url = item.image_url||item.url||item.imageUrl
                      const imported = isImported(item)
                      return (
                        <button key={item.id||url} type="button" onClick={()=>toggleImport(item)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${imported?'border-emerald-500 ring-2 ring-emerald-200 scale-95':'border-transparent hover:border-violet-400'}`}>
                          <img src={url} alt={item.title||'Library image'} className="w-full h-full object-cover"
                            onError={e=>{e.target.src='https://placehold.co/100x100?text=?'}}/>
                          {imported && (
                            <div className="absolute inset-0 bg-violet-500/70 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                <Check size={16} className="text-violet-600 stroke-[3]"/>
                              </div>
                            </div>
                          )}
                          {item.title && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                              <p className="text-[9px] text-white truncate font-medium">{item.title}</p>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500 py-6">
                    {library.length ? 'No matches for your search.' : 'No library images available.'}
                  </p>
                )}
                <p className="text-[11px] text-violet-500 text-center">
                  Click images to toggle import. Selected images have a violet ring.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Itinerary Editor ───────────────────────────────────────────────────── */
function ItineraryEditor({ items=[], onChange }) {
  const add = () => onChange([...items,{day:items.length+1,title:'',description:''}])
  const upd = (i,k,v) => { const a=[...items]; a[i]={...a[i],[k]:v}; onChange(a) }
  const rem = (i) => onChange(items.filter((_,idx)=>idx!==i).map((it,idx)=>({...it,day:idx+1})))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <List size={11} className="text-emerald-500"/> Itinerary ({items.length} days)
        </p>
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all">
          <Plus size={12}/> Add Day
        </button>
      </div>
      {items.map((item,i)=>(
        <div key={i} className="p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs">{item.day}</span>
              Day {item.day}
            </span>
            <button type="button" onClick={()=>rem(i)}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
              <Trash2 size={12}/>
            </button>
          </div>
          <input className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            value={item.title} onChange={e=>upd(i,'title',e.target.value)} placeholder="Day title…"/>
          <textarea className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 min-h-[80px]"
            value={item.description} onChange={e=>upd(i,'description',e.target.value)} placeholder="What happens on this day…"/>
        </div>
      ))}
      {items.length===0&&(
        <div className="text-center py-6 text-gray-400">
          <List size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No itinerary yet</p>
          <p className="text-xs">Add days to build the trip plan</p>
        </div>
      )}
    </div>
  )
}

/* ─── FAQ Editor ─────────────────────────────────────────────────────────── */
function FaqEditor({ faqs=[], onChange }) {
  const add = () => onChange([...faqs,{question:'',answer:''}])
  const upd = (i,k,v) => { const a=[...faqs]; a[i]={...a[i],[k]:v}; onChange(a) }
  const rem = (i) => onChange(faqs.filter((_,idx)=>idx!==i))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <BookOpen size={11} className="text-emerald-500"/> FAQs ({faqs.length})
        </p>
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all">
          <Plus size={12}/> Add FAQ
        </button>
      </div>
      {faqs.map((faq,i)=>(
        <div key={i} className="p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">FAQ {i+1}</span>
            <button type="button" onClick={()=>rem(i)}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
              <Trash2 size={12}/>
            </button>
          </div>
          <input className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            value={faq.question} onChange={e=>upd(i,'question',e.target.value)} placeholder="Question…"/>
          <textarea className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 min-h-[80px]"
            value={faq.answer} onChange={e=>upd(i,'answer',e.target.value)} placeholder="Answer…"/>
        </div>
      ))}
      {faqs.length===0&&(
        <div className="text-center py-6 text-gray-400">
          <BookOpen size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No FAQs yet</p>
        </div>
      )}
    </div>
  )
}

/* ─── Attraction Editor ─────────────────────────────────────────────────── */
function AttractionEditor({ attractions = [], onChange }) {
  const update = (index, key, value) => onChange(attractions.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const add = () => onChange([...attractions, { name: '', description: '', imageUrl: '', image_url: '' }])
  const remove = (index) => onChange(attractions.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <Sparkles size={11} className="text-emerald-500"/> Attractions ({attractions.length})
        </p>
        <button type="button" onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all">
          <Plus size={12}/> Add Attraction
        </button>
      </div>
      {attractions.map((item, index) => (
        <div key={index} className="p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attraction {index+1}</span>
            <button type="button" onClick={()=>remove(index)}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
              <Trash2 size={12}/>
            </button>
          </div>
          <input className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            placeholder="Attraction name" value={item.name || ''} onChange={e => update(index, 'name', e.target.value)} />
          <textarea className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 min-h-[70px]"
            rows={2} placeholder="Short description" value={item.description || ''} onChange={e => update(index, 'description', e.target.value)} />
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">Attraction image *</p>
            <ImageUpload label="" value={item.imageUrl || item.image_url || ''} onChange={url => update(index, 'imageUrl', url)} folder="destinations/attractions" />
            <input className="w-full mt-2 px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              type="url" placeholder="Or paste an image URL" value={item.imageUrl || item.image_url || ''} onChange={e => update(index, 'imageUrl', e.target.value)} />
          </div>
        </div>
      ))}
      {attractions.length===0 && (
        <div className="text-center py-6 text-gray-400">
          <Sparkles size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No attractions yet</p>
        </div>
      )}
    </div>
  )
}

/* ─── Step Indicator ─────────────────────────────────────────────────────── */
function StepIndicator({ steps, current, completed, onGoTo }) {
  const currentIdx = steps.findIndex(s=>s.id===current)
  return (
    <div className="relative mb-8 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
      <div className="relative min-w-[520px] sm:min-w-0">
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 mx-8"/>
      <div className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
        style={{width:currentIdx===0?'0%':`calc(${(currentIdx/(steps.length-1))*100}% - 1px)`}}/>
      <div className="relative flex items-start justify-between">
        {steps.map((s,idx)=>{
          const isActive=s.id===current, isDone=completed.includes(s.id)
          const isAccessible=isDone||isActive
          const Icon=s.icon
          return (
            <button key={s.id} type="button" onClick={()=>isAccessible&&onGoTo(s.id)} disabled={!isAccessible}
              className="flex flex-col items-center gap-2 group flex-1 disabled:cursor-not-allowed">
              <div className={`relative w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 shadow-sm
                ${isDone?'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-md'
                :isActive?'bg-white border-emerald-500 text-emerald-600 shadow-emerald-100 shadow-md scale-110'
                :'bg-white border-gray-200 text-gray-300 group-hover:border-emerald-300 group-hover:text-emerald-400'}`}>
                {isDone?<Check size={15} className="stroke-[2.5]"/>:<Icon size={14}/>}
                {isActive&&<motion.span className="absolute -inset-1.5 rounded-3xl border-2 border-emerald-400/40"
                  animate={{scale:[1,1.15,1]}} transition={{duration:2,repeat:Infinity}}/>}
              </div>
              <div className="text-center hidden sm:block">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isActive?'text-emerald-700':isDone?'text-emerald-500':'text-gray-400'}`}>{s.label}</p>
                <p className={`text-[9px] mt-0.5 ${isActive?'text-emerald-500':'text-gray-300'}`}>{s.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
      </div>
    </div>
  )
}

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({ label, required, hint, className='', icon:Icon, children }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
        {Icon&&<Icon size={11} className="text-emerald-500"/>}
        {label}{required&&<span className="text-emerald-500 text-sm">*</span>}
      </label>
      {children}
      {hint&&<p className="text-[11px] text-gray-400 italic">{hint}</p>}
    </div>
  )
}

/* ─── FlagToggle ─────────────────────────────────────────────────────────── */
function FlagToggle({ checked, onChange, label, desc, icon:Icon }) {
  return (
    <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
      ${checked?'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm shadow-emerald-100':'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e=>onChange(e.target.checked)}/>
      <div className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${checked?'bg-emerald-500':'bg-gray-200'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${checked?'left-7':'left-1'}`}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {Icon&&<Icon size={13} className={checked?'text-emerald-600':'text-gray-400'}/>}
          <p className={`text-sm font-semibold ${checked?'text-emerald-800':'text-gray-700'}`}>{label}</p>
        </div>
        {desc&&<p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

/* ─── Spinner / Delete / Success ─────────────────────────────────────────── */
function Spinner({ size='sm' }) {
  return <span className={`border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 ${size==='sm'?'w-4 h-4':'w-5 h-5'}`}/>
}

function DeleteDialog({ isOpen, onClose, target, onDeleted }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  useEffect(()=>{ if(!isOpen) setBusy(false) },[isOpen])
  if(!isOpen||!target) return null
  const doDelete = async () => {
    setBusy(true)
    try {
      await destinationsAPI.removePermanent(target.id)
      toast.success(`"${target.name}" deleted`)
      onDeleted(); onClose()
    } catch(err) {
      toast.error(getErrorMessage(err))
      setBusy(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy?undefined:onClose}/>
      <motion.div initial={{opacity:0,scale:.9,y:20}} animate={{opacity:1,scale:1,y:0}}
        className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-400"/>
        <div className="p-7">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center shrink-0"><Trash2 size={24} className="text-red-500"/></div>
            <div><h3 className="text-xl font-bold text-gray-900">Delete Destination</h3>
              <p className="text-sm text-gray-500 mt-1">You're about to delete <strong>"{target.name}"</strong></p></div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-red-700">This will permanently remove the destination and all associated data. This action <strong>cannot be undone</strong>.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={doDelete} disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-200">
              {busy?<><Spinner/>Deleting…</>:<><Trash2 size={15}/>Delete</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function SuccessCelebration({ show, message, onDone }) {
  useEffect(()=>{ if(show){const t=setTimeout(onDone,3000);return()=>clearTimeout(t)} },[show,onDone])
  return (
    <AnimatePresence>
      {show&&(
        <motion.div initial={{opacity:0,scale:.5,y:50}} animate={{opacity:1,scale:1,y:0}}
          exit={{opacity:0,scale:.8,y:-30}} transition={{type:'spring',damping:15}}
          className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-200 p-8 text-center max-w-sm mx-4">
            <motion.div animate={{rotate:[0,-10,10,-10,10,0],scale:[1,1.2,1]}} transition={{duration:.6}}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <Check size={36} className="text-white stroke-[3]"/>
            </motion.div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Success! 🎉</h3>
            <p className="text-gray-500 text-sm">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Shared input styles ────────────────────────────────────────────────── */
const inputClass = `w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all duration-200 hover:border-gray-300`
const textareaClass = `w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all duration-200 hover:border-gray-300`
const selectClass = `w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all duration-200 hover:border-gray-300`


/* ─── Compact ordered destination media manager + shared picker ─────────── */
function DestinationMediaPicker({ open, onClose, section, current, capacity, onAdd }) {
  const [tab,setTab] = useState('library');
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const [selected,setSelected] = useState([]);
  const [query,setQuery] = useState('');
  const [urlText,setUrlText] = useState('');
  const [uploaded,setUploaded] = useState('');
  const [error,setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected([]); setError(''); setQuery(''); setUrlText(''); setUploaded(''); setTab('library');
    setLoading(true);
    galleryAPI.getAll({ limit: 500 }).then(({data}) => {
      const rows = data?.data || data?.gallery || data?.images || [];
      setItems(rows.map((item,index)=>({
        url: item.image_url || item.imageUrl || item.url || item.image || '',
        caption: item.title || item.caption || item.description || '',
        source: 'library',
        library_id: item.id || item._id || null,
      })).filter(item=>item.url));
    }).catch(()=>setError('Could not load image storage. Try uploading or adding an image URL.'))
      .finally(()=>setLoading(false));
  },[open]);

  if (!open) return null;
  const remaining = Math.max(0, capacity - current.length);
  const filtered = items.filter(item => !query.trim() || item.caption.toLowerCase().includes(query.toLowerCase()) || item.url.toLowerCase().includes(query.toLowerCase()));
  const addItems = (incoming) => {
    const unique = incoming.filter(item=>item?.url && !current.some(old => (typeof old === 'string' ? old : old?.url || old?.image_url) === item.url));
    const accepted = unique.slice(0,remaining);
    const rejected = unique.length - accepted.length;
    if (accepted.length) onAdd(accepted);
    if (rejected) setError(`${rejected} image${rejected===1?'':'s'} not added: this section has room for only ${remaining} more.`);
    else onClose();
  };
  const confirmLibrary = () => {
    if (!selected.length) { setError('Select at least one image.'); return; }
    addItems(selected.map(index=>filtered[index]));
  };
  const addLinks = () => {
    const links = [...new Set(urlText.split(/[\n,;]+/).map(value=>value.trim()).filter(Boolean))];
    const invalid = links.filter(url=>!isValidUrl(url));
    if (invalid.length) { setError(`${invalid.length} invalid image URL${invalid.length===1?'':'s'}; use http://, https://, or an uploads path.`); return; }
    if (!links.length) { setError('Paste at least one image URL.'); return; }
    addItems(links.map(url=>({url,caption:'',source:'url'})));
  };
  return <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div role="dialog" aria-modal="true" aria-label={`Add images to ${section}`} className="w-full max-w-4xl max-h-[90dvh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
      <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1"><h3 className="text-base font-extrabold text-slate-900">Add images</h3><p className="mt-0.5 text-xs text-slate-500">Adding to <strong>{section}</strong> · {remaining} slot{remaining===1?'':'s'} available</p></div>
        <button type="button" aria-label="Close image picker" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={17}/></button>
      </header>
      <nav className="flex gap-1 border-b border-slate-100 px-3 py-2 overflow-x-auto">
        {[['library','Image storage'],['upload','Upload image'],['url','Image URL']].map(([id,label])=><button key={id} type="button" onClick={()=>{setTab(id);setError('')}} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${tab===id?'bg-emerald-50 text-emerald-700':'text-slate-500 hover:bg-slate-50'}`}>{label}</button>)}
      </nav>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        {tab==='library' && <div className="space-y-3">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search stored images…" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"/>
          {loading ? <div className="py-12 text-center text-sm text-slate-500">Loading image storage…</div>
          : filtered.length===0 ? <div className="py-12 text-center text-sm text-slate-500">No stored images found.</div>
          : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((item,index)=>{const active=selected.includes(index);return <button type="button" key={item.url} onClick={()=>setSelected(prev=>active?prev.filter(i=>i!==index):prev.length<remaining?[...prev,index]:prev)} className={`min-w-0 overflow-hidden rounded-xl border-2 text-left ${active?'border-emerald-500 ring-2 ring-emerald-100':'border-slate-200 hover:border-emerald-300'}`}>
              <div className="relative aspect-[4/3] bg-slate-100"><img src={item.url} alt={item.caption||'Stored image'} loading="lazy" className="h-full w-full object-cover"/><span className={`absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${active?'bg-emerald-600 text-white':'bg-white/90 text-slate-500'}`}>{active?<Check size={12}/>:''}</span></div>
              <p className="truncate px-2 py-1.5 text-[11px] font-medium text-slate-600">{item.caption||'Stored image'}</p>
            </button>})}
          </div>}
          <p className="text-[11px] text-slate-500">{selected.length} selected · Select multiple images, up to the remaining capacity.</p>
        </div>}
        {tab==='upload' && <div className="mx-auto max-w-lg space-y-3"><p className="text-sm text-slate-600">Upload an image to storage, then add it to this section. Repeat to add more than one.</p><ImageUpload label="Upload image" value={uploaded} onChange={setUploaded} folder={section.toLowerCase().includes('hero')?'destinations/hero':section.toLowerCase().includes('banner')?'destinations/banner-slides':'destinations/gallery'}/></div>}
        {tab==='url' && <div className="space-y-2"><label className="text-xs font-bold text-slate-700">Paste one or more image URLs</label><textarea rows={5} value={urlText} onChange={e=>setUrlText(e.target.value)} placeholder={'https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg'} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-400"/><p className="text-[11px] text-slate-500">Use a new line or comma between URLs.</p></div>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
        <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={()=>tab==='library'?confirmLibrary():tab==='url'?addLinks():uploaded?addItems([{url:uploaded,caption:'',source:'upload'}]):setError('Upload an image first.')} disabled={remaining===0 || (tab==='library' && selected.length===0) || (tab==='upload' && !uploaded) || (tab==='url' && !urlText.trim())} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40">{tab==='library'? `Add ${selected.length||''} selected`:tab==='url'?'Add URLs':'Add uploaded image'}</button>
      </footer>
    </div>
  </div>;
}

function NewDestinationMedia({ heroSlides=[], bannerSlides=[], gallery=[], onHeroChange, onBannerChange, onGalleryChange }) {
  const [picker,setPicker] = useState(null);
  const [sectionError,setSectionError] = useState('');
  const normalize = item => typeof item==='string'?{url:item,source:'upload'}:({...item,url:item?.url||item?.image_url||item?.imageUrl||''});
  const setList = (key,list,callback) => callback(list.map(normalize).filter(item=>item.url));
  const removeAt = (list,index,callback) => callback(list.filter((_,i)=>i!==index));
  const move = (list,index,delta,callback) => { const next=[...list]; const target=index+delta; if(target<0||target>=next.length)return; [next[index],next[target]]=[next[target],next[index]]; callback(next); };
  const add = (key,items) => {
    const current = key==='hero'?heroSlides:key==='banner'?bannerSlides:gallery;
    const max = key==='hero'||key==='banner'?4:MAX_GALLERY_IMAGES;
    const existing = current.map(item=>typeof item==='string'?item:item?.url||item?.image_url||'');
    const unique = items.filter(item=>item.url&&!existing.includes(item.url));
    const accepted=unique.slice(0,Math.max(0,max-current.length));
    if(key==='hero') onHeroChange([...current,...accepted].slice(0,max));
    else if(key==='banner') onBannerChange([...current,...accepted].slice(0,max));
    else onGalleryChange([...current,...accepted].slice(0,max));
    const missing=unique.length-accepted.length;
    if(missing) setSectionError(`${missing} image${missing===1?'':'s'} not added: section capacity reached.`);
    else setSectionError('');
    if(accepted.length) setPicker(null);
  };
  const Section = ({id,title,description,items,limit,accent}) => <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3">
    <div className="flex items-start gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}><Camera size={17}/></div><div className="min-w-0 flex-1"><h4 className="text-sm font-extrabold text-slate-800">{title}</h4><p className="mt-0.5 text-xs text-slate-500">{description}</p></div><span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">{items.length}/{limit}</span></div>
    <div className="space-y-2">
      {items.map((raw,index)=>{const item=normalize(raw);return <div key={item.url||index} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-2">
        <span className="w-5 shrink-0 text-center text-xs font-extrabold text-slate-400">{index+1}</span>
        <img src={item.url} alt={item.caption||`${title} ${index+1}`} className="h-14 w-20 shrink-0 rounded-lg bg-slate-100 object-cover sm:h-16 sm:w-24" onError={e=>{e.currentTarget.style.opacity='.3'}}/>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700">{item.caption||`Image ${index+1}`}</p><p className="truncate text-[10px] text-slate-400">{item.source||'image'}</p></div>
        <div className="flex shrink-0 flex-col gap-1"><button type="button" aria-label="Move image up" disabled={index===0} onClick={()=>move(items,index,-1,id==='hero'?onHeroChange:id==='banner'?onBannerChange:onGalleryChange)} className="rounded-md border border-slate-200 p-1 text-slate-500 disabled:opacity-25"><ChevronUp size={12}/></button><button type="button" aria-label="Move image down" disabled={index===items.length-1} onClick={()=>move(items,index,1,id==='hero'?onHeroChange:id==='banner'?onBannerChange:onGalleryChange)} className="rounded-md border border-slate-200 p-1 text-slate-500 disabled:opacity-25"><ChevronDown size={12}/></button></div>
        <button type="button" aria-label="Remove image" onClick={()=>removeAt(items,index,id==='hero'?onHeroChange:id==='banner'?onBannerChange:onGalleryChange)} className="shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15}/></button>
      </div>})}
      {items.length===0 && <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400">No images added yet.</div>}
    </div>
    {items.length<limit && <button type="button" onClick={()=>{setSectionError('');setPicker({id,title,items,limit})}} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><Plus size={15}/>Add image{items.length===0?'':'s'} from storage, upload or URL</button>}
    {id==='hero'&&items.length<4&&<p className="text-[11px] font-semibold text-amber-700">{4-items.length} image{4-items.length===1?'':'s'} missing on hero slideshow.</p>}
  </section>;
  return <div className="space-y-4">
    <div className="rounded-xl bg-emerald-950 px-4 py-3 text-white"><p className="text-sm font-extrabold">Destination images</p><p className="mt-1 text-xs text-emerald-100">Add images in one compact place per section. Use the arrows to set the display order.</p></div>
    <Section id="hero" title="Hero slideshow" description="Exactly four ordered images for the destination hero." items={heroSlides} limit={4} accent="bg-amber-50 text-amber-600"/>
    <Section id="banner" title="Banner / card slideshow" description="Up to four images used for destination cards." items={bannerSlides} limit={4} accent="bg-sky-50 text-sky-600"/>
    <Section id="gallery" title="Attractions & other images" description="Gallery imports are added directly to this collection." items={gallery} limit={MAX_GALLERY_IMAGES} accent="bg-emerald-50 text-emerald-600"/>
    {sectionError&&<p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{sectionError}</p>}
    <DestinationMediaPicker open={Boolean(picker)} onClose={()=>setPicker(null)} section={picker?.title||''} current={picker?.items||[]} capacity={picker?.limit||MAX_GALLERY_IMAGES} onAdd={items=>picker&&add(picker.id,items)}/>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function Destinations() {
  const toast     = useToast()
  const pag       = usePagination()
  const viewModal = useModal()
  const formModal = useModal()

  const [destinations, setDestinations]         = useState([])
  const [countries, setCountries]               = useState([])
  const [loading, setLoading]                   = useState(true)
  const [saving, setSaving]                     = useState(false)
  const [search, setSearch]                     = useState('')
  const [filterCountry, setFilterCountry]       = useState('')
  const [filterCategory, setFilterCategory]     = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterFeatured, setFilterFeatured]     = useState('')
  const [sortBy, setSortBy]                     = useState('name')
  const [sortOrder, setSortOrder]               = useState('asc')
  const [form, setForm]                         = useState(INITIAL_FORM)
  const [editing, setEditing]                   = useState(null)
  const [step, setStep]                         = useState('identity')
  const [completed, setCompleted]               = useState([])
  const [errors, setErrors]                     = useState({})
  const [showConfetti, setShowConfetti]         = useState(false)
  const [showCelebration, setShowCelebration]   = useState(false)
  const [celebrationMsg, setCelebrationMsg]     = useState('')
  const [deleteTarget, setDeleteTarget]         = useState(null)
  const [deleteOpen, setDeleteOpen]             = useState(false)
  const [lightboxImages, setLightboxImages]     = useState(null)
  const [lightboxStart, setLightboxStart]       = useState(0)

  const debouncedSearch = useDebounce(search, 400)

  useEffect(() => {
    countriesAPI.getAll({ limit: 200, is_active: true })
      .then(({ data }) => setCountries(data.data || data.countries || []))
      .catch(() => {})
  }, [])

  /* ── All form images for global lightbox ─────────────────────────── */
  const getAllFormImages = useCallback(() => {
    const imgs = []
    if (form.hero_image)      imgs.push({ url: form.hero_image,      caption: 'Hero Image',  source: 'hero'   })
    if (form.cover_image_url) imgs.push({ url: form.cover_image_url, caption: 'Cover Banner',source: 'cover'  })
    if (form.image_url)       imgs.push({ url: form.image_url,       caption: 'Main Image',  source: 'main'   })
    ;(form.gallery || []).forEach(g => imgs.push({ url: g.url, caption: g.caption || 'Gallery', source: 'gallery' }))
    ;(form.library_images || []).forEach(g => imgs.push({ url: g.url, caption: g.caption || 'Library', source: 'library' }))
    return imgs.filter(i => i.url)
  }, [form.image_url, form.hero_image, form.cover_image_url, form.gallery, form.library_images])

  const openLightbox = (images, startIndex = 0) => {
    setLightboxImages(images.filter(i => i.url))
    setLightboxStart(startIndex)
  }

  /* ── Load destinations ───────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(debouncedSearch  && { search: debouncedSearch }),
        ...(filterCountry    && { country_id: filterCountry }),
        ...(filterCategory   && { category: filterCategory }),
        ...(filterDifficulty && { difficulty: filterDifficulty }),
        ...(filterFeatured   && { is_featured: filterFeatured === 'true' }),
        include: 'gallery' // Request gallery data to include rich image information
      }
      const { data } = await destinationsAPI.getAll(params)
      setDestinations(data.data || data.destinations || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, debouncedSearch,
      filterCountry, filterCategory, filterDifficulty, filterFeatured])

  useEffect(() => { load() }, [load])

  /* ── Normalise gallery from API — split gallery vs library ───────── */
const normaliseGalleries = (dest) => {
  const raw = dest.gallery || []
  const gallery = []
  const library_images = []

  if (!raw.length) {
    // Fallback: images array becomes gallery
    const images = (dest.images || []).map((url, i) => ({
      url, caption: '', is_primary: i === 0, sort_order: i, source: 'url',
    }))
    return { gallery: images, library_images: [] }
  }

  raw.forEach((g, i) => {
    const url = g.imageUrl || g.url || ''
    if (!url) return
    const entry = {
      id: g.id, // Preserve the ID from the backend
      url,
      caption:    g.caption  || '',
      is_primary: g.isPrimary ?? g.is_primary ?? false,
      sort_order: g.sortOrder ?? g.sort_order ?? i,
      library_id: g.libraryId ?? g.library_id ?? null,
      source:     g.source || (g.libraryId || g.library_id ? 'library' : 'url'),
    }
    if (entry.source === 'library') library_images.push(entry)
    else gallery.push(entry)
  })

  gallery.sort((a, b) => a.sort_order - b.sort_order)
  return { gallery: gallery.slice(0, MAX_GALLERY_IMAGES), library_images }
}

  const normaliseTips = (dest) => {
    if (Array.isArray(dest.local_tips)) return dest.local_tips
    if (Array.isArray(dest.tips))       return dest.tips
    const raw = dest.localTips || dest.local_tips || ''
    if (typeof raw === 'string' && raw.startsWith('{')) {
      try {
        return raw.slice(1, -1).split('","').map(s => s.replace(/^"|"$/g, ''))
      } catch { return [] }
    }
    return []
  }

  /* ── Build form from API row ─────────────────────────────────────── */
  const buildForm = (dest) => {
    const { gallery, library_images } = normaliseGalleries(dest)
    return {
      name:               dest.name               || '',
      slug:               dest.slug               || '',
      tagline:            dest.tagline            || '',
      category:           dest.category           || dest.classification || dest.adventureCategory || '',
      destination_type:   dest.destinationType    || dest.destination_type || '',
      classification:     dest.classification     || '',
      adventure_category: dest.adventureCategory  || dest.adventure_category || '',
      difficulty:         dest.difficulty         || '',
      status:             dest.status             || 'published',
      region:             dest.region             || '',
      nearest_city:       dest.nearestCity        || dest.nearest_city || '',
      nearest_airport:    dest.nearestAirport     || dest.nearest_airport || '',
      address:            dest.address            || '',
      latitude:           dest.latitude           ?? '',
      longitude:          dest.longitude          ?? '',
      altitude_meters:    dest.altitudeMeters     ?? dest.altitude_meters ?? '',
      distance_from_airport_km: dest.distanceFromAirportKm ?? dest.distance_from_airport_km ?? '',

      description:        dest.description        || '',
      short_description:  dest.shortDescription   || dest.short_description || '',
      overview:           dest.overview           || '',
      getting_there:      dest.gettingThere       || dest.getting_there || '',
      what_to_expect:     dest.whatToExpect       || dest.what_to_expect || '',
      safety_info:        dest.safetyInfo         || dest.safety_info || '',
      best_time_to_visit: dest.bestTimeToVisit    || dest.best_time_to_visit || '',

      country_id:         dest.countryId          ?? dest.country_id ?? dest.country?.id ?? '',

      image_url:          dest.imageUrl           || dest.image_url || '',
      hero_image:         dest.heroImage          || dest.hero_image || '',
      cover_image_url:    dest.coverImageUrl      || dest.cover_image_url || '',
      video_url:          dest.videoUrl           || dest.video_url || '',
      virtual_tour_url:   dest.virtualTourUrl     || dest.virtual_tour_url || '',

      highlights:         dest.highlights         || [],
      activities:         Array.isArray(dest.activities) ? dest.activities : [],
      attractions:        Array.isArray(dest.attractions) ? dest.attractions : [],
      wildlife:           Array.isArray(dest.wildlife)   ? dest.wildlife   : [],
      duration_days:      dest.durationDays       ?? dest.duration_days ?? '',
      duration_nights:    dest.durationNights     ?? dest.duration_nights ?? '',
      duration_display:   dest.duration           || dest.durationDisplay || dest.duration_display || '',
      min_group_size:     dest.minGroupSize       ?? dest.min_group_size ?? '',
      max_group_size:     dest.maxGroupSize       ?? dest.max_group_size ?? '',
      min_age:            dest.minAge             ?? dest.min_age ?? '',
      fitness_level:      dest.fitnessLevel      || dest.fitness_level || '',
      entrance_fee:       dest.entranceFee       || dest.entrance_fee || '',
      operating_hours:    dest.operatingHours    || dest.operating_hours || '',
      local_tips:         normaliseTips(dest),
      tags:               dest.tags               || [],

      hero_slides: Array.isArray(dest.hero_slides || dest.heroSlides) ? (dest.hero_slides || dest.heroSlides).slice(0, HERO_IMAGE_COUNT) : gallery.slice(0, HERO_IMAGE_COUNT),
      banner_slides: Array.isArray(dest.banner_slides || dest.bannerSlides) ? (dest.banner_slides || dest.bannerSlides).slice(0, 4) : [],
      gallery: [...gallery.slice(HERO_IMAGE_COUNT), ...library_images],
      library_images: [],
      itinerary:          Array.isArray(dest.itinerary) ? dest.itinerary : [],
      faqs:               Array.isArray(dest.faqs)      ? dest.faqs      : [],

      meta_title:         dest.metaTitle          || dest.meta_title || '',
      meta_description:   dest.metaDescription    || dest.meta_description || '',

      is_active:          dest.isActive           ?? dest.is_active  ?? true,
      is_featured:        dest.isFeatured         ?? dest.is_featured ?? false,
      is_popular:         dest.isPopular          ?? dest.is_popular ?? false,
      is_new:             dest.isNew              ?? dest.is_new ?? false,
      is_eco_friendly:    dest.isEcoFriendly      ?? dest.is_eco_friendly ?? false,
      is_family_friendly: dest.isFamilyFriendly   ?? dest.is_family_friendly ?? false,
      is_sold_out:        dest.isSoldOut          ?? dest.is_sold_out ?? false,
    }
  }

  const openCreate = () => {
    setForm(INITIAL_FORM); setEditing(null)
    setStep('identity'); setCompleted([]); setErrors({})
    formModal.open()
  }

  const openEdit = (dest) => {
    setForm(buildForm(dest)); setEditing(dest)
    setStep('identity')
    setCompleted(['identity','details','content','media'])
    setErrors({})
    formModal.open()
  }

  const upd = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validateStep = (stepId) => {
    const e = {}
    if (stepId === 'identity') {
      if (!form.name.trim())   e.name       = 'Destination name is required'
      if (!form.country_id)    e.country_id = 'Please select a country'
      if (!form.category)      e.category   = 'Please select a category'
    }
    // Existing destinations may predate the current media requirements. Keep them editable;
    // enforce the full media checklist when creating a new destination.
    if (stepId === 'media') {
      const heroCount = (form.hero_slides || []).filter(Boolean).length
      const galleryCount = (form.gallery || []).filter(Boolean).length + (form.library_images || []).filter(Boolean).length
      if (heroCount < HERO_IMAGE_COUNT) e.hero_slides = `${HERO_IMAGE_COUNT - heroCount} image${HERO_IMAGE_COUNT - heroCount === 1 ? '' : 's'} missing on hero slideshow`
      if (galleryCount < 5) e.gallery = `${5 - galleryCount} attraction image${5 - galleryCount === 1 ? '' : 's'} missing`
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

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

  /* ── Save ─────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!validateStep('identity')) { setStep('identity'); return }
    if (!validateStep('media')) { setStep('media'); return }
    setSaving(true)
    try {
      const { gallery, library_images, hero_slides, itinerary, faqs, tags, local_tips, ...destinationFields } = form
      // Existing gallery entries are objects ({ url, id, caption, ... }) while
      // new-destination slots are plain URL strings. Normalize both shapes before
      // building API payloads so object values never leak into URL columns.
      const getImageUrl = (image) => {
        if (typeof image === 'string') return image.trim()
        if (image && typeof image === 'object') {
          return String(image.url || image.imageUrl || image.image_url || '').trim()
        }
        return ''
      }
      const heroImages = (hero_slides || []).map(getImageUrl).filter(Boolean)
      const galleryImages = (gallery || []).map(getImageUrl).filter(Boolean)
      const primaryHeroImage = getImageUrl(form.hero_image)
      const newDestinationImages = [...new Set([primaryHeroImage, ...heroImages, ...galleryImages].filter(Boolean))]
      const payload = {
        ...destinationFields,
        slug:         form.slug || toSlug(form.name),
        country_id:   form.country_id ? Number(form.country_id) : null,
        ...(editing ? {} : {
          image_urls: newDestinationImages,
          image_meta: newDestinationImages.map((url, index) => ({
            url,
            is_primary: index === 0,
            sort_order: index,
            source: index === 0 && primaryHeroImage ? 'hero' : (index <= HERO_IMAGE_COUNT && primaryHeroImage ? 'banner' : (index < HERO_IMAGE_COUNT ? 'banner' : 'attraction')),
          })),
          image_url: primaryHeroImage || heroImages[0] || null,
          hero_image: primaryHeroImage || heroImages[0] || null,
          cover_image_url: form.cover_image_url || heroImages[0] || galleryImages[0] || primaryHeroImage || null,
        }),
      }

      let savedDestination
      if (editing) {
        const response = await destinationsAPI.update(editing.id, payload)
        savedDestination = response.data?.data || response.data
        setCelebrationMsg(`"${form.name}" updated successfully!`)
      } else {
        const response = await destinationsAPI.create(payload)
        savedDestination = response.data?.data || response.data
        setCelebrationMsg(`"${form.name}" created successfully!`)
      }

// Merge gallery + library images for saving
// Only send images without ID (new images) to be created via addImages endpoint
// Images with ID are existing images - to modify existing images, 
// use the dedicated image management endpoints (not implemented in this form)
const existingImageUrls = new Set([
  ...(editing?.images || []),
  ...(editing?.image_urls || []),
  ...(editing?.imageUrls || []),
  ...(editing?.gallery || []).map(getImageUrl),
  editing?.hero_image,
  editing?.heroImage,
  editing?.cover_image_url,
  editing?.coverImageUrl,
].map(getImageUrl).filter(Boolean))
const allNewImages = [
  ...((editing
    ? (gallery || [])
    : [
        ...(heroImages || []).map((url, index) => ({ url, is_primary: index === 0, sort_order: index, source: 'banner' })),
        ...(galleryImages || []).map((url, index) => ({ url, is_primary: false, sort_order: index + 3, source: 'attraction' })),
      ]
  ).filter(image => !image.id && getImageUrl(image) && !existingImageUrls.has(getImageUrl(image))).map((image, index) => ({
    url: getImageUrl(image),
    caption: image.caption,
    is_primary: image.is_primary,
    sort_order: image.sort_order ?? index,
    source: image.source,
  }))),
  ...((editing ? (hero_slides || []) : []).map((image, index) => ({
    url: getImageUrl(image),
    caption: image?.caption || `Banner slide ${index + 1}`,
    is_primary: false,
    sort_order: index,
    source: 'banner',
  })).filter(image => image.url && !existingImageUrls.has(image.url))),
  ...(library_images || []).filter(image => !image.id && getImageUrl(image)).map(image => ({
    url: getImageUrl(image),
    caption: image.caption,
    library_id: image.library_id,
    source: 'library',
  })),
]
// Deduplicate by URL to avoid sending the same image multiple times in the same request
const seenUrls = new Set()
const uniqueNewImages = allNewImages.filter(img => {
  if (seenUrls.has(img.url)) return false
  seenUrls.add(img.url)
  return true
})

if (savedDestination?.id && uniqueNewImages.length) {
  const formData = new FormData()
  formData.append('image_urls', JSON.stringify(uniqueNewImages.map(image => image.url)))
  formData.append('image_meta', JSON.stringify(uniqueNewImages))
  await destinationsAPI.addImages(savedDestination.id, formData)
}

      if (savedDestination?.id) {
        await Promise.all((itinerary || []).filter(item => item.title?.trim()).map(item => {
          const data = {
            day_number: item.dayNumber || item.day,
            title: item.title,
            description: item.description || null,
            activities: item.activities || [],
            highlights: item.highlights || [],
            meals: item.meals || [],
            accommodation: item.accommodation || null,
            distance_km: item.distanceKm || null,
            image_url: item.imageUrl || null,
          }
          return item.id
            ? destinationsAPI.updateItineraryDay(savedDestination.id, item.id, data)
            : destinationsAPI.addItineraryDay(savedDestination.id, data)
        }))
        await Promise.all((faqs || []).filter(faq => faq.question?.trim() && faq.answer?.trim()).map(faq => {
          const data = { question: faq.question, answer: faq.answer, category: faq.category || null }
          return faq.id
            ? destinationsAPI.updateFaq(savedDestination.id, faq.id, data)
            : destinationsAPI.addFaq(savedDestination.id, data)
        }))
      }

      setShowConfetti(true); setShowCelebration(true)
      formModal.close(); load()
      setTimeout(() => { setShowConfetti(false); setShowCelebration(false) }, 3500)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const openDelete       = (row) => { setDeleteTarget(row); setDeleteOpen(true) }
  const handleDeleteDone = ()    => { setDeleteTarget(null); setDeleteOpen(false); load() }
  const handleSort       = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  /* ── Table columns ────────────────────────────────────────────────── */
  const columns = [
    {
      key: 'name', label: 'Destination', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3 min-w-0">
          {row.imageUrl || row.image_url
            ? <img src={row.imageUrl||row.image_url} alt={row.name}
                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200"
                onError={e=>{e.target.style.display='none'}}/>
            : <Avatar name={row.name} size="sm" rounded="lg"/>}
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{row.name}</p>
            <p className="text-xs text-gray-400 truncate">{row.countryName||row.country?.name||'—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category', label: 'Category',
      render: v => v ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{v}</span>
      ) : '—',
    },
    {
      key: 'difficulty', label: 'Difficulty',
      render: v => {
        const colors = {
          easy:'bg-green-50 text-green-700 border-green-200',
          moderate:'bg-yellow-50 text-yellow-700 border-yellow-200',
          challenging:'bg-orange-50 text-orange-700 border-orange-200',
          strenuous:'bg-red-50 text-red-700 border-red-200',
          expert:'bg-purple-50 text-purple-700 border-purple-200',
        }
        return v ? (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${colors[v]||'bg-gray-100 text-gray-600 border-gray-200'}`}>{v}</span>
        ) : '—'
      },
    },
    {
      key: 'rating', label: 'Rating', align: 'center',
      render: v => v ? (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600">
          <Star size={12} className="fill-amber-500 text-amber-500"/>{Number(v).toFixed(1)}
        </span>
      ) : '—',
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: (v, row) => (v || row.isFeatured)
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto"/>
        : <span className="text-gray-300 block text-center">—</span>,
    },
    {
      key: 'is_active', label: 'Status',
      render: (v, row) => {
        const active = v ?? row.isActive
        return <Badge status={active ? 'active' : 'inactive'} label={active ? 'Active' : 'Inactive'}/>
      },
    },
  ]

  /* ── Step render ──────────────────────────────────────────────────── */
  const slideVariants = {
    enter:  dir => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
    center: { opacity: 1, x: 0 },
    exit:   dir => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
  }

  const renderStep = () => {
    const tr      = { duration: 0.22, ease: 'easeInOut' }
    const allImgs = getAllFormImages()

    switch (step) {

      /* ─── IDENTITY ──────────────────────────────────────────────── */
      case 'identity': return (
        <motion.div key="identity" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><MapPin size={18} className="text-emerald-600"/></div>
            <div><h3 className="text-sm font-bold text-emerald-800">Destination Identity</h3><p className="text-xs text-emerald-600">Core name, category and location</p></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Destination Name" required icon={MapPin}>
              <input className={`${inputClass} ${errors.name?'border-red-400':''}`}
                value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="e.g., Mount Karisimbi"/>
              {errors.name&&<p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>{errors.name}</p>}
            </Field>

            <Field label="URL Slug" hint="Auto-generated if blank" icon={Hash}>
              <input className={`${inputClass} font-mono text-xs`} value={form.slug}
                onChange={e=>upd('slug',e.target.value)} placeholder="mount-karisimbi"/>
            </Field>

            <Field label="Tagline" icon={FileText}>
              <input className={inputClass} value={form.tagline}
                onChange={e=>upd('tagline',e.target.value)} placeholder="The Roof of the Virungas"/>
            </Field>

            <Field label="Country" required icon={Globe2}>
              <select className={`${selectClass} ${errors.country_id?'border-red-400':''}`}
                value={form.country_id} onChange={e=>upd('country_id',e.target.value)}>
                <option value="">Select country…</option>
                {countries.map(c=>(
                  <option key={c.id} value={c.id}>{c.flag} {c.name}</option>
                ))}
              </select>
              {errors.country_id&&<p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>{errors.country_id}</p>}
            </Field>

            <Field label="Category" required icon={Tag}>
              <input className={`${inputClass} ${errors.category?'border-red-400':''}`}
                value={form.category} onChange={e=>upd('category',e.target.value)} placeholder="Enter category (e.g., Safari, Beach, Cultural)"/>
              {errors.category&&<p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>{errors.category}</p>}
            </Field>

            <Field label="Difficulty" icon={Activity}>
              <select className={selectClass} value={form.difficulty} onChange={e=>upd('difficulty',e.target.value)}>
                <option value="">Select difficulty…</option>
                {DIFFICULTIES.map(d=><option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </Field>

            <Field label="Status" icon={Shield}>
              <select className={selectClass} value={form.status} onChange={e=>upd('status',e.target.value)}>
                {STATUSES.map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </Field>

            <Field label="Region / Province" icon={MapPin}>
              <input className={inputClass} value={form.region}
                onChange={e=>upd('region',e.target.value)} placeholder="Northern Province"/>
            </Field>
          </div>
        </motion.div>
      )

       /* ─── DETAILS ───────────────────────────────────────────────── */
       case 'details': return (
         <motion.div key="details" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
           <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-teal-50 border border-green-100">
             <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><Info size={18} className="text-green-600"/></div>
             <div><h3 className="text-sm font-bold text-green-800">Descriptions & Practical Info</h3><p className="text-xs text-green-600">Rich content for travelers</p></div>
           </div>

           <Field label="Short Description" icon={FileText}>
             <textarea className={textareaClass} value={form.short_description} onChange={e=>upd('short_description',e.target.value)} />
           </Field>
           <Field label="Description" icon={BookOpen}>
             <textarea className={`${textareaClass} min-h-[140px]`} value={form.description} onChange={e=>upd('description',e.target.value)} />
           </Field>
           <Field label="Overview" icon={Info}>
             <textarea className={textareaClass} value={form.overview} onChange={e=>upd('overview',e.target.value)} />
           </Field>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Field label="Getting There" icon={Plane}><textarea className={textareaClass} value={form.getting_there} onChange={e=>upd('getting_there',e.target.value)} /></Field>
             <Field label="What to Expect" icon={Compass}><textarea className={textareaClass} value={form.what_to_expect} onChange={e=>upd('what_to_expect',e.target.value)} /></Field>
             <Field label="Best Time to Visit" icon={Calendar}><textarea className={textareaClass} value={form.best_time_to_visit} onChange={e=>upd('best_time_to_visit',e.target.value)} /></Field>
             <Field label="Safety Information" icon={Shield}><textarea className={textareaClass} value={form.safety_info} onChange={e=>upd('safety_info',e.target.value)} /></Field>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Field label="Nearest City" icon={MapPin}><input className={inputClass} value={form.nearest_city} onChange={e=>upd('nearest_city',e.target.value)} /></Field>
             <Field label="Nearest Airport" icon={Plane}><input className={inputClass} value={form.nearest_airport} onChange={e=>upd('nearest_airport',e.target.value)} /></Field>
             <Field label="Address" icon={MapPin}><input className={inputClass} value={form.address} onChange={e=>upd('address',e.target.value)} /></Field>
             <Field label="Distance from Airport (km)" icon={Ruler}><input className={inputClass} type="number" step="any" value={form.distance_from_airport_km} onChange={e=>upd('distance_from_airport_km',e.target.value)} /></Field>
             <Field label="Duration (days)" icon={Calendar}><input className={inputClass} type="number" value={form.duration_days} onChange={e=>upd('duration_days',e.target.value)} /></Field>
             <Field label="Duration (nights)" icon={Calendar}><input className={inputClass} type="number" value={form.duration_nights} onChange={e=>upd('duration_nights',e.target.value)} /></Field>
             <Field label="Entrance Fee" icon={DollarSign}><input className={inputClass} value={form.entrance_fee} onChange={e=>upd('entrance_fee',e.target.value)} /></Field>
             <Field label="Operating Hours" icon={Clock}><input className={inputClass} value={form.operating_hours} onChange={e=>upd('operating_hours',e.target.value)} /></Field>
           </div>
         </motion.div>
       )

      /* ─── CONTENT ───────────────────────────────────────────────── */
      case 'content': return (
        <motion.div key="content" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><BookOpen size={18} className="text-emerald-600"/></div>
            <div><h3 className="text-sm font-bold text-emerald-800">Content & Lists</h3><p className="text-xs text-emerald-600">Highlights, tags & FAQs</p></div>
          </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Field label="Highlights" icon={Star}><TagInput value={form.highlights} onChange={v=>upd('highlights',v)} /></Field>
             <Field label="Activities" icon={Activity}><TagInput value={form.activities} onChange={v=>upd('activities',v)} /></Field>
             <Field label="Wildlife" icon={TreePine}><TagInput value={form.wildlife} onChange={v=>upd('wildlife',v)} /></Field>
             <Field label="Local Tips" icon={Coffee}><TagInput value={form.local_tips} onChange={v=>upd('local_tips',v)} /></Field>
           </div>
           <div className="p-5 rounded-2xl border-2 border-gray-100 bg-white">
             <AttractionEditor attractions={form.attractions} onChange={v=>upd('attractions',v)} />
           </div>
           <div className="p-5 rounded-2xl border-2 border-gray-100 bg-white">
             <FaqEditor faqs={form.faqs} onChange={v=>upd('faqs',v)}/>
           </div>
           <div className="p-5 rounded-2xl border-2 border-gray-100 bg-white">
             <ItineraryEditor items={form.itinerary} onChange={v=>upd('itinerary',v)}/>
           </div>
        </motion.div>
      )

      /* ─── MEDIA ─────────────────────────────────────────────────── */
      case 'media': return (
        !editing ? (
          <motion.div key="media-new" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
            <section className="space-y-3">
              <div className="flex items-center gap-2"><Sun size={15} className="text-amber-500"/><div><h4 className="text-sm font-extrabold text-slate-800">Hero image</h4><p className="text-xs text-slate-500">The main visual for the destination detail page.</p></div></div>
              <HeroImagePanel label="Hero image" description="Main destination page visual" value={form.hero_image} onChange={v=>upd('hero_image',v)} folder="destinations/hero" theme="amber" icon={Sun} allImages={allImgs} onLightbox={openLightbox}/>
            </section>
            <NewDestinationMedia
              heroSlides={form.hero_slides}
              gallery={form.gallery}
              onHeroChange={v=>upd('hero_slides',v)}
              onGalleryChange={v=>upd('gallery',v)}
              heroTitle="Banner / card slideshow"
              heroDescription="These images rotate on destination cards throughout the traveller-facing site."
              galleryTitle="Attraction & other images"
            />
            {(errors.hero_slides || errors.gallery || errors.attractions) && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
                <p className="font-bold">Complete the media checklist to continue:</p>
                {errors.hero_slides && <p>• {errors.hero_slides}</p>}
                {errors.gallery && <p>• {errors.gallery}</p>}
                {errors.attractions && <p>• {errors.attractions} — return to the Content step to add them.</p>}
              </div>
            )}
          </motion.div>
        ) : (
<motion.div key="media" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-6">
          {/* Header banner */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-emerald-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Camera size={18} className="text-emerald-600"/></div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-800">Media Library</h3>
              <p className="text-xs text-emerald-600">Manage hero images, banners, gallery uploads and library imports</p>
            </div>
            {allImgs.length>0 && (
              <button type="button" onClick={()=>openLightbox(allImgs,0)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition-all shadow-sm">
                <Maximize2 size={11}/>View all {allImgs.length}
              </button>
            )}
          </div>

          {/* 1. Hero image: the main destination detail-page image */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun size={15} className="text-amber-500"/>
              <div><h4 className="text-sm font-extrabold text-slate-800">Hero image</h4><p className="text-xs text-slate-500">The primary image shown first on the destination detail page.</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HeroImagePanel label="Hero image" description="Main destination page visual" value={form.hero_image} onChange={v=>upd('hero_image',v)} folder="destinations/hero" theme="amber" icon={Sun} allImages={allImgs} onLightbox={openLightbox}/>
              <HeroImagePanel label="Main image fallback" description="Used when the hero image is unavailable" value={form.image_url} onChange={v=>upd('image_url',v)} folder="destinations/main" theme="emerald" icon={Image} allImages={allImgs} onLightbox={openLightbox}/>
            </div>
          </section>

          {/* 2. Banner/card slideshow images */}
          <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0"><Layers size={17}/></div>
              <div className="min-w-0 flex-1"><h4 className="text-sm font-extrabold text-slate-800">Banner / card slideshow images</h4><p className="text-xs text-slate-600 mt-1">These images rotate in destination cards across the traveller-facing site. Add up to four slides; each slot has its own preview and upload control.</p></div>
              <span className="shrink-0 rounded-full bg-white border border-sky-200 px-2.5 py-1 text-xs font-bold text-sky-700">{(form.hero_slides||[]).filter(Boolean).length}/4</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[0,1,2,3].map((index)=>{
                const slide=form.hero_slides?.[index]||'';
                return <div key={index} className="rounded-xl border border-sky-200 bg-white p-3 space-y-3 min-w-0">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-700">Banner slide {index+1}</span><span className={`text-[10px] font-semibold ${slide?'text-emerald-600':'text-slate-400'}`}>{slide?'Ready':'Empty slot'}</span></div>
                  <div className="aspect-[16/10] rounded-lg overflow-hidden bg-slate-50 border border-dashed border-sky-200 flex items-center justify-center">
                    {slide?<img src={typeof slide==='string'?slide:(slide.url||slide.image_url||'')} alt={`Banner slide ${index+1}`} className="w-full h-full object-cover" onError={e=>{e.currentTarget.style.opacity='.25'}}/>:<div className="text-center p-3"><ImagePlus size={22} className="mx-auto text-sky-400"/><p className="text-xs text-slate-500 mt-2">Image preview appears here</p></div>}
                  </div>
                  <ImageUpload label="" value="" onChange={value=>{const next=[...(form.hero_slides||[])];next[index]=value||'';upd('hero_slides',next)}} folder="destinations/banner-slides"/>
                  {slide&&<button type="button" onClick={()=>{const next=[...(form.hero_slides||[])];next[index]='';upd('hero_slides',next)}} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Remove slide</button>}
                </div>
              })}
            </div>
            <HeroImagePanel label="Card cover / fallback banner" description="Fallback thumbnail if no slideshow image is available" value={form.cover_image_url} onChange={v=>upd('cover_image_url',v)} folder="destinations/cover" theme="sky" icon={Palette} allImages={allImgs} onLightbox={openLightbox}/>
          </section>

          {/* 3. Attraction and other destination images */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Camera size={15} className="text-emerald-600"/>
              <div><h4 className="text-sm font-extrabold text-slate-800">Attraction & other images</h4><p className="text-xs text-slate-500">Supporting photos shown in the destination gallery and attraction sections.</p></div>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">{(form.gallery||[]).length} photos</span>
            </div>
            <DestinationGallery gallery={form.gallery} onChange={v=>upd('gallery',v)} onLightbox={openLightbox}/>
          </section>

          {/* Section 3: Library Imports (unlimited) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Library size={14} className="text-violet-500"/>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Library Imports</h4>
              <div className="flex-1 h-px bg-gray-200"/>
              <span className="text-[10px] text-gray-400 font-medium">Reused from central gallery — unlimited</span>
            </div>
            <LibraryImportPanel libraryImages={form.library_images} onChange={v=>upd('library_images',v)} onLightbox={openLightbox}/>
          </div>


        </motion.div>
        )
      )

      /* ─── SETTINGS ──────────────────────────────────────────────── */
      case 'settings': return (
        <motion.div key="settings" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Shield size={18} className="text-gray-600"/></div>
            <div><h3 className="text-sm font-bold text-gray-800">Settings & Visibility</h3><p className="text-xs text-gray-600">SEO, flags and publication status</p></div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-100 space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider"><Globe size={11} className="text-blue-500"/>SEO</p>
            <Field label="Meta Title" icon={FileText}>
              <input className={inputClass} value={form.meta_title}
                onChange={e=>upd('meta_title',e.target.value)} placeholder="Mount Karisimbi Trek | Rwanda Adventures"/>
            </Field>
            <Field label="Meta Description" icon={FileText}>
              <textarea className={`${textareaClass} min-h-[80px]`} value={form.meta_description}
                onChange={e=>upd('meta_description',e.target.value)}
                placeholder="Summit Africa's highest volcano on this 2-day trek…"/>
            </Field>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider"><Flag size={11} className="text-emerald-500"/>Visibility Flags</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FlagToggle checked={form.is_active}          onChange={v=>upd('is_active',v)}          label="Active & Published"  desc="Visible on the public site"        icon={Shield}/>
              <FlagToggle checked={form.is_featured}        onChange={v=>upd('is_featured',v)}        label="Featured"            desc="Shown in featured sections"        icon={Star}/>
              <FlagToggle checked={form.is_popular}         onChange={v=>upd('is_popular',v)}         label="Popular"             desc="Marked as a popular destination"   icon={TrendingUp}/>
              <FlagToggle checked={form.is_new}             onChange={v=>upd('is_new',v)}             label="New"                 desc="Show 'New' badge on destination"   icon={Award}/>
              <FlagToggle checked={form.is_eco_friendly}    onChange={v=>upd('is_eco_friendly',v)}    label="Eco Friendly"        desc="Eco-certified experience"          icon={TreePine}/>
              <FlagToggle checked={form.is_family_friendly} onChange={v=>upd('is_family_friendly',v)} label="Family Friendly"     desc="Suitable for families with kids"   icon={Users}/>
              <FlagToggle checked={form.is_sold_out}        onChange={v=>upd('is_sold_out',v)}        label="Sold Out"            desc="Mark as currently sold out"        icon={X}/>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Check size={14} className="text-emerald-200"/>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Ready to Save — Summary</p>
            </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Name',            form.name          || '—'],
                ['Country',         countries.find(c=>String(c.id)===String(form.country_id))?.name || '—'],
                ['Category',        form.category      || '—'],
                ['Difficulty',      form.difficulty    || '—'],
                ['Status',          form.is_active     ? '✓ Active' : '○ Draft'],
                ['Gallery',         `${(form.gallery||[]).length} / ${MAX_GALLERY_IMAGES}`],
                ['Library imports', `${(form.library_images||[]).length}`],
                ['Hero + Cover',    `${[form.hero_image,form.cover_image_url,form.image_url].filter(Boolean).length}/3`],
                ['Featured',        form.is_featured   ? '⭐ Yes' : 'No'],
              ].map(([k,v])=>(
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

  /* ── View modal images ────────────────────────────────────────────── */
  const getViewImages = (dest) => {
    if (!dest) return []
    const imgs = []
    if (dest.heroImage || dest.hero_image)
      imgs.push({ url: dest.heroImage||dest.hero_image, caption: 'Hero Image', source: 'hero' })
    if (dest.coverImageUrl || dest.cover_image_url)
      imgs.push({ url: dest.coverImageUrl||dest.cover_image_url, caption: 'Cover Banner', source: 'cover' })
    if (dest.imageUrl || dest.image_url)
      imgs.push({ url: dest.imageUrl||dest.image_url, caption: 'Main Image', source: 'main' })
    const galleryRaw = dest.gallery || []
    galleryRaw.forEach(g => {
      const url = g.imageUrl || g.url || ''
      if (url) imgs.push({ url, caption: g.caption || 'Gallery', source: g.source || 'gallery' })
    })
    ;(dest.images || []).forEach((url, i) => {
      if (!imgs.find(im => im.url === url))
        imgs.push({ url, caption: `Image ${i+1}`, source: 'gallery' })
    })
    return imgs.filter(i => i.url)
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="admin-page premium-page destination-command-center space-y-5 page-enter">
      <Confetti active={showConfetti}/>
      <SuccessCelebration show={showCelebration} message={celebrationMsg} onDone={()=>setShowCelebration(false)}/>

      <AnimatePresence>
        {lightboxImages && (
          <Lightbox images={lightboxImages} startIndex={lightboxStart} onClose={()=>setLightboxImages(null)}/>
        )}
      </AnimatePresence>

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><MapPin size={28} className="text-emerald-600"/> Destinations</h1>
          <p className="page-subtitle">Manage all destinations ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading?'animate-spin':''}/></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={16}/> Add Destination</button>
        </div>
      </div>

      <div className="management-filter-panel card p-4">
        <div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-sm font-extrabold text-slate-800">Destination catalogue</p><p className="text-xs text-slate-400">Search, segment and manage your travel inventory</p></div><span className="badge badge-green">{pag.total.toLocaleString()} records</span></div><FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search destinations…" className="max-w-sm"/>
          <FilterSelect label="Country" value={filterCountry}
            onChange={v=>{setFilterCountry(v);pag.reset()}}
            options={[{value:'',label:'All Countries'},...countries.map(c=>({value:String(c.id),label:c.name}))]}/>
          <FilterSelect label="Category" value={filterCategory}
            onChange={v=>{setFilterCategory(v);pag.reset()}}
            options={[{value:'',label:'All Categories'},...CATEGORIES.map(c=>({value:c,label:c}))]}/>
          <FilterSelect label="Difficulty" value={filterDifficulty}
            onChange={v=>{setFilterDifficulty(v);pag.reset()}}
            options={[{value:'',label:'All Difficulties'},...DIFFICULTIES.map(d=>({value:d,label:d}))]}/>
          <FilterSelect label="Featured" value={filterFeatured}
            onChange={v=>{setFilterFeatured(v);pag.reset()}}
            options={[{value:'',label:'All'},{value:'true',label:'Featured'},{value:'false',label:'Not Featured'}]}/>
        </FilterBar>
      </div>

      <div className="management-table-shell card">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">Destination inventory</p><p className="text-xs text-slate-400 hidden sm:block">Click a row to open the full destination workspace</p></div><span className="text-xs font-semibold text-slate-400">{loading ? "Loading…" : `${destinations.length} shown`}</span></div>
        <Table
          columns={columns} data={destinations} loading={loading}
          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
          onRowClick={row=>viewModal.open(row)} emptyMessage="No destinations found"
          hoverActions={[
            {label:'View',   icon:Eye,    onClick:row=>viewModal.open(row)},
            {label:'Edit',   icon:Pencil, onClick:row=>openEdit(row)},
            {label:'Delete', icon:Trash2, variant:'danger', onClick:row=>openDelete(row)},
          ]}
        />
        <Pagination
          page={pag.page} totalPages={pag.totalPages} total={pag.total} limit={pag.limit}
          hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ── View Modal ── */}
      <Modal
        isOpen={viewModal.isOpen} onClose={viewModal.close}
        title={viewModal.data?.name}
        subtitle={viewModal.data?.tagline || viewModal.data?.category}
        size="lg"
        icon={<MapPin size={20}/>}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">Close</button>
            <button onClick={()=>{viewModal.close();openEdit(viewModal.data)}} className="btn-primary">
              <Pencil size={14}/> Edit
            </button>
          </div>
        }
      >
        {viewModal.data && (() => {
          const d        = viewModal.data
          const viewImgs = getViewImages(d)
          const tips     = normaliseTips(d)
          return (
            <div className="space-y-5">
              {viewImgs.length>0&&(
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden group cursor-pointer" onClick={()=>openLightbox(viewImgs,0)}>
                    <img src={viewImgs[0].url} alt={d.name} className="w-full h-52 object-cover"
                      onError={e=>{e.target.src='https://placehold.co/800x400?text=No+Image'}}/>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-800 text-sm font-bold shadow-lg">
                        <Maximize2 size={14}/> View Full Size
                      </div>
                    </div>
                    {viewImgs.length>1&&<div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium">{viewImgs.length} photos</div>}
                  </div>
                  {viewImgs.length>1&&(
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
                      {viewImgs.map((img,i)=>(
                        <button key={i} type="button" onClick={()=>openLightbox(viewImgs,i)}
                          className="shrink-0 relative group w-20 h-14 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-emerald-400 transition-all">
                          <img src={img.url} alt={img.caption||''} className="w-full h-full object-cover"
                            onError={e=>{e.target.src='https://placehold.co/80x56?text=?'}}/>
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><ZoomIn size={12} className="text-white"/></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ModalSection title="Overview">
                <ModalGrid>
                  <ModalField label="Country"     value={d.countryName||d.country?.name}/>
                  <ModalField label="Category"    value={d.category||d.classification}/>
                  <ModalField label="Difficulty"  value={d.difficulty}/>
                  <ModalField label="Region"      value={d.region}/>
                  <ModalField label="Rating"      value={d.rating ? `${d.rating} ⭐ (${d.reviewCount||d.review_count||0} reviews)` : '—'}/>
                  <ModalField label="Status"      value={<Badge status={(d.isActive||d.is_active)?'active':'inactive'} label={(d.isActive||d.is_active)?'Active':'Inactive'}/>}/>
                </ModalGrid>
              </ModalSection>

              {d.description&&<ModalSection title="Description"><p className="text-sm text-gray-600 leading-relaxed">{d.description}</p></ModalSection>}
              {(d.shortDescription||d.short_description)&&<ModalSection title="Short Description"><p className="text-sm text-gray-600">{d.shortDescription||d.short_description}</p></ModalSection>}
              {d.overview&&<ModalSection title="Overview"><p className="text-sm text-gray-600 leading-relaxed">{d.overview}</p></ModalSection>}

              {d.highlights?.length>0&&(
                <ModalSection title="Highlights">
                  <div className="flex flex-wrap gap-2">
                    {d.highlights.map((h,i)=>(
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{h}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              {Array.isArray(d.attractions)&&d.attractions.length>0&&(
                <ModalSection title="Attractions">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {d.attractions.map((item,index)=>{
                      const name = typeof item === 'string' ? item : item.name || item.title || `Attraction ${index+1}`
                      const image = typeof item === 'object' ? item.imageUrl || item.image_url || item.image || item.url : ''
                      const description = typeof item === 'object' ? item.description || item.summary || '' : ''
                      return <article key={item.id || `${name}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {image && <img src={image} alt={name} className="w-full aspect-[16/9] object-cover" onError={e=>{e.currentTarget.style.display='none'}}/>}
                        <div className="p-3"><h4 className="text-sm font-bold text-slate-800 break-words">{name}</h4>{description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{description}</p>}</div>
                      </article>
                    })}
                  </div>
                </ModalSection>
              )}

              {Array.isArray(d.tags)&&d.tags.length>0&&(
                <ModalSection title="Tags">
                  <div className="flex flex-wrap gap-2">{d.tags.map((tag,index)=><span key={tag.id || index} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{typeof tag==='string'?tag:tag.name || tag.label || JSON.stringify(tag)}</span>)}</div>
                </ModalSection>
              )}

              {Array.isArray(d.activities)&&d.activities.length>0&&(
                <ModalSection title="Activities">
                  <div className="flex flex-wrap gap-2">
                    {d.activities.map((a,i)=>(
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{a}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              {Array.isArray(d.wildlife)&&d.wildlife.length>0&&(
                <ModalSection title="Wildlife">
                  <div className="flex flex-wrap gap-2">
                    {d.wildlife.map((w,i)=>(
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200">{w}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              {tips.length>0&&(
                <ModalSection title="Local Tips">
                  <ul className="space-y-1.5">
                    {tips.map((t,i)=>(
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0"/> {t}
                      </li>
                    ))}
                  </ul>
                </ModalSection>
              )}

              {(d.gettingThere||d.getting_there)&&<ModalSection title="Getting There"><p className="text-sm text-gray-600">{d.gettingThere||d.getting_there}</p></ModalSection>}
              {(d.whatToExpect||d.what_to_expect)&&<ModalSection title="What to Expect"><p className="text-sm text-gray-600">{d.whatToExpect||d.what_to_expect}</p></ModalSection>}
              {(d.safetyInfo||d.safety_info)&&<ModalSection title="Safety Info"><p className="text-sm text-gray-600">{d.safetyInfo||d.safety_info}</p></ModalSection>}

              {d.itinerary?.length>0&&(
                <ModalSection title="Itinerary">
                  <div className="space-y-3">
                    {d.itinerary.map((it,i)=>(
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{it.day||i+1}</div>
                        <div>
                          {it.title&&<p className="text-sm font-bold text-gray-800">{it.title}</p>}
                          {it.description&&<p className="text-xs text-gray-600 mt-1">{it.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ModalSection>
              )}

              {d.faqs?.length>0&&(
                <ModalSection title="FAQs">
                  <div className="space-y-3">
                    {d.faqs.map((faq,i)=>(
                      <div key={i} className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-sm font-bold text-blue-800">{faq.question}</p>
                        <p className="text-sm text-blue-700 mt-1">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </ModalSection>
              )}

              <ModalSection title="All saved destination details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(d).filter(([key, value]) =>
                    !['gallery','images','image_urls','imageUrls','hero_slides','heroSlides','hero_images','heroImages','attractions','highlights','activities','wildlife','local_tips','localTips','faqs','itinerary','tags'].includes(key) &&
                    value !== null && value !== undefined && value !== '' &&
                    !(typeof value === 'boolean' && !value)
                  ).map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, ch => ch.toUpperCase()).trim()
                    const rendered = Array.isArray(value)
                      ? value.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' · ')
                      : typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value)
                    return <div key={key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">{label}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{rendered}</p>
                    </div>
                  })}
                </div>
              </ModalSection>

              <ModalSection title="Stats & Flags">
                <ModalGrid>
                  <ModalField label="Featured"        value={<BooleanBadge value={d.isFeatured||d.is_featured}/>}/>
                  <ModalField label="Popular"         value={<BooleanBadge value={d.isPopular||d.is_popular}/>}/>
                  <ModalField label="Eco Friendly"    value={<BooleanBadge value={d.isEcoFriendly||d.is_eco_friendly}/>}/>
                  <ModalField label="Family Friendly" value={<BooleanBadge value={d.isFamilyFriendly||d.is_family_friendly}/>}/>
                  <ModalField label="Sold Out"        value={<BooleanBadge value={d.isSoldOut||d.is_sold_out} trueLabel="Yes" falseLabel="No"/>}/>
                  <ModalField label="Views"           value={formatNumber(d.viewCount||d.view_count)}/>
                  <ModalField label="Bookings"        value={formatNumber(d.bookingCount||d.booking_count)}/>
                  <ModalField label="Total Photos"    value={viewImgs.length}/>
                </ModalGrid>
              </ModalSection>
              <ModalSection title="Complete record — no fields hidden">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 overflow-auto max-h-[420px]">
                  <pre className="text-[11px] leading-5 text-slate-600 whitespace-pre-wrap break-words">{JSON.stringify(d, null, 2)}</pre>
                </div>
              </ModalSection>

            </div>
          )
        })()}
      </Modal>

      {/* ── Form Modal ── */}
      <Modal
        isOpen={formModal.isOpen} onClose={formModal.close}
        title={editing?`Edit: ${editing.name}`:'Add New Destination'}
        size="xl" icon={<MapPin size={20}/>}
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {STEP_IDS.map(id=>(
                <div key={id} className={`h-1.5 rounded-full transition-all duration-300
                  ${id===step?'w-8 bg-emerald-500':completed.includes(id)?'w-4 bg-emerald-300':'w-4 bg-gray-200'}`}/>
              ))}
              <span className="text-xs text-gray-400 ml-1">{stepIndex+1}/{STEPS.length}</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto min-w-0 flex-wrap sm:flex-nowrap justify-end">
              {stepIndex>0&&(
                <button onClick={goPrev} className="btn-secondary btn-sm" disabled={saving}>
                  <ChevronLeft size={15}/> Back
                </button>
              )}
              {stepIndex<STEPS.length-1
                ? <motion.button whileHover={{scale:1.02}} whileTap={{scale:.98}}
                    onClick={goNext} className="btn-primary btn-sm">
                    Continue <ChevronRight size={15}/>
                  </motion.button>
                : <motion.button whileHover={{scale:1.02}} whileTap={{scale:.98}}
                    onClick={handleSave} className="btn-primary" disabled={saving}>
                    {saving?<><Spinner/>Saving…</>
                    :editing?<><Check size={15}/>Update Destination</>
                    :<><Check size={15}/>Create Destination</>}
                  </motion.button>
              }
            </div>
          </div>
        }
      >
        <div>
          <StepIndicator steps={STEPS} current={step} completed={completed} onGoTo={id=>setStep(id)}/>
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {deleteOpen&&(
          <DeleteDialog
            isOpen={deleteOpen} target={deleteTarget}
            onClose={()=>{setDeleteOpen(false);setDeleteTarget(null)}}
            onDeleted={handleDeleteDone}
          />
        )}
      </AnimatePresence>
    </div>
  )
}