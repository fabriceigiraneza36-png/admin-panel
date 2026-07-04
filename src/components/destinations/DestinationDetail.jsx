// admin/src/components/destinations/DestinationDetail.jsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  X, MapPin, Star, Eye, Heart, Share2, Clock, Users, Mountain,
  Globe, Flag, ChevronRight, Image, List, HelpCircle, MessageSquare,
  Info, Tag, Link, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw,
  Calendar, Thermometer, Shield, Package, Navigation, AlertCircle,
  CheckCircle, ExternalLink, BarChart2, TrendingUp, Award, Zap
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'

const getToken = () => localStorage.getItem('token') || ''

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts.headers },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const Badge = ({ children, color = 'green' }) => {
  const colors = {
    green:  'bg-green-100 text-green-800 border border-green-200',
    red:    'bg-red-100 text-red-800 border border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    gray:   'bg-gray-100 text-gray-700 border border-gray-200',
    blue:   'bg-blue-100 text-blue-800 border border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border border-purple-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.green}`}>
      {children}
    </span>
  )
}

const StatCard = ({ icon: Icon, label, value, color = 'green' }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color === 'green' ? 'bg-green-100' : color === 'blue' ? 'bg-blue-100' : color === 'purple' ? 'bg-purple-100' : 'bg-orange-100'}`}>
      <Icon size={18} className={color === 'green' ? 'text-green-600' : color === 'blue' ? 'text-blue-600' : color === 'purple' ? 'text-purple-600' : 'text-orange-600'} />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  </div>
)

const SectionTab = ({ id, label, icon: Icon, active, onClick, count }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
      active
        ? 'bg-green-600 text-white shadow-sm'
        : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-700'
    }`}
  >
    <Icon size={15} />
    {label}
    {count !== undefined && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
        {count}
      </span>
    )}
  </button>
)

// ── Sub-sections ──────────────────────────────────────────────────────────────

