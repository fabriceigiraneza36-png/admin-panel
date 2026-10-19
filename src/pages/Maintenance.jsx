// admin/src/pages/Maintenance.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE — Data Purge Dashboard v1.0
// ═══════════════════════════════════════════════════════════════════════════════
// Unified hub for seeing what's cluttering your database and purging it cleanly.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { RefreshCw, Trash2, Database, AlertTriangle, Zap } from 'lucide-react'
import { maintenanceAPI } from '@api/maintenance'
import ConfirmDialog from '@components/common/ConfirmDialog'
import { useToast } from '@hooks/useToast'
import { getErrorMessage } from '@api/client'

export default function Maintenance () {
  const { error: toastError, success: toastSuccess } = useToast()
  const [categories, setCategories] = useState([])
  const [catsLoading, setCatsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [purging, setPurging] = useState(false)
  const [purgeTarget, setPurgeTarget] = useState(null)
  const [purgeConfirm, setPurgeConfirm] = useState('')
  const [purgeJob, setPurgeJob] = useState(null)
  const trackingJobRef = useRef(null)
  const PURGE_JOB_STORAGE_KEY = 'altuvera:maintenance:purge-job'

  const refreshCategories = useCallback(async () => {
    setCatsLoading(true)
    setLoadError('')
    try {
      const { data } = await maintenanceAPI.listCategories()
      setCategories(Array.isArray(data?.data) ? data.data : [])
    } catch (e) {
      const message = getErrorMessage(e)
      setLoadError(message)
      toastError(message || 'Failed to load categories')
    } finally {
      setCatsLoading(false)
    }
  }, [toastError])

  useEffect(() => { refreshCategories() }, [refreshCategories])


  const openPurge = useCallback((cat) => {
    setPurgeTarget(cat)
    setPurgeConfirm('')
    setPurgeJob(null)
  }, [])

  const closePurge = useCallback(() => {
    if (purging) return
    setPurgeTarget(null)
    setPurgeConfirm('')
    setPurgeJob(null)
  }, [purging])

  const trackPurgeJob = useCallback(async (jobId, category) => {
    if (!jobId || trackingJobRef.current === jobId) return
    trackingJobRef.current = jobId
    setPurging(true)
    setPurgeTarget(category)
    let consecutivePollErrors = 0
    try {
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1200))
        try {
          const { data: response } = await maintenanceAPI.getPurgeJob(jobId)
          const job = response?.data
          if (!job) throw new Error('The server returned an empty purge status.')
          setPurgeJob(job)
          consecutivePollErrors = 0

          if (job.status === 'completed') {
            window.localStorage.removeItem(PURGE_JOB_STORAGE_KEY)
            toastSuccess(`Purge completed: ${Number(job.deletedRecords || 0).toLocaleString()} records deleted.`)
            setPurgeTarget(null)
            setPurgeConfirm('')
            setPurgeJob(null)
            await refreshCategories()
            return
          }
          if (job.status === 'failed') {
            window.localStorage.removeItem(PURGE_JOB_STORAGE_KEY)
            toastError(job.error || 'The server reported that the purge failed.')
            return
          }
        } catch (pollError) {
          if (pollError?.response || pollError?.code === 'ERR_NETWORK' || pollError?.code === 'ECONNABORTED') {
            consecutivePollErrors += 1
            if (consecutivePollErrors < 5) continue
          }
          toastError(`${getErrorMessage(pollError)}. Purge job ${jobId} is saved and can be checked again by reopening Maintenance.`)
          return
        }
      }
    } finally {
      trackingJobRef.current = null
      setPurging(false)
    }
  }, [toastError, toastSuccess, refreshCategories])

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PURGE_JOB_STORAGE_KEY) || 'null')
      if (saved?.id && saved?.category) void trackPurgeJob(saved.id, saved.category)
    } catch {
      window.localStorage.removeItem(PURGE_JOB_STORAGE_KEY)
    }
  }, [trackPurgeJob])

  const handlePurge = useCallback(async () => {
    if (!purgeTarget || purgeConfirm !== 'DELETE_ALL' || purging) return
    setPurging(true)
    setPurgeJob({ status: 'queued', totalRecords: 0, deletedRecords: 0, currentTable: null })
    try {
      const { data: queued } = await maintenanceAPI.purgeCategory(purgeTarget, 'DELETE_ALL')
      const jobId = queued?.jobId
      if (!jobId) throw new Error(queued?.message || 'The server did not return a purge job ID.')
      window.localStorage.setItem(PURGE_JOB_STORAGE_KEY, JSON.stringify({ id: jobId, category: purgeTarget }))
      await trackPurgeJob(jobId, purgeTarget)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setPurging(false)
    }
  }, [purgeTarget, purgeConfirm, purging, toastError, trackPurgeJob])

  const uniqueTableCounts = new Map()
  categories.forEach((category) => (category.tables || []).forEach((table) => {
    uniqueTableCounts.set(table.table, Number(table.count || 0))
  }))
  const totalRecords = [...uniqueTableCounts.values()].reduce((sum, count) => sum + count, 0)

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
              ≈{totalRecords.toLocaleString()} records estimated
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

      {loadError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-bold">Could not load maintenance data</p>
          <p className="mt-1 break-words">{loadError}</p>
          <button type="button" onClick={refreshCategories} disabled={catsLoading} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-700 border border-red-200 disabled:opacity-50">{catsLoading ? 'Retrying…' : 'Retry loading'}</button>
        </div>
      )}

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
          purgeJob
            ? `Status: ${purgeJob.status}. Deleted ${Number(purgeJob.deletedRecords || 0).toLocaleString()} records (estimated total ${Number(purgeJob.totalRecords || 0).toLocaleString()}).${purgeJob.currentTable ? ` Current table: ${purgeJob.currentTable}.` : ''}`
            : purgeTarget
              ? `This permanently deletes all records in the tables belonging to "${purgeTarget}". Bookings are preserved when purging countries. This cannot be undone.`
              : ''
        }
        confirmLabel={purging ? 'Purging…' : 'Purge All'}
        loading={purging}
        confirmationText="DELETE_ALL"
        confirmationValue={purgeConfirm}
        onConfirmationChange={setPurgeConfirm}
        confirmDisabled={purgeConfirm !== 'DELETE_ALL' || purging}
      />
    </div>
  )
}

function CategoryCard ({ category, onPurge }) {
  const { category: cat, tables, totalRecords } = category
  const isDangerous = Array.isArray(tables) && tables.length > 0

  return (
    <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 bg-white transition hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 capitalize">{cat}</h4>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            totalRecords > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            ≈{totalRecords.toLocaleString()} record{totalRecords !== 1 ? 's' : ''}
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
            <span className="text-slate-400 font-semibold ml-2 flex-shrink-0">≈{Number(t.count || 0).toLocaleString()}</span>
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
        {isDangerous ? (totalRecords > 0 ? 'Delete All Records' : 'Check & Delete Records') : 'No tables available'}
      </button>
    </div>
  )
}
