import React from 'react'
import { X } from 'lucide-react'

export default function BulkActionsToolbar({
  selectedCount,
  maxSelect,
  onClear,
  onBulkStatus,
  onBulkDelete,
  disabled,
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-bold text-slate-600">
        {selectedCount} selected
        {maxSelect && ` / ${maxSelect}`}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                   border border-slate-200 text-xs font-semibold text-slate-600
                   hover:bg-slate-50 transition"
      >
        <X size={12} /> Clear
      </button>
      <div className="h-5 w-px bg-slate-200 mx-1" />
      <select
        onChange={(e) => {
          if (e.target.value) {
            onBulkStatus(e.target.value)
            e.target.value = ''
          }
        }}
        disabled={disabled}
        defaultValue=""
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold
                   text-slate-700 bg-white hover:border-emerald-400 outline-none
                   focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                   disabled:opacity-40"
      >
        <option value="" disabled>Set status...</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <button
        type="button"
        onClick={onBulkDelete}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
                   border border-rose-200 text-xs font-bold text-rose-600
                   hover:bg-rose-50 transition disabled:opacity-40"
      >
        Delete selected
      </button>
    </div>
  )
}
