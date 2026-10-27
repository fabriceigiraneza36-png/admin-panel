import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronRight, Clock3,
  ClipboardCheck, FileText, MapPin, Package, RefreshCw, Search, Users,
} from 'lucide-react'
import { itinerariesAPI } from '@api/itineraries'
import { getErrorMessage } from '@api/client'

const STATUS_STYLES = {
  draft: 'bg-amber-50 text-amber-800 border-amber-200',
  sent: 'bg-sky-50 text-sky-800 border-sky-200',
  change_requested: 'bg-rose-50 text-rose-800 border-rose-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
}

const formatDate = (value) => {
  if (!value) return 'Dates to be confirmed'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const prettyStatus = (value) => String(value || 'draft').replace(/_/g, ' ')

export default function Itineraries() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const response = await itinerariesAPI.list()
      const data = response?.data?.data || response?.data || response
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getErrorMessage(err) || 'Saved itineraries could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => ({
    all: items.length,
    draft: items.filter((item) => item.itinerary_status === 'draft').length,
    sent: items.filter((item) => item.itinerary_status === 'sent').length,
    changes: items.filter((item) => item.itinerary_status === 'change_requested').length,
    approved: items.filter((item) => item.itinerary_status === 'approved').length,
  }), [items])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      const status = item.itinerary_status || 'draft'
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!term) return true
      const searchable = [
        item.booking_number, item.full_name, item.email, item.destination_name,
        item.country_name, item.package_name, item.service_name, item.booking_type,
      ].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(term)
    })
  }, [items, search, statusFilter])

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
            <ClipboardCheck size={14}/> Trip planning workspace
          </div>
          <h1 className="page-title mt-3">Itineraries</h1>
          <p className="page-subtitle mt-1 max-w-2xl">Find saved drafts, review traveller requests, and continue preparing polished day-by-day travel plans.</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/> {refreshing ? 'Refreshing…' : 'Refresh itineraries'}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" onClick={() => setStatusFilter('all')} className={`rounded-2xl border p-4 text-left transition ${statusFilter === 'all' ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">All saved</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{counts.all}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter('draft')} className={`rounded-2xl border p-4 text-left transition ${statusFilter === 'draft' ? 'border-amber-300 bg-amber-50 shadow-sm' : 'border-slate-200 bg-white hover:border-amber-200'}`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Drafts</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{counts.draft}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter('change_requested')} className={`rounded-2xl border p-4 text-left transition ${statusFilter === 'change_requested' ? 'border-rose-300 bg-rose-50 shadow-sm' : 'border-slate-200 bg-white hover:border-rose-200'}`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Changes requested</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{counts.changes}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter('approved')} className={`rounded-2xl border p-4 text-left transition ${statusFilter === 'approved' ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Approved</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{counts.approved}</p>
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search traveller, booking number, package or destination…"
              className="input w-full !rounded-xl !py-3 !pl-10"/>
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}
              className="input min-w-0 !w-auto !rounded-xl !py-3">
              <option value="all">All saved</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent to traveller</option>
              <option value="change_requested">Changes requested</option>
              <option value="approved">Approved</option>
            </select>
          </label>
        </div>
      </section>

      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <AlertCircle size={18} className="mt-0.5 shrink-0"/><div className="min-w-0 flex-1"><p className="font-extrabold">Could not load itineraries</p><p className="mt-1 break-words text-xs leading-relaxed">{error}</p></div>
        <button type="button" onClick={() => void load()} className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold">Retry</button>
      </div>}

      {loading ? (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white"><div className="text-center"><RefreshCw size={24} className="mx-auto animate-spin text-emerald-600"/><p className="mt-3 text-xs font-semibold text-slate-500">Loading saved itineraries…</p></div></div>
      ) : !error && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white p-8 text-center sm:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-100 bg-white text-emerald-700 shadow-sm"><FileText size={25}/></div>
          <h2 className="mt-4 text-base font-extrabold text-slate-900">{items.length ? 'No itineraries match those filters' : 'Your saved itineraries will appear here'}</h2>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-500">{items.length ? 'Try a different search or choose another status.' : 'Open a verified booking, build a personalized plan, and use Save draft. Drafts are stored with their booking and will remain available here when you return.'}</p>
          <button type="button" onClick={() => navigate('/bookings')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-800">Open bookings <ChevronRight size={15}/></button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((booking) => {
            const status = booking.itinerary_status || 'draft'
            const itinerary = booking.itinerary && typeof booking.itinerary === 'object' ? booking.itinerary : {}
            const dates = [booking.travel_date || booking.arrival_date, booking.end_date || booking.return_date || booking.departure_date].filter(Boolean).map(formatDate)
            const travellerCount = booking.number_of_travelers || booking.number_of_adults || '—'
            return (
              <article key={booking.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                <div className="flex items-start gap-4 p-4 sm:p-5">
                  {booking.destination_image_url ? (
                    <img src={booking.destination_image_url} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl border border-emerald-100 object-cover sm:h-24 sm:w-24"/>
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 sm:h-24 sm:w-24"><MapPin size={25}/></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>{prettyStatus(status)}</span>
                      {booking.booking_number && <span className="text-[10px] font-bold text-slate-400">#{booking.booking_number}</span>}
                    </div>
                    <h2 className="mt-2 break-words text-base font-extrabold text-slate-900">{itinerary.title || `${booking.destination_name || booking.package_name || 'Personalized'} itinerary`}</h2>
                    <p className="mt-1 break-words text-xs text-slate-500">{booking.destination_name || booking.package_name || 'Travel plan'}{booking.country_name ? ` · ${booking.country_name}` : ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:grid-cols-2 sm:px-5">
                  <div className="flex min-w-0 items-start gap-2 text-xs text-slate-600"><Users size={14} className="mt-0.5 shrink-0 text-emerald-700"/><span className="min-w-0 break-words"><b className="text-slate-800">{booking.full_name || 'Traveller'}</b><span className="block mt-0.5 break-all text-[10px] text-slate-400">{booking.email || 'No email on record'}</span></span></div>
                  <div className="flex min-w-0 items-start gap-2 text-xs text-slate-600"><CalendarDays size={14} className="mt-0.5 shrink-0 text-emerald-700"/><span>{dates.length ? dates.join(' → ') : 'Flexible dates'}<span className="block mt-0.5 text-[10px] text-slate-400">{travellerCount} traveller(s)</span></span></div>
                  <div className="flex min-w-0 items-start gap-2 text-xs text-slate-600"><Package size={14} className="mt-0.5 shrink-0 text-emerald-700"/><span className="break-words">{booking.package_name || booking.service_name || 'Custom trip'}<span className="block mt-0.5 text-[10px] capitalize text-slate-400">{booking.booking_type || 'booking'} request</span></span></div>
                  <div className="flex min-w-0 items-start gap-2 text-xs text-slate-600"><Clock3 size={14} className="mt-0.5 shrink-0 text-emerald-700"/><span>{itinerary.days?.length || 0} itinerary day(s)<span className="block mt-0.5 text-[10px] text-slate-400">{booking.updated_at ? `Updated ${formatDate(booking.updated_at)}` : 'Saved draft'}</span></span></div>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400"><CheckCircle2 size={13} className="text-emerald-600"/> Changes remain attached to this booking</div>
                  <button type="button" onClick={() => navigate(`/itineraries/${booking.id}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-800">Open itinerary builder <ChevronRight size={15}/></button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
