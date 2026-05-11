import React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown } from 'lucide-react'
import { SkeletonTable } from './Loader'

export default function Table({
  columns,
  data         = [],
  loading      = false,
  emptyMessage = 'No records found',
  sortBy,
  sortOrder,
  onSort,
  rowKey       = 'id',
  onRowClick,
  stickyHeader = false,
  compact      = false,
}) {
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
    <div className="table-container">
      <table className="table w-full text-sm">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`
                  px-4 py-3 text-left text-xs font-bold text-primary-800
                  uppercase tracking-wider whitespace-nowrap
                  ${col.sortable && onSort
                    ? 'cursor-pointer select-none hover:bg-primary-100/50'
                    : ''
                  }
                  ${col.align === 'right'  ? 'text-right'  : ''}
                  ${col.align === 'center' ? 'text-center' : ''}
                `}
                onClick={() => col.sortable && handleSort(col)}
              >
                <span className="inline-flex items-center gap-1">
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
                colSpan={columns.length}
                className="px-4 py-16 text-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-surface-100
                                  flex items-center justify-center">
                    <ArrowUpDown size={22} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">
                    {emptyMessage}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row[rowKey] ?? idx}
                onClick={() => onRowClick?.(row)}
                className={`
                  border-b border-surface-100 last:border-0
                  transition-colors duration-150
                  ${onRowClick
                    ? 'cursor-pointer hover:bg-primary-50/60'
                    : 'hover:bg-surface-50/60'
                  }
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`
                      ${compact ? 'px-4 py-2' : 'px-4 py-3'}
                      text-slate-700 whitespace-nowrap
                      ${col.align === 'right'  ? 'text-right'  : ''}
                      ${col.align === 'center' ? 'text-center' : ''}
                      ${col.className || ''}
                    `}
                  >
                    {col.render
                      ? col.render(row[col.key], row, idx)
                      : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ── Actions cell helper ── */
export function TableActions({ children }) {
  return (
    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}

/* ── Icon action button ── */
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