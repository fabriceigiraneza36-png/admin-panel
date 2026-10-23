import React, { useMemo, useState, useRef, useEffect } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Download,
  X,
} from 'lucide-react'
import { SkeletonTable } from './Loader'

/* ──────────────────────────────────────────────────────────
   Safe cell rendering
────────────────────────────────────────────────────────── */
function sanitizeCell(value) {
  if (value === null || value === undefined || value === '') return '—'

  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return String(value)
  if (t === 'function') return '—'

  try {
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
        .join(', ')
    }
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function safeRender(render, value, row, idx, isHovered) {
  const out = render(value, row, idx, isHovered)

  if (out === null || out === undefined) return '—'
  if (
    React.isValidElement(out) ||
    typeof out === 'string' ||
    typeof out === 'number' ||
    typeof out === 'boolean'
  ) {
    return out
  }

  return sanitizeCell(out)
}

function SortIcon({ active, order }) {
  if (!active) return <ChevronsUpDown size={13} className="text-slate-300" />
  return order === 'asc'
    ? <ChevronUp size={13} className="text-primary-600" />
    : <ChevronDown size={13} className="text-primary-600" />
}

function ActionButton({ action, row }) {
  const Icon = action.icon
  const disabled = action.disabled?.(row)

  const variants = {
    default: 'text-slate-500 hover:text-primary-700 hover:bg-primary-50',
    danger: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
    success: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50',
    warning: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50',
  }

  return (
    <button
      type="button"
      title={action.label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) action.onClick?.(row)
      }}
      className={`
        inline-flex items-center justify-center
        h-8 w-8 rounded-lg
        transition-all duration-150
        disabled:opacity-35 disabled:cursor-not-allowed
        ${variants[action.variant] || variants.default}
        ${disabled ? '' : 'hover:scale-105 active:scale-95'}
      `}
    >
      {Icon ? <Icon size={15} strokeWidth={2} /> : null}
    </button>
  )
}

