// admin/src/pages/Maintenance.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE — Data Purge Dashboard v1.0
// ═══════════════════════════════════════════════════════════════════════════════
// Unified hub for seeing what's cluttering your database and purging it cleanly.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Trash2, Database, AlertTriangle, Zap } from 'lucide-react'
import { maintenanceAPI } from '@api/maintenance'
import ConfirmDialog from '@components/common/ConfirmDialog'
import { useToast } from '@hooks/useToast'

export default function Maintenance () {
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [catsLoading, setCatsLoading] = useState(false)
  const [purging, setPurging] = useState(false)
  const [purgeTarget, setPurgeTarget] = useState(null)
  const [purgeConfirm, setPurgeConfirm] = useState('')

  const refreshCategories = useCallback(async () => {
    setCatsLoading(true)
    try {
      const { data } = await maintenanceAPI.listCategories()
      setCategories(data.data || [])
    } catch (e) {
      toast.error(e.message || 'Failed to load categories')
    } finally {
      setCatsLoading(false)
    }
  }, [toast])

  useEffect(() => { refreshCategories() }, [refreshCategories])

  const openPurge = useCallback((cat) => {
    setPurgeTarget(cat)
    setPurgeConfirm('')
  }, [])

  const closePurge = useCallback(() => {
    setPurgeTarget(null)
    setPurgeConfirm('')
  }, [])

  const handlePurge = useCallback(async () => {
    if (!purgeTarget || purgeConfirm !== 'DELETE_ALL') return
    setPurging(true)
    try {
      const { data } = await maintenanceAPI.purgeCategory(purgeTarget, 'DELETE_ALL')
      toast.success(data.message || 'Purged successfully')
      closePurge()
      await refreshCategories()
    } catch (e) {
      toast.error(e.message || 'Purge failed')
    } finally {
      setPurging(false)
    }
  }, [purgeTarget, purgeConfirm, toast, closePurge, refreshCategories])

  const totalRecords = categories.reduce((s, c) => s + (c.totalRecords || 0), 0)

  return (
    <div className="space-y-5 sm:space-y-6 page-enter max-w-6xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Database size={28} className="text-primary-600" />
            Database Maintenance
          </h1>
          <p className="page-subtitle">
            Inspect storage usage and purge stale or accumulated records safely.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalRecords > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full">
              <Zap size={12} />
              {totalRecords.toLocaleString()} records tracked
            </span>
          )}
          <button onClick={refreshCategories} disabled={catsLoading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={catsLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="card p-4 sm:p-6 bg-gradient-to-br from-red-50 to-white border-red-100">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Potentially destructive action</h3>
            <p className="text-xs text-red-600 mt-1 leading-relaxed">
              Purging a category deletes <strong>every record</strong> in all associated tables permanently.
              This cannot be undone. Use with caution, ideally on a staging environment first.
            </p>
          </div>
        </div>
      </div>

      {catsLoading && categories.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-24 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.category}
              category={cat}
              onPurge={() => openPurge(cat.category)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!purgeTarget}
        onClose={closePurge}
        onConfirm={handlePurge}
        type="delete"
        title={`Purge "${purgeTarget}"?`}
        description={
          purgeTarget
            ? `This will permanently delete ALL records in every table under "${purgeTarget}". This cannot be undone.`
            : ''
        }
        confirmLabel="Purge All"
        loading={purging}
      />
    </div>
  )
}

function CategoryCard ({ category, onPurge }) {
  const { category: cat, tables, totalRecords } = category
  const isDangerous = totalRecords > 0

  return (
    <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 bg-white transition hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 capitalize">{cat}</h4>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            totalRecords > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {totalRecords.toLocaleString()} record{totalRecords !== 1 ? 's' : ''}
          </span>
        </div>
        {totalRecords > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" title="Has data" />
        )}
      </div>

      <div className="space-y-1">
        {tables.slice(0, 5).map((t) => (
          <div key={t.table} className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-mono truncate">{t.table}</span>
            <span className="text-slate-400 font-semibold ml-2 flex-shrink-0">{t.count}</span>
          </div>
        ))}
        {tables.length > 5 && (
          <p className="text-[11px] text-slate-400">+{tables.length - 5} more table{tables.length - 5 !== 1 ? 's' : ''}</p>
        )}
      </div>

      <button
        onClick={onPurge}
        disabled={!isDangerous}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
          isDangerous
            ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
        }`}
      >
        <Trash2 size={14} />
        {isDangerous ? 'Delete All Records' : 'Already Empty'}
      </button>
    </div>
  )
}
