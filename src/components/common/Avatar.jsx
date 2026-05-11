import React, { useState } from 'react'
import { getInitials, getAvatarColor } from '@utils/formatters'

const SIZES = {
  xs:  { box: 'w-6 h-6',   text: 'text-[10px]', icon: 12 },
  sm:  { box: 'w-8 h-8',   text: 'text-xs',      icon: 14 },
  md:  { box: 'w-10 h-10', text: 'text-sm',       icon: 18 },
  lg:  { box: 'w-12 h-12', text: 'text-base',     icon: 22 },
  xl:  { box: 'w-16 h-16', text: 'text-xl',       icon: 28 },
  '2xl': { box: 'w-20 h-20', text: 'text-2xl',    icon: 32 },
}

const ROUNDS = {
  sm:   'rounded-lg',
  md:   'rounded-xl',
  lg:   'rounded-2xl',
  full: 'rounded-full',
}

export default function Avatar({
  src,
  name,
  size      = 'md',
  rounded   = 'md',
  className = '',
  online,
}) {
  const [imgError, setImgError] = useState(false)
  const s = SIZES[size] || SIZES.md
  const r = ROUNDS[rounded] || ROUNDS.md
  const bg = getAvatarColor(name || '')
  const initials = getInitials(name || '')

  const showImage = src && !imgError

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`
          ${s.box} ${r} flex items-center justify-center
          overflow-hidden flex-shrink-0
          ${showImage ? '' : `${bg} text-white`}
        `}
      >
        {showImage ? (
          <img
            src={src}
            alt={name || ''}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={`${s.text} font-bold select-none`}>
            {initials}
          </span>
        )}
      </div>

      {/* Online indicator */}
      {online !== undefined && (
        <span
          className={`
            absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full
            border-2 border-white
            ${online ? 'bg-green-500' : 'bg-slate-400'}
          `}
        />
      )}
    </div>
  )
}

/* ── Avatar group ── */
export function AvatarGroup({ items = [], max = 4, size = 'sm' }) {
  const shown = items.slice(0, max)
  const rest  = items.length - max

  return (
    <div className="flex -space-x-2">
      {shown.map((item, i) => (
        <Avatar
          key={i}
          src={item.src || item.avatar_url || item.image_url}
          name={item.name || item.full_name}
          size={size}
          rounded="full"
          className="ring-2 ring-white"
        />
      ))}
      {rest > 0 && (
        <div className={`
          ${SIZES[size]?.box || 'w-8 h-8'}
          rounded-full ring-2 ring-white
          bg-primary-100 text-primary-700
          flex items-center justify-center
          text-[10px] font-bold
        `}>
          +{rest}
        </div>
      )}
    </div>
  )
}