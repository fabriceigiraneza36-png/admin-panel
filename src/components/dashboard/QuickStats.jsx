import React from 'react'
import {
  Globe2, MapPin, CalendarCheck, Users,
  MessageSquare, FileText, Eye, TrendingUp,
} from 'lucide-react'
import StatCard from '@components/common/StatCard'

export default function QuickStats({ stats, loading }) {
  const cards = [
    {
      title:      'Total Countries',
      value:      stats?.countries ?? 0,
      icon:       Globe2,
      color:      'green',
      trend:      'up',
      trendValue: 12,
    },
    {
      title:      'Destinations',
      value:      stats?.destinations ?? 0,
      icon:       MapPin,
      color:      'blue',
      trend:      'up',
      trendValue: 8,
    },
    {
      title:      'Active Bookings',
      value:      stats?.bookings ?? 0,
      icon:       CalendarCheck,
      color:      'orange',
      trend:      'up',
      trendValue: 23,
    },
    {
      title:      'Total Users',
      value:      stats?.users ?? 0,
      icon:       Users,
      color:      'purple',
      trend:      'up',
      trendValue: 15,
    },
    {
      title:      'Messages',
      value:      stats?.messages ?? 0,
      icon:       MessageSquare,
      color:      'teal',
      subtitle:   `${stats?.unreadMessages ?? 0} unread`,
    },
    {
      title:      'Blog Posts',
      value:      stats?.posts ?? 0,
      icon:       FileText,
      color:      'green',
      subtitle:   `${stats?.publishedPosts ?? 0} published`,
    },
    {
      title:      'Page Views',
      value:      stats?.totalViews ?? 0,
      icon:       Eye,
      color:      'blue',
      trend:      'up',
      trendValue: 32,
    },
    {
      title:      'Subscribers',
      value:      stats?.subscribers ?? 0,
      icon:       TrendingUp,
      color:      'orange',
      trend:      'up',
      trendValue: 5,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} loading={loading} />
      ))}
    </div>
  )
}