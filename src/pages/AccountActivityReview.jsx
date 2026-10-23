import React, { useCallback, useEffect, useState } from 'react'
import { Activity, CheckCircle2, XCircle, RefreshCw, ShieldCheck, Clock3, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
const getToken = () => localStorage.getItem('altuvera_admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || sessionStorage.getItem('altuvera_admin_token') || sessionStorage.getItem('adminToken') || ''
const api = (url, options = {}) => fetch(`${API_BASE}${url}`, {
  credentials: 'include', ...options,
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) },
})
const dateLabel = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function AccountActivityReview() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await api('/account-activity/admin/deletion-requests')
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Could not load review requests.')
      setRequests(Array.isArray(payload.data) ? payload.data : [])
    } catch (err) {
      setError(err.message || 'Could not load review requests.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const decide = async (item, decision) => {
    const action = decision === 'approve' ? 'approve this deletion and preserve an audit record' : 'reject this request'
    if (!window.confirm(`Are you sure you want to ${action}?`)) return
    setBusyId(item.id)
    try {
      const response = await api(`/account-activity/admin/deletion-requests/${item.id}`, {
        method: 'PATCH', body: JSON.stringify({ decision }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'The review could not be saved.')
      toast.success(decision === 'approve' ? 'Deletion approved and audit record retained.' : 'Request rejected.')
      await load()
    } catch (err) { toast.error(err.message || 'The review could not be saved.') }
    finally { setBusyId(null) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2"><ShieldCheck size={15}/> Governance</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Account activity review</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">Review traveller requests to remove account activity. Approval is restricted to authenticated administrators and leaves a separate audit record.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:border-emerald-300 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Refresh</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending requests</div><div className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Approval policy</div><div className="text-sm font-bold text-emerald-800 mt-2">Admin approval required</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Audit retention</div><div className="text-sm font-bold text-slate-900 mt-2">Approval history retained</div></div>
      </div>
      {error && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="shrink-0"/>{error}</div>}
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading review requests…</div>
      : requests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><div className="mx-auto mb-3 grid place-items-center h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={22}/></div><h2 className="font-bold text-slate-900">No pending requests</h2><p className="text-sm text-slate-500 mt-1">All account activity removal requests have been reviewed.</p></div>
      : <div className="grid gap-3">{requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2"><span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-1 text-[11px] font-bold">Pending review</span><span className="text-xs text-slate-400">Request #{item.id}</span></div>
            <h2 className="font-bold text-slate-900">{item.title || 'Activity record no longer available'}</h2>
            <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2"><span>Traveller: <strong className="text-slate-700 break-all">{item.requester_email || `User #${item.requester_id}`}</strong></span><span>Event: {String(item.event_type || 'activity').replaceAll('_',' ')}</span><span>Event date: {dateLabel(item.activity_created_at)}</span><span className="inline-flex items-center gap-1"><Clock3 size={12}/>Requested: {dateLabel(item.created_at)}</span></div>
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3"><div className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-1">Traveller's reason</div><p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{item.reason || 'No reason supplied.'}</p></div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-40">
            <button onClick={() => decide(item, 'approve')} disabled={busyId === item.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><CheckCircle2 size={16}/>{busyId === item.id ? 'Saving…' : 'Approve deletion'}</button>
            <button onClick={() => decide(item, 'reject')} disabled={busyId === item.id} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-700 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><XCircle size={16}/>Reject request</button>
          </div>
        </div>
      </article>)}</div>}
      <div className="mt-5 flex gap-2 items-start rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500"><Activity size={16} className="shrink-0 mt-0.5"/><p>Approving removes the original activity row only after recording its event type, title, owner, original timestamp, requester, reviewer, and reason in the separate deletion audit table. The user cannot perform this operation directly.</p></div>
    </div>
  )
}
