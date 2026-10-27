import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Bus, CalendarDays, CheckCircle2, ClipboardCheck, Hotel, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { itinerariesAPI } from '@api/itineraries'
import { getErrorMessage } from '@api/client'

const stageLabel = {
  planning: 'Planning',
  awaiting_suppliers: 'Awaiting suppliers',
  ready: 'Ready for departure',
  in_progress: 'Guest travelling',
  completed: 'Completed',
  on_hold: 'Needs attention',
}
const stageStyle = {
  planning: 'bg-slate-100 text-slate-700',
  awaiting_suppliers: 'bg-amber-100 text-amber-800',
  ready: 'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-sky-100 text-sky-800',
  completed: 'bg-slate-100 text-slate-600',
  on_hold: 'bg-rose-100 text-rose-800',
}
const fmtDate = value => {
  if (!value) return 'Date not set'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TripOperations() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('attention')

  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    setError('')
    try {
      const response = await itinerariesAPI.list()
      const payload = response?.data?.data ?? response?.data ?? response
      setItems(Array.isArray(payload) ? payload : [])
    } catch (err) {
      setError(getErrorMessage(err) || 'Trip operations could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => items.map(item => {
    const operations = item.itinerary?.operations || {}
    const suppliers = Array.isArray(operations.suppliers) ? operations.suppliers : []
    const readiness = Array.isArray(operations.readiness) ? operations.readiness : []
    const requiredSuppliers = suppliers.filter(s => s.status !== 'not_required')
    const supplierIssues = requiredSuppliers.filter(s => !['confirmed', 'paid'].includes(s.status)).length
    const done = readiness.filter(r => r.done).length
    const nextAction = String(operations.nextAction || '').trim()
    const stage = operations.tripStatus || 'planning'
    const attention = stage === 'on_hold' || !String(operations.coordinator || '').trim() || suppliers.length === 0 || supplierIssues > 0 || readiness.length === 0 || done < readiness.length || Boolean(nextAction)
    return { ...item, operations, suppliers, readiness, supplierIssues, done, stage, attention, nextAction, requiredSuppliers }
  }), [items])

  const counts = useMemo(() => ({
    all: rows.length,
    attention: rows.filter(r => r.attention && r.stage !== 'completed').length,
    supplierIssues: rows.reduce((sum, r) => sum + r.supplierIssues, 0),
    ready: rows.filter(r => r.stage === 'ready' && r.supplierIssues === 0 && r.readiness.every(x => x.done)).length,
  }), [rows])

  const filtered = rows.filter(row => {
    const term = search.trim().toLowerCase()
    const text = [row.booking_number, row.full_name, row.destination_name, row.country_name, row.package_name, row.operations.coordinator].filter(Boolean).join(' ').toLowerCase()
    if (term && !text.includes(term)) return false
    if (filter === 'attention') return row.attention && row.stage !== 'completed'
    if (filter === 'supplier') return row.supplierIssues > 0
    if (filter === 'ready') return row.stage === 'ready' && row.supplierIssues === 0 && row.readiness.every(x => x.done)
    return true
  })

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800"><ClipboardCheck size={14}/> Safari operations</span>
        <h1 className="page-title mt-3">Trip Operations</h1>
        <p className="page-subtitle mt-1 max-w-2xl">Coordinate each confirmed safari across Rwanda, Uganda, Tanzania and Kenya. Track the owner, supplier confirmations, pre-departure checks and the next action.</p>
      </div>
      <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-800 shadow-sm disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/> Refresh</button>
    </header>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[['All planned trips', counts.all, 'all'], ['Need attention', counts.attention, 'attention'], ['Supplier follow-ups', counts.supplierIssues, 'supplier'], ['Ready for departure', counts.ready, 'ready']].map(([label,value,key]) =>
        <button key={key} onClick={() => setFilter(key)} className={`rounded-2xl border p-4 text-left transition ${filter===key?'border-emerald-300 bg-emerald-50':'border-slate-200 bg-white hover:border-emerald-200'}`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
        </button>)}
    </div>

    <label className="relative block"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search booking, traveller, destination or coordinator…" className="input w-full !rounded-xl !py-3 !pl-10"/></label>

    {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-extrabold">Could not load trip operations</p><p className="mt-1 text-xs">{error}</p><button onClick={()=>void load()} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold">Retry</button></div>}

    {loading ? <div className="grid min-h-48 place-items-center rounded-2xl border bg-white"><RefreshCw className="animate-spin text-emerald-600"/></div> : !error && filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center"><ClipboardCheck size={28} className="mx-auto text-emerald-600"/><h2 className="mt-3 font-extrabold text-slate-900">{items.length ? 'No trips match this view' : 'No saved trip plans yet'}</h2><p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-500">{items.length ? 'Try another filter or search term.' : 'Open a verified booking, save its itinerary draft and complete the supplier register to start coordinating its operations.'}</p><button onClick={()=>navigate('/bookings')} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white">Open bookings <ArrowRight size={14} className="ml-1 inline"/></button></div> :
      <div className="space-y-3">{filtered.map(row => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{row.booking_number || `Booking #${row.id}`}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${stageStyle[row.stage] || stageStyle.planning}`}>{stageLabel[row.stage] || row.stage}</span>{row.attention && row.stage !== 'completed' && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700"><AlertTriangle size={12}/> Follow-up needed</span>}</div>
            <h2 className="mt-2 break-words text-base font-extrabold text-slate-900">{row.full_name || 'Traveller'} · {row.destination_name || row.country_name || row.package_name || 'Custom safari'}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays size={13}/>{fmtDate(row.travel_date || row.arrival_date)} – {fmtDate(row.end_date || row.return_date || row.departure_date)}</span><span className="inline-flex items-center gap-1.5"><Users size={13}/>{row.number_of_travelers || 1} traveller(s)</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={13}/>{row.operations.coordinator || 'Coordinator not assigned'}</span></div>
          </div>
          <button onClick={()=>navigate(`/itineraries/${row.id}`)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800">Manage trip <ArrowRight size={14}/></button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><Bus size={12} className="mr-1 inline"/> Supplier confirmations</p><p className="mt-1 text-sm font-extrabold text-slate-800">{row.requiredSuppliers.length - row.supplierIssues}/{row.requiredSuppliers.length} confirmed</p><p className="mt-1 text-[11px] text-slate-500">{row.supplierIssues ? `${row.supplierIssues} supplier follow-up(s) pending` : 'No outstanding supplier confirmation'}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><CheckCircle2 size={12} className="mr-1 inline"/> Pre-departure readiness</p><p className="mt-1 text-sm font-extrabold text-slate-800">{row.done}/{row.readiness.length} checks complete</p><p className="mt-1 text-[11px] text-slate-500">{row.readiness.length && row.done === row.readiness.length ? 'All recorded checks complete' : 'Review the checklist before departure'}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><Hotel size={12} className="mr-1 inline"/> Next action</p><p className="mt-1 break-words text-sm font-extrabold text-slate-800">{row.nextAction || 'No next action recorded'}</p><p className="mt-1 text-[11px] text-slate-500">{row.operations.nextActionDue ? `Due ${fmtDate(row.operations.nextActionDue)}` : 'No due date set'}</p></div>
        </div>
      </article>)}</div>}
  </div>
}
