import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate }         from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Activity, Globe2, MapPin,
  CalendarCheck, Users, FileText, Mail,
  MessageSquare, Eye, TrendingUp, AlertCircle,
} from 'lucide-react'
import { useAuth }             from '@hooks/useAuth'
import { useToast }            from '@hooks/useToast'
import StatCard                from '@components/common/StatCard'
import RecentBookings          from '@components/dashboard/RecentBookings'
import ActivityFeed            from '@components/dashboard/ActivityFeed'
import {
  BookingChart,
  DestinationCategoryChart,
  ContinentChart,
} from '@components/dashboard/Charts'
import apiClient               from '@api/client'
import { getErrorMessage }     from '@api/client'

/* ── Fetch all stats in parallel, each endpoint isolated ── */
const safeFetch = async (fn) => {
  try { return await fn() }
  catch { return null }
}


const getDestinationImage = (item) => {
  const candidates = [
    ...(Array.isArray(item?.heroImages) ? item.heroImages : []),
    ...(Array.isArray(item?.hero_images) ? item.hero_images : []),
    item?.hero_image, item?.cover_image, item?.featured_image, item?.image_url, item?.image,
    item?.thumbnail, item?.images?.[0]?.url, item?.images?.[0],
  ]
  return candidates.find((value) => typeof value === 'string' && value.trim()) ||
    'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80'
}

/* Forty distinct motion combinations: direction, scale, rotation and reveal vary by slide. */
const SLIDE_DIRECTIONS = [
  [0, 34], [0, -34], [34, 0], [-34, 0],
  [0, 60], [0, -60], [60, 0], [-60, 0],
]
const getSlideMotion = (index) => {
  const direction = SLIDE_DIRECTIONS[index % SLIDE_DIRECTIONS.length]
  const variation = Math.floor(index / SLIDE_DIRECTIONS.length)
  const scales = [1.12, 0.9, 1.06, 0.96, 1.16]
  const rotations = [-1.5, 1.5, 0, -0.7, 0.7]
  const reveals = [
    'inset(0 0 100% 0)', 'inset(100% 0 0 0)', 'inset(0 100% 0 0)',
    'inset(0 0 0 100%)', 'inset(50% 50% 50% 50%)',
  ]
  return {
    initial: {
      opacity: 0,
      x: direction[0],
      y: direction[1],
      scale: scales[variation],
      rotate: rotations[(index + variation) % rotations.length],
      filter: variation % 2 ? 'blur(12px)' : 'blur(0px)',
      clipPath: reveals[variation],
    },
    animate: {
      opacity: 1, x: 0, y: 0, scale: 1, rotate: 0,
      filter: 'blur(0px)', clipPath: 'inset(0 0 0 0)',
    },
    exit: {
      opacity: 0,
      x: -direction[0] * 0.45,
      y: -direction[1] * 0.45,
      scale: variation % 2 ? 1.04 : 0.97,
      filter: 'blur(8px)',
      clipPath: reveals[(variation + 2) % reveals.length],
    },
    transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
  }
}

const getDestinationName = (item) =>
  item?.name || item?.title || item?.destination_name || 'Untitled destination'

const getDestinationLocation = (item) =>
  item?.country_name || item?.country?.name || item?.location || item?.region || 'East Africa'

