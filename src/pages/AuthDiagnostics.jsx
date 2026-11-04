import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Check, ChevronDown, ChevronUp, Copy,
  Filter, RefreshCw, ShieldAlert, Wifi, Clock3,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'

const getToken = () =>
  localStorage.getItem('altuvera_admin_token') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('altuvera_admin_token') ||
  sessionStorage.getItem('adminToken') ||
  ''

const PROVIDERS = [
  { value: '', label: 'All providers' },
  { value: 'google', label: 'Google' },
  { value: 'github', label: 'GitHub' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'passkey', label: 'Passkey' },
  { value: 'authenticator', label: 'Authenticator' },
  { value: 'recovery_code', label: 'Recovery code' },
  { value: 'email', label: 'Email / OTP' },
]
const CATEGORIES = [
  { value: '', label: 'All failure types' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'identity_mismatch', label: 'Identity / state mismatch' },
  { value: 'invalid_credential', label: 'Invalid credential' },
  { value: 'email_missing', label: 'Missing email' },
  { value: 'account_not_found', label: 'Account not found' },
  { value: 'account_deactivated', label: 'Account deactivated' },
  { value: 'rate_limited', label: 'Rate limited' },
  { value: 'challenge_expired', label: 'Expired challenge' },
  { value: 'challenge_invalid', label: 'Invalid challenge' },
  { value: 'passkey_unsupported', label: 'Passkey unsupported' },
  { value: 'passkey_cancelled', label: 'Passkey cancelled' },
  { value: 'provider_denied', label: 'Provider denied' },
  { value: 'network', label: 'Network' },
  { value: 'validation', label: 'Validation' },
  { value: 'unexpected', label: 'Unexpected' },
]

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}
const labelize = (value) => String(value || 'unknown').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${tones[tone] || tones.slate}`}>{children}</span>
}

export default function AuthDiagnostics() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [provider, setProvider] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [copied, setCopied] = useState('')

  const fetchRows = useCallback(async (nextOffset = 0) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(nextOffset) })
      if (provider) params.set('provider', provider)
      if (category) params.set('category', category)
      const response = await fetch(`${API_BASE.replace(/\/+$/, '')}/users/auth-diagnostics?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `Could not load diagnostics (HTTP ${response.status}).`)
      }
      setRows(Array.isArray(payload.data) ? payload.data : [])
      setSummary(Array.isArray(payload.summary) ? payload.summary : [])
      setTotal(Number(payload.pagination?.total || 0))
      setOffset(nextOffset)
    } catch (err) {
      setError(err?.message || 'Authentication diagnostics could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [provider, category])

  useEffect(() => { fetchRows(0) }, [fetchRows])

  const providerCounts = useMemo(() => Object.fromEntries(summary.map(item => [item.provider, item.total])), [summary])

  const copyReference = async (reference) => {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(reference)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setError('The incident reference could not be copied on this browser.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-emerald-800">
            <ShieldAlert size={14}/> Authentication health
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Auth diagnostics</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Review provider failures, configuration gaps, identity mismatches, rejected credentials and passkey issues reported by the sign-in flows.
          </p>
        </div>
        <button type="button" onClick={() => fetchRows(offset)} disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh reports
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Activity size={15}/> Recorded incidents</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{total.toLocaleString()}</div>
          <p className="mt-1 text-[11px] text-slate-400">Matching the current filters</p>
        </div>
        {['google', 'github', 'facebook'].map(key => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">{labelize(key)} · 30 days</div>
            <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{Number(providerCounts[key] || 0).toLocaleString()}</div>
            <p className="mt-1 text-[11px] text-slate-400">Captured provider events</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800"><Filter size={16}/> Filter incidents</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Authentication method</span>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
              {PROVIDERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Failure type</span>
            <select value={category} onChange={e => setCategory(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
              {CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={18} className="mt-0.5 shrink-0"/>{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Recent authentication incidents</h2>
            <p className="mt-0.5 text-xs text-slate-500">Newest first · details are scrubbed of credentials and email addresses</p>
          </div>
          <Badge tone="blue">{rows.length} shown</Badge>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm font-semibold text-slate-500"><RefreshCw size={16} className="animate-spin"/> Loading diagnostics…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldAlert size={22}/></div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">No matching incidents</h3>
            <p className="mt-1 text-xs text-slate-500">Captured authentication errors will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(row => {
              const isOpen = expanded === row.reference_id
              return (
                <article key={row.reference_id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={row.severity === 'error' ? 'red' : 'amber'}>{labelize(row.provider)}</Badge>
                        <Badge tone="slate">{labelize(row.category)}</Badge>
                        <span className="text-[11px] text-slate-400">{row.http_status ? `HTTP ${row.http_status}` : row.source}</span>
                      </div>
                      <p className="mt-2 break-words text-sm font-bold text-slate-800">{row.message || 'Authentication could not be completed.'}</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{row.error_code} · {row.stage}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1"><Clock3 size={12}/>{formatDate(row.created_at)}</span>
                        <span>{row.source === 'client' ? 'Browser report' : 'Server report'}</span>
                        {row.page_path && <span className="break-all">{row.page_path}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <button type="button" onClick={() => copyReference(row.reference_id)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-800">
                        {copied === row.reference_id ? <Check size={14}/> : <Copy size={14}/>}
                        {copied === row.reference_id ? 'Copied' : 'Copy reference'}
                      </button>
                      <button type="button" onClick={() => setExpanded(isOpen ? '' : row.reference_id)}
                        aria-expanded={isOpen}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">
                        {isOpen ? 'Hide details' : 'View details'}
                        {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Incident reference</span>
                    <code className="select-all text-xs font-extrabold text-slate-700">{row.reference_id}</code>
                  </div>
                  {isOpen && (
                    <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
                      <div><span className="font-bold text-slate-500">Origin</span><p className="mt-1 break-all text-slate-700">{row.origin || 'Not supplied'}</p></div>
                      <div><span className="font-bold text-slate-500">HTTP status</span><p className="mt-1 text-slate-700">{row.http_status || 'Not applicable'}</p></div>
                      <div><span className="font-bold text-slate-500">Browser / device</span><p className="mt-1 break-words text-slate-700">{row.user_agent || 'Not supplied'}</p></div>
                      <div><span className="font-bold text-slate-500">Client details</span><pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-700">{JSON.stringify(row.details || {}, null, 2)}</pre></div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">{total ? `Showing ${offset + 1}–${Math.min(offset + rows.length, total)} of ${total}` : 'No incidents to display'}</p>
          <div className="flex gap-2">
            <button type="button" disabled={loading || offset === 0} onClick={() => fetchRows(Math.max(0, offset - 50))} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40">Previous</button>
            <button type="button" disabled={loading || offset + rows.length >= total} onClick={() => fetchRows(offset + 50)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
        <Wifi size={15} className="mt-0.5 shrink-0"/>
        <p>Browser-only failures are queued on the visitor’s device while offline and uploaded when connectivity returns. Passwords, verification codes, OAuth tokens and email addresses are not stored in diagnostic details.</p>
      </div>
    </div>
  )
}
