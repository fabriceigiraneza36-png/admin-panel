import React from 'react'
import {
  ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { PAGE_SIZE_OPTIONS } from '@utils/constants'

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onGoTo,
  onPageSizeChange,
  showPageSize = true,
}) {
  if (!total && total !== 0) return null

  /* Build page number array */
  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = []
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '…', totalPages)
    } else if (page >= totalPages - 3) {
      pages.push(1, '…',
        totalPages - 4, totalPages - 3,
        totalPages - 2, totalPages - 1, totalPages,
      )
    } else {
      pages.push(1, '…', page - 1, page, page + 1, '…', totalPages)
    }
    return pages
  }

  const pageNums = getPages()
  const start = (page - 1) * limit + 1
  const end   = Math.min(page * limit, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between
                    gap-4 px-2 py-3">

      {/* Results count */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-700">{start}–{end}</span>
          {' '}of <span className="font-semibold text-slate-700">{total}</span> results
        </span>

        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Per page:</span>
            <select
              value={limit}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="input py-1 px-2 text-xs w-16 cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          onClick={() => onGoTo?.(1)}
          disabled={!hasPrev}
          className="btn-icon text-slate-400 hover:text-primary-600
                     hover:bg-primary-50 disabled:opacity-30
                     disabled:cursor-not-allowed transition-all"
          title="First page"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="btn-icon text-slate-400 hover:text-primary-600
                     hover:bg-primary-50 disabled:opacity-30
                     disabled:cursor-not-allowed transition-all"
          title="Previous"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-0.5">
          {pageNums.map((num, i) =>
            num === '…' ? (
              <span
                key={`ellipsis-${i}`}
                className="w-8 text-center text-slate-400 text-sm select-none"
              >
                ⋯
              </span>
            ) : (
              <button
                key={num}
                onClick={() => onGoTo?.(num)}
                className={`
                  min-w-[32px] h-8 px-1 rounded-lg text-sm font-semibold
                  transition-all duration-150
                  ${num === page
                    ? 'bg-primary-600 text-white shadow-green'
                    : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700'
                  }
                `}
              >
                {num}
              </button>
            ),
          )}
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="btn-icon text-slate-400 hover:text-primary-600
                     hover:bg-primary-50 disabled:opacity-30
                     disabled:cursor-not-allowed transition-all"
          title="Next"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last */}
        <button
          onClick={() => onGoTo?.(totalPages)}
          disabled={!hasNext}
          className="btn-icon text-slate-400 hover:text-primary-600
                     hover:bg-primary-50 disabled:opacity-30
                     disabled:cursor-not-allowed transition-all"
          title="Last page"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  )
}