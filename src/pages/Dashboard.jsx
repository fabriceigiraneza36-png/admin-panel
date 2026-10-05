import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate }         from 'react-router-dom'
import { motion }              from 'framer-motion'
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


const getDestinationImage = (item) =>
  item?.cover_image || item?.featured_image || item?.image_url || item?.image ||
  item?.thumbnail || item?.images?.[0]?.url || item?.images?.[0] ||
  'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=80'

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
        <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
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
        safeFetch(() => apiClient.get('/destinations', { params: { limit: 1, page: 1 } })),
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

      const destinationRows =
        destinationsRes?.data?.data ??
        destinationsRes?.data?.destinations ??
        destinationsRes?.data?.items ??
        []
      setDestinations(Array.isArray(destinationRows) ? destinationRows.slice(0, 6) : [])

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
        description="A quick visual overview of the destinations currently available in your tourism platform."
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
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">
            {destinations.map((destination, index) => (
              <motion.button
                key={destination.id || destination._id || (getDestinationName(destination) + '-' + index)}
                type="button"
                onClick={() => navigate('/destinations')}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.985 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 text-left shadow-sm transition-shadow duration-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={getDestinationImage(destination)}
                    alt={getDestinationName(destination)}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading={index < 3 ? 'eager' : 'lazy'}
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=80' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    <MapPin size={11} /> Destination
                  </div>
                  <div className="absolute inset-x-3 bottom-3">
                    <h3 className="truncate text-base font-black text-white">{getDestinationName(destination)}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-white/75">
                      <Globe2 size={11} /> {getDestinationLocation(destination)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="text-xs font-semibold text-slate-500">Open destination manager</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                    <TrendingUp size={14} />
                  </span>
                </div>
              </motion.button>
            ))}
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