function CellText({ value, align = 'left' }) {
  return (
    <div
      title={typeof value === 'string' ? value : undefined}
      className={`
        block w-full whitespace-normal break-words
        ${align === 'right' ? 'text-right' : ''}
        ${align === 'center' ? 'text-center' : ''}
      `}
    >
      {value}
    </div>
  )
}

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  emptyIcon,
  sortBy,
  sortOrder = 'asc',
  onSort,
  rowKey = 'id',
  onRowClick,
  stickyHeader = false,
  compact = false,
  hoverActions = [],
  title,
  subtitle,
  toolbar,
  className = '',
}) {
  const [hoveredRow, setHoveredRow] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false)
  const holdTimer = useRef(null)
  const longPressTriggered = useRef(false)
  const keyFor = (row, idx) => String(row?.[rowKey] ?? idx)
  const selectedRows = useMemo(() => data.filter((row, idx) => selectedKeys.has(keyFor(row, idx))), [data, selectedKeys, rowKey])
  const allCurrentSelected = data.length > 0 && data.every((row, idx) => selectedKeys.has(keyFor(row, idx)))
  useEffect(() => {
    const validKeys = new Set(data.map((row, idx) => keyFor(row, idx)))
    setSelectedKeys((previous) => {
      const next = new Set([...previous].filter((key) => validKeys.has(key)))
      return next.size === previous.size ? previous : next
    })
  }, [data, rowKey])
  useEffect(() => () => { if (holdTimer.current) window.clearTimeout(holdTimer.current) }, [])
  const toggleSelected = (key) => setSelectedKeys((previous) => {
    const next = new Set(previous)
    if (next.has(String(key))) next.delete(String(key)); else next.add(String(key))
    return next
  })
  const toggleSelectAll = () => {
    setMobileSelectionMode(true)
    setSelectedKeys((previous) => {
      const next = new Set(previous)
      if (allCurrentSelected) data.forEach((row, idx) => next.delete(keyFor(row, idx)))
      else data.forEach((row, idx) => next.add(keyFor(row, idx)))
      return next
    })
  }
  const clearSelection = () => { setSelectedKeys(new Set()); setMobileSelectionMode(false) }
  const exportSelected = () => {
    if (!selectedRows.length) return
    const keys = [...new Set(selectedRows.flatMap((row) => Object.keys(row || {})))]
    const escape = (value) => {
      const raw = value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value))
      return '"' + raw.replace(/"/g, '""') + '"'
    }
    const csv = [keys.map(escape).join(','), ...selectedRows.map((row) => keys.map((key) => escape(row?.[key])).join(','))].join('\\r\\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = 'altuvera-selected-records.csv'; link.click(); URL.revokeObjectURL(url)
  }
  const startLongPress = (rowKeyVal) => {
    longPressTriggered.current = false
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setMobileSelectionMode(true)
      setSelectedKeys((previous) => new Set(previous).add(String(rowKeyVal)))
    }, 480)
  }
  const endLongPress = () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); holdTimer.current = null }

  const hasHoverActions = Array.isArray(hoverActions) && hoverActions.length > 0

  const effectiveColumns = useMemo(() => {
    if (!hasHoverActions) return columns

    return [
      ...columns,
      {
        key: '__actions__',
        label: '',
        width: '132px',
        align: 'right',
        isActions: true,
        mobile: false,
        render: (_, row) => (
          <div className="flex items-center justify-end gap-1">
            {hoverActions.map((action, i) => (
              <ActionButton key={`${action.label || 'action'}-${i}`} action={action} row={row} />
            ))}
          </div>
        ),
      },
    ]
  }, [columns, hasHoverActions, hoverActions])

  const handleSort = (col) => {
    if (!onSort || !col.sortable) return
    const nextOrder = sortBy === col.key && sortOrder === 'asc' ? 'desc' : 'asc'
    onSort(col.key, nextOrder)
  }

  if (loading) {
    return <SkeletonTable rows={6} cols={Math.max(columns.length, 1)} />
  }

  return (
    <div className={`w-full ${className}`}>
      {(title || subtitle || toolbar) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {data.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm" aria-label="Bulk selection actions">
          <button type="button" onClick={toggleSelectAll} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            {allCurrentSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            {allCurrentSelected ? 'Deselect all on page' : 'Select all on page'}
          </button>
          <span className="text-xs font-semibold text-slate-500" aria-live="polite">{selectedKeys.size} selected</span>
          {selectedKeys.size > 0 && <>
            <button type="button" onClick={exportSelected} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Download size={14} /> Export selected</button>
            <button type="button" onClick={clearSelection} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><X size={14} /> Clear</button>
          </>}
          <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">Mobile: touch and hold a card to select it</span>
        </div>
      )}
      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full min-w-full table-fixed text-sm">
              <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
                <tr className="border-b border-slate-200 bg-slate-50/90 backdrop-blur">
                  <th className="w-12 px-3 py-3 text-center"><input type="checkbox" aria-label={allCurrentSelected ? 'Deselect all rows on this page' : 'Select all rows on this page'} checked={allCurrentSelected} onChange={toggleSelectAll} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" /></th>
                  {effectiveColumns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      onClick={() => handleSort(col)}
                      className={`
                        px-4 ${compact ? 'py-3' : 'py-3.5'}
                        text-xs font-bold uppercase tracking-wider text-slate-600
                        ${col.align === 'right' ? 'text-right' : 'text-left'}
                        ${col.align === 'center' ? 'text-center' : ''}
                        ${col.sortable && onSort ? 'cursor-pointer select-none hover:bg-slate-100/80' : ''}
                      `}
                    >
                      <span
                        className={`
                          inline-flex items-center gap-1.5
                          ${col.align === 'right' ? 'justify-end w-full' : ''}
                          ${col.align === 'center' ? 'justify-center w-full' : ''}
                        `}
                      >
                        {col.label}
                        {col.sortable && onSort && (
                          <SortIcon active={sortBy === col.key} order={sortOrder} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={effectiveColumns.length + 1} className="px-4 py-16">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                          {emptyIcon || <ArrowUpDown size={22} className="text-slate-300" />}
                        </div>
                        <p className="text-sm font-medium text-slate-400">{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => {
                    const rowKeyVal = row?.[rowKey] ?? idx
                    const isHovered = hoveredRow === rowKeyVal

                    return (
                      <tr
                        key={rowKeyVal}
                        onClick={() => onRowClick?.(row)}
                        onMouseEnter={() => setHoveredRow(rowKeyVal)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className={`
                          group border-b border-slate-100 transition-colors duration-150 last:border-b-0
                          ${onRowClick ? 'cursor-pointer hover:bg-primary-50/40' : 'hover:bg-slate-50/70'}
                          ${isHovered ? 'bg-primary-50/20' : ''}
                        `}
                      >
                        <td className="w-12 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={'Select row ' + rowKeyVal} checked={selectedKeys.has(String(rowKeyVal))} onChange={() => toggleSelected(rowKeyVal)} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" /></td>
                        {effectiveColumns.map((col) => {
                          const isActionsCol = col.isActions || col.key === '__actions__'
                          const rawValue = row?.[col.key]
                          const rendered = col.render
                            ? safeRender(col.render, rawValue, row, idx, isHovered)
                            : sanitizeCell(rawValue)

                          return (
                            <td
                              key={col.key}
                              className={`
                                px-4 ${compact ? 'py-2.5' : 'py-3.5'}
                                align-middle text-slate-700
                                ${col.align === 'right' ? 'text-right' : 'text-left'}
                                ${col.align === 'center' ? 'text-center' : ''}
                                ${col.className || ''}
                              `}
                            >
                              {isActionsCol ? (
                                <div
                                  className={`
                                    flex justify-end transition-all duration-150
                                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                                    ${isHovered ? 'pointer-events-auto' : 'pointer-events-none'}
                                    group-focus-within:opacity-100 group-focus-within:pointer-events-auto
                                  `}
                                >
                                  {rendered}
                                </div>
                              ) : React.isValidElement(rendered) ? (
                                <div className="min-w-0">{rendered}</div>
                              ) : (
                                <CellText value={rendered} align={col.align} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-14 shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                {emptyIcon || <ArrowUpDown size={22} className="text-slate-300" />}
              </div>
              <p className="text-sm font-medium text-slate-400">{emptyMessage}</p>
            </div>
          </div>
        ) : (
          data.map((row, idx) => {
            const rowKeyVal = row?.[rowKey] ?? idx

            return (
              <div
                key={rowKeyVal}
                onTouchStart={() => startLongPress(rowKeyVal)}
                onTouchEnd={endLongPress}
                onTouchMove={endLongPress}
                onContextMenu={(e) => { e.preventDefault(); setMobileSelectionMode(true); toggleSelected(rowKeyVal) }}
                onClick={(e) => {
                  if (longPressTriggered.current) { longPressTriggered.current = false; e.preventDefault(); e.stopPropagation(); return }
                  if (mobileSelectionMode) { e.stopPropagation(); toggleSelected(rowKeyVal); return }
                  onRowClick?.(row)
                }}
                className={`
                  overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm
                  ${onRowClick ? 'cursor-pointer active:scale-[0.998]' : ''}
                `}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-slate-400">{mobileSelectionMode ? "Selection mode" : "Touch and hold to select"}</span>
                  {mobileSelectionMode && <label className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-800" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={"Select row " + rowKeyVal} checked={selectedKeys.has(String(rowKeyVal))} onChange={() => toggleSelected(rowKeyVal)} className="h-4 w-4 accent-emerald-700" />Select</label>}
                </div>
                <div className="space-y-3">
                  {columns.filter((col) => col.mobile !== false).map((col) => {
                    const rawValue = row?.[col.key]
                    const rendered = col.render
                      ? safeRender(col.render, rawValue, row, idx, true)
                      : sanitizeCell(rawValue)

                    return (
                      <div
                        key={col.key}
                        className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                      >
                        <span className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {col.label}
                        </span>

                        <div className="min-w-0 max-w-[62%] text-right text-sm text-slate-800">
                          {React.isValidElement(rendered) ? (
                            rendered
                          ) : (
                            <div
                              title={typeof rendered === 'string' ? rendered : undefined}
                              className="whitespace-normal break-words"
                            >
                              {rendered}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {hasHoverActions && (
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {hoverActions.map((action, i) => {
                      const Icon = action.icon
                      const disabled = action.disabled?.(row)

                      const variants = {
                        default: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                        danger: 'bg-red-50 text-red-700 hover:bg-red-100',
                        success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                        warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                      }

                      return (
                        <button
                          key={`${action.label || 'action'}-${i}`}
                          type="button"
                          disabled={disabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!disabled) action.onClick?.(row)
                          }}
                          className={`
                            inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all
                            disabled:opacity-40 disabled:cursor-not-allowed
                            ${variants[action.variant] || variants.default}
                          `}
                        >
                          {Icon ? <Icon size={13} /> : null}
                          {action.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ── Legacy helpers ───────────────────────────────────────── */
export function TableActions({ children }) {
  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function TableAction({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}) {
  const variants = {
    default: 'text-slate-500 hover:text-primary-700 hover:bg-primary-50',
    danger: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
    success: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50',
    warning: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50',
  }

  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant] || variants.default}
      `}
    >
      {Icon ? <Icon size={15} strokeWidth={2} /> : null}
    </button>
  )
}

/* ── Optional ready-made actions example ──────────────────── */
export const defaultRowActions = ({ onEdit, onDelete, onMore }) => ([
  { label: 'Edit', icon: Pencil, onClick: onEdit },
  { label: 'Delete', icon: Trash2, variant: 'danger', onClick: onDelete },
  { label: 'More', icon: MoreHorizontal, onClick: onMore },
])