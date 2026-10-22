import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { apiClient, getErrorMessage } from '@api/client'
import { useToast } from '@hooks/useToast'

export default function AccountRecovery() {
  const [items,setItems] = useState([])
  const [notes,setNotes] = useState({})
  const [loading,setLoading] = useState(true)
  const [busyId,setBusyId] = useState(null)
  const [error,setError] = useState('')
  const toast = useToast()
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const {data} = await apiClient.get('/users/security/recovery-requests')
      setItems(data?.data || [])
    } catch (e) {
      setError(getErrorMessage(e))
    } finally { setLoading(false) }
  },[])
  useEffect(()=>{load()},[load])
  const review = async (item,status) => {
    const note=String(notes[item.id]||'').trim()
    if(!note){setError('Add a note documenting how ownership was checked before deciding.');return}
    if(!window.confirm((status==='approved'?'Approve':'Reject')+' this recovery request? This decision does not automatically sign the user in or disable their security factors.'))return
    setBusyId(item.id);setError('')
    try {
      const {data}=await apiClient.patch('/users/security/recovery-requests/'+item.id,{status,note})
      toast?.success?.(data?.message || 'Review recorded')
      setItems(prev=>prev.map(x=>x.id===item.id?{...x,status:data?.data?.status||status,review_note:note,reviewed_at:new Date().toISOString()}:x))
    } catch(e) { setError(getErrorMessage(e)) }
    finally {setBusyId(null)}
  }
  const date = value => value ? new Date(value).toLocaleString() : '—'
  return <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-emerald-700"><ShieldCheck size={20}/><span className="text-xs font-bold uppercase tracking-[.18em]">Account protection</span></div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Account recovery reviews</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Review ownership evidence before recording a decision. Approving a request is not an account-access bypass; use your verified support procedure before taking any further action.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button>
    </header>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Pending review</p><p className="mt-1 text-2xl font-bold">{items.filter(x=>x.status==='pending').length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Approved</p><p className="mt-1 text-2xl font-bold">{items.filter(x=>x.status==='approved').length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Rejected</p><p className="mt-1 text-2xl font-bold">{items.filter(x=>x.status==='rejected').length}</p></div>
    </div>
    {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading recovery requests…</div> : items.length===0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ShieldCheck size={30} className="mx-auto text-emerald-700"/><h2 className="mt-3 font-semibold text-slate-900">No recovery requests</h2><p className="mt-1 text-sm text-slate-500">New requests will appear here for manual review.</p></div> : <div className="space-y-4">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{item.full_name||'Altuvera user'}</h2><p className="mt-1 break-all text-sm text-slate-600">{item.email}</p><p className="mt-2 text-xs text-slate-500">Request #{item.id} · Submitted {date(item.created_at)} · Expires {date(item.expires_at)}</p></div><span className={'rounded-full px-3 py-1 text-xs font-semibold '+(item.status==='pending'?'bg-amber-50 text-amber-800':item.status==='approved'?'bg-emerald-50 text-emerald-800':'bg-red-50 text-red-800')}>{item.status}</span></div>
      {item.status==='pending' ? <div className="mt-4"><label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={'review-note-'+item.id}>Ownership-check notes (required)</label><textarea id={'review-note-'+item.id} rows={3} maxLength={1000} value={notes[item.id]||''} onChange={e=>setNotes(prev=>({...prev,[item.id]:e.target.value}))} placeholder="Record the independent checks completed. Do not enter passwords, OTPs or recovery codes." className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/><div className="mt-3 flex flex-wrap gap-2"><button disabled={busyId===item.id} onClick={()=>review(item,'approved')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={16}/>Approve review</button><button disabled={busyId===item.id} onClick={()=>review(item,'rejected')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"><XCircle size={16}/>Reject request</button></div></div> : <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Clock3 size={16} className="mt-0.5 shrink-0"/><span>Reviewed {date(item.reviewed_at)}. Note: {item.review_note||'No note supplied.'}</span></p>}
    </article>)}</div>}
  </main>
}
