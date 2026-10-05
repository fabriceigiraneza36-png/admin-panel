import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardCheck, FileText, MapPin, Mail, MessageSquare, Plus, Save,
  Send, Sparkles, Trash2, Users, Hotel, Utensils, Car, Info, Loader2
} from 'lucide-react'
import { itinerariesAPI } from '@api/itineraries'
import { getErrorMessage } from '@api/client'
import { useToast } from '@hooks/useToast'

const DEFAULT_CHECKLIST = [
  { key:'arrival', label:'Arrival / airport transfer confirmed', done:false, note:'' },
  { key:'transport', label:'Transport and driver details confirmed', done:false, note:'' },
  { key:'accommodation', label:'Accommodation and room details confirmed', done:false, note:'' },
  { key:'activities', label:'Activities and permits confirmed', done:false, note:'' },
  { key:'meals', label:'Meals / dietary requirements checked', done:false, note:'' },
  { key:'guest_notes', label:'Traveller requests and special notes reviewed', done:false, note:'' },
]

const dayTemplate = (date, index) => ({
  date: date || '',
  title: index === 0 ? 'Arrival & Welcome' : 'Explore & Experience',
  location: '',
  activities: index === 0 ? ['Airport pickup', 'Hotel check-in', 'Welcome briefing'] : ['Morning activity', 'Lunch / local experience', 'Afternoon activity'],
  transport: '',
  accommodation: '',
  meals: 'Breakfast',
  notes: '',
})

const dateRange = (start, end) => {
  if (!start) return []
  const a = new Date(start + 'T00:00:00')
  const b = end ? new Date(end + 'T00:00:00') : a
  const out = []
  let i = 0
  while (a <= b && i < 31) {
    out.push(new Date(a).toISOString().slice(0,10))
    a.setDate(a.getDate() + 1)
    i++
  }
  return out
}

