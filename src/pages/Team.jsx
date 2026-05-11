import { useEffect, useState, useCallback } from 'react'
import {
  UserCircle, Plus, Pencil, Trash2, RefreshCw, Eye, Star,
} from 'lucide-react'
import { teamAPI }          from '@api/team'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination           from '@components/common/Pagination'
import SearchBar            from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                from '@components/common/Badge'
import Avatar               from '@components/common/Avatar'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import ImageUpload          from '@components/common/ImageUpload'
import TagInput             from '@components/common/TagInput'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { getErrorMessage }  from '@api/client'

/* ══════════════════════════════════════════════════════════════════════════
   SOCIAL ICONS  — fully self-contained SVGs, zero lucide-react dependency
   ══════════════════════════════════════════════════════════════════════════ */

const LinkedInSocialIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const XSocialIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.857L1.254 2.25H8.08l4.261 5.636 5.903-5.636Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const InstagramSocialIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
)

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════════════ */
const INIT = {
  name: '', role: '', department: '', bio: '', email: '', phone: '',
  whatsapp: '', image_url: '', linkedin_url: '', twitter_url: '',
  instagram_url: '', website_url: '', expertise: [], languages: [],
  years_experience: 0, location: '', country: '', display_order: 0,
  is_featured: false, is_active: true,
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════════════ */
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

  /* ── data fetching ───────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page,
        limit: pag.limit,
        ...(dSearch && { search: dSearch }),
        sortBy: 'display_order',
        order: 'asc',
      }
      const { data } = await teamAPI.getAll(params)
      setItems(data.data || data.team || data.members || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, dSearch])

  useEffect(() => { load() }, [load])

  /* ── modal helpers ───────────────────────────────────────────────────── */
  const openCreate = () => {
    setForm(INIT)
    setEditing(null)
    formModal.open()
  }

  const openEdit = (m) => {
    const f = { ...INIT }
    Object.keys(f).forEach((k) => {
      if (m[k] !== undefined && m[k] !== null) {
        if (Array.isArray(INIT[k]) && typeof m[k] === 'string') {
          try { f[k] = JSON.parse(m[k]) } catch { f[k] = [] }
        } else if (Array.isArray(INIT[k]) && Array.isArray(m[k])) {
          f[k] = m[k]
        } else {
          f[k] = m[k]
        }
      }
    })
    setForm(f)
    setEditing(m)
    formModal.open()
  }

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  /* ── save ────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.role.trim()) return toast.error('Role is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        slug: form.name.toLowerCase().replace(/\s+/g, '-'),
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
  }

  /* ── delete ──────────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    try {
      await teamAPI.remove(deleteModal.data.id)
      toast.success('Member removed')
      deleteModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  /* ── table columns ───────────────────────────────────────────────────── */
  const columns = [
    {
      key: 'name',
      label: 'Member',
      sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar src={r.image_url} name={r.name} size="md" rounded="xl" />
          <div>
            <p className="font-semibold text-slate-800">{r.name}</p>
            <p className="text-xs text-slate-400">{r.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (v) => v ? <span className="badge-green">{v}</span> : '—',
    },
    {
      key: 'location',
      label: 'Location',
      render: (_, r) => `${r.location || ''} ${r.country || ''}`.trim() || '—',
    },
    {
      key: 'years_experience',
      label: 'Exp.',
      align: 'center',
      render: (v) => `${v || 0}y`,
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
        <Badge status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '100px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"   onClick={() => viewModal.open(r)} />
          <TableAction icon={Pencil} label="Edit"   onClick={() => openEdit(r)} />
          <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 page-enter">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserCircle size={28} className="text-primary-600" />
            Team
          </h1>
          <p className="page-subtitle">Manage team members ({pag.total})</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="card p-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search team…"
          className="max-w-sm"
        />
      </div>

      {/* ── Table ── */}
      <div className="card">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          onRowClick={(r) => viewModal.open(r)}
        />
        <Pagination
          {...pag}
          onNext={pag.next}
          onPrev={pag.prev}
          onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VIEW MODAL
          ════════════════════════════════════════════════════════════════════ */}
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
            <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-2xl">
              <Avatar
                src={viewModal.data.image_url}
                name={viewModal.data.name}
                size="xl"
                rounded="2xl"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {viewModal.data.name}
                </h3>
                <p className="text-sm text-primary-600 font-medium">
                  {viewModal.data.role}
                </p>
                {viewModal.data.department && (
                  <span className="badge-green mt-1">
                    {viewModal.data.department}
                  </span>
                )}
              </div>
            </div>

            {viewModal.data.bio && (
              <ModalField label="Bio" value={viewModal.data.bio} />
            )}

            <ModalGrid>
              <ModalField label="Email"      value={viewModal.data.email} />
              <ModalField label="Phone"      value={viewModal.data.phone} />
              <ModalField
                label="Location"
                value={`${viewModal.data.location || ''} ${viewModal.data.country || ''}`.trim()}
              />
              <ModalField
                label="Experience"
                value={`${viewModal.data.years_experience || 0} years`}
              />
            </ModalGrid>

            {/* Social links */}
            {(viewModal.data.linkedin_url ||
              viewModal.data.twitter_url  ||
              viewModal.data.instagram_url) && (
              <div className="flex gap-3">
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
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          FORM MODAL
          ════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? 'Edit Member' : 'Add Member'}
        size="xl"
        icon={<UserCircle size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={formModal.close}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">

          {/* Personal */}
          <ModalSection title="Personal">
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => upd('name', e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Role *</label>
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
                  value={form.years_experience}
                  onChange={(e) => upd('years_experience', Number(e.target.value))}
                />
              </div>
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Bio</label>
              <textarea
                className="input min-h-[100px]"
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
                <label className="input-label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => upd('email', e.target.value)}
                  placeholder="jane@altuvera.com"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => upd('phone', e.target.value)}
                  placeholder="+250 700 000 000"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Location</label>
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
                  placeholder="https://linkedin.com/in/…"
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
                  placeholder="https://x.com/…"
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
                  placeholder="https://instagram.com/…"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Website URL</label>
                <input
                  className="input"
                  value={form.website_url}
                  onChange={(e) => upd('website_url', e.target.value)}
                  placeholder="https://…"
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
            />
            <TagInput
              label="Languages"
              value={Array.isArray(form.languages) ? form.languages : []}
              onChange={(v) => upd('languages', v)}
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
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => upd('is_featured', e.target.checked)}
                className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">Featured</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => upd('is_active', e.target.checked)}
                className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          DELETE CONFIRM
          ════════════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title={`Remove ${deleteModal.data?.name}?`}
      />
    </div>
  )
}