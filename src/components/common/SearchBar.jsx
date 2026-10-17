import React, { useRef, useState, useEffect } from 'react'
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
  const items = React.Children.toArray(children).filter(Boolean)
  const searchIndex = items.findIndex(child => child.type === SearchBar)
  const search = searchIndex >= 0 ? items[searchIndex] : null
  const filters = items.filter((child, index) => index !== searchIndex)
  const activeCount = filters.reduce((count, child) => {
    const value = child?.props?.value
    if (value === undefined || value === null || value === '') return count
    const options = child?.props?.options || []
    const firstValue = options[0]?.value
    return value === firstValue ? count : count + 1
  }, 0)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <div className={`relative flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 ${className}`}>
      {search && <div className="w-full min-w-0 flex-1">{search}</div>}
      {filters.length > 0 && (
        <div className="relative shrink-0">
          <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors">
            <SlidersHorizontal size={16} className="text-emerald-600"/>
            <span>Filters</span>
            {activeCount > 0 && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs">{activeCount}</span>}
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
          </button>
          {open && (
            <>
              <div role="dialog" aria-modal="false" aria-label="Filter results"
                className="absolute right-0 top-full mt-2 z-[1001] w-[min(92vw,420px)] max-h-[min(75dvh,620px)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl space-y-4"
                style={{paddingBottom:'max(1rem, env(safe-area-inset-bottom))'}}>
                <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-1 pb-3">
                  <div><p className="text-base font-bold text-slate-900">Filter results</p><p className="text-xs text-slate-500">Choose one or more options</p></div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Done</button>
                </div>
                <div className="space-y-3 [&>label]:w-full [&>label>select]:w-full">
                  {filters}
                </div>
              </div>
            </>
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
