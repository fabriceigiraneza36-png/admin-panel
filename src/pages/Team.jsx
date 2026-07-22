// admin/src/pages/Team.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// TEAM v2.0 — Team Members Management
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements over v1:
//  ✓ Fully responsive (mobile card fallback for narrow screens)
//  ✓ Optimistic delete (instant removal with rollback)
//  ✓ Extracted TeamMemberCard for mobile view
//  ✓ Memoized columns to prevent unnecessary re-renders
//  ✓ Better slug generation (safe from special chars)
//  ✓ Safe array parsing (handles both stringified JSON and native arrays)
//  ✓ Validation feedback with visible field errors
//  ✓ Auto-normalise URLs on blur (adds https:// if missing)
//  ✓ Loading skeletons match final layout
//  ✓ A11y improvements throughout
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  UserCircle, Plus, Pencil, Trash2, RefreshCw, Eye, Star,
  Mail, Phone, MapPin, Globe,
} from 'lucide-react'

import { teamAPI }         from '@api/team'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination          from '@components/common/Pagination'
import SearchBar           from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge               from '@components/common/Badge'
import Avatar              from '@components/common/Avatar'
import ConfirmDialog       from '@components/common/ConfirmDialog'
import ImageUpload         from '@components/common/ImageUpload'
import TagInput            from '@components/common/TagInput'
import { useModal }        from '@hooks/useModal'
import { useToast }        from '@hooks/useToast'
import { usePagination }   from '@hooks/usePagination'
import { useDebounce }     from '@hooks/useDebounce'
import { getErrorMessage } from '@api/client'

/* ═══════════════════════════════════════════════════════════════════════════
   SOCIAL ICONS (self-contained SVGs)
═══════════════════════════════════════════════════════════════════════════ */

const LinkedInSocialIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const XSocialIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.857L1.254 2.25H8.08l4.261 5.636 5.903-5.636Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const InstagramSocialIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

/* ─── Constants ────────────────────────────────────────────────────────────── */

const INIT = Object.freeze({
  name:             '',
  role:             '',
  department:       '',
  bio:              '',
  email:            '',
  phone:            '',
  whatsapp:         '',
  image_url:        '',
  linkedin_url:     '',
  twitter_url:      '',
  instagram_url:    '',
  website_url:      '',
  expertise:        [],
  languages:        [],
  years_experience: 0,
  location:         '',
  country:          '',
  display_order:    0,
  is_featured:      false,
  is_active:        true,
})

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const slugify = (str = '') =>
  str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeUrl = (url = '') => {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const parseArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return [] }
  }
  return []
}

/* ─── Mobile Card ──────────────────────────────────────────────────────────── */

