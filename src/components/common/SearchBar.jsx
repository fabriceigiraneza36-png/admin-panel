import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

/* Shared filter experience used by admin pages. Keep rendering in one
   portal so the dialog is not clipped by tables, cards, or page overflow. */
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

    // Move keyboard focus into the dialog and keep it trapped while open.
    requestAnimationFrame(() => {
      const firstControl = panelRef.current?.querySelector('select, input, button, textarea, [tabindex]:not([tabindex="-1"])')
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
          {typeof document !== 'undefined' && createPortal(
            open ? (
              <div
                className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"
                style={{
                  position: 'fixed',
                  inset: 0,
                  width: '100%',
                  height: '100dvh',
                  minHeight: '100vh',
                  boxSizing: 'border-box',
                  zIndex: 2147483000,
                  isolation: 'isolate',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflowY: 'auto',
                  padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))',
                  backgroundColor: 'rgba(15, 23, 42, 0.52)',
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  animation: 'adminFadeIn .16s ease-out both',
                }}
                onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}
              >
                <section
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-filter-dialog-title"
                  tabIndex={-1}
                  className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: '0 1 auto',
                    width: 'min(100%, 48rem)',
                    maxHeight: 'calc(100dvh - max(24px, env(safe-area-inset-top) + env(safe-area-inset-bottom)))',
                    minHeight: 0,
                    margin: 'auto',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    opacity: 1,
                    filter: 'none',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    animation: 'adminModalIn .22s cubic-bezier(.2,.8,.2,1) both',
                  }}
                  onMouseDown={event => event.stopPropagation()}
                >
                  <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <SlidersHorizontal size={19}/>
                      </span>
                      <div className="min-w-0">
                        <h2 id="admin-filter-dialog-title" className="text-base font-extrabold leading-6 text-slate-900 sm:text-lg">Refine results</h2>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                          {filters.length} {filters.length === 1 ? 'filter' : 'filters'} available
                          {activeCount ? ` · ${activeCount} active` : ' · No filters applied'}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Close filters"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <X size={18}/>
                    </button>
                  </header>

                  <div
                    className="scrollbar-premium min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
                    style={{ minHeight: 0, flex: '1 1 auto', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                  >
                    {filters.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        {filterGroups.map(({ key, child }, index) => {
                          const value = child?.props?.value
                          const options = child?.props?.options || []
                          const active = value !== undefined && value !== null && value !== '' && value !== options[0]?.value
                          const selected = options.find(option => String(option.value) === String(value))
                          const meta = getFilterMeta(key)
                          const FilterIcon = meta.icon
                          return (
                            <section key={key + index} className={`min-w-0 rounded-2xl border p-4 transition-colors ${active ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
                              <div className="mb-3 flex items-start gap-2.5">
                                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600'}`}>
                                  <FilterIcon size={17}/>
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-800">{key}</p>
                                  <p className="mt-0.5 text-xs leading-4 text-slate-500">
                                    {active && selected ? `Selected: ${selected.label}` : meta.hint}
                                  </p>
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
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
                        <ListFilter className="mx-auto mb-3 text-slate-400" size={24}/>
                        <p className="text-sm font-semibold text-slate-700">No filters available</p>
                        <p className="mt-1 text-xs text-slate-500">This page does not currently have any additional filters.</p>
                      </div>
                    )}
                  </div>

                  <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="text-xs text-slate-500">
                      {activeCount > 0 ? <span><strong className="text-emerald-700">{activeCount}</strong> active {activeCount === 1 ? 'filter' : 'filters'}</span> : 'Adjust the options above to narrow your results.'}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {activeCount > 0 && (
                        <button type="button" onClick={clearFilters}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
                          <RotateCcw size={14}/> Clear all
                        </button>
                      )}
                      <button type="button" onClick={() => setOpen(false)}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                        Apply filters
                      </button>
                    </div>
                  </footer>
                </section>
              </div>
            ) : null,
            document.body
          )}
        </div>
      )}
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options = [], className = '' }) {
  return (
    <label className={`flex w-full min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2 ${className}`}>
      {label && <span className="text-xs font-semibold text-slate-500 sm:whitespace-nowrap">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="input w-full min-w-0 cursor-pointer py-2 text-sm sm:flex-1">
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  )
}
