import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export default function Dropdown({
  options       = [],
  value,
  onChange,
  label,
  placeholder   = 'Select…',
  className     = '',
  disabled      = false,
  searchable    = false,
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options

  const select = (opt) => {
    onChange(opt.value)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && <label className="input-label">{label}</label>}

      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`
          input flex items-center justify-between gap-2 cursor-pointer
          text-left w-full
          ${open ? 'border-primary-400 ring-2 ring-primary-100' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${!selected ? 'text-slate-400' : 'text-slate-800'}
        `}
      >
        <span className="truncate">
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`flex-shrink-0 text-slate-400 transition-transform duration-200
                      ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.97, y: -4  }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 z-50
                       bg-white rounded-xl shadow-card-lg border border-surface-200
                       overflow-hidden"
          >
            {/* Search */}
            {searchable && (
              <div className="p-2 border-b border-surface-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="input py-1.5 text-sm"
                  autoFocus
                />
              </div>
            )}

            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400 text-center">
                  No options found
                </p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => select(opt)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5
                      text-sm transition-colors duration-100 text-left
                      ${opt.value === value
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-slate-700 hover:bg-surface-50'
                      }
                    `}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && (
                      <Check size={14} className="text-primary-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}