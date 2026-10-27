import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowDownToLine, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Compass, Package, RefreshCw, Search, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import apiClient from '@api/client'
import { itinerariesAPI } from '@api/itineraries'
import { getErrorMessage } from '@api/client'

const extractRows = (response, keys = []) => {
  const root = response?.data
  const candidates = [root?.data, ...keys.map(key => root?.[key]), root?.items]
  return candidates.find(Array.isArray) || []
}
const extractTotal = response => {
  const root = response?.data
  return root?.pagination?.total ?? root?.pagination?.totalItems ?? root?.total ?? root?.count ?? null
}
const normalize = value => String(value || '').trim().toLowerCase()
const dateValue = value => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const fmt = value => new Intl.NumberFormat().format(value)
const monthKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
const monthLabel = date => date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
const csvCell = value => {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}
const downloadCsv = (filename, rows) => {
  const content = rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
const reportDate = value => value ? value.toLocaleDateString() : 'Date not recorded'

function Metric({ label, value, detail, icon: Icon, tone = 'emerald' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-800',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-slate-500">{label}</p><span className={`rounded-xl p-2 ${tones[tone] || tones.emerald}`}><Icon size={17}/></span></div>
    <p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
  </article>
}

function Ranking({ title, subtitle, rows, icon: Icon, empty }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Icon size={18}/></span><div><h2 className="font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div></div>
    {rows.length ? <div className="mt-4 space-y-4">{rows.map((row,index)=><div key={row.name} className="min-w-0">
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-extrabold text-slate-500">{index+1}</span><span className="break-words text-sm font-semibold text-slate-800">{row.name}</span></div><span className="shrink-0 text-sm font-extrabold text-slate-900">{fmt(row.count)}</span></div>
      <div className="ml-8 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{width:`${Math.max(3, row.count / Math.max(1, rows[0]?.count) * 100)}%`}}/></div>
    </div>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">{empty}</p>}
  </section>
}

export default function TourismAnalytics() {
  const navigate = useNavigate()
  const [bookings,setBookings] = useState([])
  const [destinations,setDestinations] = useState([])
  const [packages,setPackages] = useState([])
  const [countries,setCountries] = useState([])
  const [itineraries,setItineraries] = useState([])
  const [totals,setTotals] = useState({})
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [error,setError] = useState('')
  const [loadedAt,setLoadedAt] = useState(null)
  const [from,setFrom] = useState('')
  const [to,setTo] = useState('')
  const [query,setQuery] = useState('')
  const [status,setStatus] = useState('all')

  const load = useCallback(async (quiet=false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    setError('')
    const [bookingRes,destinationRes,packageRes,countryRes,itineraryRes] = await Promise.allSettled([
      apiClient.get('/bookings',{params:{limit:100,page:1,sortBy:'created_at',order:'desc'}}),
      apiClient.get('/destinations',{params:{limit:100,page:1}}),
      apiClient.get('/packages',{params:{limit:100,page:1}}),
      apiClient.get('/countries',{params:{limit:100,page:1}}),
      itinerariesAPI.list(),
    ])
    const failed = []
    const read = (result,label,keys=[]) => {
      if (result.status !== 'fulfilled') { failed.push(label); return { rows:[], total:null, ok:false } }
      return { rows:extractRows(result.value,keys), total:extractTotal(result.value), ok:true }
    }
    const b = read(bookingRes,'bookings',['bookings'])
    const d = read(destinationRes,'destinations',['destinations'])
    const p = read(packageRes,'packages',['packages'])
    const c = read(countryRes,'countries',['countries'])
    const i = read(itineraryRes,'itineraries',['itineraries'])
    setBookings(b.rows)
    setDestinations(d.rows)
    setPackages(p.rows)
    setCountries(c.rows)
    setItineraries(i.rows.map(row=>row?.itinerary ? row : row?.data?.itinerary ? {...row,...row.data} : row))
    setTotals({bookings:b.total,destinations:d.total,packages:p.total,countries:c.total, bookingsLoaded:b.rows.length, bookingsOk:b.ok, destinationsOk:d.ok, packagesOk:p.ok, countriesOk:c.ok, itinerariesOk:i.ok, itinerariesLoaded:i.rows.length})
    setLoadedAt(new Date())
    if (failed.length) setError(`Some reports could not be loaded: ${failed.join(', ')}. Metrics from unavailable sources are omitted; retry when the service is available.`)
    setLoading(false)
    setRefreshing(false)
  },[])
  useEffect(()=>{void load()},[load])

  const filtered = useMemo(()=>bookings.filter(booking=>{
    const created = dateValue(booking.created_at || booking.createdAt)
    if (from && (!created || created < new Date(`${from}T00:00:00`))) return false
    if (to && (!created || created > new Date(`${to}T23:59:59`))) return false
    const normalizedStatus = normalize(booking.status || booking.booking_status)
    if (status !== 'all' && normalizedStatus !== status) return false
    const term = query.trim().toLowerCase()
    if (term && ![booking.booking_number,booking.full_name,booking.email,booking.destination_name,booking.country_name,booking.package_name,booking.service_name].filter(Boolean).join(' ').toLowerCase().includes(term)) return false
    return true
  }),[bookings,from,to,status,query])

  const analytics = useMemo(()=>{
    const total=filtered.length
    const statuses = filtered.reduce((acc,b)=>{const key=normalize(b.status || b.booking_status)||'unknown';acc[key]=(acc[key]||0)+1;return acc},{})
    const confirmed=(statuses.confirmed||0)+(statuses.completed||0)
    const cancelled=statuses.cancelled||statuses.canceled||0
    const pending=statuses.pending||statuses.new||0
    const rankBy = key => {
      const map=new Map()
      filtered.forEach(b=>{
        const name=String(b[key] || (key==='destination_name' ? b.service_name : '') || (key==='destination_name' ? b.package_name : '') || 'Not specified').trim()
        map.set(name,(map.get(name)||0)+1)
      })
      return [...map.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,6)
    }
    const months=[]
    const now=new Date()
    for(let offset=5;offset>=0;offset--){const date=new Date(now.getFullYear(),now.getMonth()-offset,1);months.push({key:monthKey(date),label:monthLabel(date),count:0})}
    const monthMap=new Map(months.map(m=>[m.key,m]))
    filtered.forEach(b=>{const d=dateValue(b.created_at || b.createdAt);if(d&&monthMap.has(monthKey(d)))monthMap.get(monthKey(d)).count++})
    const ops=itineraries.map(item=>item?.itinerary || item?.data?.itinerary || item || {})
    let suppliers=0, supplierConfirmed=0, checks=0, checksDone=0, tripsWithPlans=0, needsAttention=0
    ops.forEach(op=>{
      const operation=op.operations || {}
      if(operation.coordinator || operation.suppliers?.length || operation.readiness?.length) tripsWithPlans++
      const sup=Array.isArray(operation.suppliers)?operation.suppliers.filter(s=>s.status!=='not_required'):[]
      suppliers+=sup.length
      supplierConfirmed+=sup.filter(s=>['confirmed','paid'].includes(s.status)).length
      const ready=Array.isArray(operation.readiness)?operation.readiness:[]
      checks+=ready.length;checksDone+=ready.filter(r=>r.done).length
      if(operation.tripStatus==='on_hold'||!operation.coordinator||sup.some(s=>!['confirmed','paid'].includes(s.status))||(ready.length&&ready.some(r=>!r.done))||operation.nextAction)needsAttention++
    })
    const amountFields=['total_amount','total_price','amount','grand_total','price']
    const amounts=filtered.map(b=>{for(const key of amountFields){const n=Number(b[key]);if(b[key]!==null&&b[key]!==undefined&&b[key]!==''&&Number.isFinite(n)&&n>=0)return n}return null})
    const hasAmounts=amounts.some(n=>n!==null)
    const sum=amounts.reduce((acc,n)=>acc+(n??0),0)
    return {total,statuses,confirmed,cancelled,pending,conversion:total?confirmed/total*100:null,cancellation:total?cancelled/total*100:null,destinations:rankBy('destination_name'),packages:rankBy('package_name'),countries:rankBy('country_name'),months,suppliers,supplierConfirmed,checks,checksDone,tripsWithPlans,needsAttention,hasAmounts,amountTotal:sum,amountCoverage:amounts.filter(n=>n!==null).length}
  },[filtered,itineraries])

  const exportReport=()=>{
    const rows=[['ALTUVERA SAFARIS — TOURISM PERFORMANCE REPORT'],['Generated at',new Date().toISOString()],['Date from',from||'All dates'],['Date to',to||'All dates'],[],['Booking number','Guest','Email','Status','Destination','Country','Package','Created at']]
    filtered.forEach(b=>rows.push([b.booking_number||b.id,b.full_name,b.email,b.status||b.booking_status,b.destination_name||b.service_name,b.country_name,b.package_name,b.created_at||b.createdAt]))
    rows.push([],['Summary metric','Value'],['Bookings in filtered data',analytics.total],['Confirmed or completed',analytics.confirmed],['Pending',analytics.pending],['Cancelled',analytics.cancelled],['Conversion rate',analytics.conversion===null?'N/A':`${analytics.conversion.toFixed(1)}%`],['Cancellation rate',analytics.cancellation===null?'N/A':`${analytics.cancellation.toFixed(1)}%`])
    downloadCsv(`altuvera-tourism-report-${new Date().toISOString().slice(0,10)}.csv`,rows)
  }

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800"><BarChart3 size={14}/> Management intelligence</span><h1 className="page-title mt-3">Tourism Analytics</h1><p className="page-subtitle mt-1 max-w-2xl">Booking conversion, cancellation trends, destination and package demand, and safari-readiness performance.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={()=>void load(true)} disabled={loading||refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-800 disabled:opacity-60"><RefreshCw size={15} className={refreshing?'animate-spin':''}/> Refresh data</button><button type="button" onClick={exportReport} disabled={!totals.bookingsOk||loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50"><ArrowDownToLine size={15}/> Export CSV</button></div>
    </header>

    {error&&<div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><AlertTriangle size={17} className="mt-0.5 shrink-0"/><div><p className="font-extrabold">Partial data availability</p><p className="mt-1">{error}</p></div></div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2"><Search size={16} className="text-emerald-700"/><h2 className="text-sm font-extrabold text-slate-900">Report filters</h2></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-bold text-slate-600">Created from<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"/></label>
        <label className="text-xs font-bold text-slate-600">Created to<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"/></label>
        <label className="text-xs font-bold text-slate-600">Booking status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label className="text-xs font-bold text-slate-600">Search bookings<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Guest, destination, package…" className="mt-1 block w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>Filtered records: <strong className="text-slate-800">{fmt(filtered.length)}</strong> of {totals.bookings==null?'unknown total':fmt(totals.bookings)} available total. This view analyzes the records loaded from the API.</span><span>{loadedAt? `Updated ${loadedAt.toLocaleTimeString()}`:'Waiting for data'}</span></div>
    </section>

    {loading?<div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white"><RefreshCw className="animate-spin text-emerald-700"/></div>:<>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Bookings in view" value={totals.bookingsOk?fmt(analytics.total):'Unavailable'} detail="Loaded records matching your filters" icon={CalendarDays}/>
        <Metric label="Conversion to confirmed/completed" value={analytics.conversion===null?'N/A':`${analytics.conversion.toFixed(1)}%`} detail={`${fmt(analytics.confirmed)} confirmed or completed bookings`} icon={TrendingUp} tone="blue"/>
        <Metric label="Cancellation rate" value={analytics.cancellation===null?'N/A':`${analytics.cancellation.toFixed(1)}%`} detail={`${fmt(analytics.cancelled)} cancelled bookings in view`} icon={AlertTriangle} tone="rose"/>
        <Metric label="Pending bookings" value={totals.bookingsOk?fmt(analytics.pending):'Unavailable'} detail="Requests awaiting a decision" icon={Users} tone="amber"/>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-sky-50 p-2 text-sky-700"><TrendingUp size={18}/></span><div><h2 className="font-extrabold text-slate-900">Six-month booking trend</h2><p className="mt-1 text-xs text-slate-500">Bookings created by month, using currently loaded records</p></div></div>
          <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3">{analytics.months.map(m=><div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-extrabold text-slate-700">{m.count}</span><div className="flex h-32 w-full items-end overflow-hidden rounded-t-lg bg-slate-100"><div className="w-full rounded-t-lg bg-emerald-600" style={{height:`${Math.max(3,m.count/Math.max(1,...analytics.months.map(x=>x.count))*100)}%`}}/></div><span className="text-center text-[9px] font-semibold text-slate-500 sm:text-[10px]">{m.label}</span></div>)}</div>
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-50 p-2 text-amber-800"><Activity size={18}/></span><div><h2 className="font-extrabold text-slate-900">Booking status mix</h2><p className="mt-1 text-xs text-slate-500">Status counts for the filtered records</p></div></div>
          <div className="mt-5 space-y-4">{['confirmed','completed','pending','cancelled','other'].map(key=>{const count=key==='other'?Object.entries(analytics.statuses).filter(([s])=>!['confirmed','completed','pending','cancelled','canceled','new'].includes(s)).reduce((n,[,v])=>n+v,0):analytics.statuses[key]||(key==='cancelled'?analytics.statuses.canceled:0)||0;return <div key={key}><div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="font-semibold capitalize text-slate-700">{key==='other'?'Other / unclassified':key}</span><span className="font-extrabold text-slate-900">{fmt(count)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${key==='cancelled'?'bg-rose-500':key==='pending'?'bg-amber-500':'bg-emerald-600'}`} style={{width:`${analytics.total?count/analytics.total*100:0}%`}}/></div></div>})}</div>
        </section>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3"><Ranking title="Most requested destinations" subtitle="Ranked by bookings in this report" rows={analytics.destinations} icon={Compass} empty="Destination-level booking names are not present in the loaded records."/><Ranking title="Most requested packages" subtitle="Ranked by bookings in this report" rows={analytics.packages} icon={Package} empty="Package-level booking names are not present in the loaded records."/><Ranking title="Countries attracting bookings" subtitle="Ranked by bookings in this report" rows={analytics.countries} icon={Users} empty="Country names are not present in the loaded booking records."/></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ClipboardList size={18}/></span><div><h2 className="font-extrabold text-slate-900">Safari operations performance</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Supplier confirmations and readiness checks recorded in saved itinerary operations.</p></div></div><button onClick={()=>navigate('/trip-operations')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-extrabold text-emerald-800">Open trip operations <Compass size={14}/></button></div>
        {!totals.itinerariesOk?<p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Itinerary data is currently unavailable; operations metrics cannot be calculated.</p>:<div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Trips with an operations plan" value={fmt(analytics.tripsWithPlans)} detail={`Across ${fmt(totals.itinerariesLoaded)} loaded itinerary records`} icon={ClipboardList}/><Metric label="Supplier confirmations" value={analytics.suppliers? `${Math.round(analytics.supplierConfirmed/analytics.suppliers*100)}%`:'N/A'} detail={`${fmt(analytics.supplierConfirmed)} of ${fmt(analytics.suppliers)} required suppliers confirmed`} icon={CheckCircle2} tone="blue"/><Metric label="Readiness checks completed" value={analytics.checks?`${Math.round(analytics.checksDone/analytics.checks*100)}%`:'N/A'} detail={`${fmt(analytics.checksDone)} of ${fmt(analytics.checks)} recorded checks`} icon={ShieldCheck}/><Metric label="Trips needing attention" value={fmt(analytics.needsAttention)} detail="Missing owner, pending supplier, incomplete checklist or recorded next action" icon={AlertTriangle} tone="amber"/></div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-2 text-slate-700"><ShieldCheck size={18}/></span><div><h2 className="font-extrabold text-slate-900">Governance, audit and data integrity</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">Use the existing account-activity review for recorded account events. This analytics page does not fabricate audit events, and reports clearly identify when API data is missing. Production backups and restore tests must be verified in the database provider; this panel cannot certify backups by itself.</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>navigate('/account-activity-review')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700"><ShieldCheck size={14}/> Review account activity</button><button onClick={()=>navigate('/account-recovery')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700"><ShieldCheck size={14}/> Account recovery controls</button><button onClick={()=>navigate('/trip-operations')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700"><ClipboardList size={14}/> Operational follow-ups</button></div></section>
      <p className="text-[11px] leading-relaxed text-slate-500">Coverage note: booking metrics reflect the records returned by the current API request (up to 100). If the API reports a larger total, export and rate calculations represent the loaded records, not the entire historical database. For full-company reporting, use a server-side aggregate endpoint before relying on this report for financial or board-level decisions.</p>
    </>}
  </div>
}
