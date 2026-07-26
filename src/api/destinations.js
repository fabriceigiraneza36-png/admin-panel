// admin/src/pages/Destinations.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapPin, Plus, Eye, Pencil, Trash2, RefreshCw, Star,
  DollarSign, Image, Info, Check, ChevronRight, ChevronLeft,
  AlertTriangle, Heart, BookOpen, Camera, Shield,
  Clock, Users, Ruler, Thermometer, Plane, Link, Upload,
  X, ZoomIn, ExternalLink, CheckCircle2, ImagePlus, Maximize2,
  ChevronDown, ChevronUp, Eye as EyeIcon, Globe2, Mountain,
  Navigation, Hash, FileText, List, Tag, Flag,
  Video, Globe, Calendar, TrendingUp, Award,
  Compass, TreePine, Bike, Coffee, Tent, Activity,
} from 'lucide-react'
import { destinationsAPI } from '@api/destinations'
import { countriesAPI }    from '@api/countries'
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
import { formatNumber }    from '@utils/formatters'
import { getErrorMessage } from '@api/client'
import { motion, AnimatePresence } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const DIFFICULTIES = ['easy', 'moderate', 'challenging', 'difficult', 'expert']
const STATUSES     = ['draft', 'published', 'archived']
const CATEGORIES   = [
  'Mountain Climbing', 'Safari', 'Beach', 'Cultural', 'Adventure',
  'Wildlife', 'Trekking', 'Water Sports', 'City Tour', 'Historical',
  'Eco Tourism', 'Photography', 'Gorilla Trekking', 'Bird Watching',
  'Cycling', 'Camping', 'Diving', 'Surfing', 'Fishing', 'Other',
]

/* Controller SORT_MAP values — must match backend */
const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest First'      },
  { value: 'oldest',   label: 'Oldest First'      },
  { value: 'name',     label: 'Name (A-Z)'        },
  { value: '-name',    label: 'Name (Z-A)'        },
  { value: 'rating',   label: 'Highest Rated'     },
  { value: 'featured', label: 'Featured First'    },
  { value: 'popular',  label: 'Most Popular'      },
  { value: 'views',    label: 'Most Viewed'       },
  { value: 'duration', label: 'Shortest Duration' },
]

const INITIAL_FORM = {
  // Identity
  name:               '',
  slug:               '',
  tagline:            '',
  category:           '',
  destination_type:   '',
  difficulty:         '',
  status:             'draft',
  region:             '',
  nearest_city:       '',
  nearest_airport:    '',
  distance_from_airport_km: '',
  address:            '',

  // Descriptions
  description:        '',
  short_description:  '',
  overview:           '',
  getting_there:      '',
  what_to_expect:     '',
  safety_info:        '',
  best_time_to_visit: '',
  entrance_fee:       '',
  operating_hours:    '',

  // Coordinates
  latitude:           '',
  longitude:          '',
  altitude_meters:    '',

  // Duration & group
  duration_days:      '',
  duration_nights:    '',
  min_group_size:     '',
  max_group_size:     '',
  min_age:            '',
  fitness_level:      '',

  // Country
  country_id:         '',

  // Media (primary)
  image_url:          '',
  hero_image:         '',
  cover_image_url:    '',
  thumbnail_url:      '',
  video_url:          '',
  virtual_tour_url:   '',

  // Arrays
  highlights:         [],
  activities:         [],
  wildlife:           [],
  local_tips_arr:     [],   // UI-only, joined into local_tips string on save

  // Satellite (managed after main save)
  gallery:            [],   // [{ url, caption, is_primary, sort_order }]
  itinerary:          [],   // [{ day_number, title, description }]
  faqs:               [],   // [{ question, answer }]

  // SEO
  meta_title:         '',
  meta_description:   '',

  // Flags
  is_active:          true,
  is_featured:        false,
  is_popular:         false,
  is_new:             false,
  is_eco_friendly:    false,
  is_family_friendly: false,
  is_sold_out:        false,
}

const STEPS = [
  { id: 'identity',  label: 'Identity',  icon: MapPin,   desc: 'Name, category & location' },
  { id: 'details',   label: 'Details',   icon: Info,     desc: 'Descriptions & practical'  },
  { id: 'logistics', label: 'Logistics', icon: Compass,  desc: 'Duration & groups'         },
  { id: 'content',   label: 'Content',   icon: BookOpen, desc: 'Lists, FAQs & itinerary'   },
  { id: 'media',     label: 'Media',     icon: Camera,   desc: 'Images & videos'           },
  { id: 'settings',  label: 'Settings',  icon: Shield,   desc: 'SEO & flags'               },
]
const STEP_IDS = STEPS.map(s => s.id)

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const isValidUrl = (s) => { try { new URL(s); return true } catch { return false } }

const toSlug = (str = '') =>
  str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-')

/* Convert form value → number or null */
const numOrNull = (v) => (v === '' || v == null ? null : Number(v))

/* Convert array of strings → newline-joined string (for local_tips) */
const arrToText = (arr) => Array.isArray(arr) ? arr.filter(Boolean).join('\n') : (arr || '')

/* Convert text → array (for editing local_tips) */
const textToArr = (txt) => {
  if (!txt) return []
  if (Array.isArray(txt)) return txt
  if (typeof txt === 'string') {
    // Handle Postgres set literal {"a","b"}
    if (txt.startsWith('{') && txt.endsWith('}')) {
      try {
        return txt.slice(1, -1).split('","').map(s => s.replace(/^"|"$/g, '')).filter(Boolean)
      } catch { return [] }
    }
    return txt.split('\n').map(s => s.trim()).filter(Boolean)
  }
  return []
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS (kept inline for portability)
═══════════════════════════════════════════════════════════════════════════ */

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
      ptRef.current = ptRef.current.filter(p => p.life > 0)
      ptRef.current.forEach(p => {
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
    return () => { if(animRef.current) cancelAnimationFrame(animRef.current) }
  }, [active])
  if(!active) return null
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[200]" style={{mixBlendMode:'multiply'}}/>
}

