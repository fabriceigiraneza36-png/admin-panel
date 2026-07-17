import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown } from 'lucide-react'
import { SkeletonTable } from './Loader'

/**
 * Coerce any cell value into something React can render.
 * React error #310 ("Objects are not valid as a React child") is thrown when a
 * raw object/array/naked Promise reaches the DOM. Data APIs occasionally return
 * nested objects for fields we expect to be scalar, so we stringify defensively
 * instead of crashing the whole page.
 */
function sanitizeCell(value) {
  if (value === null || value === undefined) return '—'
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'function') return '—'
  try {
    if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Run a column's render fn and guarantee a renderable result.
 * If the render returns a raw object/array (not a React node), coerce it to a
 * string instead of letting React throw error #310.
 */
function safeRender(render, value, row, idx, isHovered) {
  const out = render(value, row, idx, isHovered)
  if (out === null || out === undefined) return '—'
  if (React.isValidElement(out) || typeof out === 'string' || typeof out === 'number' || typeof out === 'boolean') {
    return out
  }
  return sanitizeCell(out)
}

export default function Table({
  columns,
  data         = [],
  loading      = false,
  emptyMessage = 'No records found',
  emptyIcon,
  sortBy,
  sortOrder,
  onSort,
  rowKey       = 'id',
  onRowClick,
  stickyHeader = false,
  compact      = false,
  hoverActions,
  title,
  subtitle,
  toolbar,
}) {
  const [hoveredRow, setHoveredRow] = useState(null)

  const hasHoverActions = hoverActions && hoverActions.length > 0

  // NOTE: All hooks MUST run before any early return, otherwise the hook order
  // changes between renders (loading → loaded) and React throws error #310.
  const effectiveColumns = useMemo(() => {
    if (!hasHoverActions) return columns
    const actionsCol = {
      key: '__hover_actions__',
      label: '',
      align: 'right',
      width: hoverActions.length > 2 ? '140px' : '110px',
      render: (_, row, idx, isHovered) => (
        <div className="flex items-center justify-end gap-1">
          {hoverActions.map((action, i) => {
            const Icon = action.icon
            const isVisible = isHovered || action.alwaysVisible
            if (!isVisible) return <span key={i} className="w-8 inline-block" />
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); action.onClick?.(row) }}
                title={action.label}
                disabled={action.disabled?.(row)}
                className={`
                  inline-flex items-center justify-center w-8 h-8 rounded-lg
                  text-xs transition-all duration-150 cursor-pointer
                  ${action.variant === 'danger' ? 'text-red-500 hover:text-red-700 hover:bg-red-50' :
                    action.variant === 'success' ? 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50' :
                    action.variant === 'warning' ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' :
                    'text-slate-400 hover:text-primary-600 hover:bg-primary-50'}
                  ${action.disabled?.(row) ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110'}
                `}
              >
                {Icon && <Icon size={14} strokeWidth={2} />}
              </button>
            )
          })}
        </div>
      ),
      mobile: true,
      className: 'pr-4',
    }
    return [...columns, actionsCol]
  }, [columns, hoverActions, hasHoverActions])

  const handleSort = (col) => {
    if (!onSort || !col.sortable) return
    const newOrder =
      sortBy === col.key && sortOrder === 'asc' ? 'desc' : 'asc'
    onSort(col.key, newOrder)
  }

  const SortIcon = ({ colKey }) => {
    if (sortBy !== colKey) return <ChevronsUpDown size={13} className="text-slate-300" />
    return sortOrder === 'asc'
      ? <ChevronUp   size={13} className="text-primary-600" />
      : <ChevronDown size={13} className="text-primary-600" />
  }

  if (loading) return <SkeletonTable rows={6} cols={columns.length} />

  return (
    <div className="w-full">
      {(title || subtitle || toolbar) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
              <tr>
                {effectiveColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`
                      px-4 py-3.5 text-left text-xs font-bold text-primary-800
                      uppercase tracking-wider whitespace-nowrap bg-primary-50/80
                      ${col.sortable && onSort
                        ? 'cursor-pointer select-none hover:bg-primary-100/60 transition-colors'
                        : ''
                      }
                      ${col.align === 'right'  ? 'text-right'  : ''}
                      ${col.align === 'center' ? 'text-center' : ''}
                    `}
                    onClick={() => col.sortable && handleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && onSort && <SortIcon colKey={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={effectiveColumns.length}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-surface-100
                                      flex items-center justify-center">
                        {emptyIcon || <ArrowUpDown size={22} className="text-slate-300" />}
                      </div>
                      <p className="text-slate-400 text-sm font-medium">
                        {emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const rowKeyVal = row[rowKey] ?? idx
                  const isHovered = hoveredRow === rowKeyVal

                  return (
                    <tr
                      key={rowKeyVal}
                      onClick={() => onRowClick?.(row)}
                      onMouseEnter={() => setHoveredRow(rowKeyVal)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`
                        border-b border-surface-100 last:border-0
                        transition-all duration-200
                        ${onRowClick
                          ? 'cursor-pointer hover:bg-primary-50/40'
                          : 'hover:bg-surface-50/60'
                        }
                        ${isHovered ? 'bg-primary-50/30' : ''}
                      `}
                    >
                      {effectiveColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`
                            relative
                            ${compact ? 'px-4 py-2.5' : 'px-4 py-3.5'}
                            text-slate-700 whitespace-nowrap
                            ${col.align === 'right'  ? 'text-right'  : ''}
                            ${col.align === 'center' ? 'text-center' : ''}
                            ${col.className || ''}
                          `}
                        >
                          {col.render
                            ? safeRender(col.render, row[col.key], row, idx, isHovered)
                            : sanitizeCell(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card view */}
      {data.length > 0 && (
        <div className="md:hidden mt-4 space-y-3">
          {data.map((row, idx) => {
            const rowKeyVal = row[rowKey] ?? idx
            return (
              <div
                key={rowKeyVal}
                onClick={() => onRowClick?.(row)}
                className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm"
              >
                {effectiveColumns.filter(col => col.key !== '__hover_actions__' && col.mobile !== false).map((col) => (
                  <div key={col.key} className="flex justify-between items-start py-2 border-b border-surface-100 last:border-0">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {col.label}
                    </span>
                     <span className="text-sm text-slate-800 text-right max-w-[60%]">
                       {col.render
                         ? safeRender(col.render, row[col.key], row, idx, true)
                         : sanitizeCell(row[col.key])}
                     </span>
                  </div>
                ))}
                {hasHoverActions && (
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-surface-100">
                    {hoverActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); action.onClick?.(row) }}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                          text-xs font-semibold transition-all duration-150
                          ${action.variant === 'danger' ? 'bg-red-50 text-red-700 hover:bg-red-100' :
                            action.variant === 'success' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                            action.variant === 'warning' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' :
                            'bg-surface-100 text-slate-700 hover:bg-surface-200'}
                        `}
                      >
                        {action.icon && <action.icon size={13} />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Actions cell helper (legacy — still supported) ── */
export function TableActions({ children }) {
  return (
    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}

/* ── Icon action button (legacy — still supported) ── */
export function TableAction({ icon: Icon, label, onClick, variant = 'default', disabled }) {
  const variants = {
    default: 'text-slate-500 hover:text-primary-600 hover:bg-primary-50',
    danger:  'text-slate-500 hover:text-red-600 hover:bg-red-50',
    success: 'text-slate-500 hover:text-green-600 hover:bg-green-50',
    warning: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        btn-icon text-xs transition-all duration-150
        focus:ring-1 focus:ring-offset-1
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant] || variants.default}
      `}
    >
      <Icon size={15} strokeWidth={2} />
    </button>
  )
}