export default function ItineraryBuilder() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [booking, setBooking] = useState(null)
  const [itinerary, setItinerary] = useState({ title:'Personalized Altuvera Itinerary', introduction:'', mode:'assisted', planningChecklist:DEFAULT_CHECKLIST, days:[], inclusions:[], essentials:[], contactNote:'' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [openDay, setOpenDay] = useState(0)

  useEffect(() => {
    let live = true
    itinerariesAPI.get(bookingId).then(res => {
      const data = res?.data?.data || res?.data || res
      if (!live) return
      setBooking(data?.booking || null)
      const existing = data?.itinerary && typeof data.itinerary === 'object' ? data.itinerary : null
      if (existing?.days?.length) {
        setItinerary({
          ...existing,
          planningChecklist: existing.planningChecklist?.length
            ? existing.planningChecklist
            : DEFAULT_CHECKLIST.map(item => ({...item})),
        })
      } else {
        const dates = dateRange(data?.booking?.travel_date, data?.booking?.return_date)
        setItinerary(prev => ({
          ...prev,
          title: `${data?.booking?.destination_name || 'Your'} Adventure Itinerary`,
          introduction: `A personalized plan prepared by Altuvera Safaris for ${data?.booking?.full_name || 'our traveller'}.`,
          planningChecklist: DEFAULT_CHECKLIST.map(item => ({...item})),
          days: dates.map((d,i) => dayTemplate(d,i)),
        }))
      }
    }).catch(e => toast.error(getErrorMessage(e))).finally(() => live && setLoading(false))
    return () => { live = false }
  }, [bookingId])

  const updateDay = (index, patch) => setItinerary(prev => ({...prev, days: prev.days.map((d,i)=>i===index?{...d,...patch}:d)}))
  const updateActivity = (di, ai, value) => setItinerary(prev => ({...prev,days:prev.days.map((d,i)=>i===di?{...d,activities:d.activities.map((a,j)=>j===ai?value:a)}:d)}))
  const addDay = () => setItinerary(prev => ({...prev,days:[...prev.days, dayTemplate('', prev.days.length)]}))
  const removeDay = (i) => setItinerary(prev => ({...prev,days:prev.days.filter((_,idx)=>idx!==i)}))
  const addActivity = (i) => setItinerary(prev => ({...prev,days:prev.days.map((d,idx)=>idx===i?{...d,activities:[...(d.activities||[]),'New activity']}:d)}))
  const removeActivity = (di, ai) => setItinerary(prev => ({...prev,days:prev.days.map((d,i)=>i===di?{...d,activities:d.activities.filter((_,j)=>j!==ai)}:d)}))
  const updateChecklist = (index, patch) => setItinerary(prev => ({
    ...prev,
    planningChecklist: (prev.planningChecklist || DEFAULT_CHECKLIST).map((item,i)=>i===index?{...item,...patch}:item),
  }))
  const addChecklistItem = () => setItinerary(prev => ({
    ...prev,
    planningChecklist: [...(prev.planningChecklist || []), {key:`custom_${Date.now()}`,label:'New planning item',done:false,note:''}],
  }))
  const removeChecklistItem = (index) => setItinerary(prev => ({
    ...prev,
    planningChecklist: (prev.planningChecklist || []).filter((_,i)=>i!==index),
  }))

  const save = async () => {
    setSaving(true)
    try { await itinerariesAPI.saveDraft(bookingId, itinerary); toast.success('Itinerary draft saved.') }
    catch(e) { toast.error(getErrorMessage(e)) } finally { setSaving(false) }
  }

  const publish = async () => {
    if (!itinerary.days.length) return toast.error('Add at least one day before sending.')
    setSending(true)
    try {
      const res = await itinerariesAPI.publish(bookingId, itinerary)
      const data = res?.data?.data || res?.data || res
      if (data) setBooking(data)
      toast.success('Itinerary sent to the traveller dashboard and email.')
    } catch(e) { toast.error(getErrorMessage(e)) } finally { setSending(false) }
  }

  if (loading) return <div className="min-h-[70vh] grid place-items-center"><Loader2 className="animate-spin text-emerald-600" size={30}/></div>
  if (!booking) return <div className="p-8 text-center"><p className="font-bold">Booking not found.</p><button className="btn-primary mt-4" onClick={()=>navigate('/bookings')}>Back to bookings</button></div>

  const verified = Boolean(booking.email_verified)

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={()=>navigate('/bookings')} className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1.5 mb-2"><ArrowLeft size={14}/> Back to bookings</button>
          <h1 className="page-title flex items-center gap-2"><ClipboardCheck size={25} className="text-emerald-600"/> Itinerary Builder</h1>
          <p className="page-subtitle">Prepare, edit, review and send a complete day-by-day plan.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setItinerary(p=>({...p,mode:'manual'}))} className={`px-3 py-2 rounded-xl text-xs font-bold border ${itinerary.mode==='manual'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200'}`}><FileText size={14} className="inline mr-1"/> Write manually</button>
          <button onClick={()=>setItinerary(p=>({...p,mode:'assisted'}))} className={`px-3 py-2 rounded-xl text-xs font-bold border ${itinerary.mode==='assisted'?'bg-emerald-600 text-white border-emerald-600':'bg-white text-slate-600 border-slate-200'}`}><Sparkles size={14} className="inline mr-1"/> Assisted checklist</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 h-fit lg:sticky lg:top-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 grid place-items-center"><MapPin className="text-emerald-600" size={20}/></div>
            <div><p className="font-extrabold text-slate-800">{booking.destination_name || 'Trip'}</p><p className="text-xs text-slate-500">{booking.country_name || booking.country || '—'}</p></div>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex gap-2"><FileText size={14}/><span><b>Booking:</b> {booking.booking_number}</span></div>
            <div className="flex gap-2"><Users size={14}/><span><b>Traveller:</b> {booking.full_name} · {booking.number_of_travelers} people</span></div>
            <div className="flex gap-2"><CalendarDays size={14}/><span><b>Dates:</b> {booking.travel_date || 'Flexible'} → {booking.return_date || '—'}</span></div>
            <div className="flex gap-2"><Mail size={14}/><span><b>Email:</b> {booking.email}</span></div>
            <div className="flex gap-2"><MessageSquare size={14}/><span><b>Preferred:</b> {booking.preferred_contact_method || 'Not selected'}</span></div>
            <div className="pt-2 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Preferred contact: <span className="text-emerald-700">{booking.preferred_contact_method || 'Not selected'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {booking.email && <a href={`mailto:${booking.email}`} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${booking.preferred_contact_method === 'email' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}><Mail size={12} className="inline mr-1"/>Email</a>}
                {booking.phone && <a href={`tel:${booking.phone}`} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${booking.preferred_contact_method === 'phone' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}><MessageSquare size={12} className="inline mr-1"/>Phone</a>}
                {booking.phone && <a target="_blank" rel="noreferrer" href={`https://wa.me/${String(booking.phone).replace(/\\D/g,'')}`} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${booking.preferred_contact_method === 'whatsapp' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}><MessageSquare size={12} className="inline mr-1"/>WhatsApp</a>}
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${verified?'bg-emerald-50 border-emerald-200':'bg-amber-50 border-amber-200'}`}>
              {verified ? <><CheckCircle2 size={14} className="inline mr-1 text-emerald-600"/> Email request confirmed</> : <>Waiting for traveller email confirmation before itinerary can be sent.</>}
            </div>
          </div>
          <details className="mt-4 rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Complete destination & country records — no fields hidden</summary>
            <div className="grid grid-cols-1 gap-3 p-3 border-t border-slate-100">
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Destination</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-4 text-slate-600 bg-slate-50 rounded-lg p-2">{JSON.stringify(booking.destination_details || {}, null, 2)}</pre></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Country</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-4 text-slate-600 bg-slate-50 rounded-lg p-2">{JSON.stringify(booking.country_details || {}, null, 2)}</pre></div>
            </div>
          </details>
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Complete traveller & booking details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <div><b>Nationality:</b> {booking.nationality || '—'}</div>
              <div><b>Residence:</b> {booking.country || '—'}</div>
              <div><b>Phone:</b> {booking.phone || '—'}</div>
              <div><b>WhatsApp:</b> {booking.whatsapp || '—'}</div>
              <div><b>Preferred time:</b> {booking.preferred_contact_time || 'Any time'}</div>
              <div><b>Booking type:</b> {booking.booking_type || '—'}</div>
              <div><b>Package:</b> {booking.package_name || '—'}</div>
              <div><b>Service:</b> {booking.service_name || '—'}</div>
              <div><b>Accommodation:</b> {booking.accommodation_type || '—'}</div>
              <div><b>Pickup:</b> {booking.pickup_location || '—'}</div>
              <div><b>Dietary:</b> {booking.dietary_requirements || '—'}</div>
              <div><b>Accessibility:</b> {booking.accessibility_needs || '—'}</div>
              <div><b>Flexible dates:</b> {booking.flexible_dates ? 'Yes' : 'No'}</div>
              <div><b>Group:</b> {booking.group_type || '—'}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
              <p><b>Special requests:</b> {booking.special_requests || 'None'}</p>
              <p><b>Customer notes:</b> {booking.customer_notes || 'None'}</p>
              <p><b>Emergency contact:</b> {booking.emergency_contact || 'Not provided'}</p>
              <p><b>Traveler details:</b> {booking.travelers_details || 'Not provided'}</p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-emerald-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-slate-800 flex items-center gap-2"><ClipboardCheck size={18} className="text-emerald-600"/> Assisted planning checklist</h2>
                <p className="text-xs text-slate-500 mt-1">Editable checks help the coordinator verify the trip before sending. They are saved with the itinerary.</p>
              </div>
              <button onClick={addChecklistItem} className="text-xs font-bold text-emerald-700 whitespace-nowrap"><Plus size={14} className="inline mr-1"/> Add item</button>
            </div>
            <div className="space-y-2">
              {(itinerary.planningChecklist || []).map((item,i)=>(
                <div key={item.key || i} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <input type="checkbox" checked={Boolean(item.done)} onChange={e=>updateChecklist(i,{done:e.target.checked})} className="w-4 h-4 accent-emerald-600"/>
                  <div className="min-w-0 space-y-1">
                    <input value={item.label||''} onChange={e=>updateChecklist(i,{label:e.target.value})} className="input !py-1.5"/>
                    <input value={item.note||''} onChange={e=>updateChecklist(i,{note:e.target.value})} placeholder="Optional coordinator note" className="input !py-1.5 text-xs"/>
                  </div>
                  <button onClick={()=>removeChecklistItem(i)} className="p-2 text-rose-500"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div><label className="text-xs font-bold uppercase text-slate-500">Itinerary title</label><input value={itinerary.title} onChange={e=>setItinerary(p=>({...p,title:e.target.value}))} className="input mt-1"/></div>
            <div><label className="text-xs font-bold uppercase text-slate-500">Introduction</label><textarea value={itinerary.introduction} onChange={e=>setItinerary(p=>({...p,introduction:e.target.value}))} className="input mt-1 min-h-[90px]"/></div>
          </div>

          {itinerary.days.map((day,i)=>(
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button onClick={()=>setOpenDay(openDay===i?-1:i)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50">
                <span className="font-bold text-sm text-slate-800">Day {i+1} · {day.title || 'Untitled day'}</span>
                {openDay===i?<ChevronUp size={17}/>:<ChevronDown size={17}/>}
              </button>
              {openDay===i && <div className="p-5 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-slate-600">Date<input type="date" value={day.date||''} onChange={e=>updateDay(i,{date:e.target.value})} className="input mt-1"/></label>
                  <label className="text-xs font-bold text-slate-600">Day title<input value={day.title||''} onChange={e=>updateDay(i,{title:e.target.value})} className="input mt-1"/></label>
                  <label className="text-xs font-bold text-slate-600">Location<input value={day.location||''} onChange={e=>updateDay(i,{location:e.target.value})} className="input mt-1"/></label>
                  <label className="text-xs font-bold text-slate-600">Transport<input value={day.transport||''} onChange={e=>updateDay(i,{transport:e.target.value})} className="input mt-1"/></label>
                  <label className="text-xs font-bold text-slate-600">Accommodation<input value={day.accommodation||''} onChange={e=>updateDay(i,{accommodation:e.target.value})} className="input mt-1"/></label>
                  <label className="text-xs font-bold text-slate-600">Meals<input value={day.meals||''} onChange={e=>updateDay(i,{meals:e.target.value})} className="input mt-1"/></label>
                </div>
                <div><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-600">Activities checklist</label><button onClick={()=>addActivity(i)} className="text-xs font-bold text-emerald-700"><Plus size={13} className="inline"/> Add</button></div>
                  <div className="space-y-2">{(day.activities||[]).map((a,ai)=><div key={ai} className="flex gap-2 items-center"><span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center"><Check size={12}/></span><input value={a} onChange={e=>updateActivity(i,ai,e.target.value)} className="input"/><button onClick={()=>removeActivity(i,ai)} className="p-2 text-rose-500"><Trash2 size={14}/></button></div>)}</div>
                </div>
                <div><label className="text-xs font-bold text-slate-600">Day notes</label><textarea value={day.notes||''} onChange={e=>updateDay(i,{notes:e.target.value})} className="input mt-1 min-h-[80px]"/></div>
                <button onClick={()=>removeDay(i)} className="text-xs font-bold text-rose-600"><Trash2 size={13} className="inline mr-1"/>Remove day</button>
              </div>}
            </div>
          ))}

          <button onClick={addDay} className="w-full border-2 border-dashed border-emerald-200 text-emerald-700 rounded-2xl py-4 font-bold text-sm hover:bg-emerald-50"><Plus size={16} className="inline mr-1"/> Add itinerary day</button>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-600">What is included</label><textarea value={(itinerary.inclusions||[]).join('\n')} onChange={e=>setItinerary(p=>({...p,inclusions:e.target.value.split('\n')}))} className="input mt-1 min-h-[100px]" placeholder="One item per line"/></div>
            <div><label className="text-xs font-bold text-slate-600">Traveller essentials</label><textarea value={(itinerary.essentials||[]).join('\n')} onChange={e=>setItinerary(p=>({...p,essentials:e.target.value.split('\n')}))} className="input mt-1 min-h-[100px]" placeholder="Passport\nTravel insurance\nHiking shoes"/></div>
            <div className="sm:col-span-2"><label className="text-xs font-bold text-slate-600">Coordinator note</label><textarea value={itinerary.contactNote||''} onChange={e=>setItinerary(p=>({...p,contactNote:e.target.value}))} className="input mt-1 min-h-[80px]"/></div>
          </div>

          <div className="sticky bottom-4 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-xl flex flex-col sm:flex-row gap-2">
            <button onClick={save} disabled={saving||sending} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm"><Save size={15} className="inline mr-1"/> {saving?'Saving…':'Save draft'}</button>
            <button onClick={publish} disabled={saving||sending||!verified} className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50"><Send size={15} className="inline mr-1"/> {sending?'Sending…':'Send itinerary to traveller'}</button>
          </div>
        </section>
      </div>
    </div>
  )
}
