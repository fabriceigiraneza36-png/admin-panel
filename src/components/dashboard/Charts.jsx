import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts'
import apiClient from '@api/client'
import { destinationsAPI } from '@api/destinations'
import { countriesAPI } from '@api/countries'
import { motion } from 'framer-motion'

const GREEN_SHADES = [
  '#059669', '#10b981', '#34d399', '#6ee7b7',
  '#064e3b', '#065f46', '#047857', '#d1fae5',
]

// API responses may be direct arrays or nested response envelopes.
const extractRows = (payload, keys = []) => {
  let value = payload
  for (let depth = 0; depth < 5 && value != null; depth += 1) {
    if (Array.isArray(value)) return value
    if (typeof value !== 'object') return null
    const key = keys.find((candidate) => Array.isArray(value[candidate]))
    if (key) return value[key]
    value = value.data
  }
  return null
}

const ChartFrame = ({ children, className = '' }) => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className={'min-w-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_14px_40px_rgba(5,150,105,0.06)] sm:p-5 ' + className}
  >{children}</motion.section>
)

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
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)
  const [period, setPeriod] = useState('week')
  const [updatedAt, setUpdatedAt] = useState(null)
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      if (period === 'week' || period === 'month') {
        const { data: liveResponse } = await apiClient.get('/bookings/stats', { params: { period: '6months' } })
        const liveStats = liveResponse?.data || liveResponse
        const aggregateRows = period === 'week' ? liveStats?.daily_trends : liveStats?.weekly_trends
        if (Array.isArray(aggregateRows)) {
          const now = new Date()
          const buckets = []
          const map = new Map(aggregateRows.map(row => [row.period, Number(row.total || 0)]))
          if (period === 'week') {
            for (let offset = 6; offset >= 0; offset--) {
              const day = new Date(now); day.setHours(0,0,0,0); day.setDate(day.getDate()-offset)
              const key = day.toISOString().slice(0,10)
              buckets.push({ key, name: day.toLocaleDateString(undefined,{weekday:'short'}), bookings: map.get(key) || 0 })
            }
          } else {
            const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(monday.getDate()-((monday.getDay()+6)%7))
            for (let offset = 4; offset >= 0; offset--) {
              const day = new Date(monday); day.setDate(day.getDate()-offset*7)
              const key = day.toISOString().slice(0,10)
              buckets.push({ key, name: day.toLocaleDateString(undefined,{month:'short',day:'numeric'}), bookings: map.get(key) || 0 })
            }
          }
          setData(buckets); setAvailable(true); setUpdatedAt(new Date()); return
        }
      }
      if (period === 'year') {
        const { data: aggregateResponse } = await apiClient.get('/bookings/stats', { params: { period: '12months' } })
        const aggregate = aggregateResponse?.data || aggregateResponse
        if (!Array.isArray(aggregate?.monthly_trends)) throw new Error('Monthly aggregate unavailable')
        const monthRows = aggregate.monthly_trends.slice(-12).map(row => ({
          key: row.month,
          name: row.month_label || row.month,
          bookings: Number(row.total || 0),
        }))
        setData(monthRows)
        setAvailable(true)
        setUpdatedAt(new Date())
        return
      }
      const { data: res } = await apiClient.get('/bookings', { params: { limit: 100, page: 1, sortBy: 'created_at', order: 'desc' } })
      const list = res?.data?.bookings || res?.data?.data || res?.bookings || res?.data?.items || res?.items
      if (!Array.isArray(list)) throw new Error('Booking records missing')
      const now = new Date()
      const grouped = new Map()
      const labels = []
      if (period === 'week') {
        for (let offset = 6; offset >= 0; offset--) {
          const day = new Date(now); day.setHours(0,0,0,0); day.setDate(day.getDate()-offset)
          const key = day.toISOString().slice(0,10)
          grouped.set(key,0); labels.push({key,label:day.toLocaleDateString(undefined,{weekday:'short'})})
        }
      } else if (period === 'month') {
        for (let offset = 4; offset >= 0; offset--) {
          const day = new Date(now); day.setDate(day.getDate()-offset*7)
          day.setDate(day.getDate()-((day.getDay()+6)%7)); day.setHours(0,0,0,0)
          const key=day.toISOString().slice(0,10)
          if(!grouped.has(key)){grouped.set(key,0);labels.push({key,label:day.toLocaleDateString(undefined,{month:'short',day:'numeric'})})}
        }
      } else {
        for(let offset=11;offset>=0;offset--){
          const day=new Date(now.getFullYear(),now.getMonth()-offset,1)
          const key=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}`
          grouped.set(key,0);labels.push({key,label:day.toLocaleDateString(undefined,{month:'short'})})
        }
      }
      list.forEach(item=>{
        const raw=item.created_at||item.createdAt
        if(!raw)return
        const date=new Date(raw);if(Number.isNaN(date.getTime()))return
        let key
        if(period==='week')key=date.toISOString().slice(0,10)
        else if(period==='month'){date.setDate(date.getDate()-((date.getDay()+6)%7));date.setHours(0,0,0,0);key=date.toISOString().slice(0,10)}
        else key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
        if(grouped.has(key))grouped.set(key,grouped.get(key)+1)
      })
      setData(labels.map(({key,label})=>({key,name:label,bookings:grouped.get(key)||0})))
      setAvailable(true);setUpdatedAt(new Date())
    } catch { setAvailable(false);setData([]) }
    finally { setLoading(false) }
  },[period])
  useEffect(()=>{void load();const timer=setInterval(()=>void load(true),60_000);return()=>clearInterval(timer)},[load])
  const total=data.reduce((sum,row)=>sum+row.bookings,0)
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h3 className="text-sm font-bold text-gray-800">Booking Trends</h3>
          <p className="mt-0.5 text-xs text-gray-400">{available?`${total.toLocaleString()} bookings in loaded records`:'Live booking data unavailable'}</p>
          <p className="mt-1 text-[10px] text-gray-400">{updatedAt?`Updated ${updatedAt.toLocaleTimeString()}`:'Waiting for data'} · refreshes every minute</p>
        </div>
        <div className="flex w-full flex-wrap gap-1 rounded-xl bg-gray-100 p-1 sm:w-auto">
          {['week','month','year'].map(p=><button key={p} onClick={()=>setPeriod(p)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize transition-all sm:flex-none ${period===p?'bg-white text-emerald-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{p}</button>)}
        </div>
      </div>
      {loading?<ChartSkeleton/>:!available?<div className="flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center"><p className="text-sm font-semibold text-slate-600">No verified data available</p><p className="mt-1 max-w-sm text-xs text-slate-500">Booking trends could not be loaded. The chart is not replaced with fabricated zero values.</p></div>:(
        <div className="h-56 w-full min-w-0 sm:h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:8,right:8,left:-18,bottom:0}}>
          <defs><linearGradient id="bookingTrendGreenGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.2}/><stop offset="95%" stopColor="#059669" stopOpacity={0.015}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={10}/>
          <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} allowDecimals={false} width={38}/>
          <Tooltip content={<CustomTooltip/>}/>
          <Area type="monotone" dataKey="bookings" stroke="#059669" strokeWidth={2.5} fill="url(#bookingTrendGreenGrad)" name="Bookings" dot={{fill:'#059669',r:3,strokeWidth:0}} activeDot={{r:5,fill:'#059669'}}/>
        </AreaChart></ResponsiveContainer></div>
      )}
      {available&&<p className="mt-2 text-[10px] leading-relaxed text-gray-400">{period === 'year' ? 'Uses server-side monthly aggregates across all booking records.' : 'Uses the latest 100 booking records returned by the current API, not a full historical aggregate.'}</p>}
    </div>
  )
}

/* ── Destination categories pie chart ── */
export function DestinationCategoryChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await destinationsAPI.getAllAdmin({ limit: 500, page: 1, include: 'gallery' })
        const destinations = extractRows(response?.data, ['destinations', 'items', 'results'])
        if (!destinations) throw new Error('Admin destination records missing')

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

        setData(chartData)
        setAvailable(true)
      } catch {
        setData([])
        setAvailable(false)
      } finally {
        setLoading(false)
      }
    }
    void load()
    const timer = setInterval(() => { void load() }, 60_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-800">Destinations by Category</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {available ? `${data.reduce((s, d) => s + d.value, 0)} total destinations` : 'Destination data unavailable'}
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
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await countriesAPI.getAll({ limit: 500, page: 1 })
        const countries = extractRows(response?.data, ['countries', 'items', 'results'])
        if (!countries) throw new Error('Country records missing')

        /* Count by continent */
        const counts = {}
        countries.forEach((c) => {
          const cont = c.continent || 'Other'
          counts[cont] = (counts[cont] || 0) + 1
        })

        const chartData = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }))

        setData(chartData)
        setAvailable(true)
      } catch {
        setData([])
        setAvailable(false)
      } finally {
        setLoading(false)
      }
    }
    void load()
    const timer = setInterval(() => { void load() }, 60_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-800">Countries by Continent</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {available ? `${data.reduce((s, d) => s + d.count, 0)} countries in database` : 'Country data unavailable'}
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