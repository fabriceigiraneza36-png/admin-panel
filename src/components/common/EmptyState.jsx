import React from 'react'
import { PackageOpen, Search, AlertCircle, Inbox } from 'lucide-react'
import { motion } from 'framer-motion'

const ICONS = {
  empty:   PackageOpen,
  search:  Search,
  error:   AlertCircle,
  inbox:   Inbox,
}

export default function EmptyState({
  type        = 'empty',
  title       = 'Nothing here yet',
  description = '',
  action,
  actionLabel = 'Get Started',
  icon: CustomIcon,
  compact = false,
}) {
  const Icon = CustomIcon || ICONS[type] || ICONS.empty

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Icon size={32} className="text-slate-300" strokeWidth={1.5} />
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-20 text-center px-6"
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-50
                      to-primary-100 flex items-center justify-center
                      shadow-inner">
        <Icon size={36} className="text-primary-400" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* CTA */}
      {action && (
        <button onClick={action} className="btn-primary mt-2">
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}