// admin/src/pages/Users.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// USERS v2.0 — Registered User Management
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements over v1:
//  ✓ Fully responsive (mobile card fallback for narrow screens)
//  ✓ Optimistic activate/deactivate toggle (with rollback)
//  ✓ Optimistic delete (with rollback via refetch)
//  ✓ Extracted MobileUserCard component
//  ✓ Memoized columns, callbacks, and derived state
//  ✓ Inline styles removed → Tailwind consistently
//  ✓ Better CSV export with proper escaping (handles commas, quotes, newlines)
//  ✓ Provider-specific colored badges (Google, Facebook, Email)
//  ✓ Skeleton loaders match final layout (no CLS)
//  ✓ A11y: aria-labels, focus states, semantic buttons
//  ✓ Loading states on all async buttons
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Users as UsersIcon, Eye, UserX, UserCheck, Trash2, RefreshCw,
  Download, Shield, Mail, Phone, Globe, Calendar, Clock,
} from 'lucide-react'

import apiClient, { getErrorMessage } from '@api/client'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                from '@components/common/Badge'
import Avatar               from '@components/common/Avatar'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate, formatTimeAgo } from '@utils/formatters'
import { downloadBlob }     from '@utils/helpers'

/* ─── Constants ────────────────────────────────────────────────────────────── */

const PROVIDER_STYLES = {
  google:   'bg-red-50 text-red-700 border-red-200',
  facebook: 'bg-blue-50 text-blue-700 border-blue-200',
  apple:    'bg-slate-100 text-slate-700 border-slate-200',
  email:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  default:  'bg-slate-100 text-slate-700 border-slate-200',
}

