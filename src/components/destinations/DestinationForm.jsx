// admin/src/components/destinations/DestinationForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Save, Upload, Plus, Trash2, Mountain, MapPin, Globe,
  Image, List, Settings, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle, Loader2, Eye, Tag, Info, Star, Clock
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
const getToken = () => localStorage.getItem('token') || ''

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, ...opts.headers },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

// ── UI Atoms ──────────────────────────────────────────────────────────────────

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${className}`}
    {...props}
  />
)

const Select = ({ children, className = '', ...props }) => (
  <select
    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white ${className}`}
    {...props}
  >
    {children}
  </select>
)

const Textarea = ({ className = '', ...props }) => (
  <textarea
    rows={4}
    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none ${className}`}
    {...props}
  />
)

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'}`} />
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </div>
    <span className="text-sm text-gray-700">{label}</span>
  </label>
)

const SectionCard = ({ title, icon: Icon, children, collapsible = false, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon size={15} className="text-green-600" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        {collapsible && (open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
      </button>
      {(!collapsible || open) && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

const ArrayInput = ({ value = [], onChange, placeholder, label, addLabel = 'Add Item' }) => {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onChange([...value, trimmed])
    setInput('')
  }

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder || 'Type and press Enter'}
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap">
          <Plus size={16} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span key={i} className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full text-xs">
              {item}
              <button type="button" onClick={() => remove(i)} className="text-green-500 hover:text-red-500 transition-colors ml-0.5">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Form Tabs ─────────────────────────────────────────────────────────────────

const FORM_TABS = [
  { id: 'basic',    label: 'Basic',    icon: Info },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'media',    label: 'Media',    icon: Image },
  { id: 'details',  label: 'Details',  icon: Settings },
  { id: 'seo',      label: 'SEO',      icon: Globe },
]

// ── Default form state ────────────────────────────────────────────────────────

const DEFAULTS = {
  name: '', tagline: '', short_description: '', description: '', overview: '',
  what_to_expect: '', best_time_to_visit: '', getting_there: '', local_tips: '', safety_info: '',
  country_id: '', category: 'safari', difficulty: 'moderate', destination_type: '',
  status: 'draft',
  latitude: '', longitude: '', altitude_meters: '', address: '', region: '',
  nearest_city: '', nearest_airport: '', distance_from_airport_km: '',
  image_url: '', hero_image: '', thumbnail_url: '', video_url: '', virtual_tour_url: '',
  duration_days: '', duration_nights: '',
  min_group_size: 1, max_group_size: '', min_age: '', fitness_level: '',
  entrance_fee: '', operating_hours: '',
  highlights: [], activities: [], wildlife: [], gallery: [],
  is_featured: false, is_popular: false, is_new: false,
  is_eco_friendly: false, is_family_friendly: false, is_sold_out: false,
  meta_title: '', meta_description: '',
}

// ── Main Form Component ───────────────────────────────────────────────────────

export default function DestinationForm({ destination, onSuccess, onClose }) {
  const [form, setForm]           = useState(DEFAULTS)
  const [activeTab, setActiveTab] = useState('basic')
  const [countries, setCountries] = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileRef = useRef(null)

  const isEdit = !!destination

  const [gallery, setGallery] = useState([])
  const [galleryUrls, setGalleryUrls] = useState([''])
  const [galleryLoading, setGalleryLoading] = useState(false)

  // Load countries
  useEffect(() => {
    apiFetch('/countries?limit=200&is_active=true')
      .then(d => setCountries(d.data || d.countries || []))
      .catch(() => {})
  }, [])

  // Populate form on edit
  useEffect(() => {
    if (destination) {
      setForm({
        name:                     destination.name || '',
        tagline:                  destination.tagline || '',
        short_description:        destination.shortDescription || '',
        description:              destination.description || '',
        overview:                 destination.overview || '',
        what_to_expect:           destination.whatToExpect || '',
        best_time_to_visit:       destination.bestTimeToVisit || '',
        getting_there:            destination.gettingThere || '',
        local_tips:               destination.localTips || '',
        safety_info:              destination.safetyInfo || '',
        country_id:               destination.countryId || destination.country?.id || '',
        category:                 destination.category || 'safari',
        difficulty:               destination.difficulty || 'moderate',
        destination_type:         destination.destinationType || '',
        status:                   destination.status || 'draft',
        latitude:                 destination.latitude || '',
        longitude:                destination.longitude || '',
        altitude_meters:          destination.altitudeMeters || '',
        address:                  destination.address || '',
        region:                   destination.region || '',
        nearest_city:             destination.nearestCity || '',
        nearest_airport:          destination.nearestAirport || '',
        distance_from_airport_km: destination.distanceFromAirportKm || '',
        image_url:                destination.imageUrl || '',
        hero_image:               destination.heroImage || '',
        thumbnail_url:            destination.thumbnailUrl || '',
        video_url:                destination.videoUrl || '',
        virtual_tour_url:         destination.virtualTourUrl || '',
        duration_days:            destination.durationDays || '',
        duration_nights:          destination.durationNights || '',
        min_group_size:           destination.minGroupSize || 1,
        max_group_size:           destination.maxGroupSize || '',
        min_age:                  destination.minAge || '',
        fitness_level:            destination.fitnessLevel || '',
        entrance_fee:             destination.entranceFee || '',
        operating_hours:          destination.operatingHours || '',
        highlights:               destination.highlights || [],
        activities:               destination.activities || [],
        wildlife:                 destination.wildlife || [],
        is_featured:              destination.isFeatured || false,
        is_popular:               destination.isPopular || false,
        is_new:                   destination.isNew || false,
        is_eco_friendly:          destination.isEcoFriendly || false,
        is_family_friendly:       destination.isFamilyFriendly || false,
        is_sold_out:              destination.isSoldOut || false,
        meta_title:               destination.metaTitle || '',
        meta_description:         destination.metaDescription || '',
      })
      if (destination.imageUrl) setImagePreview(destination.imageUrl)
      if (destination.gallery?.length) {
        setGallery(destination.gallery.map(g => ({ url: g.url || g.imageUrl, caption: g.caption || '' })))
      }
    }
  }, [destination])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addGalleryUrl = () => {
    const url = galleryUrls[0]?.trim()
    if (!url) return
    setGallery(prev => [...prev, { url, caption: '' }])
    setGalleryUrls([''])
  }

  const removeGalleryItem = (idx) => setGallery(prev => prev.filter((_, i) => i !== idx))

  const updateGalleryCaption = (idx, caption) => {
    setGallery(prev => prev.map((g, i) => i === idx ? { ...g, caption } : g))
  }

  const uploadGallery = async (destId) => {
    const items = gallery.filter(g => g?.url)
    if (!items.length) return
    setGalleryLoading(true)
    try {
      const fd = new FormData()
      items.forEach(g => fd.append('image_urls', g.url))
      if (items[0]?.caption) fd.append('caption', items[0].caption)
      await apiFetch(`/destinations/${destId}/images`, { method: 'POST', body: fd })
    } catch (e) {
      console.error('Gallery upload error:', e)
    } finally {
      setGalleryLoading(false)
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    set('image_url', '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Destination name is required')
    if (!form.country_id)  return setError('Country is required')

    setSaving(true)
    setError(null)

    try {
      let body
      let headers = {}

      const { gallery: _g, ...rest } = form

      if (imageFile) {
        body = new FormData()
        body.append('image', imageFile)
        Object.entries(rest).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            v.forEach(item => body.append(k, item))
          } else if (v !== '' && v !== null && v !== undefined) {
            body.append(k, v)
          }
        })
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(rest)
      }

      const method = isEdit ? 'PUT' : 'POST'
      const path   = isEdit ? `/destinations/${destination.id}` : '/destinations'

      const res = await apiFetch(path, { method, headers, body })
      const destId = res.data?.data?.id || destination?.id
      setSuccess(true)

      if (destId) {
        uploadGallery(destId)
      }

      setTimeout(() => onSuccess?.(), 1200)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const tabContent = {
    basic: (
      <div className="space-y-4">
        <SectionCard title="Core Details" icon={Info}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label required>Destination Name</Label>
              <Input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Bwindi Impenetrable Forest"
              />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Short catchy phrase" />
            </div>
            <div>
              <Label required>Country</Label>
              <Select value={form.country_id} onChange={e => set('country_id', e.target.value)}>
                <option value="">Select country...</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.flag || ''} {c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={e => set('category', e.target.value)}>
                {['safari','wildlife','mountain','beach','cultural','adventure','city','nature','historical','wellness'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                {['easy','moderate','challenging','difficult','expert'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Destination Type</Label>
              <Input value={form.destination_type} onChange={e => set('destination_type', e.target.value)} placeholder="e.g. National Park, Reserve" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Short Description</Label>
            <Textarea
              rows={2}
              value={form.short_description}
              onChange={e => set('short_description', e.target.value)}
              placeholder="Brief summary shown on cards (150–200 chars ideal)"
            />
          </div>
          <div>
            <Label>Full Description</Label>
            <Textarea
              rows={5}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Detailed destination description"
            />
          </div>
          <div>
            <Label>Overview</Label>
            <Textarea
              rows={3}
              value={form.overview}
              onChange={e => set('overview', e.target.value)}
              placeholder="High-level overview paragraph"
            />
          </div>
        </SectionCard>

        <SectionCard title="Trip Details" icon={Clock} collapsible defaultOpen>
          <div>
            <Label>What to Expect</Label>
            <Textarea rows={3} value={form.what_to_expect} onChange={e => set('what_to_expect', e.target.value)} placeholder="What visitors should expect" />
          </div>
          <div>
            <Label>Best Time to Visit</Label>
            <Input value={form.best_time_to_visit} onChange={e => set('best_time_to_visit', e.target.value)} placeholder="e.g. June to September" />
          </div>
          <div>
            <Label>Getting There</Label>
            <Textarea rows={3} value={form.getting_there} onChange={e => set('getting_there', e.target.value)} placeholder="How visitors get there" />
          </div>
          <div>
            <Label>Local Tips</Label>
            <Textarea rows={3} value={form.local_tips} onChange={e => set('local_tips', e.target.value)} placeholder="Tips for visitors" />
          </div>
          <div>
            <Label>Safety Info</Label>
            <Textarea rows={2} value={form.safety_info} onChange={e => set('safety_info', e.target.value)} placeholder="Safety notes and advisories" />
          </div>
        </SectionCard>

        <SectionCard title="Arrays: Highlights, Activities, Wildlife" icon={Tag} collapsible defaultOpen>
          <ArrayInput label="Highlights" value={form.highlights} onChange={v => set('highlights', v)} placeholder="Add a highlight" />
          <ArrayInput label="Activities" value={form.activities} onChange={v => set('activities', v)} placeholder="Add an activity" />
          <ArrayInput label="Wildlife" value={form.wildlife} onChange={v => set('wildlife', v)} placeholder="Add wildlife" />
        </SectionCard>

        <SectionCard title="Group & Access" icon={Star} collapsible defaultOpen={false}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Duration (Days)</Label>
              <Input type="number" min="1" value={form.duration_days} onChange={e => set('duration_days', e.target.value)} placeholder="7" />
            </div>
            <div>
              <Label>Duration (Nights)</Label>
              <Input type="number" min="0" value={form.duration_nights} onChange={e => set('duration_nights', e.target.value)} placeholder="6" />
            </div>
            <div>
              <Label>Min Group Size</Label>
              <Input type="number" min="1" value={form.min_group_size} onChange={e => set('min_group_size', e.target.value)} placeholder="1" />
            </div>
            <div>
              <Label>Max Group Size</Label>
              <Input type="number" min="1" value={form.max_group_size} onChange={e => set('max_group_size', e.target.value)} placeholder="20" />
            </div>
            <div>
              <Label>Min Age</Label>
              <Input type="number" min="0" value={form.min_age} onChange={e => set('min_age', e.target.value)} placeholder="12" />
            </div>
            <div>
              <Label>Fitness Level</Label>
              <Input value={form.fitness_level} onChange={e => set('fitness_level', e.target.value)} placeholder="e.g. Moderate" />
            </div>
            <div>
              <Label>Entrance Fee</Label>
              <Input value={form.entrance_fee} onChange={e => set('entrance_fee', e.target.value)} placeholder="e.g. $50 USD" />
            </div>
            <div>
              <Label>Operating Hours</Label>
              <Input value={form.operating_hours} onChange={e => set('operating_hours', e.target.value)} placeholder="e.g. 6am–6pm" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Flags" icon={Settings} collapsible defaultOpen>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Toggle checked={form.is_featured}      onChange={v => set('is_featured', v)}      label="Featured" />
            <Toggle checked={form.is_popular}       onChange={v => set('is_popular', v)}       label="Popular" />
            <Toggle checked={form.is_new}           onChange={v => set('is_new', v)}           label="New" />
            <Toggle checked={form.is_eco_friendly}  onChange={v => set('is_eco_friendly', v)}  label="Eco Friendly" />
            <Toggle checked={form.is_family_friendly} onChange={v => set('is_family_friendly', v)} label="Family Friendly" />
            <Toggle checked={form.is_sold_out}      onChange={v => set('is_sold_out', v)}      label="Sold Out" />
          </div>
        </SectionCard>
      </div>
    ),

    location: (
      <SectionCard title="Location & Geography" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Latitude</Label>
            <Input type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="-1.9403" />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="29.8739" />
          </div>
          <div>
            <Label>Altitude (meters)</Label>
            <Input type="number" value={form.altitude_meters} onChange={e => set('altitude_meters', e.target.value)} placeholder="2607" />
          </div>
          <div>
            <Label>Region</Label>
            <Input value={form.region} onChange={e => set('region', e.target.value)} placeholder="e.g. Western Uganda" />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address or area" />
          </div>
          <div>
            <Label>Nearest City</Label>
            <Input value={form.nearest_city} onChange={e => set('nearest_city', e.target.value)} placeholder="e.g. Kabale" />
          </div>
          <div>
            <Label>Nearest Airport</Label>
            <Input value={form.nearest_airport} onChange={e => set('nearest_airport', e.target.value)} placeholder="e.g. Entebbe International" />
          </div>
          <div>
            <Label>Distance from Airport (km)</Label>
            <Input type="number" value={form.distance_from_airport_km} onChange={e => set('distance_from_airport_km', e.target.value)} placeholder="480" />
          </div>
        </div>
      </SectionCard>
    ),

    media: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Main Image" icon={Image}>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all"
            >
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-44 object-cover rounded-lg mx-auto" />
                  <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium">Click to change</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={28} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 font-medium">Click to upload image</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 10MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <div>
              <Label>Or paste Image URL</Label>
              <Input
                value={form.image_url}
                onChange={e => {
                  set('image_url', e.target.value)
                  if (e.target.value) setImagePreview(e.target.value)
                }}
                placeholder="https://..."
              />
            </div>
          </SectionCard>

          <SectionCard title="Cover / Banner" icon={Image}>
            <div>
              <Label>Cover Image URL</Label>
              <Input
                value={form.hero_image}
                onChange={e => set('hero_image', e.target.value)}
                placeholder="https://..."
              />
              {form.hero_image && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                  <img src={form.hero_image} alt="Cover preview" className="w-full h-36 object-cover"
                    onError={e => { e.target.style.display = 'none' }} />
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Gallery" icon={List} collapsible defaultOpen>
          <p className="text-xs text-gray-500 mb-3">Add images to the destination gallery. These images will be uploaded after the destination is saved.</p>
          {gallery.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {gallery.map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 aspect-[4/3]">
                  <img src={img.url} alt={img.caption || `Photo ${i+1}`} className="w-full h-full object-cover"
                    onError={e => { e.target.src = 'https://placehold.co/200x150?text=?' }} />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1">
                    <button type="button" onClick={() => updateGalleryCaption(i, prompt('Caption:', img.caption) || img.caption)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-gray-800 text-[10px] font-bold hover:bg-blue-50">
                      ✏️ Caption
                    </button>
                    <button type="button" onClick={() => removeGalleryItem(i)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600">
                      <Trash2 size={10} /> Remove
                    </button>
                  </div>
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-[10px] text-white truncate">{img.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label>Add image by URL</Label>
            <div className="flex gap-2">
              <Input
                value={galleryUrls[0] || ''}
                onChange={e => setGalleryUrls([e.target.value])}
                placeholder="https://example.com/photo.jpg"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGalleryUrl())}
              />
              <button type="button" onClick={addGalleryUrl}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap">
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
          {galleryLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Uploading gallery...
            </div>
          )}
        </SectionCard>

        <SectionCard title="Video & Tour" icon={Globe} collapsible defaultOpen={false}>
          <div className="space-y-3">
            <div>
              <Label>Video URL</Label>
              <Input value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtube.com/..." />
            </div>
            <div>
              <Label>Virtual Tour URL</Label>
              <Input value={form.virtual_tour_url} onChange={e => set('virtual_tour_url', e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </SectionCard>
      </div>
    ),

    details: (
      <SectionCard title="Additional Details" icon={Settings}>
        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
          💡 Itinerary, FAQs, Practical Info, Images and Tags can be managed from the destination detail view after saving.
        </p>
      </SectionCard>
    ),

    seo: (
      <SectionCard title="SEO & Meta" icon={Globe}>
        <div className="space-y-4">
          <div>
            <Label>Meta Title</Label>
            <Input
              value={form.meta_title}
              onChange={e => set('meta_title', e.target.value)}
              placeholder="SEO title (50–60 chars ideal)"
              maxLength={160}
            />
            <p className="text-xs text-gray-400 mt-1">{form.meta_title.length}/160</p>
          </div>
          <div>
            <Label>Meta Description</Label>
            <Textarea
              rows={3}
              value={form.meta_description}
              onChange={e => set('meta_description', e.target.value)}
              placeholder="SEO description (150–160 chars ideal)"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{form.meta_description.length}/500</p>
          </div>
          {/* Preview */}
          {(form.meta_title || form.name) && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Search Preview</p>
              <p className="text-blue-600 text-sm font-medium truncate">{form.meta_title || form.name}</p>
              <p className="text-green-700 text-xs">{typeof window !== 'undefined' ? window.location.origin : 'https://altuvera.com'}/destinations/{form.name.toLowerCase().replace(/\s+/g, '-')}</p>
              <p className="text-gray-600 text-xs mt-1 line-clamp-2">{form.meta_description || form.short_description || 'No description set'}</p>
            </div>
          )}
        </div>
      </SectionCard>
    ),
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
      <div className="h-full w-full max-w-3xl bg-gray-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Mountain size={16} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Destination' : 'New Destination'}</h2>
              <p className="text-xs text-gray-500">{isEdit ? `Editing: ${destination.name}` : 'Fill in the details below'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-2 overflow-x-auto shrink-0">
          {FORM_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            <CheckCircle size={16} />
            Destination {isEdit ? 'updated' : 'created'} successfully!
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {tabContent[activeTab]}
          </div>
        </form>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <div className="flex gap-3">
            {activeTab !== FORM_TABS[FORM_TABS.length - 1].id && (
              <button
                type="button"
                onClick={() => {
                  const idx = FORM_TABS.findIndex(t => t.id === activeTab)
                  if (idx < FORM_TABS.length - 1) setActiveTab(FORM_TABS[idx + 1].id)
                }}
                className="px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
              >
                Next →
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || success}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" /> Saving...</>
              ) : success ? (
                <><CheckCircle size={15} /> Saved!</>
              ) : (
                <><Save size={15} /> {isEdit ? 'Save Changes' : 'Create Destination'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}