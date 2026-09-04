// admin/src/pages/Destinations.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapPin, Plus, Eye, Pencil, Trash2, RefreshCw, Star,
  DollarSign, Image, Info, Check, ChevronRight, ChevronLeft,
  AlertTriangle, Zap, Heart, BookOpen, Camera, Shield,
  Clock, Users, Ruler, Thermometer, Plane, Link, Upload,
  X, ZoomIn, ExternalLink, CheckCircle2, ImagePlus, Maximize2,
  ChevronDown, ChevronUp, Eye as EyeIcon, Globe2, Mountain,
  Navigation, Hash, FileText, List, Layers, Tag, Flag,
  Video, Globe, Phone, Calendar, TrendingUp, Award,
  Compass, TreePine, Bike, Coffee, Tent, Activity,
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
const CATEGORIES   = [];

const INITIAL_FORM = {
  // Identity
  name:               '',
  slug:               '',
  category:           '',
  destination_type:   '',
  classification:     '',
  adventure_category: '',
  difficulty:         '',
  status:             'published',
  region:             '',
  nearest_city:       '',
  nearest_airport:    '',
  address:            '',
  latitude:           '',
  longitude:          '',
  altitude_meters:    '',
  distance_from_airport_km: '',

  // Country
  country_id:         '',

  // Media
  image_url:          '',
  hero_image:         '',
  cover_image_url:    '',
  video_url:          '',
  virtual_tour_url:   '',

  // Arrays / lists
  activities:         [],
  attractions:        [],
  highlights:         [],
  wildlife:           [],
  local_tips:         [],
  tags:               [],
  faqs:               [],
  gallery:            [],

  // Details
  description:        '',
  short_description:  '',
  overview:           '',
  getting_there:      '',
  what_to_expect:     '',
  best_time_to_visit: '',
  safety_info:        '',
  duration_days:      '',
  duration_nights:    '',
  duration_display:   '',
  min_group_size:     '',
  max_group_size:     '',
  min_age:            '',
  fitness_level:      '',
  entrance_fee:       '',
  operating_hours:    '',

  // SEO / flags
  meta_title:         '',
  meta_description:   '',
  is_featured:        false,
  is_active:          true,
}