const STATUS_FILTERS = [
  { value: '',         label: 'All Users' },
  { value: 'active',   label: 'Active'    },
  { value: 'inactive', label: 'Inactive'  },
  { value: 'verified', label: 'Verified'  },
]

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const csvEscape = (v) => {
  const s = String(v ?? '')
  // Quote if contains comma, quote, or newline
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const generateCSV = (rows) => {
  const headers = [
    'ID', 'Email', 'Full Name', 'Phone', 'Nationality',
    'Provider', 'Verified', 'Active', 'Last Login', 'Created',
  ]
  const lines = [headers.join(',')]
  rows.forEach((r) => {
    lines.push([
      csvEscape(r.id),
      csvEscape(r.email),
      csvEscape(r.full_name || ''),
      csvEscape(r.phone || ''),
      csvEscape(r.nationality || ''),
      csvEscape(r.auth_provider || 'email'),
      csvEscape(r.is_verified ? 'Yes' : 'No'),
      csvEscape(r.is_active ? 'Yes' : 'No'),
      csvEscape(r.last_login ? new Date(r.last_login).toISOString() : ''),
      csvEscape(r.created_at ? new Date(r.created_at).toISOString() : ''),
    ].join(','))
  })
  return lines.join('\n')
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function ProviderBadge({ provider }) {
  const p = (provider || 'email').toLowerCase()
  const style = PROVIDER_STYLES[p] || PROVIDER_STYLES.default
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5
                      rounded-full border ${style}`}>
      {p}
    </span>
  )
}

const MobileUserCard = React.memo(function MobileUserCard({
  user, busy, onView, onToggle, onDelete,
}) {
  return (
    <div
      onClick={onView}
      className="rounded-2xl border border-slate-200 bg-white p-3 flex gap-3
                 hover:border-emerald-300 hover:shadow-sm transition cursor-pointer"
    >
      <Avatar
        src={user.avatar_url}
        name={user.full_name || user.email}
        size="md"
        rounded="full"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm text-slate-800 truncate">
            {user.full_name || '—'}
          </p>
          {user.is_verified && (
            <Shield size={11} className="text-emerald-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <ProviderBadge provider={user.auth_provider} />
          <Badge
            status={user.is_active ? 'active' : 'inactive'}
            label={user.is_active ? 'Active' : 'Inactive'}
          />
          <span className="text-[10px] text-slate-400">
            {user.last_login ? formatTimeAgo(user.last_login) : 'Never'}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggle}
          disabled={busy}
          aria-label={user.is_active ? 'Deactivate' : 'Activate'}
          className={`w-8 h-8 rounded-lg grid place-items-center transition
            disabled:opacity-50 disabled:cursor-not-allowed
            ${user.is_active
              ? 'text-amber-600 hover:bg-amber-50'
              : 'text-emerald-600 hover:bg-emerald-50'
            }`}
        >
          {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete"
          className="w-8 h-8 rounded-lg text-slate-500 hover:bg-red-50
                     hover:text-red-600 grid place-items-center transition
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
})

function StatCard({ icon: Icon, label, value, color = 'emerald' }) {
  const palette = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue:    'bg-blue-50 text-blue-600',
    amber:   'bg-amber-50 text-amber-600',
    slate:   'bg-slate-100 text-slate-600',
  }
  return (
    <div className="card p-3 sm:p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${palette[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-800">
          {value?.toLocaleString?.() ?? value ?? '—'}
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function UsersPage() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const deleteModal = useModal()

  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [exporting,    setExporting]    = useState(false)
  const [busyId,       setBusyId]       = useState(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy,       setSortBy]       = useState('created_at')
  const [sortOrder,    setSortOrder]    = useState('desc')

  const dSearch = useDebounce(search, 400)

  /* ── Load ──────────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/users', {
        params: {
          page:  pag.page,
          limit: pag.limit,
          sortBy,
          order: sortOrder,
          ...(dSearch      && { search: dSearch }),
          ...(statusFilter && { status: statusFilter }),
        },
      })
      setItems(data.data || data.users || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, statusFilter])

  useEffect(() => { load() }, [load])

  /* ── Derived stats ─────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const active   = items.filter((u) => u.is_active).length
    const verified = items.filter((u) => u.is_verified).length
    return {
      total:    pag.total,
      active,
      inactive: items.length - active,
      verified,
    }
  }, [items, pag.total])

  /* ── Optimistic toggle active ──────────────────────────────────────────── */

  const handleToggleActive = useCallback(async (user) => {
    const original = user.is_active
    setBusyId(user.id)

    // Optimistic
    setItems((prev) =>
      prev.map((x) => (x.id === user.id ? { ...x, is_active: !original } : x))
    )

    try {
      if (original) {
        await apiClient.post(`/users/${user.id}/deactivate`)
        toast.success(`${user.full_name || 'User'} deactivated`)
      } else {
        await apiClient.post(`/users/${user.id}/activate`)
        toast.success(`${user.full_name || 'User'} activated`)
      }
    } catch (err) {
      // Rollback
      setItems((prev) =>
        prev.map((x) => (x.id === user.id ? { ...x, is_active: original } : x))
      )
      toast.error(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }, [toast])

  /* ── Optimistic delete ─────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    const target = deleteModal.data
    if (!target) return

    setBusyId(target.id)
    setItems((prev) => prev.filter((x) => x.id !== target.id))
    deleteModal.close()

    try {
      await apiClient.delete(`/users/${target.id}`)
      toast.success('User deleted')
      pag.setTotal(Math.max(0, pag.total - 1))
    } catch (err) {
      toast.error(getErrorMessage(err))
      load() // Refetch to restore
    } finally {
      setBusyId(null)
    }
  }, [deleteModal, load, pag, toast])

  /* ── Export CSV ────────────────────────────────────────────────────────── */

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      // Try dedicated endpoint first
      try {
        const { data } = await apiClient.get('/users/export', { responseType: 'blob' })
        downloadBlob(data, `users-${new Date().toISOString().split('T')[0]}.csv`)
        toast.success('Users exported')
        return
      } catch {
        // Fall through to client-side generation
      }

      // Fallback: fetch bulk and generate CSV client-side
      const { data } = await apiClient.get('/users', { params: { limit: 5000 } })
      const rows = data.data || data.users || []
      if (rows.length === 0) {
        toast.error('No users to export')
        return
      }
      const csv = generateCSV(rows)
      downloadBlob(csv, `users-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
      toast.success(`Exported ${rows.length.toLocaleString()} users`)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Export failed')
    } finally {
      setExporting(false)
    }
  }, [toast])

  const handleSort = useCallback((k, o) => {
    setSortBy(k)
    setSortOrder(o)
    pag.reset()
  }, [pag])

  /* ── Table columns ─────────────────────────────────────────────────────── */

  const columns = useMemo(() => [
    {
      key: 'full_name',
      label: 'User',
      sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={r.avatar_url}
            name={r.full_name || r.email}
            size="sm"
            rounded="full"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-slate-800 text-sm truncate">
                {r.full_name || '—'}
              </p>
              {r.is_verified && (
                <Shield size={11} className="text-emerald-500 flex-shrink-0"
                        aria-label="Verified" />
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'auth_provider',
      label: 'Provider',
      render: (v) => <ProviderBadge provider={v} />,
    },
    {
      key: 'is_verified',
      label: 'Verified',
      align: 'center',
      render: (v) => v
        ? <Shield size={15} className="text-emerald-500 mx-auto" />
        : <span className="text-slate-300 text-xs mx-auto block text-center">—</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (v) => (
        <Badge
          status={v ? 'active' : 'inactive'}
          label={v ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      key: 'last_login',
      label: 'Last Login',
      sortable: true,
      render: (v) => v
        ? <span className="text-sm text-slate-600">{formatTimeAgo(v)}</span>
        : <span className="text-slate-300 text-sm">Never</span>,
    },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (v) => (
        <span className="text-sm text-slate-600">{formatDate(v)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '120px',
      render: (_, r) => (
        <TableActions>
          <TableAction
            icon={Eye}
            label="View"
            onClick={() => viewModal.open(r)}
          />
          <TableAction
            icon={r.is_active ? UserX : UserCheck}
            label={r.is_active ? 'Deactivate' : 'Activate'}
            onClick={() => handleToggleActive(r)}
            variant={r.is_active ? 'warning' : 'success'}
            disabled={busyId === r.id}
          />
          <TableAction
            icon={Trash2}
            label="Delete"
            onClick={() => deleteModal.open(r)}
            variant="danger"
            disabled={busyId === r.id}
          />
        </TableActions>
      ),
    },
  ], [viewModal, deleteModal, handleToggleActive, busyId])

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <UsersIcon size={26} className="text-emerald-600" />
            Users
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage registered users ({pag.total.toLocaleString()} total)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold
                       text-emerald-700 bg-emerald-50 border border-emerald-200
                       rounded-xl hover:bg-emerald-100 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} className={exporting ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">
              {exporting ? 'Exporting…' : 'Export'}
            </span>
          </button>
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold
                       text-emerald-700 bg-emerald-50 border border-emerald-200
                       rounded-xl hover:bg-emerald-100 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={UsersIcon}  label="Total"    value={stats.total}    color="emerald" />
        <StatCard icon={UserCheck}  label="Active"   value={stats.active}   color="blue" />
        <StatCard icon={Shield}     label="Verified" value={stats.verified} color="emerald" />
        <StatCard icon={UserX}      label="Inactive" value={stats.inactive} color="amber" />
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <FilterBar>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email…"
            className="max-w-sm"
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); pag.reset() }}
            options={STATUS_FILTERS}
          />
        </FilterBar>
      </div>

      {/* Content: Table (md+) OR Cards (mobile) */}
      <div className="card">
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table
            columns={columns}
            data={items}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onRowClick={(r) => viewModal.open(r)}
            emptyMessage="No users found"
          />
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 p-3 bg-white
                           flex gap-3 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded" />
                  <div className="h-3 w-1/3 bg-slate-200 rounded" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <UsersIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-500">No users found</p>
              <p className="text-xs mt-1">
                {search || statusFilter
                  ? 'Try adjusting your filters.'
                  : 'Registered users will appear here.'}
              </p>
            </div>
          ) : (
            items.map((u) => (
              <MobileUserCard
                key={u.id}
                user={u}
                busy={busyId === u.id}
                onView={() => viewModal.open(u)}
                onToggle={() => handleToggleActive(u)}
                onDelete={() => deleteModal.open(u)}
              />
            ))
          )}
        </div>

        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          total={pag.total}
          limit={pag.limit}
          hasNext={pag.hasNext}
          hasPrev={pag.hasPrev}
          onNext={pag.next}
          onPrev={pag.prev}
          onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ═════════ VIEW MODAL ═════════ */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={viewModal.data?.full_name || 'User Details'}
        size="md"
        icon={<UsersIcon size={20} />}
        footer={
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 w-full">
            {viewModal.data && (
              <button
                onClick={() => {
                  handleToggleActive(viewModal.data)
                  viewModal.close()
                }}
                disabled={busyId === viewModal.data.id}
                className={`btn-secondary ${
                  viewModal.data.is_active
                    ? 'text-amber-700 border-amber-200 hover:bg-amber-50'
                    : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                {viewModal.data.is_active ? (
                  <><UserX size={14} /> Deactivate</>
                ) : (
                  <><UserCheck size={14} /> Activate</>
                )}
              </button>
            )}
            <button onClick={viewModal.close} className="btn-secondary">
              Close
            </button>
          </div>
        }
      >
        {viewModal.data && (
          <div className="space-y-5">
            {/* Profile card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4
                            p-4 rounded-2xl bg-emerald-50 border border-emerald-100
                            text-center sm:text-left">
              <Avatar
                src={viewModal.data.avatar_url}
                name={viewModal.data.full_name || viewModal.data.email}
                size="xl"
                rounded="2xl"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {viewModal.data.full_name || '—'}
                </h3>
                <p className="text-sm text-slate-600 truncate">
                  {viewModal.data.email}
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                  <Badge
                    status={viewModal.data.is_active ? 'active' : 'inactive'}
                    label={viewModal.data.is_active ? 'Active' : 'Inactive'}
                  />
                  {viewModal.data.is_verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold
                                     px-2 py-1 rounded-full bg-emerald-100 text-emerald-800
                                     border border-emerald-200">
                      <Shield size={10} /> Verified
                    </span>
                  )}
                  <ProviderBadge provider={viewModal.data.auth_provider} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <ModalSection title="Contact">
              <ModalGrid>
                <ModalField
                  label={<span className="inline-flex items-center gap-1"><Mail size={11} /> Email</span>}
                  value={viewModal.data.email || '—'}
                />
                <ModalField
                  label={<span className="inline-flex items-center gap-1"><Phone size={11} /> Phone</span>}
                  value={viewModal.data.phone || '—'}
                />
                <ModalField
                  label={<span className="inline-flex items-center gap-1"><Globe size={11} /> Nationality</span>}
                  value={viewModal.data.nationality || '—'}
                />
                <ModalField
                  label="Auth Provider"
                  value={viewModal.data.auth_provider || 'email'}
                />
              </ModalGrid>
            </ModalSection>

            {/* Activity */}
            <ModalSection title="Activity">
              <ModalGrid>
                <ModalField
                  label={<span className="inline-flex items-center gap-1"><Clock size={11} /> Last Login</span>}
                  value={
                    viewModal.data.last_login
                      ? formatTimeAgo(viewModal.data.last_login)
                      : 'Never'
                  }
                />
                <ModalField
                  label={<span className="inline-flex items-center gap-1"><Calendar size={11} /> Joined</span>}
                  value={formatDate(viewModal.data.created_at)}
                />
                <ModalField
                  label="Last Updated"
                  value={formatDate(viewModal.data.updated_at)}
                />
                <ModalField
                  label="User ID"
                  value={<code className="text-xs font-mono text-slate-500">
                    {viewModal.data.id}
                  </code>}
                />
              </ModalGrid>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ═════════ DELETE CONFIRM ═════════ */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this user?"
        description={
          deleteModal.data
            ? `This permanently removes ${deleteModal.data.full_name || deleteModal.data.email} and all their data. This cannot be undone.`
            : 'This permanently removes the user account and all their data.'
        }
      />
    </div>
  )
}