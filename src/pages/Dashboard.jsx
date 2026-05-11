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

export default function Dashboard() {
  const { admin }  = useAuth()
  const toast      = useToast()
  const navigate   = useNavigate()

  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [stats,      setStats]      = useState(null)
  const [bookings,   setBookings]   = useState([])
  const [activities, setActivities] = useState([])
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
        res?.data?.total             ??
        res?.data?.count             ??
        0

      /* ── Helper to extract data array ── */
      const getData = (res) =>
        res?.data?.data       ??
        res?.data?.bookings   ??
        res?.data?.items      ??
        []

      /* ── Booking stats (if endpoint exists) ── */
      const bStats = bookingStatsRes?.data?.data || {}

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
      toast.error(`Dashboard error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

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

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center
                      sm:justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black text-gray-900"
          >
            {greeting()},{' '}
            <span style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {admin?.fullName?.split(' ')[0] || admin?.full_name?.split(' ')[0] || admin?.username || 'Admin'}
            </span>
            {' '}👋
          </motion.h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Activity size={14} className="text-emerald-500" />
            {lastRefresh
              ? `Last updated ${lastRefresh.toLocaleTimeString()}`
              : 'Loading live data from your database…'
            }
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold
                     text-emerald-700 bg-emerald-50 border border-emerald-200
                     rounded-xl hover:bg-emerald-100 transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

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