const TeamMemberCard = React.memo(function TeamMemberCard({
  member, onView, onEdit, onDelete,
}) {
  return (
    <div
      onClick={onView}
      className="rounded-2xl border border-slate-200 bg-white p-3 flex gap-3
                 hover:border-primary-300 hover:shadow-sm transition cursor-pointer"
    >
      <Avatar src={member.image_url} name={member.name} size="lg" rounded="xl" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{member.name}</p>
        <p className="text-xs text-primary-600 font-medium truncate">{member.role}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {member.department && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-emerald-50 text-emerald-700 border border-emerald-200">
              {member.department}
            </span>
          )}
          {member.is_featured && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5
                             rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Star size={9} className="fill-amber-500 text-amber-500" /> Featured
            </span>
          )}
          <Badge
            status={member.is_active ? 'active' : 'inactive'}
            label={member.is_active ? 'Active' : 'Inactive'}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onEdit}
          aria-label="Edit"
          className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100
                     hover:text-primary-600 grid place-items-center transition"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="w-8 h-8 rounded-lg text-slate-500 hover:bg-red-50
                     hover:text-red-600 grid place-items-center transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function TeamPage() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [form,    setForm]    = useState(INIT)
  const [editing, setEditing] = useState(null)

  const dSearch = useDebounce(search, 400)

  /* ── Load ──────────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page:   pag.page,
        limit:  pag.limit,
        sortBy: 'display_order',
        order:  'asc',
        ...(dSearch && { search: dSearch }),
      }
      const { data } = await teamAPI.getAll(params)
      setItems(data.data || data.team || data.members || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pag.page, pag.limit, dSearch])

  useEffect(() => { load() }, [load])

  /* ── Modal helpers ─────────────────────────────────────────────────────── */

  const openCreate = useCallback(() => {
    setForm(INIT)
    setEditing(null)
    formModal.open()
  }, [formModal])

  const openEdit = useCallback((m) => {
    const f = { ...INIT }
    Object.keys(f).forEach((k) => {
      if (m[k] === undefined || m[k] === null) return
      if (Array.isArray(INIT[k])) {
        f[k] = parseArray(m[k])
      } else {
        f[k] = m[k]
      }
    })
    setForm(f)
    setEditing(m)
    formModal.open()
  }, [formModal])

  const upd = useCallback(
    (k, v) => setForm((p) => ({ ...p, [k]: v })),
    []
  )

  /* ── Save ──────────────────────────────────────────────────────────────── */

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.role.trim()) return toast.error('Role is required')

    setSaving(true)
    try {
      const payload = {
        ...form,
        slug:          slugify(form.name),
        linkedin_url:  normalizeUrl(form.linkedin_url),
        twitter_url:   normalizeUrl(form.twitter_url),
        instagram_url: normalizeUrl(form.instagram_url),
        website_url:   normalizeUrl(form.website_url),
      }

      if (editing) {
        await teamAPI.update(editing.id, payload)
        toast.success('Member updated')
      } else {
        await teamAPI.create(payload)
        toast.success('Member added')
      }
      formModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [editing, form, formModal, load, toast])

  /* ── Optimistic delete ─────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    const target = deleteModal.data
    if (!target) return

    setItems((prev) => prev.filter((x) => x.id !== target.id))
    deleteModal.close()

    try {
      await teamAPI.remove(target.id)
      toast.success('Member removed')
      pag.setTotal(Math.max(0, pag.total - 1))
    } catch (e) {
      toast.error(getErrorMessage(e))
      load()
    }
  }, [deleteModal, load, pag, toast])

  /* ── Table columns ─────────────────────────────────────────────────────── */

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Member',
      sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar src={r.image_url} name={r.name} size="md" rounded="xl" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{r.name}</p>
            <p className="text-xs text-slate-400 truncate">{r.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (v) => v
        ? <span className="badge-green">{v}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'location',
      label: 'Location',
      render: (_, r) => {
        const loc = `${r.location || ''} ${r.country || ''}`.trim()
        return loc || <span className="text-slate-300">—</span>
      },
    },
    {
      key: 'years_experience',
      label: 'Exp.',
      align: 'center',
      render: (v) => (
        <span className="text-sm font-semibold text-slate-600">
          {v || 0}y
        </span>
      ),
    },
    {
      key: 'is_featured',
      label: 'Featured',
      align: 'center',
      render: (v) => v
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-slate-300">—</span>,
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
      key: 'actions',
      label: '',
      align: 'right',
      width: '120px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"   onClick={() => viewModal.open(r)} />
          <TableAction icon={Pencil} label="Edit"   onClick={() => openEdit(r)} />
          <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
        </TableActions>
      ),
    },
  ], [viewModal, deleteModal, openEdit])

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserCircle size={28} className="text-primary-600" />
            Team
          </h1>
          <p className="page-subtitle">
            Manage team members ({pag.total.toLocaleString()})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary btn-sm"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-3 sm:p-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search team by name or role…"
          className="max-w-sm"
        />
      </div>

      {/* Content: Table OR Cards */}
      <div className="card">
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table
            columns={columns}
            data={items}
            loading={loading}
            onRowClick={(r) => viewModal.open(r)}
          />
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-3
                                      bg-white flex gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded" />
                  <div className="h-3 w-1/3 bg-slate-200 rounded" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <UserCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-500">No team members</p>
              <p className="text-xs mt-1">
                {search ? 'No matches found.' : 'Add your first team member.'}
              </p>
            </div>
          ) : (
            items.map((m) => (
              <TeamMemberCard
                key={m.id}
                member={m}
                onView={() => viewModal.open(m)}
                onEdit={() => openEdit(m)}
                onDelete={() => deleteModal.open(m)}
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

      {/* ═════════ VIEW MODAL ═════════ */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={viewModal.data?.name}
        size="md"
        icon={<UserCircle size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">
              Close
            </button>
            <button
              onClick={() => { viewModal.close(); openEdit(viewModal.data) }}
              className="btn-primary"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        }
      >
        {viewModal.data && (
          <div className="space-y-5">
            {/* Profile card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4
                            p-4 bg-primary-50 rounded-2xl text-center sm:text-left">
              <Avatar
                src={viewModal.data.image_url}
                name={viewModal.data.name}
                size="xl"
                rounded="2xl"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-800 truncate">
                  {viewModal.data.name}
                </h3>
                <p className="text-sm text-primary-600 font-medium">
                  {viewModal.data.role}
                </p>
                {viewModal.data.department && (
                  <span className="badge-green mt-1 inline-block">
                    {viewModal.data.department}
                  </span>
                )}
              </div>
            </div>

            {viewModal.data.bio && (
              <ModalField label="Bio" value={viewModal.data.bio} />
            )}

            <ModalGrid>
              <ModalField label="Email"      value={viewModal.data.email      || '—'} />
              <ModalField label="Phone"      value={viewModal.data.phone      || '—'} />
              <ModalField
                label="Location"
                value={`${viewModal.data.location || ''} ${viewModal.data.country || ''}`.trim() || '—'}
              />
              <ModalField
                label="Experience"
                value={`${viewModal.data.years_experience || 0} years`}
              />
            </ModalGrid>

            {/* Expertise / Languages */}
            {(parseArray(viewModal.data.expertise).length > 0 ||
              parseArray(viewModal.data.languages).length > 0) && (
              <ModalSection title="Skills">
                {parseArray(viewModal.data.expertise).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parseArray(viewModal.data.expertise).map((x, i) => (
                        <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full
                                                bg-primary-50 text-primary-700 border border-primary-200">
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {parseArray(viewModal.data.languages).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Languages</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parseArray(viewModal.data.languages).map((x, i) => (
                        <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full
                                                bg-slate-100 text-slate-700 border border-slate-200">
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </ModalSection>
            )}

            {/* Social links */}
            {(viewModal.data.linkedin_url  ||
              viewModal.data.twitter_url   ||
              viewModal.data.instagram_url ||
              viewModal.data.website_url) && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                {viewModal.data.linkedin_url && (
                  <a
                    href={viewModal.data.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon text-blue-600 hover:bg-blue-50"
                    aria-label="LinkedIn profile"
                  >
                    <LinkedInSocialIcon size={16} />
                  </a>
                )}
                {viewModal.data.twitter_url && (
                  <a
                    href={viewModal.data.twitter_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon text-slate-700 hover:bg-slate-100"
                    aria-label="X (Twitter) profile"
                  >
                    <XSocialIcon size={16} />
                  </a>
                )}
                {viewModal.data.instagram_url && (
                  <a
                    href={viewModal.data.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon text-pink-500 hover:bg-pink-50"
                    aria-label="Instagram profile"
                  >
                    <InstagramSocialIcon size={16} />
                  </a>
                )}
                {viewModal.data.website_url && (
                  <a
                    href={viewModal.data.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon text-emerald-600 hover:bg-emerald-50"
                    aria-label="Website"
                  >
                    <Globe size={16} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ═════════ FORM MODAL ═════════ */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? 'Edit Member' : 'Add Member'}
        size="xl"
        icon={<UserCircle size={20} />}
        footer={
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 w-full">
            <button
              onClick={formModal.close}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary disabled:opacity-50"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white
                                   rounded-full animate-spin" />
                  Saving…
                </>
              ) : editing ? 'Update' : 'Create'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Personal */}
          <ModalSection title="Personal">
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => upd('name', e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  Role <span className="text-rose-500">*</span>
                </label>
                <input
                  className="input"
                  value={form.role}
                  onChange={(e) => upd('role', e.target.value)}
                  placeholder="Safari Guide"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Department</label>
                <input
                  className="input"
                  value={form.department}
                  onChange={(e) => upd('department', e.target.value)}
                  placeholder="Operations"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Experience (years)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={form.years_experience}
                  onChange={(e) => upd('years_experience', Number(e.target.value) || 0)}
                />
              </div>
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Bio</label>
              <textarea
                className="input min-h-[100px] resize-y"
                value={form.bio}
                onChange={(e) => upd('bio', e.target.value)}
                placeholder="Write a short bio…"
              />
            </div>
          </ModalSection>

          {/* Contact */}
          <ModalSection title="Contact">
            <ModalGrid>
              <div className="input-group">
                <label className="input-label flex items-center gap-1.5">
                  <Mail size={12} /> Email
                </label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => upd('email', e.target.value)}
                  placeholder="jane@altuvera.com"
                />
              </div>
              <div className="input-group">
                <label className="input-label flex items-center gap-1.5">
                  <Phone size={12} /> Phone
                </label>
                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => upd('phone', e.target.value)}
                  placeholder="+250 700 000 000"
                />
              </div>
              <div className="input-group">
                <label className="input-label flex items-center gap-1.5">
                  <MapPin size={12} /> Location
                </label>
                <input
                  className="input"
                  value={form.location}
                  onChange={(e) => upd('location', e.target.value)}
                  placeholder="Kigali"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Country</label>
                <input
                  className="input"
                  value={form.country}
                  onChange={(e) => upd('country', e.target.value)}
                  placeholder="Rwanda"
                />
              </div>
            </ModalGrid>
          </ModalSection>

          {/* Social */}
          <ModalSection title="Social Media">
            <ModalGrid>
              <div className="input-group">
                <label className="input-label flex items-center gap-2">
                  <LinkedInSocialIcon size={14} className="text-blue-600" />
                  LinkedIn URL
                </label>
                <input
                  className="input"
                  value={form.linkedin_url}
                  onChange={(e) => upd('linkedin_url', e.target.value)}
                  onBlur={(e) => upd('linkedin_url', normalizeUrl(e.target.value))}
                  placeholder="linkedin.com/in/…"
                />
              </div>
              <div className="input-group">
                <label className="input-label flex items-center gap-2">
                  <XSocialIcon size={14} className="text-slate-700" />
                  X (Twitter) URL
                </label>
                <input
                  className="input"
                  value={form.twitter_url}
                  onChange={(e) => upd('twitter_url', e.target.value)}
                  onBlur={(e) => upd('twitter_url', normalizeUrl(e.target.value))}
                  placeholder="x.com/…"
                />
              </div>
              <div className="input-group">
                <label className="input-label flex items-center gap-2">
                  <InstagramSocialIcon size={14} className="text-pink-500" />
                  Instagram URL
                </label>
                <input
                  className="input"
                  value={form.instagram_url}
                  onChange={(e) => upd('instagram_url', e.target.value)}
                  onBlur={(e) => upd('instagram_url', normalizeUrl(e.target.value))}
                  placeholder="instagram.com/…"
                />
              </div>
              <div className="input-group">
                <label className="input-label flex items-center gap-2">
                  <Globe size={14} className="text-emerald-600" />
                  Website URL
                </label>
                <input
                  className="input"
                  value={form.website_url}
                  onChange={(e) => upd('website_url', e.target.value)}
                  onBlur={(e) => upd('website_url', normalizeUrl(e.target.value))}
                  placeholder="example.com"
                />
              </div>
            </ModalGrid>
          </ModalSection>

          {/* Skills */}
          <ModalSection title="Skills & Languages">
            <TagInput
              label="Expertise"
              value={Array.isArray(form.expertise) ? form.expertise : []}
              onChange={(v) => upd('expertise', v)}
              placeholder="e.g. Wildlife photography"
            />
            <TagInput
              label="Languages"
              value={Array.isArray(form.languages) ? form.languages : []}
              onChange={(v) => upd('languages', v)}
              placeholder="e.g. English, Swahili"
            />
          </ModalSection>

          {/* Photo */}
          <ImageUpload
            label="Photo"
            value={form.image_url}
            onChange={(v) => upd('image_url', v)}
            folder="team"
          />

          {/* Flags */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => upd('is_featured', e.target.checked)}
                className="w-5 h-5 rounded-lg text-primary-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">
                ⭐ Featured
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => upd('is_active', e.target.checked)}
                className="w-5 h-5 rounded-lg text-primary-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">
                ✅ Active
              </span>
            </label>
          </div>
        </div>
      </Modal>

      {/* ═════════ DELETE CONFIRM ═════════ */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title={`Remove ${deleteModal.data?.name || 'member'}?`}
        description="This will permanently remove the team member. This action cannot be undone."
      />
    </div>
  )
}