function Lightbox({ images, startIndex=0, onClose }) {
  const [idx,setIdx] = useState(startIndex)
  const cur = images[idx]
  useEffect(() => {
    const fn = (e) => {
      if(e.key==='Escape') onClose()
      if(e.key==='ArrowLeft')  setIdx(i=>Math.max(0,i-1))
      if(e.key==='ArrowRight') setIdx(i=>Math.min(images.length-1,i+1))
    }
    window.addEventListener('keydown',fn)
    return () => window.removeEventListener('keydown',fn)
  }, [images.length, onClose])
  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
        <span className="text-white/70 text-sm">
          {idx+1}/{images.length}{cur?.caption&&<span className="ml-3 text-white/50">{cur.caption}</span>}
        </span>
        <div className="flex gap-2">
          {cur?.url && <a href={cur.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 text-xs transition-all"><ExternalLink size={12}/>Open original</a>}
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"><X size={16}/></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
        {idx>0 && <button onClick={()=>setIdx(i=>i-1)} className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all"><ChevronLeft size={20}/></button>}
        <img src={cur?.url} alt={cur?.caption||'Image'} className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" onError={e=>{e.target.src='https://placehold.co/800x500?text=Not+found'}}/>
        {idx<images.length-1 && <button onClick={()=>setIdx(i=>i+1)} className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all"><ChevronRight size={20}/></button>}
      </div>
      {images.length>1 && (
        <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 bg-black/60 scrollbar-thin scrollbar-thumb-white/20">
          {images.map((img,i) => (
            <button key={i} onClick={()=>setIdx(i)} className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i===idx?'border-emerald-400 scale-105':'border-white/10 hover:border-white/40'}`}>
              <img src={img.url} alt="" className="w-full h-full object-cover" onError={e=>{e.target.src='https://placehold.co/64x48?text=?'}}/>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ImageManagerPanel({ label, value, onChange, folder, allImages, onLightbox }) {
  const [mode,setMode]         = useState('upload')
  const [urlInput,setUrlInput] = useState(value||'')
  const [urlValid,setUrlValid] = useState(true)
  const [preview,setPreview]   = useState(value||'')
  const [loaded,setLoaded]     = useState(false)
  const [error,setError]       = useState(false)

  useEffect(() => { setUrlInput(value||''); setPreview(value||''); setLoaded(false); setError(false) }, [value])

  const applyUrl = () => {
    if(!urlInput.trim()) { onChange(''); setPreview(''); return }
    if(!isValidUrl(urlInput.trim())) { setUrlValid(false); return }
    setUrlValid(true); onChange(urlInput.trim()); setPreview(urlInput.trim())
  }
  const clear = () => { onChange(''); setUrlInput(''); setPreview(''); setLoaded(false); setError(false) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <Image size={11} className="text-emerald-500"/> {label}
        </label>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {[['upload',Upload,'Upload'],['url',Link,'URL']].map(([m,Icon,lbl]) => (
            <button key={m} type="button" onClick={()=>setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${mode===m?'bg-white text-emerald-700 shadow-sm':'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={10}/> {lbl}
            </button>
          ))}
        </div>
      </div>
      {preview && (
        <div className="relative group rounded-2xl overflow-hidden border-2 border-emerald-200 bg-gray-50">
          <img src={preview} alt={label}
            className={`w-full h-44 object-cover transition-opacity duration-300 ${loaded?'opacity-100':'opacity-0'}`}
            onLoad={()=>{setLoaded(true);setError(false)}}
            onError={()=>{setError(true);setLoaded(true)}}/>
          {!loaded && !error && <div className="absolute inset-0 flex items-center justify-center bg-gray-100"><div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/></div>}
          {error && <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-400 gap-2"><AlertTriangle size={20}/><p className="text-xs">Failed to load</p></div>}
          {loaded && !error && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
              <button type="button" onClick={()=>onLightbox(allImages,allImages.findIndex(i=>i.url===preview))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-gray-800 text-xs font-bold shadow-lg hover:bg-emerald-50"><Maximize2 size={12}/>View Full</button>
              <a href={preview} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-gray-800 text-xs font-bold shadow-lg hover:bg-blue-50"><ExternalLink size={12}/>Original</a>
              <button type="button" onClick={clear}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-red-500 text-xs font-bold shadow-lg hover:bg-red-50"><X size={12}/>Remove</button>
            </div>
          )}
        </div>
      )}
      <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode==='upload'
            ? <motion.div key="up" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <ImageUpload label="" value={value} onChange={v=>{onChange(v);setPreview(v)}} folder={folder}/>
              </motion.div>
            : <motion.div key="url" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-4 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/>
                    <input type="url"
                      className={`w-full pl-8 pr-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none focus:ring-4 bg-white transition-all ${!urlValid?'border-red-400':'border-gray-200 focus:border-emerald-400 focus:ring-emerald-50'}`}
                      value={urlInput} onChange={e=>{setUrlInput(e.target.value);setUrlValid(true)}}
                      onKeyDown={e=>e.key==='Enter'&&applyUrl()} placeholder="https://example.com/photo.jpg"/>
                  </div>
                  <button type="button" onClick={applyUrl} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all shrink-0">Apply</button>
                </div>
                {!urlValid && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>Enter a valid URL</p>}
              </motion.div>
          }
        </AnimatePresence>
      </div>
      {value && <button type="button" onClick={clear} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium"><X size={11}/>Clear image</button>}
    </div>
  )
}

function GalleryManager({ gallery=[], onChange, onLightbox }) {
  const [mode,setMode]         = useState('url')
  const [urlInput,setUrlInput] = useState('')
  const [caption,setCaption]   = useState('')
  const [urlValid,setUrlValid] = useState(true)
  const [uploaded,setUploaded] = useState('')
  const [editIdx,setEditIdx]   = useState(null)
  const [editCap,setEditCap]   = useState('')

  const addUrl = () => {
    if(!urlInput.trim()) return
    if(!isValidUrl(urlInput.trim())){setUrlValid(false);return}
    setUrlValid(true)
    const isPrimary = gallery.length===0
    onChange([...gallery,{url:urlInput.trim(),caption:caption.trim(),is_primary:isPrimary,sort_order:gallery.length}])
    setUrlInput(''); setCaption('')
  }
  const addUpload = () => {
    if(!uploaded) return
    const isPrimary = gallery.length===0
    onChange([...gallery,{url:uploaded,caption:caption.trim(),is_primary:isPrimary,sort_order:gallery.length}])
    setUploaded(''); setCaption('')
  }
  const remove     = (i) => onChange(gallery.filter((_,idx)=>idx!==i))
  const moveUp     = (i) => { if(i===0) return; const g=[...gallery];[g[i-1],g[i]]=[g[i],g[i-1]];onChange(g) }
  const moveDown   = (i) => { if(i===gallery.length-1) return; const g=[...gallery];[g[i],g[i+1]]=[g[i+1],g[i]];onChange(g) }
  const setPrimary = (i) => onChange(gallery.map((img,idx)=>({...img,is_primary:idx===i})))
  const saveCaption= (i) => { const g=[...gallery]; g[i]={...g[i],caption:editCap}; onChange(g); setEditIdx(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <Camera size={11} className="text-emerald-500"/> Gallery ({gallery.length} photos)
        </p>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {[['url',Link,'URL'],['upload',Upload,'Upload']].map(([m,Icon,lbl]) => (
            <button key={m} type="button" onClick={()=>setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${mode===m?'bg-white text-emerald-700 shadow-sm':'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={10}/> {lbl}
            </button>
          ))}
        </div>
      </div>

      {gallery.length>0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {gallery.map((img,i) => (
            <div key={i} className={`relative group rounded-xl overflow-hidden border-2 bg-gray-50 aspect-[4/3] ${img.is_primary?'border-emerald-400':'border-gray-200'}`}>
              <img src={img.url} alt={img.caption||`Photo ${i+1}`} className="w-full h-full object-cover"
                onError={e=>{e.target.src='https://placehold.co/200x150?text=?'}}/>
              {img.is_primary && <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-500 text-white">Primary</div>}
              {img.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1"><p className="text-[10px] text-white truncate">{img.caption}</p></div>}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                <button type="button" onClick={()=>onLightbox(gallery.map(g=>({url:g.url,caption:g.caption})),i)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-emerald-50"><Maximize2 size={10}/>View</button>
                {!img.is_primary && <button type="button" onClick={()=>setPrimary(i)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600"><Star size={10}/>Set Primary</button>}
                <button type="button" onClick={()=>{setEditIdx(i);setEditCap(img.caption||'')}}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-blue-50"><Pencil size={10}/>Caption</button>
                <div className="flex gap-1">
                  <button type="button" onClick={()=>moveUp(i)} disabled={i===0}
                    className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 disabled:opacity-30"><ChevronUp size={11}/></button>
                  <button type="button" onClick={()=>moveDown(i)} disabled={i===gallery.length-1}
                    className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 disabled:opacity-30"><ChevronDown size={11}/></button>
                  <button type="button" onClick={()=>remove(i)}
                    className="w-6 h-6 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center text-white"><Trash2 size={10}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editIdx!==null && (
        <motion.div initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} className="flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
          <input className="flex-1 px-3 py-1.5 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-400"
            value={editCap} onChange={e=>setEditCap(e.target.value)} placeholder="Add a caption…" autoFocus/>
          <button type="button" onClick={()=>saveCaption(editIdx)}
            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600">Save</button>
          <button type="button" onClick={()=>setEditIdx(null)}
            className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300">Cancel</button>
        </motion.div>
      )}

      <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5"><ImagePlus size={13}/>Add photo</p>
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
        <button type="button" onClick={mode==='url'?addUrl:addUpload} disabled={mode==='url'?!urlInput.trim():!uploaded}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <Plus size={14}/> Add to Gallery
        </button>
      </div>

      {gallery.length===0 && (
        <div className="text-center py-6 text-gray-400">
          <Camera size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No gallery images yet</p>
          <p className="text-xs">First image added becomes primary</p>
        </div>
      )}
    </div>
  )
}

function ItineraryEditor({ items=[], onChange }) {
  const add = () => onChange([...items, { day_number: items.length+1, title: '', description: '' }])
  const upd = (i,k,v) => { const a=[...items]; a[i]={...a[i],[k]:v}; onChange(a) }
  const rem = (i) => onChange(items.filter((_,idx)=>idx!==i).map((it,idx)=>({...it, day_number: idx+1})))

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
      {items.map((item,i) => (
        <div key={i} className="p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs">{item.day_number || i+1}</span>
              Day {item.day_number || i+1}
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
      {items.length===0 && (
        <div className="text-center py-6 text-gray-400">
          <List size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No itinerary yet</p>
        </div>
      )}
    </div>
  )
}

function FaqEditor({ faqs=[], onChange }) {
  const add = () => onChange([...faqs, { question:'', answer:'' }])
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
      {faqs.map((faq,i) => (
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
      {faqs.length===0 && (
        <div className="text-center py-6 text-gray-400">
          <BookOpen size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No FAQs yet</p>
        </div>
      )}
    </div>
  )
}

function StepIndicator({ steps, current, completed, onGoTo }) {
  const currentIdx = steps.findIndex(s=>s.id===current)
  return (
    <div className="relative mb-8">
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 mx-8"/>
      <div className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
        style={{width:currentIdx===0?'0%':`calc(${(currentIdx/(steps.length-1))*100}% - 1px)`}}/>
      <div className="relative flex items-start justify-between">
        {steps.map((s,idx) => {
          const isActive=s.id===current, isDone=completed.includes(s.id)
          const isAccessible=isDone||isActive||idx<=currentIdx
          const Icon=s.icon
          return (
            <button key={s.id} type="button" onClick={()=>isAccessible&&onGoTo(s.id)} disabled={!isAccessible}
              className="flex flex-col items-center gap-2 group flex-1 disabled:cursor-not-allowed">
              <div className={`relative w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 shadow-sm
                ${isDone?'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-md'
                :isActive?'bg-white border-emerald-500 text-emerald-600 shadow-emerald-100 shadow-md scale-110'
                :'bg-white border-gray-200 text-gray-300 group-hover:border-emerald-300 group-hover:text-emerald-400'}`}>
                {isDone?<Check size={15} className="stroke-[2.5]"/>:<Icon size={14}/>}
                {isActive && <motion.span className="absolute -inset-1.5 rounded-3xl border-2 border-emerald-400/40"
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
  )
}

function Field({ label, required, hint, className='', icon:Icon, children }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
        {Icon && <Icon size={11} className="text-emerald-500"/>}
        {label}{required && <span className="text-emerald-500 text-sm">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 italic">{hint}</p>}
    </div>
  )
}

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
          {Icon && <Icon size={13} className={checked?'text-emerald-600':'text-gray-400'}/>}
          <p className={`text-sm font-semibold ${checked?'text-emerald-800':'text-gray-700'}`}>{label}</p>
        </div>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

function Spinner({ size='sm' }) {
  return <span className={`border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 ${size==='sm'?'w-4 h-4':'w-5 h-5'}`}/>
}

function DeleteDialog({ isOpen, onClose, target, onDeleted }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  useEffect(() => { if(!isOpen) setBusy(false) }, [isOpen])
  if(!isOpen || !target) return null
  const doDelete = async () => {
    setBusy(true)
    try {
      await destinationsAPI.remove(target.id)
      toast.success(`"${target.name}" archived`)
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
            <div>
              <h3 className="text-xl font-bold text-gray-900">Delete Destination</h3>
              <p className="text-sm text-gray-500 mt-1">You're about to archive <strong>"{target.name}"</strong></p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-red-700">This will archive the destination. You can restore it later.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={doDelete} disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-200">
              {busy?<><Spinner/>Deleting…</>:<><Trash2 size={15}/>Archive</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function SuccessCelebration({ show, message, onDone }) {
  useEffect(() => { if(show){const t=setTimeout(onDone,3000);return()=>clearTimeout(t)} }, [show,onDone])
  return (
    <AnimatePresence>
      {show && (
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

const inputClass = `w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all duration-200 hover:border-gray-300`
const textareaClass = `w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all duration-200 hover:border-gray-300`
const selectClass = `w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all duration-200 hover:border-gray-300`

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
  const [filterStatus, setFilterStatus]         = useState('')
  const [sort, setSort]                         = useState('newest')
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

  /* ── Load countries ───────────────────────────────────────────────── */
  useEffect(() => {
    countriesAPI.getAll({ limit: 200 })
      .then(res => {
        const list = res?.data?.data || res?.data || res?.countries || []
        setCountries(Array.isArray(list) ? list : [])
      })
      .catch(() => setCountries([]))
  }, [])

  /* ── All form images (for lightbox) ──────────────────────────────── */
  const getAllFormImages = useCallback(() => {
    const imgs = []
    if (form.image_url)       imgs.push({ url: form.image_url,       caption: 'Main Image' })
    if (form.hero_image)      imgs.push({ url: form.hero_image,      caption: 'Hero Image' })
    if (form.cover_image_url) imgs.push({ url: form.cover_image_url, caption: 'Cover Image' })
    if (form.thumbnail_url)   imgs.push({ url: form.thumbnail_url,   caption: 'Thumbnail'   })
    ;(form.gallery || []).forEach(g => imgs.push({ url: g.url, caption: g.caption || 'Gallery' }))
    return imgs.filter(i => i.url)
  }, [form.image_url, form.hero_image, form.cover_image_url, form.thumbnail_url, form.gallery])

  const openLightbox = (images, startIndex = 0) => {
    setLightboxImages(images.filter(i => i.url))
    setLightboxStart(startIndex)
  }

  /* ── LOAD DESTINATIONS ────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        admin: true,   // ✅ tells backend to include drafts + inactive
        page:  pag.page,
        limit: pag.limit,
        sort,
        ...(debouncedSearch  && { search:     debouncedSearch }),
        ...(filterCountry    && { country_id: filterCountry }),
        ...(filterCategory   && { category:   filterCategory }),
        ...(filterDifficulty && { difficulty: filterDifficulty }),
        ...(filterFeatured   !== '' && { is_featured: filterFeatured }),
        ...(filterStatus     && { status:     filterStatus }),
      }
      const res  = await destinationsAPI.getAll(params)
      const list = res?.data || []
      const pgn  = res?.pagination || {}
      setDestinations(Array.isArray(list) ? list : [])
      pag.setTotal(pgn.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
      setDestinations([])
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sort, debouncedSearch,
      filterCountry, filterCategory, filterDifficulty, filterFeatured, filterStatus])

  useEffect(() => { load() }, [load])

  /* ── Build form from API row (camelCase → snake_case) ────────────── */
  const buildForm = (d) => ({
    ...INITIAL_FORM,
    name:               d.name              || '',
    slug:               d.slug              || '',
    tagline:            d.tagline           || '',
    category:           d.category          || '',
    destination_type:   d.destinationType   || '',
    difficulty:         d.difficulty        || '',
    status:             d.status            || 'draft',
    region:             d.region            || '',
    nearest_city:       d.nearestCity       || '',
    nearest_airport:    d.nearestAirport    || '',
    distance_from_airport_km: d.distanceFromAirportKm ?? '',
    address:            d.address           || '',

    description:        d.description       || '',
    short_description:  d.shortDescription  || '',
    overview:           d.overview          || '',
    getting_there:      d.gettingThere      || '',
    what_to_expect:     d.whatToExpect      || '',
    safety_info:        d.safetyInfo        || '',
    best_time_to_visit: d.bestTimeToVisit   || '',
    entrance_fee:       d.entranceFee       || '',
    operating_hours:    d.operatingHours    || '',

    latitude:           d.latitude          ?? '',
    longitude:          d.longitude         ?? '',
    altitude_meters:    d.altitudeMeters    ?? '',

    duration_days:      d.durationDays      ?? '',
    duration_nights:    d.durationNights    ?? '',
    min_group_size:     d.minGroupSize      ?? '',
    max_group_size:     d.maxGroupSize      ?? '',
    min_age:            d.minAge            ?? '',
    fitness_level:      d.fitnessLevel      || '',

    country_id:         d.countryId ?? d.country?.id ?? '',

    image_url:          d.imageUrl          || '',
    hero_image:         d.heroImage         || '',
    cover_image_url:    d.coverImageUrl     || '',
    thumbnail_url:      d.thumbnailUrl      || '',
    video_url:          d.videoUrl          || '',
    virtual_tour_url:   d.virtualTourUrl    || '',

    highlights:         Array.isArray(d.highlights) ? d.highlights : [],
    activities:         Array.isArray(d.activities) ? d.activities : [],
    wildlife:           Array.isArray(d.wildlife)   ? d.wildlife   : [],
    local_tips_arr:     textToArr(d.localTips || d.local_tips || ''),

    gallery: (d.gallery || []).map(g => ({
      id:         g.id,
      url:        g.imageUrl || g.url || '',
      caption:    g.caption  || '',
      is_primary: g.isPrimary ?? g.is_primary ?? false,
      sort_order: g.sortOrder ?? g.sort_order ?? 0,
    })),

    itinerary: (d.itinerary || []).map(it => ({
      id:          it.id,
      day_number:  it.dayNumber ?? it.day_number ?? 1,
      title:       it.title       || '',
      description: it.description || '',
    })),

    faqs: (d.faqs || []).map(f => ({
      id:       f.id,
      question: f.question || '',
      answer:   f.answer   || '',
    })),

    meta_title:         d.metaTitle         || '',
    meta_description:   d.metaDescription   || '',

    is_active:          d.isActive          ?? true,
    is_featured:        d.isFeatured        ?? false,
    is_popular:         d.isPopular         ?? false,
    is_new:             d.isNew             ?? false,
    is_eco_friendly:    d.isEcoFriendly     ?? false,
    is_family_friendly: d.isFamilyFriendly  ?? false,
    is_sold_out:        d.isSoldOut         ?? false,
  })

  const openCreate = () => {
    setForm(INITIAL_FORM); setEditing(null)
    setStep('identity'); setCompleted([]); setErrors({})
    formModal.open()
  }

  /* Fetch full record with include=all when opening for edit */
  const openEdit = async (dest) => {
    setEditing(dest); setStep('identity'); setErrors({})
    setCompleted(['identity','details','logistics','content','media'])
    formModal.open()
    try {
      const res  = await destinationsAPI.getOne(dest.id, 'all')
      const full = res?.data || dest
      setForm(buildForm(full))
    } catch (e) {
      // fallback to whatever we have
      setForm(buildForm(dest))
      toast.error('Could not fetch full record — editing with partial data')
    }
  }

  const upd = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }))
  }

  /* ── Validation ───────────────────────────────────────────────────── */
  const validateStep = (stepId) => {
    const e = {}
    if (stepId === 'identity') {
      if (!form.name.trim()) e.name       = 'Destination name is required'
      if (!form.country_id)  e.country_id = 'Please select a country'
      if (!form.category)    e.category   = 'Please select a category'
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

  /* ── Build payload for API (snake_case, correct types) ───────────── */
  const buildPayload = () => ({
    // Identity
    name:              form.name.trim(),
    slug:              form.slug?.trim() || toSlug(form.name),
    tagline:           form.tagline || null,
    category:          form.category || null,
    destination_type:  form.destination_type || null,
    difficulty:        form.difficulty || null,
    status:            form.status || 'draft',
    region:            form.region || null,
    nearest_city:      form.nearest_city || null,
    nearest_airport:   form.nearest_airport || null,
    distance_from_airport_km: numOrNull(form.distance_from_airport_km),
    address:           form.address || null,

    // Descriptions
    description:        form.description || null,
    short_description:  form.short_description || null,
    overview:           form.overview || null,
    getting_there:      form.getting_there || null,
    what_to_expect:     form.what_to_expect || null,
    safety_info:        form.safety_info || null,
    best_time_to_visit: form.best_time_to_visit || null,
    entrance_fee:       form.entrance_fee || null,
    operating_hours:    form.operating_hours || null,

    // Coords
    latitude:           numOrNull(form.latitude),
    longitude:          numOrNull(form.longitude),
    altitude_meters:    numOrNull(form.altitude_meters),

    // Duration & groups
    duration_days:      numOrNull(form.duration_days),
    duration_nights:    numOrNull(form.duration_nights),
    min_group_size:     numOrNull(form.min_group_size),
    max_group_size:     numOrNull(form.max_group_size),
    min_age:            numOrNull(form.min_age),
    fitness_level:      form.fitness_level || null,

    // Country
    country_id:         numOrNull(form.country_id),

    // Media (primary — gallery handled separately)
    image_url:          form.image_url || null,
    hero_image:         form.hero_image || null,
    cover_image_url:    form.cover_image_url || null,
    thumbnail_url:      form.thumbnail_url || null,
    video_url:          form.video_url || null,
    virtual_tour_url:   form.virtual_tour_url || null,

    // Arrays
    highlights:         Array.isArray(form.highlights) ? form.highlights : [],
    activities:         Array.isArray(form.activities) ? form.activities : [],
    wildlife:           Array.isArray(form.wildlife)   ? form.wildlife   : [],

    // local_tips is TEXT on backend — join array with newlines
    local_tips:         arrToText(form.local_tips_arr),

    // SEO
    meta_title:         form.meta_title || null,
    meta_description:   form.meta_description || null,

    // Flags
    is_active:          !!form.is_active,
    is_featured:        !!form.is_featured,
    is_popular:         !!form.is_popular,
    is_new:             !!form.is_new,
    is_eco_friendly:    !!form.is_eco_friendly,
    is_family_friendly: !!form.is_family_friendly,
    is_sold_out:        !!form.is_sold_out,
  })

  /* ── Sync satellite tables (best-effort, non-blocking) ───────────── */
  const syncSatellites = async (destId) => {
    /* Gallery: add any items that have no `id` (new items) */
    const newImages = (form.gallery || []).filter(g => !g.id && g.url)
    if (newImages.length) {
      try {
        await destinationsAPI.addImagesByUrl(destId, newImages.map(g => g.url))
      } catch (err) {
        console.warn('Gallery sync failed:', err)
      }
    }

    /* Itinerary: add any items with no `id` */
    const newDays = (form.itinerary || []).filter(d => !d.id && d.title?.trim())
    for (const day of newDays) {
      try {
        await destinationsAPI.addItineraryDay(destId, {
          day_number:  day.day_number,
          title:       day.title,
          description: day.description || '',
        })
      } catch (err) {
        console.warn('Itinerary day sync failed:', err)
      }
    }

    /* FAQs: add any items with no `id` */
    const newFaqs = (form.faqs || []).filter(f => !f.id && f.question?.trim() && f.answer?.trim())
    for (const faq of newFaqs) {
      try {
        await destinationsAPI.addFaq(destId, {
          question: faq.question,
          answer:   faq.answer,
        })
      } catch (err) {
        console.warn('FAQ sync failed:', err)
      }
    }
  }

  /* ── Save ─────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!validateStep('identity')) { setStep('identity'); return }
    setSaving(true)
    try {
      const payload = buildPayload()

      let saved
      if (editing) {
        const res = await destinationsAPI.updateJson(editing.id, payload)
        saved = res?.data || {}
        await syncSatellites(editing.id)
        setCelebrationMsg(`"${form.name}" updated successfully!`)
      } else {
        const res = await destinationsAPI.create(payload)
        saved = res?.data || {}
        if (saved.id) await syncSatellites(saved.id)
        setCelebrationMsg(`"${form.name}" created successfully!`)
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

  /* ── Delete ───────────────────────────────────────────────────────── */
  const openDelete       = (row) => { setDeleteTarget(row); setDeleteOpen(true) }
  const handleDeleteDone = ()    => { setDeleteTarget(null); setDeleteOpen(false); load() }

  /* ── Table columns ────────────────────────────────────────────────── */
  const columns = [
    {
      key: 'name', label: 'Destination', sortable: false,
      render: (_, row) => {
        const img = row.imageUrl || row.image_url || row.heroImage
        return (
          <div className="flex items-center gap-3 min-w-0">
            {img
              ? <img src={img} alt={row.name}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200"
                  onError={e=>{e.target.style.display='none'}}/>
              : <Avatar name={row.name} size="sm" rounded="lg"/>}
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{row.name}</p>
              <p className="text-xs text-gray-400 truncate">{row.countryName || row.country?.name || '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'category', label: 'Category',
      render: v => v
        ? <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{v}</span>
        : '—',
    },
    {
      key: 'difficulty', label: 'Difficulty',
      render: v => {
        const colors = {
          easy:        'bg-green-50 text-green-700 border-green-200',
          moderate:    'bg-yellow-50 text-yellow-700 border-yellow-200',
          challenging: 'bg-orange-50 text-orange-700 border-orange-200',
          difficult:   'bg-red-50 text-red-700 border-red-200',
          expert:      'bg-purple-50 text-purple-700 border-purple-200',
        }
        return v
          ? <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${colors[v]||'bg-gray-100 text-gray-600 border-gray-200'}`}>{v}</span>
          : '—'
      },
    },
    {
      key: 'rating', label: 'Rating', align: 'center',
      render: v => v && Number(v) > 0
        ? <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600">
            <Star size={12} className="fill-amber-500 text-amber-500"/>{Number(v).toFixed(1)}
          </span>
        : '—',
    },
    {
      key: 'isFeatured', label: 'Featured', align: 'center',
      render: (_, row) => (row.isFeatured || row.is_featured)
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto"/>
        : <span className="text-gray-300 block text-center">—</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (v, row) => {
        const status = v || 'draft'
        const active = row.isActive ?? row.is_active
        if (!active) return <Badge status="inactive" label="Archived"/>
        if (status === 'published') return <Badge status="active"   label="Published"/>
        if (status === 'draft')     return <Badge status="pending"  label="Draft"/>
        return <Badge status="inactive" label={status}/>
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
              {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>{errors.name}</p>}
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
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.flag || ''} {c.name}</option>
                ))}
              </select>
              {errors.country_id && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>{errors.country_id}</p>}
            </Field>

            <Field label="Category" required icon={Tag}>
              <select className={`${selectClass} ${errors.category?'border-red-400':''}`}
                value={form.category} onChange={e=>upd('category',e.target.value)}>
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>{errors.category}</p>}
            </Field>

            <Field label="Difficulty" icon={Activity}>
              <select className={selectClass} value={form.difficulty} onChange={e=>upd('difficulty',e.target.value)}>
                <option value="">Select difficulty…</option>
                {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </Field>

            <Field label="Status" icon={Shield}>
              <select className={selectClass} value={form.status} onChange={e=>upd('status',e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </Field>

            <Field label="Region / Province" icon={MapPin}>
              <input className={inputClass} value={form.region}
                onChange={e=>upd('region',e.target.value)} placeholder="Northern Province"/>
            </Field>

            <Field label="Destination Type" icon={Tag}>
              <input className={inputClass} value={form.destination_type}
                onChange={e=>upd('destination_type',e.target.value)} placeholder="Volcano / National Park / Lake"/>
            </Field>
          </div>

          {/* Location details */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-cyan-50/40 border-2 border-blue-100 space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider"><Navigation size={11} className="text-blue-500"/>Location Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Nearest City" icon={MapPin}>
                <input className={inputClass} value={form.nearest_city}
                  onChange={e=>upd('nearest_city',e.target.value)} placeholder="Musanze"/>
              </Field>
              <Field label="Nearest Airport" icon={Plane}>
                <input className={inputClass} value={form.nearest_airport}
                  onChange={e=>upd('nearest_airport',e.target.value)} placeholder="Kigali Intl"/>
              </Field>
              <Field label="Distance from Airport (km)" icon={Ruler}>
                <input className={inputClass} type="number" value={form.distance_from_airport_km}
                  onChange={e=>upd('distance_from_airport_km',e.target.value)} placeholder="110"/>
              </Field>
            </div>
            <Field label="Address / Access Point" icon={MapPin}>
              <input className={inputClass} value={form.address}
                onChange={e=>upd('address',e.target.value)} placeholder="Kinigi trailhead, Volcanoes NP"/>
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Latitude" icon={Navigation}>
                <input className={`${inputClass} font-mono text-xs`} type="number" step="any"
                  value={form.latitude} onChange={e=>upd('latitude',e.target.value)} placeholder="-1.5067"/>
              </Field>
              <Field label="Longitude" icon={Navigation}>
                <input className={`${inputClass} font-mono text-xs`} type="number" step="any"
                  value={form.longitude} onChange={e=>upd('longitude',e.target.value)} placeholder="29.4431"/>
              </Field>
              <Field label="Altitude (m)" icon={Mountain}>
                <input className={inputClass} type="number"
                  value={form.altitude_meters} onChange={e=>upd('altitude_meters',e.target.value)} placeholder="4507"/>
              </Field>
            </div>
            {form.latitude && form.longitude && (
              <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}}
                className="p-2.5 rounded-xl bg-blue-100/60 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium text-center">
                  📍 {Number(form.latitude).toFixed(4)}°, {Number(form.longitude).toFixed(4)}°
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )

      case 'details': return (
        <motion.div key="details" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-teal-50 border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><Info size={18} className="text-green-600"/></div>
            <div><h3 className="text-sm font-bold text-green-800">Descriptions & Practical Info</h3><p className="text-xs text-green-600">Rich content for travelers</p></div>
          </div>

          <Field label="Short Description" hint="Shown in cards and search" icon={FileText}>
            <textarea className={`${textareaClass} min-h-[80px]`} value={form.short_description}
              onChange={e=>upd('short_description',e.target.value)}
              placeholder="Brief compelling summary…"/>
          </Field>

          <Field label="Full Description" icon={BookOpen}>
            <textarea className={`${textareaClass} min-h-[120px]`} value={form.description}
              onChange={e=>upd('description',e.target.value)}
              placeholder="Detailed description for the destination page…"/>
          </Field>

          <Field label="Overview" hint="Secondary long-form" icon={BookOpen}>
            <textarea className={`${textareaClass} min-h-[100px]`} value={form.overview}
              onChange={e=>upd('overview',e.target.value)}
              placeholder="Overview shown on detail page…"/>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Getting There" icon={Plane}>
              <textarea className={`${textareaClass} min-h-[90px]`} value={form.getting_there}
                onChange={e=>upd('getting_there',e.target.value)}
                placeholder="How to reach this destination…"/>
            </Field>
            <Field label="What to Expect" icon={Compass}>
              <textarea className={`${textareaClass} min-h-[90px]`} value={form.what_to_expect}
                onChange={e=>upd('what_to_expect',e.target.value)}
                placeholder="What visitors should know before arriving…"/>
            </Field>
            <Field label="Safety Information" icon={Shield}>
              <textarea className={`${textareaClass} min-h-[90px]`} value={form.safety_info}
                onChange={e=>upd('safety_info',e.target.value)}
                placeholder="Altitude sickness risks, emergency info…"/>
            </Field>
            <Field label="Best Time to Visit" icon={Calendar}>
              <textarea className={`${textareaClass} min-h-[90px]`} value={form.best_time_to_visit}
                onChange={e=>upd('best_time_to_visit',e.target.value)}
                placeholder="June–September for dry season…"/>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Entrance Fee" icon={DollarSign}>
              <input className={inputClass} value={form.entrance_fee}
                onChange={e=>upd('entrance_fee',e.target.value)} placeholder="$400 climbing permit"/>
            </Field>
            <Field label="Operating Hours" icon={Clock}>
              <input className={inputClass} value={form.operating_hours}
                onChange={e=>upd('operating_hours',e.target.value)} placeholder="Trek starts 07:00"/>
            </Field>
          </div>
        </motion.div>
      )

      case 'logistics': return (
        <motion.div key="logistics" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center"><Compass size={18} className="text-teal-600"/></div>
            <div><h3 className="text-sm font-bold text-teal-800">Logistics</h3><p className="text-xs text-teal-600">Duration and groups</p></div>
          </div>

          {/* Duration */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-100 space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider"><Clock size={11} className="text-emerald-500"/>Duration</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Days" icon={Calendar}>
                <input className={inputClass} type="number" value={form.duration_days}
                  onChange={e=>upd('duration_days',e.target.value)} placeholder="2"/>
              </Field>
              <Field label="Nights" icon={Tent}>
                <input className={inputClass} type="number" value={form.duration_nights}
                  onChange={e=>upd('duration_nights',e.target.value)} placeholder="1"/>
              </Field>
            </div>
            <p className="text-xs text-emerald-600 italic">Display label auto-generated (e.g. "2 Days / 1 Night")</p>
          </div>

          {/* Group size */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-100 space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-purple-700 uppercase tracking-wider"><Users size={11} className="text-purple-500"/>Group & Age</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Min Group Size" icon={Users}>
                <input className={inputClass} type="number" value={form.min_group_size}
                  onChange={e=>upd('min_group_size',e.target.value)} placeholder="1"/>
              </Field>
              <Field label="Max Group Size" icon={Users}>
                <input className={inputClass} type="number" value={form.max_group_size}
                  onChange={e=>upd('max_group_size',e.target.value)} placeholder="8"/>
              </Field>
              <Field label="Min Age" icon={Users}>
                <input className={inputClass} type="number" value={form.min_age}
                  onChange={e=>upd('min_age',e.target.value)} placeholder="16"/>
              </Field>
              <Field label="Fitness Level" icon={Activity}>
                <input className={inputClass} value={form.fitness_level}
                  onChange={e=>upd('fitness_level',e.target.value)} placeholder="High"/>
              </Field>
            </div>
          </div>
        </motion.div>
      )

      case 'content': return (
        <motion.div key="content" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><BookOpen size={18} className="text-emerald-600"/></div>
            <div><h3 className="text-sm font-bold text-emerald-800">Content & Lists</h3><p className="text-xs text-emerald-600">Highlights, wildlife, FAQs & itinerary</p></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Star size={11} className="text-emerald-500"/> Highlights
              </label>
              <TagInput value={form.highlights} onChange={v=>upd('highlights',v)} placeholder="Add highlight…"/>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Bike size={11} className="text-emerald-500"/> Activities
              </label>
              <TagInput value={form.activities} onChange={v=>upd('activities',v)} placeholder="Add activity…"/>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <TreePine size={11} className="text-emerald-500"/> Wildlife
              </label>
              <TagInput value={form.wildlife} onChange={v=>upd('wildlife',v)} placeholder="Add wildlife…"/>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Coffee size={11} className="text-emerald-500"/> Local Tips
              </label>
              <TagInput value={form.local_tips_arr} onChange={v=>upd('local_tips_arr',v)} placeholder="Add tip…"/>
            </div>
          </div>

          {/* Itinerary */}
          <div className="p-5 rounded-2xl border-2 border-gray-100 bg-white">
            <ItineraryEditor items={form.itinerary} onChange={v=>upd('itinerary',v)}/>
          </div>

          {/* FAQs */}
          <div className="p-5 rounded-2xl border-2 border-gray-100 bg-white">
            <FaqEditor faqs={form.faqs} onChange={v=>upd('faqs',v)}/>
          </div>
        </motion.div>
      )

      case 'media': return (
        <motion.div key="media" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><Camera size={18} className="text-green-600"/></div>
            <div><h3 className="text-sm font-bold text-green-800">Media</h3><p className="text-xs text-green-600">All images and video for this destination</p></div>
          </div>

          {allImgs.length>0 && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><EyeIcon size={11}/>All Images ({allImgs.length})</p>
                <button type="button" onClick={()=>openLightbox(allImgs,0)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                  <Maximize2 size={11}/>View all
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
                {allImgs.map((img,i) => (
                  <button key={i} type="button" onClick={()=>openLightbox(allImgs,i)}
                    className="shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-emerald-400 transition-all group relative">
                    <img src={img.url} alt={img.caption||''} className="w-full h-full object-cover"
                      onError={e=>{e.target.src='https://placehold.co/80x56?text=?'}}/>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <ZoomIn size={12} className="text-white"/>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ImageManagerPanel label="Main Image" value={form.image_url}
              onChange={v=>upd('image_url',v)} folder="destinations"
              allImages={allImgs} onLightbox={openLightbox}/>
            <ImageManagerPanel label="Hero Image" value={form.hero_image}
              onChange={v=>upd('hero_image',v)} folder="destinations"
              allImages={allImgs} onLightbox={openLightbox}/>
            <ImageManagerPanel label="Cover / Banner" value={form.cover_image_url}
              onChange={v=>upd('cover_image_url',v)} folder="destinations"
              allImages={allImgs} onLightbox={openLightbox}/>
            <ImageManagerPanel label="Thumbnail" value={form.thumbnail_url}
              onChange={v=>upd('thumbnail_url',v)} folder="destinations"
              allImages={allImgs} onLightbox={openLightbox}/>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-100 space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider"><Video size={11} className="text-gray-500"/>Video & Virtual Tour</p>
            <Field label="Video URL" icon={Video}>
              <div className="relative">
                <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/>
                <input className={`${inputClass} pl-8`} type="url" value={form.video_url}
                  onChange={e=>upd('video_url',e.target.value)} placeholder="https://youtube.com/watch?v=…"/>
              </div>
            </Field>
            <Field label="Virtual Tour URL" icon={Globe}>
              <div className="relative">
                <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/>
                <input className={`${inputClass} pl-8`} type="url" value={form.virtual_tour_url}
                  onChange={e=>upd('virtual_tour_url',e.target.value)} placeholder="https://…"/>
              </div>
            </Field>
          </div>

          <div className="p-5 rounded-2xl border-2 border-gray-100 bg-white">
            <GalleryManager gallery={form.gallery} onChange={v=>upd('gallery',v)} onLightbox={openLightbox}/>
            {editing && (
              <p className="mt-3 text-xs text-gray-400 italic">
                Note: gallery images are added when you save. To reorder/remove existing gallery items, use the destination's detail page.
              </p>
            )}
          </div>
        </motion.div>
      )

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
              <FlagToggle checked={form.is_active}          onChange={v=>upd('is_active',v)}          label="Active"              desc="Visible on the public site (if published)" icon={Shield}/>
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
                ['Name',       form.name || '—'],
                ['Country',    countries.find(c=>String(c.id)===String(form.country_id))?.name || '—'],
                ['Category',   form.category || '—'],
                ['Difficulty', form.difficulty || '—'],
                ['Status',     form.status || 'draft'],
                ['Active',     form.is_active ? '✓ Yes' : '○ No'],
                ['Gallery',    `${(form.gallery||[]).length} photo(s)`],
                ['Itinerary',  `${(form.itinerary||[]).length} day(s)`],
                ['Featured',   form.is_featured ? '⭐ Yes' : 'No'],
              ].map(([k,v]) => (
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

  /* ── Build images for view modal ─────────────────────────────────── */
  const getViewImages = (d) => {
    if (!d) return []
    const imgs = []
    ;(d.gallery || []).forEach(g => {
      const url = g.imageUrl || g.url
      if (url) imgs.push({ url, caption: g.caption || 'Gallery' })
    })
    if (d.imageUrl)      imgs.push({ url: d.imageUrl,      caption: 'Main Image' })
    if (d.heroImage)     imgs.push({ url: d.heroImage,     caption: 'Hero Image' })
    if (d.coverImageUrl) imgs.push({ url: d.coverImageUrl, caption: 'Cover Image' })
    if (d.thumbnailUrl)  imgs.push({ url: d.thumbnailUrl,  caption: 'Thumbnail'  })
    ;(d.images || []).forEach((url, i) => {
      if (!imgs.find(im => im.url === url)) imgs.push({ url, caption: `Image ${i+1}` })
    })
    return imgs.filter(i => i.url)
  }

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 page-enter">
      <Confetti active={showConfetti}/>
      <SuccessCelebration show={showCelebration} message={celebrationMsg} onDone={()=>setShowCelebration(false)}/>

      <AnimatePresence>
        {lightboxImages && (
          <Lightbox images={lightboxImages} startIndex={lightboxStart} onClose={()=>setLightboxImages(null)}/>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><MapPin size={28} className="text-emerald-600"/> Destinations</h1>
          <p className="page-subtitle">Manage all destinations ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading?'animate-spin':''}/>
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus size={16}/> Add Destination</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <FilterBar>
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
          <FilterSelect label="Status" value={filterStatus}
            onChange={v=>{setFilterStatus(v);pag.reset()}}
            options={[{value:'',label:'All Status'},...STATUSES.map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))]}/>
          <FilterSelect label="Featured" value={filterFeatured}
            onChange={v=>{setFilterFeatured(v);pag.reset()}}
            options={[{value:'',label:'All'},{value:'true',label:'Featured'},{value:'false',label:'Not Featured'}]}/>
          <FilterSelect label="Sort" value={sort}
            onChange={v=>{setSort(v);pag.reset()}}
            options={SORT_OPTIONS}/>
        </FilterBar>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns} data={destinations} loading={loading}
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
          const tips     = textToArr(d.localTips || d.local_tips)
          return (
            <div className="space-y-5">
              {viewImgs.length>0 && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden group cursor-pointer" onClick={()=>openLightbox(viewImgs,0)}>
                    <img src={viewImgs[0].url} alt={d.name} className="w-full h-52 object-cover"
                      onError={e=>{e.target.src='https://placehold.co/800x400?text=No+Image'}}/>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-800 text-sm font-bold shadow-lg">
                        <Maximize2 size={14}/> View Full Size
                      </div>
                    </div>
                    {viewImgs.length>1 && <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium">{viewImgs.length} photos</div>}
                  </div>
                  {viewImgs.length>1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
                      {viewImgs.map((img,i) => (
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
                  <ModalField label="Country"      value={d.countryName || d.country?.name}/>
                  <ModalField label="Category"     value={d.category}/>
                  <ModalField label="Difficulty"   value={d.difficulty}/>
                  <ModalField label="Region"       value={d.region}/>
                  <ModalField label="Duration"     value={d.duration}/>
                  <ModalField label="Rating"       value={d.rating ? `${d.rating} ⭐ (${d.reviewCount||0} reviews)` : '—'}/>
                  <ModalField label="Altitude"     value={d.altitudeMeters ? `${d.altitudeMeters}m` : '—'}/>
                  <ModalField label="Coordinates"  value={d.latitude ? `${d.latitude}°, ${d.longitude}°` : '—'}/>
                  <ModalField label="Entrance Fee" value={d.entranceFee}/>
                  <ModalField label="Hours"        value={d.operatingHours}/>
                  <ModalField label="Status"       value={<Badge status={d.isActive?'active':'inactive'} label={d.status||'draft'}/>}/>
                </ModalGrid>
              </ModalSection>

              {d.description       && <ModalSection title="Description"><p className="text-sm text-gray-600 leading-relaxed">{d.description}</p></ModalSection>}
              {d.shortDescription  && <ModalSection title="Short Description"><p className="text-sm text-gray-600">{d.shortDescription}</p></ModalSection>}
              {d.overview          && <ModalSection title="Overview"><p className="text-sm text-gray-600 leading-relaxed">{d.overview}</p></ModalSection>}

              {d.highlights?.length>0 && (
                <ModalSection title="Highlights">
                  <div className="flex flex-wrap gap-2">
                    {d.highlights.map((h,i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{h}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              {Array.isArray(d.activities) && d.activities.length>0 && (
                <ModalSection title="Activities">
                  <div className="flex flex-wrap gap-2">
                    {d.activities.map((a,i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{a}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              {Array.isArray(d.wildlife) && d.wildlife.length>0 && (
                <ModalSection title="Wildlife">
                  <div className="flex flex-wrap gap-2">
                    {d.wildlife.map((w,i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200">{w}</span>
                    ))}
                  </div>
                </ModalSection>
              )}

              {tips.length>0 && (
                <ModalSection title="Local Tips">
                  <ul className="space-y-1.5">
                    {tips.map((t,i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0"/> {t}
                      </li>
                    ))}
                  </ul>
                </ModalSection>
              )}

              {d.gettingThere && <ModalSection title="Getting There"><p className="text-sm text-gray-600">{d.gettingThere}</p></ModalSection>}
              {d.whatToExpect && <ModalSection title="What to Expect"><p className="text-sm text-gray-600">{d.whatToExpect}</p></ModalSection>}
              {d.safetyInfo   && <ModalSection title="Safety Info"><p className="text-sm text-gray-600">{d.safetyInfo}</p></ModalSection>}

              {d.itinerary?.length>0 && (
                <ModalSection title="Itinerary">
                  <div className="space-y-3">
                    {d.itinerary.map((it,i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{it.dayNumber || i+1}</div>
                        <div>
                          {it.title       && <p className="text-sm font-bold text-gray-800">{it.title}</p>}
                          {it.description && <p className="text-xs text-gray-600 mt-1">{it.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ModalSection>
              )}

              {d.faqs?.length>0 && (
                <ModalSection title="FAQs">
                  <div className="space-y-3">
                    {d.faqs.map((faq,i) => (
                      <div key={i} className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-sm font-bold text-blue-800">{faq.question}</p>
                        <p className="text-sm text-blue-700 mt-1">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </ModalSection>
              )}

              <ModalSection title="Stats & Flags">
                <ModalGrid>
                  <ModalField label="Featured"        value={<BooleanBadge value={d.isFeatured}/>}/>
                  <ModalField label="Popular"         value={<BooleanBadge value={d.isPopular}/>}/>
                  <ModalField label="Eco Friendly"    value={<BooleanBadge value={d.isEcoFriendly}/>}/>
                  <ModalField label="Family Friendly" value={<BooleanBadge value={d.isFamilyFriendly}/>}/>
                  <ModalField label="Sold Out"        value={<BooleanBadge value={d.isSoldOut} trueLabel="Yes" falseLabel="No"/>}/>
                  <ModalField label="Views"           value={formatNumber(d.viewCount)}/>
                  <ModalField label="Bookings"        value={formatNumber(d.bookingCount)}/>
                  <ModalField label="Gallery Photos"  value={viewImgs.length}/>
                </ModalGrid>
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
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              {STEP_IDS.map(id => (
                <div key={id} className={`h-1.5 rounded-full transition-all duration-300
                  ${id===step?'w-8 bg-emerald-500':completed.includes(id)?'w-4 bg-emerald-300':'w-4 bg-gray-200'}`}/>
              ))}
              <span className="text-xs text-gray-400 ml-1">{stepIndex+1}/{STEPS.length}</span>
            </div>
            <div className="flex gap-2">
              {stepIndex>0 && (
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

      {/* ── Delete Dialog ── */}
      <AnimatePresence>
        {deleteOpen && (
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