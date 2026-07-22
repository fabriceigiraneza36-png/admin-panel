// admin/src/pages/Subscribers.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIBERS v2.0 — Newsletter Subscribers Management
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements over v1:
//  ✓ Expanded from one-line syntax to readable, maintainable code
//  ✓ Fully responsive (mobile-first, card fallback on tiny screens)
//  ✓ Optimistic delete (instant removal with rollback on failure)
//  ✓ CSV export of subscribers
//  ✓ Char counters + validation on newsletter form
//  ✓ Preview banner shows exact recipient count
//  ✓ Skeleton loader instead of empty state during fetch
//  ✓ Better a11y (aria-labels, focus states, keyboard support)
//  ✓ Loading state on refresh button
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Mail, Trash2, RefreshCw, Send, Download, Users,
  CheckCircle2, AlertCircle,
} from 'lucide-react'

import { subscribersAPI }  from '@api/subscribers'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination          from '@components/common/Pagination'
import SearchBar           from '@components/common/SearchBar'
import Modal               from '@components/common/Modal'
import Badge               from '@components/common/Badge'
import ConfirmDialog       from '@components/common/ConfirmDialog'
import { useModal }        from '@hooks/useModal'
import { useToast }        from '@hooks/useToast'
import { usePagination }   from '@hooks/usePagination'
import { useDebounce }     from '@hooks/useDebounce'
import { formatDate }      from '@utils/formatters'
import { getErrorMessage } from '@api/client'

/* ─── Constants ────────────────────────────────────────────────────────────── */

const MAX_SUBJECT = 200
const MAX_BODY    = 10_000

const INIT_NL = { subject: '', body: '' }

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const generateCSV = (rows) => {
  const headers = ['Email', 'Status', 'Subscribed At']
  const escape  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.join(',')]
  rows.forEach((r) => {
    lines.push([
      escape(r.email),
      escape(r.is_active ? 'Active' : 'Unsubscribed'),
      escape(r.subscribed_at ? new Date(r.subscribed_at).toISOString() : ''),
    ].join(','))
  })
  return lines.join('\n')
}

const downloadFile = (content, filename, mime = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const palette = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${palette[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value?.toLocaleString?.() ?? value}</p>
      </div>
    </div>
  )
}

function CharCount({ current, max }) {
  const ratio = current / max
  const color =
    ratio > 0.95 ? 'text-rose-500' :
    ratio > 0.8  ? 'text-amber-500' :
                   'text-slate-400'
  return (
    <p className={`text-[11px] mt-1 text-right ${color}`}>
      {current}/{max}
    </p>
  )
}

