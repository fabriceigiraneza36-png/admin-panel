import React, { useEffect, useState } from 'react'
import {
  CalendarCheck, MessageSquare, Star, User,
  Globe2, MapPin, FileText, Mail, Activity,
} from 'lucide-react'
import { formatTimeAgo } from '@utils/formatters'
import apiClient from '@api/client'

const TYPE_CONFIG = {
  booking:     { Icon: CalendarCheck, bg: 'bg-blue-50',    color: 'text-blue-600'    },
  contact:     { Icon: MessageSquare, bg: 'bg-amber-50',   color: 'text-amber-600'   },
  review:      { Icon: Star,          bg: 'bg-yellow-50',  color: 'text-yellow-600'  },
  user:        { Icon: User,          bg: 'bg-purple-50',  color: 'text-purple-600'  },
  country:     { Icon: Globe2,        bg: 'bg-emerald-50', color: 'text-emerald-600' },
  destination: { Icon: MapPin,        bg: 'bg-teal-50',    color: 'text-teal-600'    },
  post:        { Icon: FileText,      bg: 'bg-indigo-50',  color: 'text-indigo-600'  },
  subscriber:  { Icon: Mail,          bg: 'bg-rose-50',    color: 'text-rose-600'    },
}

export default function ActivityFeed({ activities: propActivities, loading: propLoading }) {
  const [activities, setActivities] = useState(propActivities || [])
  const [loading,    setLoading]    = useState(propLoading ?? true)

  useEffect(() => {
    if (propActivities !== undefined) {
      setActivities(propActivities)
      setLoading(propLoading ?? false)
      return
    }

    /* Build activity from multiple sources */
    const load = async () => {
      setLoading(true)
      try {
        const results = await Promise.allSettled([
          apiClient.get('/bookings', { params: { limit: 5, sortBy: 'created_at', order: 'desc' } }),
          apiClient.get('/contact',  { params: { limit: 5, sortBy: 'created_at', order: 'desc' } }),
          apiClient.get('/users',    { params: { limit: 5, sortBy: 'created_at', order: 'desc' } }),
        ])

        const acts = []

        const bookings  = results[0].value?.data?.data || []
        const messages  = results[1].value?.data?.data || []
        const users     = results[2].value?.data?.data || []

        bookings.forEach((b) => acts.push({
          type:      'booking',
          message:   `${b.full_name || 'Guest'} created booking ${b.booking_number ? `#${b.booking_number}` : ''}`,
          createdAt: b.created_at,
        }))
        messages.forEach((m) => acts.push({
          type:      'contact',
          message:   `${m.full_name || 'Someone'} sent a message: "${String(m.subject || m.message || '').slice(0, 40)}…"`,
          createdAt: m.created_at,
        }))
        users.forEach((u) => acts.push({
          type:      'user',
          message:   `New user registered: ${u.full_name || u.email || 'Unknown'}`,
          createdAt: u.created_at,
        }))

        /* Sort by date newest first */
        acts.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        setActivities(acts.slice(0, 12))
      } catch {
        setActivities([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [propActivities, propLoading])

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="p-5 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex-shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Activity size={14} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Activity Feed</h3>
          <p className="text-xs text-gray-400">
            {activities.length} recent events
          </p>
        </div>
      </div>

      <div className="p-5">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Activity size={28} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No activity yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Events will appear as your platform gets used
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-3 bottom-3 w-0.5
                            bg-gray-100 rounded-full" />

            <div className="space-y-4">
              {activities.map((a, i) => {
                const cfg  = TYPE_CONFIG[a.type] || TYPE_CONFIG.user
                const { Icon } = cfg
                return (
                  <div key={i} className="flex gap-3 relative">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex
                                    items-center justify-center z-10
                                    ${cfg.bg}`}>
                      <Icon size={14} className={cfg.color} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs text-gray-700 leading-snug line-clamp-2">
                        {a.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatTimeAgo(a.createdAt || a.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}