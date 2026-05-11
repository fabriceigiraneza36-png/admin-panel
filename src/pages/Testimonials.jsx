import React, { useEffect, useState, useCallback } from 'react'
import { Star, Plus, Pencil, Trash2, RefreshCw, Eye, Quote } from 'lucide-react'
import { testimonialsAPI }   from '@api/testimonials'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination            from '@components/common/Pagination'
import SearchBar             from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                 from '@components/common/Badge'
import Avatar                from '@components/common/Avatar'
import ConfirmDialog         from '@components/common/ConfirmDialog'
import ImageUpload           from '@components/common/ImageUpload'
import { useModal }          from '@hooks/useModal'
import { useToast }          from '@hooks/useToast'
import { usePagination }     from '@hooks/usePagination'
import { useDebounce }       from '@hooks/useDebounce'
import { formatDate, formatRating, truncate } from '@utils/formatters'
import { getErrorMessage }   from '@api/client'

const INIT = { content: '', author_name: '', author_location: '', author_avatar: '', rating: 5, is_featured: false, is_active: true }

export default function Testimonials() {
  const toast = useToast(), pag = usePagination(), viewModal = useModal(), formModal = useModal(), deleteModal = useModal()
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [search, setSearch] = useState(''), [form, setForm] = useState(INIT), [editing, setEditing] = useState(null)
  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await testimonialsAPI.getAll({ page: pag.page, limit: pag.limit, ...(dSearch && { search: dSearch }) })
      setItems(data.data || data.testimonials || []); pag.setTotal(data.pagination?.total || data.total || 0) }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setLoading(false) }
  }, [pag.page, pag.limit, dSearch])
  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(INIT); setEditing(null); formModal.open() }
  const openEdit = (t) => { const f = { ...INIT }; Object.keys(f).forEach((k) => { if (t[k] != null) f[k] = t[k] }); setForm(f); setEditing(t); formModal.open() }
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const handleSave = async () => { if (!form.content.trim()) return toast.error('Content required'); setSaving(true)
    try { if (editing) { await testimonialsAPI.update(editing.id, form); toast.success('Updated') } else { await testimonialsAPI.create(form); toast.success('Created') }; formModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setSaving(false) } }
  const handleDelete = async () => { try { await testimonialsAPI.remove(deleteModal.data.id); toast.success('Deleted'); deleteModal.close(); load() } catch (e) { toast.error(getErrorMessage(e)) } }

  const renderStars = (r) => (
    <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < Math.round(r || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'} />)}</div>
  )

  const columns = [
    { key: 'content', label: 'Testimonial', render: (v) => <p className="max-w-[250px] truncate text-sm text-slate-700">{v}</p> },
    { key: 'author_name', label: 'Author', render: (_, r) => (<div className="flex items-center gap-2"><Avatar src={r.author_avatar} name={r.author_name} size="xs" rounded="full" /><span className="text-sm font-medium">{r.author_name || '—'}</span></div>) },
    { key: 'author_location', label: 'Location', render: (v) => v || '—' },
    { key: 'rating', label: 'Rating', render: (v) => renderStars(v) },
    { key: 'is_featured', label: 'Featured', align: 'center', render: (v) => v ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" /> : <span className="text-slate-300">—</span> },
    { key: 'is_active', label: 'Status', render: (v) => <Badge status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Inactive'} /> },
    { key: 'actions', label: '', align: 'right', width: '100px', render: (_, r) => (<TableActions><TableAction icon={Eye} label="View" onClick={() => viewModal.open(r)} /><TableAction icon={Pencil} label="Edit" onClick={() => openEdit(r)} /><TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" /></TableActions>) },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header"><div><h1 className="page-title flex items-center gap-2"><Quote size={28} className="text-primary-600" /> Testimonials</h1><p className="page-subtitle">{pag.total} testimonials</p></div>
        <div className="flex gap-2"><button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button><button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add</button></div></div>
      <div className="card p-4"><SearchBar value={search} onChange={setSearch} placeholder="Search testimonials…" className="max-w-sm" /></div>
      <div className="card"><Table columns={columns} data={items} loading={loading} onRowClick={(r) => viewModal.open(r)} />
        <Pagination {...pag} onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} /></div>

      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close} title="Testimonial" size="sm" icon={<Quote size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={viewModal.close} className="btn-secondary">Close</button><button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary"><Pencil size={14} /> Edit</button></div>}>
        {viewModal.data && (<div className="space-y-4 text-center">
          <Avatar src={viewModal.data.author_avatar} name={viewModal.data.author_name} size="xl" rounded="full" className="mx-auto" />
          <div>{renderStars(viewModal.data.rating)}</div>
          <blockquote className="text-slate-700 italic text-sm leading-relaxed">"{viewModal.data.content}"</blockquote>
          <p className="font-bold text-slate-800">{viewModal.data.author_name}</p>
          {viewModal.data.author_location && <p className="text-xs text-slate-400">{viewModal.data.author_location}</p>}
        </div>)}
      </Modal>

      <Modal isOpen={formModal.isOpen} onClose={formModal.close} title={editing ? 'Edit' : 'Add Testimonial'} size="md" icon={<Quote size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button></div>}>
        <div className="space-y-4">
          <div className="input-group"><label className="input-label">Content *</label><textarea className="input min-h-[120px]" value={form.content} onChange={(e) => upd('content', e.target.value)} placeholder="What the customer said…" /></div>
          <ModalGrid>
            <div className="input-group"><label className="input-label">Author Name</label><input className="input" value={form.author_name} onChange={(e) => upd('author_name', e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Location</label><input className="input" value={form.author_location} onChange={(e) => upd('author_location', e.target.value)} /></div>
          </ModalGrid>
          <div className="input-group"><label className="input-label">Rating (1-5)</label>
            <div className="flex items-center gap-1">{[1,2,3,4,5].map((n) => (<button key={n} type="button" onClick={() => upd('rating', n)}><Star size={24} className={n <= form.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200 hover:text-amber-300'} /></button>))}</div></div>
          <ImageUpload label="Author Avatar" value={form.author_avatar} onChange={(v) => upd('author_avatar', v)} folder="testimonials" />
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_featured} onChange={(e) => upd('is_featured', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Featured</span></label>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => upd('is_active', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Active</span></label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete" title="Delete testimonial?" />
    </div>
  )
}