function MobileSubscriberCard({ sub, onDelete }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary-50 grid place-items-center flex-shrink-0">
        <Mail size={16} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-800 truncate">{sub.email}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge
            status={sub.is_active ? 'active' : 'inactive'}
            label={sub.is_active ? 'Active' : 'Unsubscribed'}
          />
          <span className="text-[11px] text-slate-400">
            {formatDate(sub.subscribed_at)}
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(sub)}
        aria-label={`Remove ${sub.email}`}
        className="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100
                   grid place-items-center transition flex-shrink-0"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function Subscribers() {
  const toast           = useToast()
  const pag             = usePagination()
  const deleteModal     = useModal()
  const newsletterModal = useModal()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [search,  setSearch]  = useState('')
  const [nlForm,  setNlForm]  = useState(INIT_NL)

  const dSearch = useDebounce(search, 400)

  /* ── Load ──────────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page:  pag.page,
        limit: pag.limit,
        ...(dSearch && { search: dSearch }),
      }
      const { data } = await subscribersAPI.getAll(params)
      setItems(data.data || data.subscribers || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pag.page, pag.limit, dSearch])

  useEffect(() => { load() }, [load])

  /* ── Derived stats ──────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const active = items.filter((s) => s.is_active).length
    return {
      total:    pag.total,
      active,
      inactive: items.length - active,
    }
  }, [items, pag.total])

  /* ── Optimistic delete ──────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    const target = deleteModal.data
    if (!target) return

    setItems((prev) => prev.filter((x) => x.id !== target.id))
    deleteModal.close()

    try {
      await subscribersAPI.remove(target.id)
      toast.success(`${target.email} unsubscribed`)
      pag.setTotal(Math.max(0, pag.total - 1))
    } catch (e) {
      toast.error(getErrorMessage(e))
      load() // Rollback via refetch
    }
  }, [deleteModal, load, pag, toast])

  /* ── Send newsletter ────────────────────────────────────────────────────── */

  const canSendNewsletter =
    nlForm.subject.trim().length > 0 && nlForm.body.trim().length > 0

  const handleSendNewsletter = useCallback(async () => {
    if (!canSendNewsletter) {
      return toast.error('Subject and body are required')
    }
    setSending(true)
    try {
      await subscribersAPI.sendNewsletter(nlForm)
      toast.success(`Newsletter sent to ${stats.active.toLocaleString()} subscribers!`)
      setNlForm(INIT_NL)
      newsletterModal.close()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }, [canSendNewsletter, nlForm, stats.active, newsletterModal, toast])

  /* ── Export CSV ─────────────────────────────────────────────────────────── */

  const handleExport = useCallback(() => {
    if (items.length === 0) return toast.error('No subscribers to export')
    const csv = generateCSV(items)
    const date = new Date().toISOString().split('T')[0]
    downloadFile(csv, `subscribers-${date}.csv`)
    toast.success(`Exported ${items.length} subscribers`)
  }, [items, toast])

  /* ── Table columns ──────────────────────────────────────────────────────── */

  const columns = useMemo(() => [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-2 min-w-0">
          <Mail size={13} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium text-slate-800 truncate">{v}</span>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (v) => (
        <Badge
          status={v ? 'active' : 'inactive'}
          label={v ? 'Active' : 'Unsubscribed'}
        />
      ),
    },
    {
      key: 'subscribed_at',
      label: 'Subscribed',
      sortable: true,
      render: (v) => (
        <span className="text-sm text-slate-500">{formatDate(v)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '60px',
      render: (_, r) => (
        <TableActions>
          <TableAction
            icon={Trash2}
            label="Remove"
            onClick={() => deleteModal.open(r)}
            variant="danger"
          />
        </TableActions>
      ),
    },
  ], [deleteModal])

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Mail size={28} className="text-primary-600" />
            Subscribers
          </h1>
          <p className="page-subtitle">
            {pag.total.toLocaleString()} newsletter subscriber{pag.total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary btn-sm"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={loading || items.length === 0}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => newsletterModal.open()}
            className="btn-primary"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send Newsletter</span>
            <span className="sm:hidden">Newsletter</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Users}         label="Total"        value={stats.total}    color="primary" />
        <StatCard icon={CheckCircle2}  label="Active (page)" value={stats.active}  color="emerald" />
        <StatCard icon={AlertCircle}   label="Inactive (page)" value={stats.inactive} color="amber" />
      </div>

      {/* Search */}
      <div className="card p-3 sm:p-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by email…"
          className="max-w-sm"
        />
      </div>

      {/* Content: Table (md+) OR Cards (mobile) */}
      <div className="card">
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table columns={columns} data={items} loading={loading} />
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-3
                                      bg-white flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Mail size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-500">No subscribers</p>
              <p className="text-xs mt-1">
                {search ? 'No matches found.' : 'Waiting for the first sign-up.'}
              </p>
            </div>
          ) : (
            items.map((s) => (
              <MobileSubscriberCard
                key={s.id}
                sub={s}
                onDelete={(row) => deleteModal.open(row)}
              />
            ))
          )}
        </div>

        <Pagination
          {...pag}
          onNext={pag.next}
          onPrev={pag.prev}
          onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ═════════ NEWSLETTER MODAL ═════════ */}
      <Modal
        isOpen={newsletterModal.isOpen}
        onClose={() => { if (!sending) newsletterModal.close() }}
        title="Send Newsletter"
        size="md"
        icon={<Send size={20} />}
        footer={
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 w-full">
            <button
              onClick={newsletterModal.close}
              className="btn-secondary"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              onClick={handleSendNewsletter}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={sending || !canSendNewsletter}
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white
                                   rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={14} /> Send to {pag.total.toLocaleString()} subscribers
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200
                          rounded-xl text-sm text-amber-800">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p>
              This will send an email to all{' '}
              <strong>{pag.total.toLocaleString()}</strong> active subscribers.
              This action cannot be undone.
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="input-label">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              className="input"
              value={nlForm.subject}
              maxLength={MAX_SUBJECT}
              onChange={(e) => setNlForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Newsletter subject line"
            />
            <CharCount current={nlForm.subject.length} max={MAX_SUBJECT} />
          </div>

          {/* Body */}
          <div>
            <label className="input-label">
              Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="input min-h-[200px] resize-y"
              value={nlForm.body}
              maxLength={MAX_BODY}
              onChange={(e) => setNlForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Newsletter content — line breaks are preserved."
            />
            <CharCount current={nlForm.body.length} max={MAX_BODY} />
          </div>
        </div>
      </Modal>

      {/* ═════════ DELETE CONFIRM ═════════ */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Remove subscriber?"
        description={
          deleteModal.data
            ? `This will unsubscribe ${deleteModal.data.email}. They can resubscribe later.`
            : 'This will unsubscribe the user.'
        }
      />
    </div>
  )
}