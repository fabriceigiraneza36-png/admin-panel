import React, { useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

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
    <div className={`relative flex-1 ${className}`}>
      {/* Left icon */}
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
        {loading
          ? <Loader2 size={16} className="text-primary-500 animate-spin" />
          : <Search  size={16} className="text-slate-400" />
        }
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          input pl-10 pr-9 ${sizes[size] || sizes.md}
          ${value ? 'border-primary-300 ring-2 ring-primary-100' : ''}
        `}
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => { onClear?.(); onChange(''); inputRef.current?.focus() }}
          className="absolute right-3 top-1/2 -translate-y-1/2
                     text-slate-400 hover:text-slate-600
                     transition-colors duration-150"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}

/* ── Filter bar wrapper ── */
export function FilterBar({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {children}
    </div>
  )
}

/* ── Select filter ── */
export function FilterSelect({ label, value, onChange, options, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
          {label}:
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input py-2 text-sm min-w-[130px] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}