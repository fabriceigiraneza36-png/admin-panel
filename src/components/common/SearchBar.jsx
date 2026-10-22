import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, Loader2, SlidersHorizontal, ChevronDown, MapPin, Tag, Gauge, Star, CalendarDays, UserRound, CircleCheck, Layers3, Flag, ListFilter, RotateCcw } from 'lucide-react'

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
export function FilterBar({ children, className = '', onClear }) {
  const [open, setOpen] = useState(false)
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
  const getFilterMeta = (label = '') => {
    const name = String(label).toLowerCase()
    if (/country|destination|location|region/.test(name)) return { icon: MapPin, hint: 'Narrow results by place' }
    if (/category|type|topic|kind/.test(name)) return { icon: Tag, hint: 'Choose a content category' }
    if (/difficulty|level|priority|rating/.test(name)) return { icon: Gauge, hint: 'Choose the level that fits' }
    if (/featured|popular|highlight/.test(name)) return { icon: Star, hint: 'Show highlighted content' }
    if (/date|period|month|year|time/.test(name)) return { icon: CalendarDays, hint: 'Narrow results by date' }
    if (/user|role|author|owner|customer|guest/.test(name)) return { icon: UserRound, hint: 'Choose who the record belongs to' }
    if (/status|active|published|read|approval/.test(name)) return { icon: CircleCheck, hint: 'Choose a record status' }
    if (/package|product|plan/.test(name)) return { icon: Layers3, hint: 'Narrow the catalogue' }
    if (/language|country code|flag/.test(name)) return { icon: Flag, hint: 'Choose a locale' }
    return { icon: ListFilter, hint: 'Narrow the results' }
  }
  const clearFilters = () => {
    if (onClear) onClear()
    else filters.forEach(child => {
      const options = child?.props?.options || []
      if (typeof child?.props?.onChange === 'function') child.props.onChange(options[0]?.value ?? '')
    })
  }
  const activeCount = filters.reduce((count, child) => {
    const value = child?.props?.value
    if (value === undefined || value === null || value === '') return count
    const options = child?.props?.options || []
    const firstValue = options[0]?.value
    return value === firstValue ? count : count + 1
  }, 0)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'

    // Move keyboard focus into the dialog and keep it there while open.
    requestAnimationFrame(() => {
      const firstControl = panelRef.current?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ;(firstControl || panelRef.current)?.focus?.()
    })

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus()
    }
  }, [open])

  return (
    <div className={`flex flex-row items-center gap-2 sm:gap-3 min-w-0 ${className}`}>
      {search && <div className="w-full min-w-0 flex-1">{search}</div>}
      {filters.length > 0 && (
        <div className="relative shrink-0 w-auto">
          <button ref={buttonRef} type="button" aria-expanded={open} aria-haspopup="dialog"
            onClick={() => setOpen(value => !value)}
            className="w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <SlidersHorizontal size={16} className="text-emerald-600"/>
            <span>Filters</span>
            {activeCount > 0 && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs">{activeCount}</span>}
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
          </button>
          {createPortal(
            <AnimatePresence>
              {open && (
                <motion.div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', minHeight: '100vh', boxSizing: 'border-box', zIndex: 2147483647, isolation: 'isolate', display: 'grid', placeItems: 'center', overflow: 'hidden', padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
                <motion.section ref={panelRef} role="dialog" aria-modal="true" aria-label="Filter results"
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl space-y-3 sm:p-6"
                  tabIndex={-1}
                  style={{ width: 'min(100%, 48rem)', maxHeight: 'calc(100dvh - max(24px, env(safe-area-inset-top) + env(safe-area-inset-bottom)))', margin: 0, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', boxSizing: 'border-box' }}
                  onMouseDown={event => event.stopPropagation()}>
                  <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-1 pb-3">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900">Refine results</p>
                      <p className="mt-0.5 text-xs text-slate-500">{filters.length} {filters.length === 1 ? 'filter' : 'filters'} available{activeCount ? ` · ${activeCount} active` : ' · No filters applied'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {activeCount > 0 && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"><RotateCcw size={13}/>Clear all</button>}
                      <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Apply</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filterGroups.map(({ key, child }, index) => {
                      const value = child?.props?.value
                      const options = child?.props?.options || []
                      const active = value !== undefined && value !== null && value !== '' && value !== options[0]?.value
                      const selected = options.find(option => String(option.value) === String(value))
                      const meta = getFilterMeta(key)
                      const FilterIcon = meta.icon
                      return (
                        <section key={key + index} className={`min-w-0 rounded-xl border p-3.5 transition-colors ${active ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
                          <div className="mb-3 flex items-start gap-2.5">
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><FilterIcon size={17}/></span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-800">{key}</p>
                              <p className="mt-0.5 text-xs leading-4 text-slate-500">{active && selected ? `Selected: ${selected.label}` : meta.hint}</p>
                            </div>
                            {active && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Filter active"/>}
                          </div>
                          <div className="[&>label]:w-full [&>label>select]:w-full [&>label>span]:text-slate-500">
                            {child}
                          </div>
                          {options.length > 0 && <p className="mt-2 text-[11px] text-slate-400">{options.length} {options.length === 1 ? 'option' : 'options'}</p>}
                        </section>
                      )
                    })}
                  </div>
                </motion.section>
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