const STEPS = [
  { id: 'identity',  label: 'Identity',  icon: MapPin,    desc: 'Name, category & type'  },
  { id: 'details',   label: 'Details',   icon: Info,      desc: 'Descriptions & practical'    },
  { id: 'content',   label: 'Content',   icon: BookOpen,  desc: 'Highlights, tags & FAQs'     },
  { id: 'media',     label: 'Media',     icon: Camera,    desc: 'All images & videos'         },
  { id: 'settings',  label: 'Settings',  icon: Shield,    desc: 'SEO, flags & visibility'     },
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

/* ─── Sub-components (Confetti, Lightbox, ImageManagerPanel, GalleryManager)
      are identical to the Countries page — import or inline them here.
      Below we inline the minimal versions needed.                         ── */

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
        <span className="text-white/70 text-sm">{idx+1}/{images.length}{cur?.caption&&<span className="ml-3 text-white/50">{cur.caption}</span>}</span>
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

/* ─── Image Manager Panel ────────────────────────────────────────────────── */
function ImageManagerPanel({ label, value, onChange, folder, allImages, onLightbox }) {
  const [mode,setMode]       = useState('upload')
  const [urlInput,setUrlInput] = useState(value||'')
  const [urlValid,setUrlValid] = useState(true)
  const [preview,setPreview]   = useState(value||'')
  const [loaded,setLoaded]     = useState(false)
  const [error,setError]       = useState(false)

  useEffect(()=>{ setUrlInput(value||''); setPreview(value||''); setLoaded(false); setError(false) },[value])

  const applyUrl = () => {
    if(!urlInput.trim()){onChange('');setPreview('');return}
    if(!isValidUrl(urlInput.trim())){setUrlValid(false);return}
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
          {[['upload',Upload,'Upload'],['url',Link,'URL']].map(([m,Icon,lbl])=>(
            <button key={m} type="button" onClick={()=>setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${mode===m?'bg-white text-emerald-700 shadow-sm':'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={10}/> {lbl}
            </button>
          ))}
        </div>
      </div>
      {preview&&(
        <div className="relative group rounded-2xl overflow-hidden border-2 border-emerald-200 bg-gray-50">
          <img src={preview} alt={label}
            className={`w-full h-44 object-cover transition-opacity duration-300 ${loaded?'opacity-100':'opacity-0'}`}
            onLoad={()=>{setLoaded(true);setError(false)}}
            onError={()=>{setError(true);setLoaded(true)}}/>
          {!loaded&&!error&&<div className="absolute inset-0 flex items-center justify-center bg-gray-100"><div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/></div>}
          {error&&<div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-400 gap-2"><AlertTriangle size={20}/><p className="text-xs">Failed to load</p></div>}
          {loaded&&!error&&(
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
                {!urlValid&&<p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>Enter a valid URL</p>}
              </motion.div>
          }
        </AnimatePresence>
      </div>
      {value&&<button type="button" onClick={clear} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium"><X size={11}/>Clear image</button>}
    </div>
  )
}

/* ─── Gallery Manager ────────────────────────────────────────────────────── */
function GalleryManager({ gallery=[], onChange, onLightbox }) {
  const [mode,setMode]           = useState('url')
  const [urlInput,setUrlInput]   = useState('')
  const [caption,setCaption]     = useState('')
  const [urlValid,setUrlValid]   = useState(true)
  const [uploaded,setUploaded]   = useState('')
  const [editIdx,setEditIdx]     = useState(null)
  const [editCap,setEditCap]     = useState('')
  const [library,setLibrary]     = useState([])
  const [showLibrary,setShowLibrary] = useState(false)

  useEffect(() => {
    if (!showLibrary || library.length) return
    galleryAPI.getAll({ limit: 100 }).then(({ data }) => {
      setLibrary(data.data || data.gallery || [])
    }).catch(() => setLibrary([]))
  }, [showLibrary, library.length])

  const importImage = (item) => {
    const url = item.image_url || item.url || item.imageUrl
    if (!url || gallery.some(image => (image.url || image.imageUrl) === url)) return
    onChange([...gallery, { url, caption: item.title || item.description || '', is_primary: gallery.length === 0, sort_order: gallery.length, source: 'gallery' }])
  }

  const addUrl = () => {
    if(!urlInput.trim()) return
    if(!isValidUrl(urlInput.trim())){setUrlValid(false);return}
    setUrlValid(true)
    const isPrimary = gallery.length===0
    onChange([...gallery,{url:urlInput.trim(),caption:caption.trim(),is_primary:isPrimary,sort_order:gallery.length,source:'url'}])
    setUrlInput(''); setCaption('')
  }
  const addUpload = () => {
    if(!uploaded) return
    const isPrimary = gallery.length===0
    onChange([...gallery,{url:uploaded,caption:caption.trim(),is_primary:isPrimary,sort_order:gallery.length,source:'upload'}])
    setUploaded(''); setCaption('')
  }
  const remove   = (i) => onChange(gallery.filter((_,idx)=>idx!==i))
  const moveUp   = (i) => { if(i===0) return; const g=[...gallery];[g[i-1],g[i]]=[g[i],g[i-1]];onChange(g) }
  const moveDown = (i) => { if(i===gallery.length-1) return; const g=[...gallery];[g[i],g[i+1]]=[g[i+1],g[i]];onChange(g) }
  const setPrimary = (i) => onChange(gallery.map((img,idx)=>({...img,is_primary:idx===i})))
  const saveCaption = (i) => { const g=[...gallery]; g[i]={...g[i],caption:editCap}; onChange(g); setEditIdx(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <Camera size={11} className="text-emerald-500"/> Gallery ({gallery.length} photos)
        </p>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {[['url',Link,'URL'],['upload',Upload,'Upload']].map(([m,Icon,lbl])=>(
            <button key={m} type="button" onClick={()=>setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${mode===m?'bg-white text-emerald-700 shadow-sm':'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={10}/> {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={()=>setShowLibrary(value=>!value)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50">
          <Image size={13}/> {showLibrary ? 'Hide gallery library' : 'Import from gallery'}
        </button>
      </div>
      {showLibrary&&(
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 rounded-xl border border-emerald-100 bg-emerald-50/40">
          {library.map(item=>{
            const url=item.image_url||item.url||item.imageUrl
            return <button key={item.id||url} type="button" onClick={()=>importImage(item)} className="aspect-[4/3] overflow-hidden rounded-lg border border-white bg-white hover:border-emerald-400">
              <img src={url} alt={item.title||'Gallery image'} className="w-full h-full object-cover"/>
            </button>
          })}
          {!library.length&&<p className="col-span-full text-xs text-gray-500 py-3 text-center">No gallery images available.</p>}
        </div>
      )}

      {gallery.length>0&&(
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {gallery.map((img,i)=>(
            <div key={i} className={`relative group rounded-xl overflow-hidden border-2 bg-gray-50 aspect-[4/3] ${img.is_primary?'border-emerald-400':'border-gray-200'}`}>
              <img src={img.url||img.imageUrl} alt={img.caption||`Photo ${i+1}`}
                className="w-full h-full object-cover"
                onError={e=>{e.target.src='https://placehold.co/200x150?text=?'}}/>
              {img.is_primary&&(
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-500 text-white">Primary</div>
              )}
              {img.caption&&(
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-[10px] text-white truncate">{img.caption}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                <button type="button" onClick={()=>onLightbox(gallery.map(g=>({url:g.url||g.imageUrl,caption:g.caption})),i)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-emerald-50"><Maximize2 size={10}/>View</button>
                {!img.is_primary&&(
                  <button type="button" onClick={()=>setPrimary(i)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600"><Star size={10}/>Set Primary</button>
                )}
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

      {editIdx!==null&&(
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
                {!urlValid&&<p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10}/>Enter a valid URL</p>}
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
          disabled={mode==='url'?!urlInput.trim():!uploaded}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <Plus size={14}/> Add to Gallery
        </button>
      </div>

      {gallery.length===0&&(
        <div className="text-center py-6 text-gray-400">
          <Camera size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No gallery images yet</p>
          <p className="text-xs">First image added becomes primary</p>
        </div>
      )}
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

/* ─── Step Indicator ─────────────────────────────────────────────────────── */
function StepIndicator({ steps, current, completed, onGoTo }) {
  const currentIdx = steps.findIndex(s=>s.id===current)
  return (
    <div className="relative mb-8">
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 mx-8"/>
      <div className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
        style={{width:currentIdx===0?'0%':`calc(${(currentIdx/(steps.length-1))*100}% - 1px)`}}/>
      <div className="relative flex items-start justify-between">
        {steps.map((s,idx)=>{
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

/* ─── Spinner / Delete Dialog / Success Celebration (same as Countries) ─── */
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
      await destinationsAPI.remove(target.id)
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

  /* ── Load countries for dropdown ─────────────────────────────────── */
  useEffect(() => {
    countriesAPI.getAll({ limit: 200, is_active: true })
      .then(({ data }) => setCountries(data.data || data.countries || []))
      .catch(() => {})
  }, [])

  /* ── All form images for lightbox ────────────────────────────────── */
  const getAllFormImages = useCallback(() => {
    const imgs = []
    if (form.image_url)       imgs.push({ url: form.image_url,       caption: 'Main Image' })
    if (form.hero_image)      imgs.push({ url: form.hero_image,      caption: 'Hero Image' })
    if (form.cover_image_url) imgs.push({ url: form.cover_image_url, caption: 'Cover Image' })
    ;(form.gallery || []).forEach(g => imgs.push({ url: g.url || g.imageUrl, caption: g.caption || 'Gallery' }))
    return imgs.filter(i => i.url)
  }, [form.image_url, form.hero_image, form.cover_image_url, form.gallery])

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

  /* ── Normalise gallery from API response ─────────────────────────── */
  const normaliseGallery = (dest) => {
    // API returns gallery as [{ id, imageUrl, thumbnailUrl, isPrimary, sortOrder }]
    // We normalise to [{ url, caption, is_primary, sort_order, source }]
    const raw = dest.gallery || []
    if (!raw.length) {
      // Fall back to images array
      return (dest.images || []).map((url, i) => ({
        url, caption: '', is_primary: i === 0, sort_order: i, source: 'url',
      }))
    }
    return raw.map(g => ({
      url:        g.imageUrl || g.url || '',
      caption:    g.caption  || '',
      is_primary: g.isPrimary ?? g.is_primary ?? false,
      sort_order: g.sortOrder ?? g.sort_order ?? 0,
      source:     'url',
    })).sort((a, b) => a.sort_order - b.sort_order)
  }

  /* ── Normalise local_tips from API (can be array or weird string) ── */
  const normaliseTips = (dest) => {
    if (Array.isArray(dest.local_tips)) return dest.local_tips
    if (Array.isArray(dest.tips))       return dest.tips
    // API returns localTips as a stringified set literal: {"tip1","tip2"}
    const raw = dest.localTips || dest.local_tips || ''
    if (typeof raw === 'string' && raw.startsWith('{')) {
      try {
        return raw.slice(1, -1).split('","').map(s => s.replace(/^"|"$/g, ''))
      } catch { return [] }
    }
    return []
  }

  /* ── Build form from API row ─────────────────────────────────────── */
  const buildForm = (dest) => ({
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

    gallery:            normaliseGallery(dest),
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
  })

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

  /* ── Validation ───────────────────────────────────────────────────── */
  const validateStep = (stepId) => {
    const e = {}
    if (stepId === 'identity') {
      if (!form.name.trim())   e.name       = 'Destination name is required'
      if (!form.country_id)    e.country_id = 'Please select a country'
      if (!form.category)      e.category   = 'Please select a category'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Step nav ─────────────────────────────────────────────────────── */
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
    setSaving(true)
    try {
      const { gallery, itinerary, faqs, tags, local_tips, ...destinationFields } = form
      const payload = {
        ...destinationFields,
        slug:         form.slug || toSlug(form.name),
        country_id:   form.country_id ? Number(form.country_id) : null,
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

      const newGalleryImages = (gallery || []).filter(image => !image.id && (image.url || image.imageUrl))
      if (savedDestination?.id && newGalleryImages.length) {
        const formData = new FormData()
        formData.append('image_urls', JSON.stringify(newGalleryImages.map(image => image.url || image.imageUrl)))
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

  /* ── Delete ───────────────────────────────────────────────────────── */
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

           {/* FAQs */}
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
        <motion.div key="media" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><Camera size={18} className="text-green-600"/></div>
            <div><h3 className="text-sm font-bold text-green-800">Media</h3><p className="text-xs text-green-600">All images and video for this destination</p></div>
          </div>

           {/* All-images strip */}
           {allImgs.length>0&&(
             <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
               <div className="flex items-center justify-between">
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><EyeIcon size={11}/>All Images ({allImgs.length})</p>
                 <button type="button" onClick={()=>openLightbox(allImgs,0)}
                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                   <Maximize2 size={11}/>View all
                 </button>
               </div>
               <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
                 {allImgs.map((img,i)=>(
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

           {/* Primary images */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
             <ImageManagerPanel label="Main Image" value={form.image_url}
               onChange={v=>upd('image_url',v)} folder="destinations"
               allImages={allImgs} onLightbox={openLightbox}/>
             <ImageManagerPanel label="Hero Image" value={form.hero_image}
               onChange={v=>upd('hero_image',v)} folder="destinations"
               allImages={allImgs} onLightbox={openLightbox}/>
             <ImageManagerPanel label="Cover / Banner" value={form.cover_image_url}
               onChange={v=>upd('cover_image_url',v)} folder="destinations"
               allImages={allImgs} onLightbox={openLightbox}/>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Field label="Video URL" icon={Video}><input className={inputClass} type="url" value={form.video_url} onChange={e=>upd('video_url',e.target.value)} /></Field>
             <Field label="Virtual Tour URL" icon={Globe2}><input className={inputClass} type="url" value={form.virtual_tour_url} onChange={e=>upd('virtual_tour_url',e.target.value)} /></Field>
           </div>

           <p className="text-center text-gray-500 py-8">
             Add images & videos supplied for this destination.
           </p>

           {/* Gallery */}
           <div className="p-5 rounded-2xl border-2 border-gray-100 bg-white">
             <GalleryManager gallery={form.gallery} onChange={v=>upd('gallery',v)} onLightbox={openLightbox}/>
           </div>
        </motion.div>
      )

      /* ─── SETTINGS ──────────────────────────────────────────────── */
      case 'settings': return (
        <motion.div key="settings" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={tr} className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Shield size={18} className="text-gray-600"/></div>
            <div><h3 className="text-sm font-bold text-gray-800">Settings & Visibility</h3><p className="text-xs text-gray-600">SEO, flags and publication status</p></div>
          </div>

          {/* SEO */}
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

          {/* Flags */}
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

          {/* Summary */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Check size={14} className="text-emerald-200"/>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Ready to Save — Summary</p>
            </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Name',       form.name          || '—'],
                ['Country',    countries.find(c=>String(c.id)===String(form.country_id))?.name || '—'],
                ['Category',   form.category      || '—'],
                ['Difficulty', form.difficulty    || '—'],
                ['Status',     form.is_active     ? '✓ Active' : '○ Draft'],
                ['Gallery',    `${(form.gallery||[]).length} photo(s)`],
                ['Featured',   form.is_featured   ? '⭐ Yes' : 'No'],
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
    const galleryRaw = dest.gallery || []
    galleryRaw.forEach(g => {
      const url = g.imageUrl || g.url || ''
      if (url) imgs.push({ url, caption: g.caption || 'Gallery' })
    })
    if (dest.imageUrl || dest.image_url)
      imgs.push({ url: dest.imageUrl||dest.image_url, caption: 'Main Image' })
    if (dest.heroImage || dest.hero_image)
      imgs.push({ url: dest.heroImage||dest.hero_image, caption: 'Hero Image' })
    if (dest.coverImageUrl || dest.cover_image_url)
      imgs.push({ url: dest.coverImageUrl||dest.cover_image_url, caption: 'Cover' })
    // also images array
    ;(dest.images || []).forEach((url, i) => {
      if (!imgs.find(im => im.url === url))
        imgs.push({ url, caption: `Image ${i+1}` })
    })
    return imgs.filter(i => i.url)
  }

  /* ── Render ───────────────────────────────────────────────────────── */
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
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading?'animate-spin':''}/></button>
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
          <FilterSelect label="Featured" value={filterFeatured}
            onChange={v=>{setFilterFeatured(v);pag.reset()}}
            options={[{value:'',label:'All'},{value:'true',label:'Featured'},{value:'false',label:'Not Featured'}]}/>
        </FilterBar>
      </div>

      {/* Table */}
      <div className="card">
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
              {/* Images */}
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

              <ModalSection title="Stats & Flags">
                <ModalGrid>
                  <ModalField label="Featured"       value={<BooleanBadge value={d.isFeatured||d.is_featured}/>}/>
                  <ModalField label="Popular"        value={<BooleanBadge value={d.isPopular||d.is_popular}/>}/>
                  <ModalField label="Eco Friendly"   value={<BooleanBadge value={d.isEcoFriendly||d.is_eco_friendly}/>}/>
                  <ModalField label="Family Friendly" value={<BooleanBadge value={d.isFamilyFriendly||d.is_family_friendly}/>}/>
                  <ModalField label="Sold Out"       value={<BooleanBadge value={d.isSoldOut||d.is_sold_out} trueLabel="Yes" falseLabel="No"/>}/>
                  <ModalField label="Views"          value={formatNumber(d.viewCount||d.view_count)}/>
                  <ModalField label="Bookings"       value={formatNumber(d.bookingCount||d.booking_count)}/>
                  <ModalField label="Gallery Photos" value={viewImgs.length}/>
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
              {STEP_IDS.map(id=>(
                <div key={id} className={`h-1.5 rounded-full transition-all duration-300
                  ${id===step?'w-8 bg-emerald-500':completed.includes(id)?'w-4 bg-emerald-300':'w-4 bg-gray-200'}`}/>
              ))}
              <span className="text-xs text-gray-400 ml-1">{stepIndex+1}/{STEPS.length}</span>
            </div>
            <div className="flex gap-2">
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

      {/* ── Delete Dialog ── */}
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

function AttractionEditor({ attractions = [], onChange }) {
  const update = (index, key, value) => onChange(attractions.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const add = () => onChange([...attractions, { name: '', description: '', imageUrl: '' }])
  const remove = (index) => onChange(attractions.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-slate-800">Attractions & Experiences</p><p className="text-xs text-slate-500">Each attraction can be booked separately.</p></div>
        <button type="button" onClick={add} className="btn-secondary flex items-center gap-2"><Plus size={14}/> Add attraction</button>
      </div>
      {attractions.map((item, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_1fr_auto] gap-2 items-start rounded-xl border border-slate-200 p-3">
          <input className={inputClass} placeholder="Attraction name" value={item.name || ''} onChange={e => update(index, 'name', e.target.value)} />
          <textarea className={textareaClass} rows={2} placeholder="Short description" value={item.description || ''} onChange={e => update(index, 'description', e.target.value)} />
          <input className={inputClass} type="url" placeholder="Image URL" value={item.imageUrl || item.image_url || ''} onChange={e => update(index, 'imageUrl', e.target.value)} />
          <button type="button" aria-label={`Remove attraction ${index + 1}`} onClick={() => remove(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={16}/></button>
        </div>
      ))}
    </div>
  )
}