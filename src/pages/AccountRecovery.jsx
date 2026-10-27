import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { apiClient, getErrorMessage } from '@api/client'
import { useToast } from '@hooks/useToast'

export default function AccountRecovery() {
  const [items,setItems] = useState([])
  const [notes,setNotes] = useState({})
  const [verifiedEmails,setVerifiedEmails] = useState({})
  const [loading,setLoading] = useState(true)
  const [busyId,setBusyId] = useState(null)
  const [deletingId,setDeletingId] = useState(null)
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
  useEffect(()=>{
    void load()
    const timer=setInterval(()=>{void load()},60_000)
    return ()=>clearInterval(timer)
  },[load])
  const review = async (item,status) => {
    const note=String(notes[item.id]||'').trim()
    if(!note){setError('Add a note documenting how ownership was checked before deciding.');return}
    if(!window.confirm((status==='approved'?'Approve':'Reject')+' this recovery request? This decision does not automatically sign the user in or disable their security factors.'))return
    setBusyId(item.id);setError('')
    try {
      const {data}=await apiClient.patch('/users/security/recovery-requests/'+item.id,{status,note,verifiedContactEmail:verifiedEmails[item.id]||item.recovery_contact_email||''})
      toast?.success?.(data?.message || 'Review recorded')
      setItems(prev=>prev.map(x=>x.id===item.id?{...x,status:data?.data?.status||status,review_note:note,reviewed_at:new Date().toISOString()}:x))
    } catch(e) {
      if(e?.response?.status===404 || e?.response?.status===409) {
        setItems(prev=>prev.filter(x=>String(x.id)!==String(item.id)))
        toast?.error?.('This recovery request has expired, was already reviewed, or no longer exists. It has been removed from the active queue.')
        void load()
      } else setError(getErrorMessage(e))
    }
    finally {setBusyId(null)}
  }
  const removeRequest = async (item) => {
    const stale = item.status === 'expired' || (item.status === 'pending' && item.expires_at && new Date(item.expires_at) <= new Date())
    if (!window.confirm(`Delete ${stale ? 'this expired' : 'this'} recovery request from the admin queue? This cannot be undone.`)) return
    setDeletingId(item.id); setError('')
    try {
      const {data}=await apiClient.delete('/users/security/recovery-requests/'+item.id)
      setItems(prev=>prev.filter(x=>String(x.id)!==String(item.id)))
      toast?.success?.(data?.message || 'Recovery request deleted')
    } catch(e) {
      const status=e?.response?.status
      if(status===404 || status===409) {
        setItems(prev=>prev.filter(x=>String(x.id)!==String(item.id)))
        toast?.success?.('This request is no longer available and was removed from the queue.')
        void load()
      } else setError(getErrorMessage(e))
    } finally { setDeletingId(null) }
  }
  const date = value => value ? new Date(value).toLocaleString() : '—'
  return <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-emerald-700"><ShieldCheck size={20}/><span className="text-xs font-bold uppercase tracking-[.18em]">Account protection</span></div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Account recovery reviews</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Review ownership evidence before recording a decision. Approving sends a short-lived, single-use recovery link to the alternate email you have independently verified. The link resets the account email and enrolled factors only after the user completes it.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button>
    </header>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Clock3 size={19}/></div><p className="text-sm font-medium text-slate-600">Pending review</p><p className="mt-1 text-2xl font-bold">{items.filter(x=>x.status==='pending').length}</p></div>
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><CheckCircle2 size={19}/></div><p className="text-sm font-medium text-slate-600">Approved</p><p className="mt-1 text-2xl font-bold">{items.filter(x=>x.status==='approved').length}</p></div>
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-800"><XCircle size={19}/></div><p className="text-sm font-medium text-slate-600">Rejected</p><p className="mt-1 text-2xl font-bold">{items.filter(x=>x.status==='rejected').length}</p></div>
    </div>
    {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading recovery requests…</div> : items.length===0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ShieldCheck size={30} className="mx-auto text-emerald-700"/><h2 className="mt-3 font-semibold text-slate-900">No recovery requests</h2><p className="mt-1 text-sm text-slate-500">New requests will appear here for manual review.</p></div> : <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">{items.map(item=><article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-white p-4 sm:p-5"><div className="min-w-0 flex-1"><h2 className="break-words text-base font-bold text-slate-900 sm:text-lg">{item.full_name||'Altuvera user'}</h2><p className="mt-1 break-all text-sm text-slate-600">{item.email}</p><p className="mt-2 break-words text-xs leading-5 text-slate-500">Request #{item.id} · Submitted {date(item.created_at)} · Expires {date(item.expires_at)}</p></div><div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end"><span className={'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide '+(item.status==='pending'?'bg-amber-50 text-amber-800':item.status==='approved'?'bg-emerald-50 text-emerald-800':item.status==='expired'?'bg-slate-100 text-slate-700':'bg-red-50 text-red-800')}>{item.status}</span><button type="button" disabled={deletingId===item.id} onClick={()=>removeRequest(item)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50" aria-label={'Delete recovery request '+item.id}><Trash2 size={15}/><span>{deletingId===item.id?'Removing…':'Delete'}</span></button></div></div>
      {item.status==='pending' && (!item.expires_at || new Date(item.expires_at)>new Date()) ? <div className="p-4 sm:p-5"><label className="mb-1 mt-3 block text-sm font-medium text-slate-700" htmlFor={'verified-email-'+item.id}>Manually verified alternate email (required to approve)</label><input id={'verified-email-'+item.id} type="email" value={verifiedEmails[item.id]??item.recovery_contact_email??''} onChange={e=>setVerifiedEmails(prev=>({...prev,[item.id]:e.target.value}))} placeholder="verified-address@example.com" className="mb-3 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/><label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={'review-note-'+item.id}>Ownership-check notes (required)</label><textarea id={'review-note-'+item.id} rows={3} maxLength={1000} value={notes[item.id]||''} onChange={e=>setNotes(prev=>({...prev,[item.id]:e.target.value}))} placeholder="Record the independent checks completed. Do not enter passwords, OTPs or recovery codes." className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"><button disabled={busyId===item.id} onClick={()=>review(item,'approved')} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"><CheckCircle2 size={16}/>Approve review</button><button disabled={busyId===item.id} onClick={()=>review(item,'rejected')} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"><XCircle size={16}/>Reject request</button></div></div> : <p className="m-4 mt-0 flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600 sm:m-5 sm:mt-0"><Clock3 size={16} className="mt-0.5 shrink-0"/><span>Reviewed {date(item.reviewed_at)}. Note: {item.review_note||'No note supplied.'}</span></p>}
    </article>)}</div>}
  </main>
}
