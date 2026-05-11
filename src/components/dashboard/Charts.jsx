import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts'
import apiClient from '@api/client'

const GREEN_SHADES = [
  '#059669', '#10b981', '#34d399', '#6ee7b7',
  '#064e3b', '#065f46', '#047857', '#d1fae5',
]

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
      <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

/* ── Skeleton ── */
const ChartSkeleton = () => (
  <div className="space-y-3">
    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
    <div className="h-64 w-full bg-gray-50 rounded-xl animate-pulse" />
  </div>
)

/* ── Booking trends chart ── */
export function BookingChart() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState('week')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: res } = await apiClient.get('/bookings', {
          params: {
            limit:   100,
            sortBy:  'created_at',
            order:   'desc',
          },
        })

        const bookingList = res?.data || res?.bookings || []

        /* Group by day / week / month */
        const grouped = {}
        const now     = new Date()

        bookingList.forEach((b) => {
          const d = new Date(b.created_at)
          let key = ''

          if (period === 'week') {
            /* Last 7 days */
            const diff = Math.floor((now - d) / 86400000)
            if (diff > 7) return
            key = d.toLocaleDateString('en-US', { weekday: 'short' })
          } else if (period === 'month') {
            /* Last 30 days — group by week number */
            const diff = Math.floor((now - d) / 86400000)
            if (diff > 30) return
            key = `Week ${Math.ceil((30 - diff) / 7)}`
          } else {
            /* Year — group by month */
            const diff = (now.getFullYear() - d.getFullYear()) * 12 +
                         (now.getMonth() - d.getMonth())
            if (diff > 12) return
            key = d.toLocaleDateString('en-US', { month: 'short' })
          }

          grouped[key] = (grouped[key] || 0) + 1
        })

        const chartData = Object.entries(grouped).map(([name, bookings]) => ({
          name, bookings,
        }))

        /* Fallback: show empty periods with 0 */
        if (chartData.length === 0) {
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          setData(days.map((name) => ({ name, bookings: 0 })))
        } else {
          setData(chartData)
        }
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [period])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Booking Trends</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.reduce((s, d) => s + d.bookings, 0)} bookings in this period
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-bold rounded-lg capitalize
                          transition-all duration-150
                          ${period === p
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                          }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? <ChartSkeleton /> : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke="#059669"
              strokeWidth={2.5}
              fill="url(#greenGrad)"
              name="Bookings"
              dot={{ fill: '#059669', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#059669' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

/* ── Destination categories pie chart ── */
export function DestinationCategoryChart() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: res } = await apiClient.get('/destinations', {
          params: { limit: 200, page: 1 },
        })

        const destinations = res?.data || res?.destinations || []

        /* Count by category */
        const counts = {}
        destinations.forEach((d) => {
          const cat = d.category || d.destination_type || 'Other'
          const key = cat.charAt(0).toUpperCase() + cat.slice(1)
          counts[key] = (counts[key] || 0) + 1
        })

        const chartData = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }))

        setData(chartData.length > 0 ? chartData : [])
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-800">Destinations by Category</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {data.reduce((s, d) => s + d.value, 0)} total destinations
        </p>
      </div>

      {loading ? <ChartSkeleton /> : data.length === 0 ? (
        <div className="h-60 flex items-center justify-center">
          <p className="text-sm text-gray-400">No destination data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={GREEN_SHADES[i % GREEN_SHADES.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(v) => (
                <span className="text-xs text-gray-600 font-medium">{v}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

/* ── Countries by continent bar chart ── */
export function ContinentChart() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: res } = await apiClient.get('/countries', {
          params: { limit: 300, page: 1 },
        })

        const countries = res?.data || res?.countries || []

        /* Count by continent */
        const counts = {}
        countries.forEach((c) => {
          const cont = c.continent || 'Other'
          counts[cont] = (counts[cont] || 0) + 1
        })

        const chartData = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }))

        setData(chartData.length > 0 ? chartData : [])
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-800">Countries by Continent</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {data.reduce((s, d) => s + d.count, 0)} countries in database
        </p>
      </div>

      {loading ? <ChartSkeleton /> : data.length === 0 ? (
        <div className="h-60 flex items-center justify-center">
          <p className="text-sm text-gray-400">No country data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="#059669"
              radius={[8, 8, 0, 0]}
              name="Countries"
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}