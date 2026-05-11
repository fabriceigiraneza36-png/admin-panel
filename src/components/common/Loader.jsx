import React from 'react'

export default function Loader({ fullScreen = false, size = 'md', text = '' }) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
    xl: 'w-16 h-16 border-4',
  }

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`
          ${sizeMap[size] || sizeMap.md}
          rounded-full animate-spin
        `}
        style={{
          borderColor:      '#d1fae5',
          borderTopColor:   '#059669',
        }}
      />
      {text && (
        <p className="text-sm font-semibold text-gray-500 animate-pulse">
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      >
        <div className="flex flex-col items-center gap-5">
          {/* Logo mark */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center
                       justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-9 h-9 text-white fill-current"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            </svg>
          </div>

          {/* Spinner */}
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{
              borderColor:    '#d1fae5',
              borderTopColor: '#059669',
            }}
          />

          <div className="text-center">
            <p className="text-sm font-bold text-gray-800 tracking-wide">
              Altuvera Admin
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Loading your dashboard…
            </p>
          </div>
        </div>
      </div>
    )
  }

  return spinner
}

/* ── Skeleton variants ── */
export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded-lg animate-pulse bg-gray-100"
            style={{ width: `${55 + (i * 12) % 35}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="h-4 w-3/4 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-3 w-1/2 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-emerald-50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-3 w-16 bg-emerald-100 rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}