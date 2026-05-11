import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatCompact } from '@utils/formatters'

const COLOR_MAP = {
  green:  {
    bg:   'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
    bar:  'bg-emerald-500',
  },
  blue:   {
    bg:   'bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    text: 'text-blue-700',
    bar:  'bg-blue-500',
  },
  orange: {
    bg:   'bg-orange-50',
    icon: 'bg-orange-100 text-orange-700',
    text: 'text-orange-700',
    bar:  'bg-orange-500',
  },
  purple: {
    bg:   'bg-purple-50',
    icon: 'bg-purple-100 text-purple-700',
    text: 'text-purple-700',
    bar:  'bg-purple-500',
  },
  red:    {
    bg:   'bg-red-50',
    icon: 'bg-red-100 text-red-700',
    text: 'text-red-700',
    bar:  'bg-red-500',
  },
  teal:   {
    bg:   'bg-teal-50',
    icon: 'bg-teal-100 text-teal-700',
    text: 'text-teal-700',
    bar:  'bg-teal-500',
  },
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  trendLabel = 'vs last month',
  color      = 'green',
  loading    = false,
  onClick,
  subtitle,
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.green

  const TrendIcon =
    trend === 'up'   ? TrendingUp   :
    trend === 'down' ? TrendingDown : Minus

  const trendColorClass =
    trend === 'up'   ? 'text-emerald-700 bg-emerald-50' :
    trend === 'down' ? 'text-red-600 bg-red-50'          :
                       'text-gray-500 bg-gray-50'

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
        <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-5
                  ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-500 uppercase
                        tracking-wider mb-2">
            {title}
          </p>
          <p className="text-2xl font-black text-gray-900 leading-none mb-1">
            {value == null
              ? '—'
              : typeof value === 'number'
              ? formatCompact(value)
              : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1 font-medium">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className={`flex-shrink-0 w-11 h-11 rounded-2xl
                           flex items-center justify-center ${c.icon}`}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>

      {trendValue !== undefined && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5
                            rounded-full text-xs font-bold ${trendColorClass}`}>
            <TrendIcon size={11} />
            {trendValue}%
          </span>
          <span className="text-xs text-gray-400">{trendLabel}</span>
        </div>
      )}
    </motion.div>
  )
}