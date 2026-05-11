import React from 'react'
import { getStatusStyle, getPriorityStyle } from '@styles/theme'

export default function Badge({ status, label, size = 'sm' }) {
  const style = getStatusStyle(status)

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1',
  }

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-semibold rounded-full
      ${style.bg} ${style.text}
      ${sizes[size] || sizes.sm}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {label || status || '—'}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const style = getPriorityStyle(priority)
  return (
    <span className={`badge text-xs ${style.bg} ${style.text}`}>
      {priority}
    </span>
  )
}

export function BooleanBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }) {
  return (
    <span className={`badge text-xs
      ${value ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}
    >
      {value ? trueLabel : falseLabel}
    </span>
  )
}

export function CountBadge({ count, max = 99 }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5
                     px-1 bg-primary-100 text-primary-700 text-[10px]
                     font-bold rounded-full">
      {count > max ? `${max}+` : count}
    </span>
  )
}