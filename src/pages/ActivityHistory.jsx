import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowDownWideNarrow, ArrowUpWideNarrow, CalendarDays, Camera,
  CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, FileClock,
  Filter, Globe2, Loader2, MapPin, MessageSquare, Package, Pencil,
  Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, UserRound,
  X, XCircle, History as HistoryIcon,
} from 'lucide-react'
import { format, isToday, isYesterday, subDays } from 'date-fns'
import apiClient from '@api/client'

const PAGE_SIZE = 30

const ACTION_META = {
  created:   { label: 'Created',   icon: Plus,           tone: 'emerald' },
  updated:   { label: 'Updated',   icon: Pencil,         tone: 'blue' },
  deleted:   { label: 'Deleted',   icon: Trash2,         tone: 'rose' },
  purged:    { label: 'Purged',    icon: Trash2,         tone: 'rose' },
  requested: { label: 'Requested', icon: Camera,         tone: 'violet' },
  approved:  { label: 'Approved',  icon: CheckCircle2,   tone: 'emerald' },
  rejected:  { label: 'Rejected',  icon: XCircle,        tone: 'rose' },
  published: { label: 'Published', icon: CheckCircle2,   tone: 'emerald' },
  archived:  { label: 'Archived',  icon: FileClock,      tone: 'amber' },
  restored:  { label: 'Restored',  icon: RefreshCw,      tone: 'blue' },
  assigned:  { label: 'Assigned',  icon: UserRound,      tone: 'blue' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2,   tone: 'emerald' },
  cancelled: { label: 'Cancelled', icon: XCircle,        tone: 'rose' },
  completed: { label: 'Completed', icon: CheckCircle2,   tone: 'emerald' },
  closed:    { label: 'Closed',    icon: FileClock,      tone: 'slate' },
  reopened:  { label: 'Reopened',  icon: RefreshCw,      tone: 'blue' },
  sent:      { label: 'Sent',      icon: MessageSquare,  tone: 'violet' },
  changed:   { label: 'Changed',   icon: Activity,       tone: 'slate' },
  'marked as read': { label: 'Marked read', icon: CheckCircle2, tone: 'slate' },
}

const TONE_CLASSES = {
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-100 bg-blue-50 text-blue-700',
  rose: 'border-rose-100 bg-rose-50 text-rose-700',
  violet: 'border-violet-100 bg-violet-50 text-violet-700',
  amber: 'border-amber-100 bg-amber-50 text-amber-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
}

const RESOURCE_OPTIONS = [
  ['destination', 'Destinations'], ['country', 'Countries'], ['package', 'Packages'],
  ['booking', 'Bookings'], ['conversation', 'Conversations'], ['conversation message', 'Messages'],
  ['traveller portrait', 'Portrait requests'], ['itinerary', 'Itineraries'], ['user account', 'User accounts'],
  ['blog post', 'Blog posts'], ['testimonial', 'Testimonials'], ['review', 'Reviews'],
  ['comment', 'Comments'], ['gallery item', 'Gallery'], ['team member', 'Team'],
  ['contact message', 'Contact'], ['notification', 'Notifications'], ['setting', 'Settings'],
]

const getLocalDateValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

const getTimestamp = (entry) => {
  const value = entry?.created_at || entry?.createdAt || entry?.timestamp
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

const getInitials = (name) => String(name || 'Admin').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()

const formatDateLabel = (date) => {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d, yyyy')
}

function ActivityRow({ entry, index, expanded, onToggle }) {
  const action = ACTION_META[entry.action] || { label: String(entry.action || 'Activity'), icon: Activity, tone: 'slate' }
  const Icon = action.icon
  const tone = TONE_CLASSES[action.tone] || TONE_CLASSES.slate
  const date = getTimestamp(entry)
  const time = date ? format(date, 'HH:mm:ss') : 'Time unavailable'
  const actor = entry.actor_name || 'Administrator'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.15) }}
      className="group relative"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="relative flex w-11 shrink-0 flex-col items-center">
          <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-105 ${tone}`}>
            <Icon size={17} strokeWidth={2.1} />
          </div>
          <span className="mt-2 h-full min-h-5 w-px bg-gradient-to-b from-slate-200 to-transparent" />
        </div>

        <div className="mb-3 min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_3px_14px_rgba(15,23,42,0.025)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_30px_rgba(5,150,105,0.075)] sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-100 bg-emerald-50 text-[10px] font-extrabold text-emerald-800">
                {getInitials(actor)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-extrabold leading-5 text-slate-900 sm:text-sm">{entry.summary || action.label + ' ' + (entry.resource || 'record')}</p>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] ${tone}`}>{action.label}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">{actor}</span>
                  {entry.actor_role && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{entry.actor_role}</span>}
                  <span className="inline-flex items-center gap-1"><Clock3 size={11} />{time}</span>
                  {entry.resource && <span className="inline-flex items-center gap-1"><Package size={11} />{entry.resource}</span>}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {expanded ? 'Hide details' : 'Details'}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] sm:grid-cols-2">
                  <div><span className="font-bold text-slate-400">Actor</span><p className="mt-0.5 break-all font-semibold text-slate-700">{entry.actor_email || actor}</p></div>
                  <div><span className="font-bold text-slate-400">Record</span><p className="mt-0.5 font-semibold text-slate-700">{entry.resource_name || (entry.resource_id ? '#' + entry.resource_id : 'Not supplied')}</p></div>
                  <div><span className="font-bold text-slate-400">Request</span><p className="mt-0.5 font-semibold text-slate-700">{entry.method || '—'} · {entry.status_code || '—'}</p></div>
                  <div><span className="font-bold text-slate-400">Exact timestamp</span><p className="mt-0.5 font-semibold text-slate-700">{date ? format(date, 'PPpp') : 'Unavailable'}</p></div>
                  <div className="sm:col-span-2"><span className="font-bold text-slate-400">Panel action route</span><p className="mt-0.5 break-all font-mono text-[10px] text-slate-600">{entry.endpoint || '—'}</p></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  )
}

