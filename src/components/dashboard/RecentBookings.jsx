import React, { useEffect, useState } from 'react'
import { useNavigate }   from 'react-router-dom'
import { ArrowRight, CalendarCheck, RefreshCw } from 'lucide-react'
import Badge             from '@components/common/Badge'
import Avatar            from '@components/common/Avatar'
import { formatDate, formatTimeAgo } from '@utils/formatters'
import apiClient         from '@api/client'

export default function RecentBookings({ bookings: propBookings, loading: propLoading }) {
  const navigate = useNavigate()

  /* If bookings are passed from parent use them, otherwise fetch independently */
  const [bookings, setBookings] = useState(propBookings || [])
  const [loading,  setLoading]  = useState(propLoading ?? true)

  useEffect(() => {
    if (propBookings !== undefined) {
      setBookings(propBookings)
      setLoading(propLoading ?? false)
      return
    }

    /* Stand-alone fetch */
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await apiClient.get('/bookings', {
          params: { limit: 8, page: 1, sortBy: 'created_at', order: 'desc' },
        })
        setBookings(data?.data || data?.bookings || [])
      } catch {
        setBookings([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [propBookings, propLoading])

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-9 h-9 bg-gray-100 rounded-xl animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CalendarCheck size={14} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Recent Bookings</h3>
            <p className="text-xs text-gray-400">
              {bookings.length} latest requests
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-1.5 text-xs font-semibold
                     text-emerald-600 hover:text-emerald-700
                     bg-emerald-50 hover:bg-emerald-100
                     px-3 py-1.5 rounded-lg transition-all"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {bookings.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarCheck size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No bookings yet</p>
            <p className="text-xs text-gray-300 mt-1">
              New bookings will appear here
            </p>
          </div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              onClick={() => navigate('/bookings')}
              className="flex items-center gap-4 px-5 py-3.5
                         hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Avatar
                name={b.full_name}
                size="sm"
                rounded="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {b.full_name || 'Guest'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {b.booking_number ? `#${b.booking_number}` : '—'}
                  {b.travel_date && ` · ${formatDate(b.travel_date)}`}
                </p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <Badge status={b.status} label={b.status} size="xs" />
                <span className="text-[10px] text-gray-400">
                  {formatTimeAgo(b.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}