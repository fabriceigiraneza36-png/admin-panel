import React, { useEffect, useState, useCallback } from 'react'
import {
  UserCircle, Plus, Pencil, Trash2, RefreshCw,
  Eye, Linkedin, Twitter, Instagram, Globe, Star,
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
import { formatDate }       from '@utils/formatters'
import { getErrorMessage }  from '@api/client'

const INIT = {
  name: '', role: '', department: '', bio: '', email: '', phone: '',
  whatsapp: '', image_url: '', linkedin_url: '', twitter_url: '',
  instagram_url: '', website_url: '', expertise: [], languages: [],
  years_experience: 0, location: '', country: '', display_order: 0,
  is_featured: false, is_active: true,
}

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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: pag.page, limit: pag.limit, ...(dSearch && { search: dSearch }), sortBy: 'display_order', order: 'asc' }
      const { data } = await teamAPI.getAll(params)
      setItems(data.data || data.team || data.members || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [pag.page, pag.limit, dSearch])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(INIT); setEditing(null); formModal.open() }
  const openEdit = (m) => {
    const f = { ...INIT }
    Object.keys(f).forEach((k) => {
      if (m[k] !== undefined && m[k] !== null) {
        if (Array.isArray(INIT[k]) && typeof m[k] === 'string') {
          try { f[k] = JSON.parse(m[k]) } catch { f[k] = [] }
        } else if (Array.isArray(INIT[k]) && Array.isArray(m[k])) {
          f[k] = m[k]
        } else { f[k] = m[k] }
      }
    })
    setForm(f); setEditing(m); formModal.open()
  }
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.role.trim()) return toast.error('Role is required')
    setSaving(true)
    try {
      const payload = { ...form, slug: form.name.toLowerCase().replace(/\s+/g, '-') }
      if (editing) { await teamAPI.update(editing.id, payload); toast.success('Member updated') }
      else { await teamAPI.create(payload); toast.success('Member added') }
      formModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await teamAPI.remove(deleteModal.data.id); toast.success('Member removed'); deleteModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const columns = [
    {
      key: 'name', label: 'Member', sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar src={r.image_url} name={r.name} size="md" rounded="xl" />
          <div><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.role}</p></div>
        </div>
      ),
    },
    { key: 'department', label: 'Department', render: (v) => v ? <span className="badge-green">{v}</span> : '—' },
    { key: 'location', label: 'Location', render: (_, r) => `${r.location || ''} ${r.country || ''}`.trim() || '—' },
    { key: 'years_experience', label: 'Exp.', align: 'center', render: (v) => `${v || 0}y` },
    { key: 'is_featured', label: 'Featured', align: 'center',
      render: (v) => v ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" /> : <span className="text-slate-300">—</span> },
    { key: 'is_active', label: 'Status', render: (v) => <Badge status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Inactive'} /> },
    { key: 'actions', label: '', align: 'right', width: '100px',
      render: (_, r) => (<TableActions>
        <TableAction icon={Eye} label="View" onClick={() => viewModal.open(r)} />
        <TableAction icon={Pencil} label="Edit" onClick={() => openEdit(r)} />
        <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
      </TableActions>) },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><UserCircle size={28} className="text-primary-600" /> Team</h1>
          <p className="page-subtitle">Manage team members ({pag.total})</p></div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Member</button></div>
      </div>

      <div className="card p-4"><SearchBar value={search} onChange={setSearch} placeholder="Search team…" className="max-w-sm" /></div>

      <div className="card">
        <Table columns={columns} data={items} loading={loading} onRowClick={(r) => viewModal.open(r)} />
        <Pagination {...pag} onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} />
      </div>

      {/* View */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name} size="md" icon={<UserCircle size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={viewModal.close} className="btn-secondary">Close</button>
          <button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary"><Pencil size={14} /> Edit</button></div>}>
        {viewModal.data && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-2xl">
              <Avatar src={viewModal.data.image_url} name={viewModal.data.name} size="xl" rounded="2xl" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">{viewModal.data.name}</h3>
                <p className="text-sm text-primary-600 font-medium">{viewModal.data.role}</p>
                {viewModal.data.department && <span className="badge-green mt-1">{viewModal.data.department}</span>}
              </div>
            </div>
            {viewModal.data.bio && <ModalField label="Bio" value={viewModal.data.bio} />}
            <ModalGrid>
              <ModalField label="Email" value={viewModal.data.email} />
              <ModalField label="Phone" value={viewModal.data.phone} />
              <ModalField label="Location" value={`${viewModal.data.location || ''} ${viewModal.data.country || ''}`} />
              <ModalField label="Experience" value={`${viewModal.data.years_experience || 0} years`} />
            </ModalGrid>
            {viewModal.data.linkedin_url && (
              <div className="flex gap-3">
                {viewModal.data.linkedin_url && <a href={viewModal.data.linkedin_url} target="_blank" rel="noreferrer" className="btn-icon text-blue-600 hover:bg-blue-50"><Linkedin size={16} /></a>}
                {viewModal.data.twitter_url && <a href={viewModal.data.twitter_url} target="_blank" rel="noreferrer" className="btn-icon text-sky-500 hover:bg-sky-50"><Twitter size={16} /></a>}
                {viewModal.data.instagram_url && <a href={viewModal.data.instagram_url} target="_blank" rel="noreferrer" className="btn-icon text-pink-500 hover:bg-pink-50"><Instagram size={16} /></a>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Form */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.close} title={editing ? 'Edit Member' : 'Add Member'} size="xl" icon={<UserCircle size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button></div>}>
        <div className="space-y-5">
          <ModalSection title="Personal">
            <ModalGrid>
              <div className="input-group"><label className="input-label">Full Name *</label><input className="input" value={form.name} onChange={(e) => upd('name', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Role *</label><input className="input" value={form.role} onChange={(e) => upd('role', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Department</label><input className="input" value={form.department} onChange={(e) => upd('department', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Experience (years)</label><input className="input" type="number" value={form.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} /></div>
            </ModalGrid>
            <div className="input-group"><label className="input-label">Bio</label><textarea className="input min-h-[100px]" value={form.bio} onChange={(e) => upd('bio', e.target.value)} /></div>
          </ModalSection>
          <ModalSection title="Contact">
            <ModalGrid>
              <div className="input-group"><label className="input-label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Phone</label><input className="input" value={form.phone} onChange={(e) => upd('phone', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Location</label><input className="input" value={form.location} onChange={(e) => upd('location', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Country</label><input className="input" value={form.country} onChange={(e) => upd('country', e.target.value)} /></div>
            </ModalGrid>
          </ModalSection>
          <ModalSection title="Social">
            <ModalGrid>
              <div className="input-group"><label className="input-label">LinkedIn</label><input className="input" value={form.linkedin_url} onChange={(e) => upd('linkedin_url', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Twitter</label><input className="input" value={form.twitter_url} onChange={(e) => upd('twitter_url', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Instagram</label><input className="input" value={form.instagram_url} onChange={(e) => upd('instagram_url', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Website</label><input className="input" value={form.website_url} onChange={(e) => upd('website_url', e.target.value)} /></div>
            </ModalGrid>
          </ModalSection>
          <ModalSection title="Skills">
            <TagInput label="Expertise" value={Array.isArray(form.expertise) ? form.expertise : []} onChange={(v) => upd('expertise', v)} />
            <TagInput label="Languages" value={Array.isArray(form.languages) ? form.languages : []} onChange={(v) => upd('languages', v)} />
          </ModalSection>
          <ImageUpload label="Photo" value={form.image_url} onChange={(v) => upd('image_url', v)} folder="team" />
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_featured} onChange={(e) => upd('is_featured', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Featured</span></label>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => upd('is_active', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Active</span></label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete" title={`Remove ${deleteModal.data?.name}?`} />
    </div>
  )
}