export default function ActivityHistory() {
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState({ total: 0, today: 0, last_seven_days: 0 })
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')
  const [resource, setResource] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim())
      setPage(1)
    }, 260)
    return () => window.clearTimeout(timer)
  }, [searchDraft])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/admin/activity', {
        params: { page, limit: PAGE_SIZE, search, action, resource, from, to, sort },
      })
      const payload = response?.data || {}
      setEntries(Array.isArray(payload.data) ? payload.data : [])
      setPagination(payload.pagination || { page: 1, total: 0, totalPages: 1 })
      setStats(payload.stats || { total: 0, today: 0, last_seven_days: 0 })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'The activity journal could not be loaded.')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [page, search, action, resource, from, to, sort])

  useEffect(() => { void load() }, [load])

  const sections = useMemo(() => {
    const grouped = new Map()
    entries.forEach((entry) => {
      const date = getTimestamp(entry)
      const key = date ? format(date, 'yyyy-MM-dd') : 'unknown'
      if (!grouped.has(key)) grouped.set(key, { key, label: date ? formatDateLabel(date) : 'Date unavailable', date, entries: [] })
      grouped.get(key).entries.push(entry)
    })
    return Array.from(grouped.values())
  }, [entries])

  const activeFilters = Boolean(search || action !== 'all' || resource !== 'all' || from || to)
  const setQuickRange = (days) => {
    if (days === 'all') {
      setFrom('')
      setTo('')
    } else {
      const now = new Date()
      setTo(getLocalDateValue(now))
      setFrom(getLocalDateValue(days === 0 ? now : subDays(now, days - 1)))
    }
    setPage(1)
  }

  const clearFilters = () => {
    setSearchDraft('')
    setSearch('')
    setAction('all')
    setResource('all')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const exportCsv = () => {
    if (!entries.length) return
    const columns = ['Timestamp', 'Administrator', 'Role', 'Action', 'Resource', 'Summary', 'Method', 'Status', 'Endpoint']
    const rows = entries.map(entry => [
      entry.created_at, entry.actor_name, entry.actor_role, entry.action, entry.resource,
      entry.summary, entry.method, entry.status_code, entry.endpoint,
    ])
    const csvCell = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"'
    const csv = [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'altuvera-admin-activity-page-' + page + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#052f24] via-[#07543e] to-[#087b58] px-5 py-6 text-white shadow-[0_20px_55px_rgba(5,83,60,0.18)] sm:px-7 sm:py-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/[0.035] blur-[1px]" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-100">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
              Private admin journal
            </div>
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight sm:text-3xl">
              <HistoryIcon size={27} className="text-emerald-200" />
              Activity history
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-6 text-emerald-50/80 sm:text-sm">
              A chronological record of successful changes made across the Altuvera admin panel, with precise timestamps and action details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-[11px] font-bold text-emerald-50">
              <ShieldCheck size={14} /> Admin-only records
            </span>
            <button onClick={exportCsv} disabled={!entries.length} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.1] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40">
              <Download size={14} /> Export view
            </button>
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-extrabold text-emerald-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50 disabled:opacity-60">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[10px] font-semibold text-emerald-50/70 sm:text-[11px]">
          <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> Timestamped automatically</span>
          <span className="inline-flex items-center gap-1.5"><Activity size={13} /> Successful admin actions only</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> No notification generated</span>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'All recorded actions', value: stats.total, note: 'Stored in the journal', icon: FileClock, tone: 'emerald' },
          { label: 'Today', value: stats.today, note: 'Since midnight (server time)', icon: CalendarDays, tone: 'blue' },
          { label: 'Last 7 days', value: stats.last_seven_days, note: 'Recent admin activity', icon: Activity, tone: 'violet' },
        ].map((card, index) => {
          const Icon = card.icon
          const color = card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : card.tone === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-violet-50 text-violet-700 border-violet-100'
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * index, duration: 0.35 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[11px] font-bold text-slate-500">{card.label}</p><p className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 tabular-nums">{Number(card.value || 0).toLocaleString()}</p><p className="mt-1 text-[10px] text-slate-400">{card.note}</p></div>
                <span className={`grid h-10 w-10 place-items-center rounded-xl border ${color}`}><Icon size={18} /></span>
              </div>
            </motion.div>
          )
        })}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><Sparkles size={16} className="text-emerald-600" /><h2 className="text-sm font-extrabold text-slate-900 sm:text-base">Journal entries</h2></div>
              <p className="mt-1 text-[11px] text-slate-500">{Number(pagination.total || 0).toLocaleString()} matching records · newest entries appear first</p>
            </div>
            <button type="button" onClick={() => setSort(value => value === 'desc' ? 'asc' : 'desc')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
              {sort === 'desc' ? <ArrowDownWideNarrow size={14} /> : <ArrowUpWideNarrow size={14} />}
              {sort === 'desc' ? 'Newest first' : 'Oldest first'}
            </button>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(120px,1fr))]">
            <label className="relative block min-w-0">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search activities, people, records…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-9 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50" />
              {searchDraft && <button onClick={() => setSearchDraft('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={13} /></button>}
            </label>
            <label className="relative block min-w-0">
              <Filter size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={action} onChange={event => { setAction(event.target.value); setPage(1) }} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs font-semibold text-slate-600 outline-none focus:border-emerald-300 focus:bg-white">
                <option value="all">All actions</option>
                {Object.entries(ACTION_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}
              </select>
            </label>
            <label className="relative block min-w-0">
              <Package size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={resource} onChange={event => { setResource(event.target.value); setPage(1) }} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs font-semibold text-slate-600 outline-none focus:border-emerald-300 focus:bg-white">
                <option value="all">All sections</option>
                {RESOURCE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label className="relative block min-w-0">
              <CalendarDays size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="From date" type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(1) }} className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-emerald-300 focus:bg-white" />
            </label>
            <label className="relative block min-w-0">
              <CalendarDays size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="To date" type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1) }} className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-emerald-300 focus:bg-white" />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {[['Today', 0], ['7 days', 7], ['30 days', 30], ['All time', 'all']].map(([label, days]) => (
                <button key={label} type="button" onClick={() => setQuickRange(days)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">{label}</button>
              ))}
            </div>
            {activeFilters && <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50"><X size={12} /> Clear filters</button>}
          </div>
        </div>

        <div className="min-h-[360px] bg-gradient-to-b from-slate-50/60 to-white px-3 py-4 sm:px-5 sm:py-5">
          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div>}

          {loading && entries.length === 0 ? (
            <div className="space-y-3 py-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="flex gap-4"><div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" /><div className="h-[76px] flex-1 animate-pulse rounded-2xl bg-slate-100" /></div>)}</div>
          ) : sections.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-[22px] border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-inner"><HistoryIcon size={27} /></div>
              <h3 className="text-sm font-extrabold text-slate-800">{activeFilters ? 'No matching activities' : 'Your journal is ready'}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{activeFilters ? 'Try another search or clear the filters to see more records.' : 'Successful changes made in the admin panel will appear here automatically, with no notifications.'}</p>
              {activeFilters && <button onClick={clearFilters} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800">Reset filters</button>}
            </div>
          ) : (
            <div>
              <AnimatePresence mode="popLayout">
                {sections.map(section => (
                  <div key={section.key} className="mb-5 last:mb-0">
                    <div className="mb-3 flex items-center gap-3 pl-1">
                      <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500 shadow-sm">{section.label}</span>
                      <span className="h-px flex-1 bg-slate-200/80" />
                      <span className="text-[10px] font-bold tabular-nums text-slate-400">{section.entries.length} {section.entries.length === 1 ? 'entry' : 'entries'}</span>
                    </div>
                    <div>
                      {section.entries.map((entry, index) => (
                        <ActivityRow
                          key={entry.id}
                          entry={entry}
                          index={index}
                          expanded={expandedId === entry.id}
                          onToggle={() => setExpandedId(current => current === entry.id ? null : entry.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {loading && entries.length > 0 && <div className="flex items-center justify-center gap-2 py-3 text-[11px] font-semibold text-slate-400"><Loader2 size={14} className="animate-spin" /> Updating journal…</div>}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:px-5">
          <p className="text-[10px] font-semibold text-slate-400">Page {pagination.page || page} of {pagination.totalPages || 1} · {Number(pagination.total || 0).toLocaleString()} total</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage(value => Math.max(1, value - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={13} /> Previous</button>
            <button disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage(value => value + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={13} /></button>
          </div>
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 px-3 text-center text-[10px] font-medium text-slate-400"><ShieldCheck size={12} /> Journal entries are visible to authenticated admin accounts only. This page does not create notifications.</p>
    </div>
  )
}
