import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, AlertTriangle, CalendarDays, Check, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardCheck, FileText, MapPin, Mail, Plus, Save, Send,
  Sparkles, Trash2, Users, Hotel, Utensils, Car, Loader2, Eye,
  ShieldCheck, Luggage, BookOpen,
} from 'lucide-react'
import { itinerariesAPI } from '@api/itineraries'
import { getErrorMessage } from '@api/client'
import { useToast } from '@hooks/useToast'

const DEFAULT_OPERATIONS = {
  coordinator: '',
  tripStatus: 'planning',
  suppliers: [
    { category: 'Transport & driver', name: '', contact: '', reference: '', status: 'pending', notes: '' },
    { category: 'Accommodation', name: '', contact: '', reference: '', status: 'pending', notes: '' },
    { category: 'Activities & permits', name: '', contact: '', reference: '', status: 'pending', notes: '' },
    { category: 'Guide / local partner', name: '', contact: '', reference: '', status: 'pending', notes: '' },
  ],
  readiness: [
    { key: 'documents', label: 'Traveller documents and entry requirements checked', done: false, note: '' },
    { key: 'permits', label: 'Park, activity and permit arrangements confirmed', done: false, note: '' },
    { key: 'arrival', label: 'Arrival time, pickup and transport reconfirmed', done: false, note: '' },
    { key: 'stay', label: 'Accommodation and meal arrangements confirmed', done: false, note: '' },
    { key: 'health', label: 'Dietary and accessibility requests reviewed', done: false, note: '' },
    { key: 'contacts', label: 'Emergency and local contact details prepared', done: false, note: '' },
    { key: 'payment', label: 'Supplier arrangements reviewed internally', done: false, note: '' },
    { key: 'briefing', label: 'Final itinerary and traveller briefing ready', done: false, note: '' },
  ],
  risks: '',
  nextAction: '',
  nextActionDue: '',
}

const DEFAULT_CHECKLIST = [
  { key: 'arrival', label: 'Arrival and pickup arrangements checked', done: false, note: '' },
  { key: 'transport', label: 'Daily transport arrangements checked', done: false, note: '' },
  { key: 'accommodation', label: 'Accommodation details checked', done: false, note: '' },
  { key: 'activities', label: 'Activities and permits checked', done: false, note: '' },
  { key: 'meals', label: 'Meals and dietary requests checked', done: false, note: '' },
  { key: 'guest_notes', label: 'Traveller requests included in the plan', done: false, note: '' },
]

const dayTemplate = (date, index) => ({
  date: date || '',
  title: index === 0 ? 'Arrival & welcome' : 'Explore & experience',
  location: '',
  activities: [],
  transport: '',
  accommodation: '',
  meals: '',
  notes: '',
})

const dateRange = (start, end) => {
  if (!start) return []
  const a = new Date(start + 'T00:00:00')
  const b = end ? new Date(end + 'T00:00:00') : a
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || b < a) return []
  const out = []
  let i = 0
  while (a <= b && i < 31) {
    out.push(a.getFullYear() + '-' + String(a.getMonth() + 1).padStart(2, '0') + '-' + String(a.getDate()).padStart(2, '0'))
    a.setDate(a.getDate() + 1)
    i++
  }
  return out
}

const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return 'Date to be confirmed'
  const date = new Date(String(value).slice(0, 10) + 'T00:00:00')
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-GB', options) : 'Date to be confirmed'
}

const splitLines = (value) => String(value || '').split('\n').map(line => line.trim()).filter(Boolean)
const bookingDateRange = (booking) => ({
  start: booking?.travel_date || booking?.arrival_date || '',
  end: booking?.end_date || booking?.return_date || booking?.departure_date || '',
})
const getBookingImage = (booking) => {
  const images = Array.isArray(booking?.package_details?.images) ? booking.package_details.images : []
  return booking?.destination_image_url ||
    booking?.package_details?.cover_image_url ||
    booking?.package_details?.image_url ||
    booking?.package_details?.thumbnail_url ||
    images.map(image => typeof image === 'string' ? image : image?.url || image?.image_url || image?.imageUrl || '').find(Boolean) ||
    ''
}
const normalizeDay = (day, index) => ({
  ...dayTemplate(day?.date || '', index),
  ...(day || {}),
  activities: Array.isArray(day?.activities)
    ? day.activities.map(activity => typeof activity === 'string' ? activity : activity?.title || activity?.name || '').filter(Boolean)
    : [],
})