const OverviewSection = ({ dest }) => (
  <div className="space-y-6">
    {/* Hero */}
    <div className="relative rounded-2xl overflow-hidden h-64 bg-gray-100">
      {dest.heroImage || dest.imageUrl ? (
        <img src={dest.heroImage || dest.imageUrl} alt={dest.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
          <Mountain size={48} className="text-green-300" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 text-white">
        <p className="text-sm opacity-75">{dest.country?.name} {dest.country?.flag}</p>
        <h2 className="text-2xl font-bold">{dest.name}</h2>
        {dest.tagline && <p className="text-sm opacity-90 mt-0.5">{dest.tagline}</p>}
      </div>
      <div className="absolute top-3 right-3 flex gap-2">
        <Badge color={dest.status === 'published' ? 'green' : dest.status === 'draft' ? 'yellow' : 'gray'}>
          {dest.status}
        </Badge>
        {dest.isFeatured && <Badge color="purple">Featured</Badge>}
        {dest.isPopular && <Badge color="blue">Popular</Badge>}
      </div>
    </div>

    {/* Stats Row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard icon={Star}   label="Rating"      value={dest.rating ? `${dest.rating}/5` : '—'} color="yellow" />
      <StatCard icon={Eye}    label="Views"        value={dest.viewCount?.toLocaleString()}         color="blue" />
      <StatCard icon={Heart}  label="Wishlisted"   value={dest.wishlistCount?.toLocaleString()}     color="purple" />
      <StatCard icon={Share2} label="Shares"       value={dest.shareCount?.toLocaleString()}        color="green" />
    </div>

    {/* Info Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info size={16} className="text-green-600" /> Basic Info
        </h3>
        <dl className="space-y-2.5">
          {[
            { label: 'Category',    value: dest.category },
            { label: 'Type',        value: dest.destinationType },
            { label: 'Difficulty',  value: dest.difficulty },
            { label: 'Duration',    value: dest.duration },
            { label: 'Group Size',  value: dest.maxGroupSize ? `${dest.minGroupSize || 1}–${dest.maxGroupSize}` : null },
            { label: 'Min Age',     value: dest.minAge ? `${dest.minAge}+` : null },
            { label: 'Fitness',     value: dest.fitnessLevel },
          ].filter(i => i.value).map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900 capitalize">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Location */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-green-600" /> Location
        </h3>
        <dl className="space-y-2.5">
          {[
            { label: 'Country',    value: `${dest.country?.name || '—'} ${dest.country?.flag || ''}` },
            { label: 'Region',     value: dest.region },
            { label: 'Nearest City', value: dest.nearestCity },
            { label: 'Airport',    value: dest.nearestAirport },
            { label: 'Distance',   value: dest.distanceFromAirportKm ? `${dest.distanceFromAirportKm} km` : null },
            { label: 'Altitude',   value: dest.altitudeMeters ? `${dest.altitudeMeters}m` : null },
            { label: 'GPS',        value: dest.latitude ? `${dest.latitude}, ${dest.longitude}` : null },
          ].filter(i => i.value).map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>

    {/* Description */}
    {(dest.shortDescription || dest.description) && (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
        {dest.shortDescription && (
          <p className="text-sm text-gray-600 font-medium mb-2">{dest.shortDescription}</p>
        )}
        {dest.description && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{dest.description}</p>
        )}
      </div>
    )}

    {/* Highlights & Activities */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {dest.highlights?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Award size={16} className="text-green-600" /> Highlights
          </h3>
          <ul className="space-y-1.5">
            {dest.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
      {dest.activities?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-green-600" /> Activities
          </h3>
          <div className="flex flex-wrap gap-2">
            {dest.activities.map((a, i) => (
              <span key={i} className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* SEO */}
    {(dest.metaTitle || dest.metaDescription) && (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Globe size={16} className="text-green-600" /> SEO
        </h3>
        {dest.metaTitle && <p className="text-sm font-medium text-gray-800 mb-1">{dest.metaTitle}</p>}
        {dest.metaDescription && <p className="text-sm text-gray-600">{dest.metaDescription}</p>}
      </div>
    )}
  </div>
)

const GallerySection = ({ destId, images, onRefresh }) => {
  const [loading, setLoading] = useState(false)

  const setPrimary = async (imageId) => {
    try {
      await apiFetch(`/destinations/${destId}/images/${imageId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_primary: true }),
      })
      onRefresh()
    } catch (e) { alert(e.message) }
  }

  const deleteImage = async (imageId) => {
    if (!confirm('Delete this image?')) return
    try {
      await apiFetch(`/destinations/${destId}/images/${imageId}`, { method: 'DELETE' })
      onRefresh()
    } catch (e) { alert(e.message) }
  }

  if (!images?.length) return (
    <div className="text-center py-16 text-gray-400">
      <Image size={40} className="mx-auto mb-3 opacity-40" />
      <p>No images yet</p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map(img => (
        <div key={img.id} className={`relative group rounded-xl overflow-hidden border-2 ${img.isPrimary ? 'border-green-500' : 'border-gray-200'}`}>
          <img src={img.imageUrl} alt={img.altText || ''} className="w-full h-40 object-cover" />
          {img.isPrimary && (
            <div className="absolute top-2 left-2">
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">Primary</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {!img.isPrimary && (
              <button onClick={() => setPrimary(img.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">
                Set Primary
              </button>
            )}
            <button onClick={() => deleteImage(img.id)} className="bg-red-600 text-white p-1.5 rounded-lg hover:bg-red-700">
              <Trash2 size={14} />
            </button>
          </div>
          {img.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
              {img.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const ItinerarySection = ({ itinerary }) => {
  if (!itinerary?.length) return (
    <div className="text-center py-16 text-gray-400">
      <List size={40} className="mx-auto mb-3 opacity-40" />
      <p>No itinerary days yet</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {itinerary.map(day => (
        <div key={day.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              {day.dayNumber}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">{day.title}</h4>
              {day.distanceKm && <p className="text-xs text-gray-500">{day.distanceKm} km</p>}
            </div>
          </div>
          <div className="p-4 space-y-3">
            {day.description && <p className="text-sm text-gray-600 leading-relaxed">{day.description}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {day.activities?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Activities</p>
                  <div className="flex flex-wrap gap-1">
                    {day.activities.map((a, i) => <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{a}</span>)}
                  </div>
                </div>
              )}
              {day.meals?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Meals</p>
                  <div className="flex flex-wrap gap-1">
                    {day.meals.map((m, i) => <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{m}</span>)}
                  </div>
                </div>
              )}
              {day.accommodation && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Accommodation</p>
                  <p className="text-xs text-gray-700">{day.accommodation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const FAQsSection = ({ faqs }) => {
  const [open, setOpen] = useState(null)

  if (!faqs?.length) return (
    <div className="text-center py-16 text-gray-400">
      <HelpCircle size={40} className="mx-auto mb-3 opacity-40" />
      <p>No FAQs yet</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {faqs.map(faq => (
        <div key={faq.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setOpen(open === faq.id ? null : faq.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
            <ChevronRight size={16} className={`text-gray-400 shrink-0 transition-transform ${open === faq.id ? 'rotate-90' : ''}`} />
          </button>
          {open === faq.id && (
            <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              {faq.answer}
              {faq.helpfulCount > 0 && (
                <p className="text-xs text-gray-400 mt-2">{faq.helpfulCount} people found this helpful</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const ReviewsSection = ({ reviews, aggregate }) => {
  if (!reviews?.length) return (
    <div className="text-center py-16 text-gray-400">
      <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
      <p>No approved reviews yet</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Aggregate */}
      {aggregate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">{aggregate.avgRating?.toFixed(1) || '0'}</p>
              <div className="flex items-center gap-0.5 justify-center mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} className={s <= Math.round(aggregate.avgRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{aggregate.totalReviews} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {[
                { label: '5★', count: aggregate.distribution?.fiveStar || 0 },
                { label: '4★', count: aggregate.distribution?.fourStar || 0 },
                { label: '3★', count: aggregate.distribution?.threeStar || 0 },
                { label: '2★', count: aggregate.distribution?.twoStar || 0 },
                { label: '1★', count: aggregate.distribution?.oneStar || 0 },
              ].map(({ label, count }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-gray-500">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-yellow-400 h-1.5 rounded-full"
                      style={{ width: `${aggregate.totalReviews ? (count / aggregate.totalReviews) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 text-gray-500 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Cards */}
      {reviews.map(r => (
        <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {r.reviewerAvatar ? (
                <img src={r.reviewerAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                  {(r.reviewerName || 'A')[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 text-sm">{r.reviewerName || 'Anonymous'}</p>
                {r.reviewerCountry && <p className="text-xs text-gray-500">{r.reviewerCountry}</p>}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={13} className={s <= Math.round(r.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
              ))}
            </div>
          </div>
          {r.title && <p className="font-semibold text-gray-800 text-sm mb-1">{r.title}</p>}
          <p className="text-sm text-gray-600 leading-relaxed">{r.content}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            {r.tripType && <span>🎒 {r.tripType}</span>}
            {r.tripDate && <span>📅 {new Date(r.tripDate).toLocaleDateString()}</span>}
            {r.isVerified && <span className="text-green-600 font-medium">✓ Verified</span>}
            {r.isFeatured && <span className="text-purple-600 font-medium">⭐ Featured</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

const PracticalInfoSection = ({ info }) => {
  if (!info) return (
    <div className="text-center py-16 text-gray-400">
      <Info size={40} className="mx-auto mb-3 opacity-40" />
      <p>No practical info yet</p>
    </div>
  )

  const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon size={16} className="text-green-600" />
        {title}
      </h3>
      {children}
    </div>
  )

  const Item = ({ label, value }) => {
    if (!value || (Array.isArray(value) && !value.length)) return null
    return (
      <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
        <dt className="text-gray-500 shrink-0 mr-4">{label}</dt>
        <dd className="font-medium text-gray-900 text-right">
          {Array.isArray(value) ? value.join(', ') : String(value)}
        </dd>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Section title="Getting There" icon={Navigation}>
        <dl>
          <Item label="Airport"             value={info.gettingThere?.nearestAirport} />
          <Item label="From Airport"        value={info.gettingThere?.distanceFromAirport} />
          <Item label="From Capital"        value={info.gettingThere?.driveTimeFromCapital} />
          <Item label="Road Conditions"     value={info.gettingThere?.roadConditions} />
          <Item label="Transport Options"   value={info.gettingThere?.transportOptions} />
          <Item label="Border Crossings"    value={info.gettingThere?.borderCrossings} />
        </dl>
      </Section>

      <Section title="Health & Safety" icon={Shield}>
        <dl>
          <Item label="Vaccinations Required"    value={info.healthAndSafety?.vaccinationsRequired} />
          <Item label="Vaccinations Recommended" value={info.healthAndSafety?.vaccinationsRecommended} />
          <Item label="Malaria Risk"             value={info.healthAndSafety?.malariaRisk} />
          <Item label="Water Safety"             value={info.healthAndSafety?.waterSafety} />
          <Item label="Medical Facilities"       value={info.healthAndSafety?.medicalFacilities} />
          <Item label="Safety Rating"            value={info.healthAndSafety?.safetyRating} />
          <Item label="Safety Notes"             value={info.healthAndSafety?.safetyNotes} />
        </dl>
      </Section>

      <Section title="Climate" icon={Thermometer}>
        <dl>
          <Item label="Temp Range"     value={info.climate?.avgTempLowC != null ? `${info.climate.avgTempLowC}°C – ${info.climate.avgTempHighC}°C` : null} />
          <Item label="Best Months"    value={info.climate?.bestMonths} />
          <Item label="Avoid Months"   value={info.climate?.avoidMonths} />
          <Item label="Rainfall/Year"  value={info.climate?.rainfallMmAnnual ? `${info.climate.rainfallMmAnnual}mm` : null} />
          <Item label="Humidity"       value={info.climate?.humidityPercent ? `${info.climate.humidityPercent}%` : null} />
          <Item label="UV Index"       value={info.climate?.uvIndexPeak} />
          <Item label="Climate Notes"  value={info.climate?.climateNotes} />
        </dl>
      </Section>

      <Section title="Budget & Costs" icon={Package}>
        <dl>
          <Item label="Budget Range"   value={info.budget?.rangeUsd} />
          <Item label="Entrance Fee"   value={info.budget?.entranceFeeUsd} />
          <Item label="Guide Cost"     value={info.budget?.guideCostUsd} />
          <Item label="Meal Range"     value={info.budget?.mealCostRange} />
        </dl>
      </Section>

      <Section title="Permits & Rules" icon={AlertCircle}>
        <dl>
          <Item label="Permits Required"   value={info.permitsAndRegulations?.permitsRequired} />
          <Item label="Permit Cost"        value={info.permitsAndRegulations?.permitCost} />
          <Item label="Booking Lead Time"  value={info.permitsAndRegulations?.bookingLeadTime} />
          <Item label="Visitor Limits"     value={info.permitsAndRegulations?.visitorLimits} />
          <Item label="Regulations"        value={info.permitsAndRegulations?.regulations} />
        </dl>
      </Section>

      <Section title="Packing & Culture" icon={Tag}>
        <dl>
          <Item label="Packing Essentials"  value={info.packing?.essentials} />
          <Item label="Clothing Tips"       value={info.packing?.clothingTips} />
          <Item label="Gear"                value={info.packing?.gearRecommendations} />
          <Item label="Currency Tips"       value={info.culture?.currencyTips} />
          <Item label="Tipping"             value={info.culture?.tippingCulture} />
          <Item label="Etiquette"           value={info.culture?.localEtiquette} />
          <Item label="Photography Rules"   value={info.culture?.photographyRules} />
        </dl>
      </Section>
    </div>
  )
}

const TagsSection = ({ tags, destId, onRefresh }) => {
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  const addTag = async (e) => {
    e.preventDefault()
    if (!newTag.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/destinations/${destId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag_name: newTag.trim() }),
      })
      setNewTag('')
      onRefresh()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const removeTag = async (tagId) => {
    if (!confirm('Remove tag?')) return
    try {
      await apiFetch(`/destinations/${destId}/tags/${tagId}`, { method: 'DELETE' })
      onRefresh()
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addTag} className="flex gap-2">
        <input
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="Add a tag..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={saving || !newTag.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '...' : 'Add'}
        </button>
      </form>

      {tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 px-3 py-1 rounded-full text-sm">
              <Tag size={12} />
              {tag.name}
              {tag.category && <span className="text-green-500 text-xs">({tag.category})</span>}
              <button onClick={() => removeTag(tag.id)} className="ml-1 text-green-500 hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">No tags yet</p>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DestinationDetail({ destinationId, onClose, onEdit }) {
  const [dest, setDest]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const load = useCallback(async () => {
    if (!destinationId) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(
        `/destinations/${destinationId}?include=all`
      )
      setDest(data.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [destinationId])

  useEffect(() => { load() }, [load])

  const TABS = [
    { id: 'overview',   label: 'Overview',       icon: BarChart2 },
    { id: 'gallery',    label: 'Gallery',         icon: Image,          count: dest?.gallery?.length },
    { id: 'itinerary',  label: 'Itinerary',       icon: List,           count: dest?.itinerary?.length },
    { id: 'faqs',       label: 'FAQs',            icon: HelpCircle,     count: dest?.faqs?.length },
    { id: 'reviews',    label: 'Reviews',         icon: MessageSquare,  count: dest?.reviews?.length },
    { id: 'practical',  label: 'Practical Info',  icon: Info },
    { id: 'tags',       label: 'Tags',            icon: Tag,            count: dest?.tags?.length },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
      <div className="h-full w-full max-w-4xl bg-gray-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <Mountain size={16} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{dest?.name || 'Loading...'}</h2>
              {dest?.country && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={11} /> {dest.country.name} {dest.country.flag}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={load}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            {onEdit && dest && (
              <button
                onClick={() => onEdit(dest)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Edit size={14} /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-2 overflow-x-auto shrink-0">
          {TABS.map(tab => (
            <SectionTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={setActiveTab}
              count={tab.count}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-10 h-10 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading destination...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <AlertCircle size={40} className="text-red-400" />
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={load} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Retry
              </button>
            </div>
          ) : dest ? (
            <>
              {activeTab === 'overview'  && <OverviewSection dest={dest} />}
              {activeTab === 'gallery'   && <GallerySection destId={dest.id} images={dest.gallery} onRefresh={load} />}
              {activeTab === 'itinerary' && <ItinerarySection itinerary={dest.itinerary} />}
              {activeTab === 'faqs'      && <FAQsSection faqs={dest.faqs} />}
              {activeTab === 'reviews'   && <ReviewsSection reviews={dest.reviews} aggregate={dest.reviewAggregate} />}
              {activeTab === 'practical' && <PracticalInfoSection info={dest.practicalInfo} />}
              {activeTab === 'tags'      && <TagsSection tags={dest.tags} destId={dest.id} onRefresh={load} />}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}