const DashboardSection = ({ eyebrow, title, description, children, action }) => (
  <section className="relative overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_18px_50px_rgba(5,150,105,0.07)]">
    <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-emerald-50/70 blur-3xl" />
    <div className="relative flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">{eyebrow}</p>
        <motion.h2
          initial={{ opacity: 0, y: 14, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl"
        >{title}</motion.h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
)

export default function Dashboard() {
  const { admin }  = useAuth()
  const { error: toastError } = useToast()  // Destructure to get stable reference
  const navigate   = useNavigate()

  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [stats,      setStats]      = useState(null)
  const [bookings,   setBookings]   = useState([])
  const [activities, setActivities] = useState([])
  const [destinations, setDestinations] = useState([])
  const [activeDestinationIndex, setActiveDestinationIndex] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      /* ── Parallel requests — each wrapped so one failure doesn't block others ── */
      const [
        countriesRes,
        destinationsRes,
        bookingsRes,
        usersRes,
        postsRes,
        subscribersRes,
        contactRes,
        bookingStatsRes,
      ] = await Promise.all([
        safeFetch(() => apiClient.get('/countries',    { params: { limit: 1, page: 1 } })),
        safeFetch(() => apiClient.get('/destinations', { params: { limit: 20, page: 1, sortBy: 'name', order: 'asc' } })),
        safeFetch(() => apiClient.get('/bookings',     { params: { limit: 8, page: 1, sortBy: 'created_at', order: 'desc' } })),
        safeFetch(() => apiClient.get('/users',        { params: { limit: 1, page: 1 } })),
        safeFetch(() => apiClient.get('/posts',        { params: { limit: 1, page: 1 } })),
        safeFetch(() => apiClient.get('/subscribers',  { params: { limit: 1, page: 1 } })),
        safeFetch(() => apiClient.get('/contact',      { params: { limit: 1, page: 1 } })),
        safeFetch(() => apiClient.get('/bookings/stats')),
      ])

      /* ── Helper to extract pagination total ── */
      const getTotal = (res) =>
        res?.data?.pagination?.total ??
        res?.data?.pagination?.totalItems ??
        res?.data?.total             ??
        res?.data?.count             ??
        0

      /* ── Helper to extract data array ── */
      const getData = (res) =>
        res?.data?.data          ??
        res?.data?.bookings      ??
        res?.data?.countries     ??
        res?.data?.destinations  ??
        res?.data?.users         ??
        res?.data?.posts         ??
        res?.data?.subscribers   ??
        res?.data?.messages      ??
        res?.data?.items         ??
        []

      /* ── Booking stats (if endpoint exists) ── */
      const bStats = bookingStatsRes?.data?.data || {}

      const destinationPayload = destinationsRes?.data?.data ?? destinationsRes?.data ?? {}
      const destinationRows = Array.isArray(destinationPayload)
        ? destinationPayload
        : destinationPayload?.destinations ?? destinationPayload?.items ?? destinationPayload?.results ?? []
      setDestinations(Array.isArray(destinationRows) ? destinationRows.filter(Boolean).slice(0, 20) : [])

      setStats({
        countries:       getTotal(countriesRes),
        destinations:    getTotal(destinationsRes),
        bookings:        getTotal(bookingsRes),
        users:           getTotal(usersRes),
        posts:           getTotal(postsRes),
        subscribers:     getTotal(subscribersRes),
        messages:        getTotal(contactRes),
        unreadMessages:  contactRes?.data?.unread ?? 0,
        totalViews:      bStats.totalViews    ?? 0,
        publishedPosts:  bStats.publishedPosts ?? 0,
        pendingBookings: bStats.pending        ?? 0,
        confirmedBookings: bStats.confirmed    ?? 0,
      })

      const recentBookings = getData(bookingsRes)
      setBookings(recentBookings)

      /* ── Synthetic activity feed from real bookings ── */
      const acts = recentBookings.slice(0, 10).map((b) => ({
        type:      'booking',
        message:   `${b.full_name || 'A guest'} requested booking ${b.booking_number || ''}`,
        createdAt: b.created_at,
      }))
      setActivities(acts)
      setLastRefresh(new Date())

    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      toastError(`Dashboard error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [toastError])  // Now depends on stable toastError function

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setActiveDestinationIndex(0)
  }, [destinations.length])

  useEffect(() => {
    if (destinations.length < 2) return undefined
    const timer = setInterval(() => {
      setActiveDestinationIndex((current) => (current + 1) % destinations.length)
    }, 4800)
    return () => clearInterval(timer)
  }, [destinations.length])

  /* ── Auto-refresh every 5 minutes ── */
  useEffect(() => {
    const interval = setInterval(() => {
      load()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [load])

  /* ── Greeting ── */
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  /* ── Stat cards config ── */
  const statCards = stats ? [
    {
      title:      'Countries',
      value:      stats.countries,
      icon:       Globe2,
      color:      'green',
      subtitle:   'Active destinations',
      onClick:    () => navigate('/countries'),
    },
    {
      title:      'Destinations',
      value:      stats.destinations,
      icon:       MapPin,
      color:      'blue',
      subtitle:   'Published & draft',
      onClick:    () => navigate('/destinations'),
    },
    {
      title:      'Total Bookings',
      value:      stats.bookings,
      icon:       CalendarCheck,
      color:      'orange',
      subtitle:   `${stats.pendingBookings || 0} pending`,
      onClick:    () => navigate('/bookings'),
    },
    {
      title:      'Registered Users',
      value:      stats.users,
      icon:       Users,
      color:      'purple',
      subtitle:   'All time',
      onClick:    () => navigate('/users'),
    },
    {
      title:      'Blog Posts',
      value:      stats.posts,
      icon:       FileText,
      color:      'green',
      subtitle:   `${stats.publishedPosts || 0} published`,
      onClick:    () => navigate('/posts'),
    },
    {
      title:      'Newsletter',
      value:      stats.subscribers,
      icon:       Mail,
      color:      'teal',
      subtitle:   'Subscribers',
      onClick:    () => navigate('/subscribers'),
    },
    {
      title:      'Contact Messages',
      value:      stats.messages,
      icon:       MessageSquare,
      color:      'orange',
      subtitle:   stats.unreadMessages > 0 ? `${stats.unreadMessages} unread` : 'All read',
      onClick:    () => navigate('/contact'),
    },
    {
      title:      'Page Views',
      value:      stats.totalViews,
      icon:       Eye,
      color:      'blue',
      subtitle:   'Across all destinations',
    },
  ] : []

  return (
    <div className="space-y-6">

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[30px] border border-emerald-100 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-5 text-white shadow-[0_24px_70px_rgba(6,78,59,0.18)] sm:p-7"
      >
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100 backdrop-blur">
              <Globe2 size={13} /> Altuvera Tourism Command Center
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              {greeting()},{' '}
              <span className="text-emerald-300">
                {admin?.fullName?.split(' ')[0] || admin?.full_name?.split(' ')[0] || admin?.username || 'Admin'}
              </span>{' '}👋
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/75">
              Manage destinations, bookings, travellers and content from one beautifully organized workspace.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-emerald-100/70">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <Activity size={12} className="text-emerald-300" />
                {lastRefresh ? 'Updated ' + lastRefresh.toLocaleTimeString() : 'Syncing live data…'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <MapPin size={12} className="text-emerald-300" /> East Africa
              </span>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            Refresh dashboard
          </button>
        </div>
      </motion.section>

      {/* ── Error state ── */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}
        >
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">
              Failed to load dashboard data
            </p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <button
              onClick={load}
              className="mt-2 text-xs font-semibold text-red-600
                         underline underline-offset-2 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Stats grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </motion.div>
      )}

      {/* ── Featured destinations ── */}
      <DashboardSection
        eyebrow="Explore"
        title="Destinations at a glance"
        description="A cinematic, hands-free tour through destinations in your tourism platform."
        action={
          <button
            onClick={() => navigate('/destinations')}
            className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100"
          >
            Manage destinations <MapPin size={13} className="ml-1.5" />
          </button>
        }
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : destinations.length ? (
          <div className="p-4 sm:p-6">
            <div className="relative isolate overflow-hidden rounded-[24px] bg-slate-950 shadow-[0_20px_55px_rgba(15,23,42,0.18)]">
              <div className="relative min-h-[280px] sm:min-h-[360px]">
                <AnimatePresence mode="wait">
                  {destinations[activeDestinationIndex] && (
                    <motion.button
                      key={destinations[activeDestinationIndex].id || destinations[activeDestinationIndex]._id || getDestinationName(destinations[activeDestinationIndex])}
                      type="button"
                      onClick={() => navigate('/destinations')}
                      {...getSlideMotion(activeDestinationIndex)}
                      className="absolute inset-0 h-full w-full text-left"
                      aria-label={`Open destination manager for ${getDestinationName(destinations[activeDestinationIndex])}`}
                    >
                      <img
                        src={getDestinationImage(destinations[activeDestinationIndex])}
                        alt={getDestinationName(destinations[activeDestinationIndex])}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="eager"
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/35 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/10" />
                      <div className="absolute inset-x-5 bottom-7 max-w-2xl sm:inset-x-9 sm:bottom-10">
                        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 backdrop-blur-md">
                          <Globe2 size={13} /> Featured destination
                        </span>
                        <h3 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
                          {getDestinationName(destinations[activeDestinationIndex])}
                        </h3>
                        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/80 sm:text-sm">
                          <MapPin size={14} /> {getDestinationLocation(destinations[activeDestinationIndex])}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-800 shadow-lg">
                          Open destination manager <TrendingUp size={14} />
                        </span>
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <div className="pointer-events-none absolute right-5 top-5 z-10 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] font-bold text-white/90 backdrop-blur-md">
                {String(activeDestinationIndex + 1).padStart(2, '0')} / {String(destinations.length).padStart(2, '0')}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><MapPin size={21} /></div>
            <p className="text-sm font-bold text-slate-800">No destinations to display yet</p>
            <p className="mt-1 text-xs text-slate-500">Create your first destination to see it featured here.</p>
          </div>
        )}
      </DashboardSection>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Destinations', icon: MapPin, path: '/destinations' },
          { label: 'Bookings', icon: CalendarCheck, path: '/bookings' },
          { label: 'Travellers', icon: Users, path: '/users' },
          { label: 'Blog posts', icon: FileText, path: '/posts' },
        ].map((item, index) => (
          <motion.button
            key={item.path}
            onClick={() => navigate(item.path)}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-sm transition-shadow hover:shadow-md sm:p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <item.icon size={18} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 truncate text-xs font-extrabold text-slate-700 sm:text-sm">{item.label}</span>
          </motion.button>
        ))}
      </div>

      {/* ── Charts ── */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BookingChart />
        <DestinationCategoryChart />
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentBookings bookings={bookings} loading={loading} />
        </div>
        <ActivityFeed activities={activities} loading={loading} />
      </div>

      {/* ── Continent chart ── */}
      <ContinentChart />
    </div>
  )
}