const STEPS = [
  { title: 'Trip overview', subtitle: 'Check the traveller and trip details', icon: MapPin },
  { title: 'Daily programme', subtitle: 'Describe what happens each day', icon: CalendarDays },
  { title: 'Traveller essentials', subtitle: 'Add inclusions and useful guidance', icon: Luggage },
  { title: 'Review & send', subtitle: 'Preview the finished itinerary', icon: Eye },
]

export default function ItineraryBuilder() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [booking, setBooking] = useState(null)
  const [itinerary, setItinerary] = useState({
    title: 'Your Altuvera Adventure',
    introduction: 'We are delighted to help you discover East Africa. Here is the journey prepared for you.',
    mode: 'assisted',
    backgroundMode: 'white',
    planningChecklist: DEFAULT_CHECKLIST.map(item => ({ ...item })),
    operations: { ...DEFAULT_OPERATIONS },
    days: [],
    inclusions: [],
    essentials: [],
    contactNote: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [openDayDetails, setOpenDayDetails] = useState(-1)

  useEffect(() => {
    let live = true
    itinerariesAPI.get(bookingId).then(res => {
      const data = res?.data?.data || res?.data || res
      if (!live) return
      const currentBooking = data?.booking || null
      setBooking(currentBooking)

      const existing = data?.itinerary && typeof data.itinerary === 'object' ? data.itinerary : null
      if (existing && Object.keys(existing).length) {
        setItinerary(prev => ({
          ...prev,
          ...existing,
          mode: 'assisted',
          backgroundMode: existing.backgroundMode === 'destination' ? 'destination' : 'white',
          planningChecklist: Array.isArray(existing.planningChecklist) && existing.planningChecklist.length
            ? existing.planningChecklist
            : DEFAULT_CHECKLIST.map(item => ({ ...item })),
          operations: {
            ...DEFAULT_OPERATIONS,
            ...(existing.operations || {}),
            suppliers: existing.operations?.suppliers?.length
              ? existing.operations.suppliers
              : DEFAULT_OPERATIONS.suppliers.map(item => ({ ...item })),
            readiness: existing.operations?.readiness?.length
              ? existing.operations.readiness
              : DEFAULT_OPERATIONS.readiness.map(item => ({ ...item })),
          },
          days: Array.isArray(existing.days) ? existing.days.map(normalizeDay) : [],
          inclusions: Array.isArray(existing.inclusions) ? existing.inclusions : [],
          essentials: Array.isArray(existing.essentials) ? existing.essentials : [],
        }))
      } else {
        const dates = bookingDateRange(currentBooking)
        const days = dateRange(dates.start, dates.end)
        const destination = currentBooking?.destination_name || currentBooking?.package_name || 'East Africa'
        const firstName = String(currentBooking?.full_name || 'traveller').trim().split(/\s+/)[0]
        setItinerary(prev => ({
          ...prev,
          title: 'Your ' + destination + ' Adventure',
          introduction: 'Hello ' + firstName + ', we are delighted to help you discover ' + destination + '. This is your personalised journey, prepared by Altuvera.',
          backgroundMode: getBookingImage(currentBooking) ? 'destination' : 'white',
          planningChecklist: DEFAULT_CHECKLIST.map(item => ({ ...item })),
          operations: { ...DEFAULT_OPERATIONS },
          days: days.map((date, index) => dayTemplate(date, index)),
        }))
      }
    }).catch(error => toast.error(getErrorMessage(error))).finally(() => {
      if (live) setLoading(false)
    })
    return () => { live = false }
  }, [bookingId])

  const updateItinerary = (patch) => setItinerary(previous => ({ ...previous, ...patch }))
  const updateDay = (index, patch) => setItinerary(previous => ({
    ...previous,
    days: previous.days.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day),
  }))
  const addDay = () => setItinerary(previous => ({
    ...previous,
    days: [...previous.days, dayTemplate('', previous.days.length)],
  }))
  const removeDay = (index) => {
    setItinerary(previous => ({ ...previous, days: previous.days.filter((_, dayIndex) => dayIndex !== index) }))
    setOpenDayDetails(-1)
  }
  const updateChecklist = (index, done) => setItinerary(previous => ({
    ...previous,
    planningChecklist: (previous.planningChecklist || DEFAULT_CHECKLIST).map((item, itemIndex) =>
      itemIndex === index ? { ...item, done } : item
    ),
  }))

  const buildDaysFromBooking = () => {
    const dates = bookingDateRange(booking)
    const generatedDates = dateRange(dates.start, dates.end)
    if (!generatedDates.length) {
      toast.error('There are no confirmed travel dates on this booking yet. Add the trip days manually.')
      return
    }
    setItinerary(previous => ({
      ...previous,
      days: generatedDates.map((date, index) => ({
        ...dayTemplate(date, index),
        ...(previous.days[index] || {}),
        date,
      })),
    }))
    setOpenDayDetails(-1)
    toast.success(generatedDates.length + ' day plans prepared from the booking dates.')
  }

  const save = async () => {
    setSaving(true)
    try {
      await itinerariesAPI.saveDraft(bookingId, itinerary)
      toast.success('Itinerary draft saved. You can continue later.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!itinerary.days.length) {
      setActiveStep(1)
      return toast.error('Add at least one day to the programme before sending.')
    }
    if (!itinerary.title.trim()) {
      setActiveStep(0)
      return toast.error('Add a title for the traveller’s itinerary.')
    }
    if (!booking?.email_verified) return toast.error('The traveller must confirm their email address before the itinerary can be sent.')
    setSending(true)
    try {
      const response = await itinerariesAPI.publish(bookingId, { ...itinerary, deliveryMode: 'dashboard_pdf' })
      const responseBody = response?.data || response
      const updatedBooking = responseBody?.data?.data || responseBody?.data || responseBody
      if (updatedBooking) setBooking(previous => ({ ...previous, ...updatedBooking }))
      if (responseBody?.delivery?.email === 'failed') {
        toast.error('The itinerary is available in the traveller dashboard, but the email could not be sent. Review the delivery status below.')
      } else if (responseBody?.delivery?.email === 'sent') {
        toast.success('Itinerary sent. The email provider accepted the message.')
      } else {
        toast.success(responseBody?.message || 'Itinerary published successfully.')
      }
      setActiveStep(3)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="min-h-[65vh] grid place-items-center">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-sm font-semibold text-emerald-800 shadow-sm">
        <Loader2 className="animate-spin" size={20}/> Preparing this traveller’s trip
      </div>
    </div>
  )

  if (!booking) return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <AlertTriangle size={28} className="mx-auto text-amber-600"/>
      <p className="mt-3 font-bold text-slate-900">We couldn’t find this booking.</p>
      <button className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white" onClick={() => navigate('/bookings')}>Back to bookings</button>
    </div>
  )

  const allowedStatuses = ['confirmed', 'under_review', 'itinerary_preparing', 'revision_requested', 'itinerary_sent', 'awaiting_confirmation']
  if (!allowedStatuses.includes(String(booking.status || '').toLowerCase())) return (
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-7 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle size={23}/></div>
      <h2 className="mt-4 text-lg font-extrabold text-slate-900">This booking is not ready for an itinerary yet.</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Once the booking is confirmed, the trip plan can be prepared here.</p>
      <button className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white" onClick={() => navigate('/bookings')}>Back to bookings</button>
    </div>
  )

  const verified = Boolean(booking.email_verified)
  const destinationImage = getBookingImage(booking)
  const destination = booking.destination_name || booking.package_name || 'East Africa'
  const travellerName = booking.full_name || 'Altuvera traveller'
  const travellerEmail = booking.email || ''
  const startDate = booking.travel_date || booking.arrival_date || ''
  const endDate = booking.end_date || booking.return_date || booking.departure_date || ''
  const completedChecks = (itinerary.planningChecklist || []).filter(item => item.done).length
  const totalChecks = (itinerary.planningChecklist || []).length
  const programmeProgress = itinerary.days.length
    ? Math.min(100, Math.round(itinerary.days.filter(day => day.title && day.activities?.length).length / itinerary.days.length * 100))
    : 0
  const stageComplete = [
    Boolean(itinerary.title.trim() && destination),
    Boolean(itinerary.days.length && itinerary.days.every(day => day.title && day.activities?.some(activity => String(activity).trim()))),
    true,
    Boolean(itinerary.days.length),
  ]
  const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50'
  const labelClass = 'block text-xs font-bold text-slate-700'
  const dayCount = itinerary.days.length

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-28">
      <style>{'.itinerary-stage-scroll{scrollbar-width:none;-ms-overflow-style:none}.itinerary-stage-scroll::-webkit-scrollbar{display:none}.itinerary-day-card{transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease}.itinerary-day-card:hover{border-color:#a7d9bd;box-shadow:0 8px 22px rgba(6,78,59,.06)}.itinerary-preview-paper{background:linear-gradient(180deg,#fff 0%,#fbfefc 100%);box-shadow:0 12px 34px rgba(15,50,35,.09)}@media(prefers-reduced-motion:reduce){.itinerary-day-card{transition:none!important;transform:none!important}}'}</style>

      <header className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-sm">
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 px-5 py-5 text-white sm:px-7 sm:py-6">
          {destinationImage && <img src={destinationImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-15"/>}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <button onClick={() => navigate('/bookings')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-100 transition hover:text-white"><ArrowLeft size={14}/> Back to bookings</button>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-200">ALTUVERA · TRIP PREPARATION</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Prepare a traveller’s itinerary</h1>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-emerald-50/90 sm:text-sm">Follow the four simple steps below. Booking details are already filled in, so you only need to add the journey plan and review it before sending.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Trip destination</p>
              <p className="mt-1 max-w-[220px] text-base font-extrabold">{destination}</p>
              <p className="mt-1 text-[11px] text-emerald-100">{booking.booking_number || 'Confirmed booking'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Users size={18}/></span>
            <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Traveller</span><span className="block truncate text-sm font-extrabold text-slate-800">{travellerName}</span><span className="block truncate text-[11px] text-slate-500">{booking.number_of_travelers || 1} traveller(s)</span></span>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><CalendarDays size={18}/></span>
            <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel dates</span><span className="block text-sm font-extrabold text-slate-800">{formatDate(startDate, { day: 'numeric', month: 'short' })}</span><span className="block text-[11px] text-slate-500">to {formatDate(endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Mail size={18}/></span>
            <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Traveller email</span><span className="block truncate text-sm font-extrabold text-slate-800">{travellerEmail || 'Not provided'}</span><span className={'block text-[11px] ' + (verified ? 'text-emerald-700' : 'text-amber-700')}>{verified ? 'Email confirmed' : 'Email confirmation needed'}</span></span>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><p className="text-xs font-extrabold text-slate-900">Your preparation steps</p><p className="mt-0.5 text-[10px] text-slate-500">Select a step or move through them in order.</p></div>
          <span className="text-[11px] font-extrabold tabular-nums text-emerald-800">{activeStep + 1} of 4</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all duration-300" style={{ width: ((activeStep + 1) / STEPS.length * 100) + '%' }}/></div>
        <div className="itinerary-stage-scroll flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const active = activeStep === index
            const done = stageComplete[index] && index < activeStep
            return (
              <button key={step.title} type="button" onClick={() => setActiveStep(index)} aria-current={active ? 'step' : undefined} className={'flex min-w-[170px] flex-1 items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition ' + (active ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : done ? 'border-emerald-100 bg-white' : 'border-slate-200 bg-white hover:border-emerald-200')}>
                <span className={'grid h-8 w-8 shrink-0 place-items-center rounded-lg ' + (active ? 'bg-emerald-700 text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')}>{done ? <Check size={15}/> : <Icon size={15}/>}</span>
                <span className="min-w-0"><span className="block text-xs font-extrabold text-slate-800">{step.title}</span><span className="mt-0.5 block truncate text-[9px] text-slate-500">{step.subtitle}</span></span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <main className="min-w-0 space-y-4">
          {activeStep === 0 && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BookOpen size={19}/></span>
                <div><h2 className="text-base font-extrabold text-slate-900">Start with the trip overview</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">The traveller’s name, destination and dates come from the booking. Personalise the heading and welcome message below.</p></div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Already filled in from the booking</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <p className="text-slate-700"><b>Traveller:</b> {travellerName}</p>
                  <p className="text-slate-700"><b>Destination:</b> {destination}</p>
                  <p className="text-slate-700"><b>Group size:</b> {booking.number_of_travelers || 1}</p>
                  <p className="text-slate-700"><b>Travel period:</b> {formatDate(startDate)} – {formatDate(endDate)}</p>
                </div>
                {booking.package_name && <p className="mt-2 text-xs text-slate-700"><b>Selected package:</b> {booking.package_name}</p>}
              </div>
              <label className={labelClass}>Itinerary heading
                <input value={itinerary.title || ''} onChange={event => updateItinerary({ title: event.target.value })} className={inputClass} placeholder="Example: Your Rwanda Adventure"/>
              </label>
              <label className={labelClass}>Welcome message for the traveller
                <textarea value={itinerary.introduction || ''} onChange={event => updateItinerary({ introduction: event.target.value })} rows={4} className={inputClass + ' resize-y'} placeholder="Write a warm introduction to their journey..."/>
                <span className="mt-1 block text-[10px] font-normal leading-4 text-slate-500">This appears near the beginning of the itinerary. Keep it warm, clear and personal.</span>
              </label>
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-700"/>
                <span>Personal booking information is included automatically. You do not need to copy the traveller’s contact details or booking reference into the itinerary.</span>
              </div>
            </section>
          )}

          {activeStep === 1 && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays size={19}/></span>
                  <div><h2 className="text-base font-extrabold text-slate-900">Build the day-by-day programme</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Add the main experience and where the traveller will be each day. Booking dates can fill the day cards for you.</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={buildDaysFromBooking} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800 hover:bg-emerald-100"><Sparkles size={14}/> Use booking dates</button>
                  <button type="button" onClick={addDay} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-800"><Plus size={14}/> Add day</button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-xs font-bold text-slate-700">{dayCount} day{dayCount === 1 ? '' : 's'} prepared</span>
                <span className="h-1 w-1 rounded-full bg-slate-300"/>
                <span className="text-[11px] text-slate-500">{programmeProgress}% of days have a title and activities</span>
                <span className="ml-auto text-[10px] font-semibold text-emerald-700">You can edit every day</span>
              </div>

              <div className="space-y-3">
                {itinerary.days.map((day, index) => (
                  <article key={index} className="itinerary-day-card overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50/80 to-white px-3 py-3 sm:px-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-sm font-black text-white">{String(index + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-emerald-700">Day {index + 1} · {formatDate(day.date, { day: 'numeric', month: 'short' })}</p>
                        <p className="truncate text-sm font-extrabold text-slate-900">{day.title || 'Untitled day'}</p>
                        <p className="truncate text-[10px] text-slate-500">{day.location || 'Add the place or experience for this day'}</p>
                      </div>
                      <button type="button" onClick={() => setOpenDayDetails(openDayDetails === index ? -1 : index)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 hover:border-emerald-300">{openDayDetails === index ? 'Close' : 'Edit day'}</button>
                      <button type="button" onClick={() => removeDay(index)} aria-label={'Remove day ' + (index + 1)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button>
                    </div>
                    {openDayDetails === index && (
                      <div className="space-y-3 border-t border-slate-100 p-3 sm:p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className={labelClass}>Date
                            <input type="date" value={day.date || ''} onChange={event => updateDay(index, { date: event.target.value })} className={inputClass}/>
                          </label>
                          <label className={labelClass}>Day heading
                            <input value={day.title || ''} onChange={event => updateDay(index, { title: event.target.value })} className={inputClass} placeholder="Example: Gorilla trekking"/>
                          </label>
                          <label className={labelClass + ' sm:col-span-2'}>Place or experience
                            <input value={day.location || ''} onChange={event => updateDay(index, { location: event.target.value })} className={inputClass} placeholder="Example: Volcanoes National Park"/>
                          </label>
                          <label className={labelClass + ' sm:col-span-2'}>What will the traveller do?
                            <textarea value={(day.activities || []).join('\n')} onChange={event => updateDay(index, { activities: splitLines(event.target.value) })} rows={4} className={inputClass + ' resize-y'} placeholder={'Morning: Guided nature walk\nAfternoon: Cultural experience\nEvening: Relax at the lodge'}/>
                            <span className="mt-1 block text-[10px] font-normal text-slate-500">Write one activity per line. These become clear bullet points in the itinerary.</span>
                          </label>
                        </div>
                        <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <summary className="cursor-pointer text-xs font-extrabold text-slate-700">Optional travel arrangements for this day</summary>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className={labelClass}><span className="inline-flex items-center gap-1.5"><Car size={13} className="text-emerald-700"/> Transport</span>
                              <input value={day.transport || ''} onChange={event => updateDay(index, { transport: event.target.value })} className={inputClass} placeholder="Transfer, driver or vehicle"/>
                            </label>
                            <label className={labelClass}><span className="inline-flex items-center gap-1.5"><Hotel size={13} className="text-emerald-700"/> Overnight stay</span>
                              <input value={day.accommodation || ''} onChange={event => updateDay(index, { accommodation: event.target.value })} className={inputClass} placeholder="Hotel, lodge or camp"/>
                            </label>
                            <label className={labelClass + ' sm:col-span-2'}><span className="inline-flex items-center gap-1.5"><Utensils size={13} className="text-emerald-700"/> Meals included</span>
                              <input value={day.meals || ''} onChange={event => updateDay(index, { meals: event.target.value })} className={inputClass} placeholder="Example: Breakfast and lunch"/>
                            </label>
                            <label className={labelClass + ' sm:col-span-2'}>Helpful note for the traveller
                              <textarea value={day.notes || ''} onChange={event => updateDay(index, { notes: event.target.value })} rows={2} className={inputClass + ' resize-y'} placeholder="Useful timing, clothing or meeting-point information"/>
                            </label>
                          </div>
                        </details>
                      </div>
                    )}
                  </article>
                ))}
                {!dayCount && (
                  <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 px-5 py-10 text-center">
                    <CalendarDays size={28} className="mx-auto text-emerald-700"/>
                    <p className="mt-3 text-sm font-extrabold text-slate-900">Your daily programme starts here</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">Use the booking dates to create the day cards automatically, or add your first day.</p>
                    <button type="button" onClick={buildDaysFromBooking} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white"><Sparkles size={14} className="mr-1 inline"/> Prepare my days</button>
                  </div>
                )}
              </div>
              {dayCount > 0 && <button type="button" onClick={addDay} className="w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 py-3 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50"><Plus size={15} className="mr-1 inline"/> Add another day</button>}
            </section>
          )}

          {activeStep === 2 && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Luggage size={19}/></span>
                <div><h2 className="text-base font-extrabold text-slate-900">Add the useful finishing details</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">These details help the traveller understand what is arranged and what to prepare. Leave anything that does not apply blank.</p></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className={labelClass}>What is included?
                  <textarea value={(itinerary.inclusions || []).join('\n')} onChange={event => updateItinerary({ inclusions: splitLines(event.target.value) })} rows={5} className={inputClass + ' resize-y'} placeholder={'Airport transfers\nGuided activities\nAccommodation'} />
                  <span className="mt-1 block text-[10px] font-normal text-slate-500">One included service per line.</span>
                </label>
                <label className={labelClass}>What should the traveller bring?
                  <textarea value={(itinerary.essentials || []).join('\n')} onChange={event => updateItinerary({ essentials: splitLines(event.target.value) })} rows={5} className={inputClass + ' resize-y'} placeholder={'Passport and travel documents\nComfortable walking shoes\nWeather-appropriate clothing'} />
                  <span className="mt-1 block text-[10px] font-normal text-slate-500">Keep advice practical for this particular trip.</span>
                </label>
              </div>
              <label className={labelClass}>A final helpful message (optional)
                <textarea value={itinerary.contactNote || ''} onChange={event => updateItinerary({ contactNote: event.target.value })} rows={3} className={inputClass + ' resize-y'} placeholder="For assistance during your journey, contact the Altuvera team..."/>
              </label>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="text-sm font-extrabold text-slate-900">Final preparation checks</h3><p className="mt-1 text-[11px] text-slate-600">For your team only. These checks are not shown as a traveller activity list.</p></div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold text-emerald-800">{completedChecks} of {totalChecks} complete</span>
                </div>
                <div className="mt-3 space-y-2">
                  {(itinerary.planningChecklist || []).map((item, index) => (
                    <label key={item.key || index} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200">
                      <input type="checkbox" checked={Boolean(item.done)} onChange={event => updateChecklist(index, event.target.checked)} className="h-4 w-4 shrink-0 accent-emerald-700"/>
                      <span className="flex-1">{item.label}</span>
                      {item.done && <CheckCircle2 size={15} className="text-emerald-600"/>}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-700"/>
                <span>Internal preparation checks are saved with the draft, but the traveller only receives the itinerary details, inclusions, essentials and your final message.</span>
              </div>
            </section>
          )}

          {activeStep === 3 && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Eye size={19}/></span>
                  <div><h2 className="text-base font-extrabold text-slate-900">Review before sending</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Read through the itinerary as the traveller will see it. You can go back to any step to make changes.</p></div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-800"><FileText size={13}/> Detailed PDF + traveller dashboard</span>
              </div>
              <article className="itinerary-preview-paper mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-emerald-100">
                <div className="relative isolate overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 px-5 py-7 text-white sm:px-8">
                  {destinationImage && <img src={destinationImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"/>}
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-14 shrink-0 place-items-center rounded-xl border border-white/35 bg-white p-1.5"><img src="https://www.altuverasafaris.com/altuvera.png" alt="Altuvera" className="max-h-full max-w-full object-contain"/></div>
                    <div><p className="text-sm font-black">ALTUVERA</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.13em] text-emerald-100">True adventure in high places &amp; deep culture</p></div>
                  </div>
                  <p className="mt-7 text-[9px] font-extrabold uppercase tracking-[.2em] text-emerald-200">Your journey, thoughtfully arranged</p>
                  <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{itinerary.title || 'Your Altuvera Adventure'}</h3>
                  <p className="mt-2 text-xs text-emerald-50">{destination} · {formatDate(startDate, { day: 'numeric', month: 'short' })} – {formatDate(endDate)}</p>
                </div>
                <div className="space-y-5 px-4 py-5 sm:px-7 sm:py-7">
                  <p className="whitespace-pre-line text-xs leading-6 text-slate-600">{itinerary.introduction}</p>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-emerald-50/70 p-3 text-[10px]">
                    <div><p className="font-bold uppercase tracking-wide text-emerald-800">Traveller</p><p className="mt-1 font-extrabold text-slate-800">{travellerName}</p></div>
                    <div><p className="font-bold uppercase tracking-wide text-emerald-800">Travellers</p><p className="mt-1 font-extrabold text-slate-800">{booking.number_of_travelers || 1}</p></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">Your day-by-day journey</h4>
                    <div className="mt-3 space-y-3">
                      {itinerary.days.map((day, index) => (
                        <div key={index} className="relative rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-start gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-700 text-[10px] font-black text-white">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">{formatDate(day.date)}</p>
                              <h5 className="mt-0.5 text-xs font-extrabold text-slate-900">{day.title || 'Day ' + (index + 1)}</h5>
                              {day.location && <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500"><MapPin size={11}/>{day.location}</p>}
                              {(day.activities || []).length > 0 && <ul className="mt-2 space-y-1.5">{day.activities.map((activity, activityIndex) => <li key={activityIndex} className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-600"><Check size={11} className="mt-0.5 shrink-0 text-emerald-600"/><span>{activity}</span></li>)}</ul>}
                              {(day.transport || day.accommodation || day.meals) && <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-slate-500">{day.transport && <span><Car size={10} className="mr-1 inline"/>{day.transport}</span>}{day.accommodation && <span><Hotel size={10} className="mr-1 inline"/>{day.accommodation}</span>}{day.meals && <span><Utensils size={10} className="mr-1 inline"/>{day.meals}</span>}</div>}
                              {day.notes && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[9px] leading-4 text-slate-600">{day.notes}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                      {!itinerary.days.length && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">Your day-by-day programme will appear here.</p>}
                    </div>
                  </div>
                  {itinerary.inclusions?.length > 0 && <div><h4 className="text-sm font-black text-emerald-950">Included in your journey</h4><ul className="mt-2 space-y-1.5">{itinerary.inclusions.map((item, index) => <li key={index} className="flex gap-2 text-[10px] text-slate-600"><Check size={12} className="shrink-0 text-emerald-600"/>{item}</li>)}</ul></div>}
                  {itinerary.essentials?.length > 0 && <div><h4 className="text-sm font-black text-emerald-950">What to bring</h4><ul className="mt-2 space-y-1.5">{itinerary.essentials.map((item, index) => <li key={index} className="flex gap-2 text-[10px] text-slate-600"><Luggage size={12} className="shrink-0 text-emerald-700"/>{item}</li>)}</ul></div>}
                  {itinerary.contactNote && <div className="rounded-xl bg-emerald-50 p-3 text-[10px] leading-5 text-emerald-900">{itinerary.contactNote}</div>}
                  <div className="border-t border-slate-100 pt-3 text-center"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-800">Altuvera · East Africa</p><p className="mt-1 text-[9px] text-slate-400">True adventure in high places &amp; deep culture</p></div>
                </div>
              </article>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-700"/><p className="text-[11px] leading-5 text-emerald-900">When you send, the traveller receives a detailed PDF by email and can also open it from My Bookings. They will be asked to review and approve the itinerary.</p></div>
              </div>
              {!verified && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle size={15} className="mr-1 inline"/> The traveller’s email is not confirmed yet, so sending is unavailable.</div>}
              {booking.itinerary_email_status && (
                <div className={'rounded-xl border p-3 text-xs ' + (booking.itinerary_email_status === 'sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : booking.itinerary_email_status === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                  <p className="font-extrabold">Latest email status: {booking.itinerary_email_status === 'sent' ? 'Accepted by email provider' : booking.itinerary_email_status === 'failed' ? 'Not sent successfully' : booking.itinerary_email_status}</p>
                  {booking.itinerary_email_status === 'failed' && <p className="mt-1 break-words text-[11px]">{booking.itinerary_email_error || 'The dashboard itinerary remains available.'}</p>}
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="hidden space-y-4 xl:block xl:sticky xl:top-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-emerald-950 px-4 py-3 text-white"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-200">Preparation snapshot</p><h3 className="mt-1 text-sm font-extrabold">{destination}</h3></div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Daily programme</span><b className="text-slate-900">{dayCount} days</b></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: programmeProgress + '%' }}/></div>
              <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Preparation checks</span><b className="text-slate-900">{completedChecks}/{totalChecks}</b></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: (totalChecks ? completedChecks / totalChecks * 100 : 0) + '%' }}/></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Next step</p><p className="mt-1 text-xs font-extrabold text-slate-800">{STEPS[activeStep].title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{STEPS[activeStep].subtitle}</p></div>
              <button type="button" onClick={save} disabled={saving || sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Save draft</button>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 text-emerald-900"><Sparkles size={16}/><p className="text-xs font-extrabold">Manager’s tip</p></div>
            <p className="mt-2 text-[11px] leading-5 text-emerald-900/80">Keep each day clear: name the experience, add its location and list the main activities. Optional hotel and meal details can be added only where useful.</p>
          </div>
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-8px_28px_rgba(15,23,42,.08)] backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <button type="button" onClick={save} disabled={saving || sending} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:px-4">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}<span className="hidden sm:inline">{saving ? 'Saving…' : 'Save draft'}</span><span className="sm:hidden">Save</span>
          </button>
          {activeStep > 0 && <button type="button" onClick={() => setActiveStep(step => Math.max(0, step - 1))} disabled={saving || sending} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={15}/><span className="hidden sm:inline">Back</span></button>}
          <div className="min-w-0 flex-1 text-center"><p className="truncate text-[10px] font-bold text-slate-500">{activeStep === 3 ? 'Final review' : 'Step ' + (activeStep + 1) + ' of 4'}</p><p className="truncate text-xs font-extrabold text-slate-800">{activeStep === 3 ? 'Ready to send when you are' : STEPS[activeStep].title}</p></div>
          {activeStep < 3 ? (
            <button type="button" onClick={() => setActiveStep(step => Math.min(3, step + 1))} disabled={saving || sending} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50">Continue <ChevronRight size={15}/></button>
          ) : (
            <button type="button" onClick={publish} disabled={saving || sending || !verified || !dayCount} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}<span className="hidden sm:inline">{sending ? 'Sending…' : 'Send itinerary'}</span><span className="sm:hidden">{sending ? 'Sending' : 'Send'}</span></button>
          )}
        </div>
      </footer>
    </div>
  )
}
