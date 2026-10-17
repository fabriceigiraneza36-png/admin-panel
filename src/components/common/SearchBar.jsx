import React, { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, Loader2, SlidersHorizontal, ChevronDown } from 'lucide-react'

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search…',
  loading     = false,
  className   = '',
  size        = 'md',
}) {
  const inputRef = useRef(null)

  const sizes = {
    sm: 'py-1.5 text-xs',
    md: 'py-2.5 text-sm',
    lg: 'py-3 text-base',
  }

  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
        {loading
          ? <Loader2 size={16} className="text-primary-500 animate-spin" />
          : <Search size={16} className="text-slate-400" />
        }
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input w-full pl-10 pr-9 ${sizes[size] || sizes.md} ${value ? 'border-primary-300 ring-2 ring-primary-100' : ''}`}
      />
      {value && (
        <button type="button" onClick={() => { onClear?.(); onChange(''); inputRef.current?.focus() }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150">
          <X size={15} />
        </button>
      )}
    </div>
  )
}

/* Shared compact filter experience used throughout the admin. */
export function FilterBar({ children, className = '' }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 })
  const [expandedFilter, setExpandedFilter] = useState('')
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const items = React.Children.toArray(children).filter(Boolean)
  const searchIndex = items.findIndex(child => child.type === SearchBar)
  const search = searchIndex >= 0 ? items[searchIndex] : null
  const filters = items.filter((child, index) => index !== searchIndex)
  const filterGroups = filters.map((child, index) => ({
    key: String(child?.props?.label || child?.props?.name || `Filter ${index + 1}`),
    child,
  }))
  const activeCount = filters.reduce((count, child) => {
    const value = child?.props?.value
    if (value === undefined || value === null || value === '') return count
    const options = child?.props?.options || []
    const firstValue = options[0]?.value
    return value === firstValue ? count : count + 1
  }, 0)

  const updatePosition = () => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const width = Math.min(420, Math.max(0, window.innerWidth - 24))
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
    const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - 180))
    setPosition({ top, left, width, maxHeight: Math.max(160, window.innerHeight - top - 12) })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const reposition = () => updatePosition()
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false) }
    const closeOnOutside = event => {
      if (!panelRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false)
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutside)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutside)
    }
  }, [open])

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 ${className}`}>
      {search && <div className="w-full min-w-0 flex-1">{search}</div>}
      {filters.length > 0 && (
        <div className="relative shrink-0 w-full sm:w-auto">
          <button ref={buttonRef} type="button" aria-expanded={open} aria-haspopup="dialog"
            onClick={() => setOpen(value => !value)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <SlidersHorizontal size={16} className="text-emerald-600"/>
            <span>Filters</span>
            {activeCount > 0 && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs">{activeCount}</span>}
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
          </button>
          {createPortal(
            <AnimatePresence>
              {open && (
                <motion.div ref={panelRef} role="dialog" aria-modal="false" aria-label="Filter results"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.985 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="fixed z-[1200] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl space-y-3 origin-top"
                  style={{
                    top: position.top,
                    left: position.left,
                    width: position.width,
                    maxHeight: position.maxHeight || 'calc(100dvh - 24px)',
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                  }}>
                  <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-1 pb-3">
                    <div><p className="text-base font-bold text-slate-900">Filter results</p><p className="text-xs text-slate-500">Choose a category to reveal its options</p></div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Done</button>
                  </div>
                  <div className="space-y-2">
                    {filterGroups.map(({ key, child }, index) => {
                      const value = child?.props?.value
                      const options = child?.props?.options || []
                      const active = value !== undefined && value !== null && value !== '' && value !== options[0]?.value
                      const expanded = expandedFilter === key
                      return (
                        <section key={key + index} className="overflow-hidden rounded-xl border border-slate-200">
                          <button type="button" aria-expanded={expanded}
                            onClick={() => setExpandedFilter(current => current === key ? '' : key)}
                            className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-700">{key}</span>
                              {active && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Selected</span>}
                            </span>
                            <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}/>
                          </button>
                          <AnimatePresence initial={false}>
                            {expanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.16 }} className="overflow-hidden">
                                <div className="border-t border-slate-100 bg-slate-50/60 p-3 [&>label]:w-full [&>label>select]:w-full">
                                  {child}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </section>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
      )}
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options = [], className = '' }) {
  return (
    <label className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 ${className}`}>
      {label && <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="input w-full sm:w-auto py-2 text-sm min-w-0 sm:min-w-[130px] max-w-full cursor-pointer">
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  )
}
