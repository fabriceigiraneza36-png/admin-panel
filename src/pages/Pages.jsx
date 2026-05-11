import React, { useEffect, useState, useCallback } from 'react'
import { FileText, Plus, Pencil, Trash2, RefreshCw, Eye, Globe2, EyeOff } from 'lucide-react'
import { pagesAPI }          from '@api/pages'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination            from '@components/common/Pagination'
import SearchBar             from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                 from '@components/common/Badge'
import ConfirmDialog         from '@components/common/ConfirmDialog'
import { useModal }          from '@hooks/useModal'
import { useToast }          from '@hooks/useToast'
import { usePagination }     from '@hooks/usePagination'
import { useDebounce }       from '@hooks/useDebounce'
import { formatDate }        from '@utils/formatters'
import { getErrorMessage }   from '@api/client'

const INIT = { title: '', slug: '', content: '', meta_title: '', meta_description: '', is_published: true }

export default function PagesPage() {
  const toast = useToast(), pag = usePagination(), viewModal = useModal(), formModal = useModal(), deleteModal = useModal()
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [search, setSearch] = useState(''), [form, setForm] = useState(INIT), [editing, setEditing] = useState(null)
  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await pagesAPI.getAll({ page: pag.page, limit: pag.limit, ...(dSearch && { search: dSearch }) })
      setItems(data.data || data.pages || []); pag.setTotal(data.pagination?.total || data.total || 0) }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setLoading(false) }
  }, [pag.page, pag.limit, dSearch])
  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(INIT); setEditing(null); formModal.open() }
  const openEdit = (p) => { const f = { ...INIT }; Object.keys(f).forEach((k) => { if (p[k] != null) f[k] = p[k] }); setForm(f); setEditing(p); formModal.open() }
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title required')
    setSaving(true)
    try { const payload = { ...form, slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-') }
      if (editing) { await pagesAPI.update(editing.id, payload); toast.success('Updated') } else { await pagesAPI.create(payload); toast.success('Created') }
      formModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setSaving(false) }
  }

  const handleDelete = async () => { try { await pagesAPI.remove(deleteModal.data.id); toast.success('Deleted'); deleteModal.close(); load() } catch (e) { toast.error(getErrorMessage(e)) } }

  const columns = [
    { key: 'title', label: 'Title', sortable: true, render: (v) => <span className="font-semibold text-slate-800">{v}</span> },
    { key: 'slug', label: 'Slug', render: (v) => <code className="text-xs bg-surface-100 px-2 py-0.5 rounded">{v}</code> },
    { key: 'is_published', label: 'Status', render: (v) => <Badge status={v ? 'published' : 'draft'} label={v ? 'Published' : 'Draft'} /> },
    { key: 'updated_at', label: 'Updated', render: (v) => formatDate(v) },
    { key: 'actions', label: '', align: 'right', width: '100px', render: (_, r) => (<TableActions>
      <TableAction icon={Eye} label="View" onClick={() => viewModal.open(r)} />
      <TableAction icon={Pencil} label="Edit" onClick={() => openEdit(r)} />
      <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
    </TableActions>) },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header"><div><h1 className="page-title flex items-center gap-2"><FileText size={28} className="text-primary-600" /> Pages</h1><p className="page-subtitle">{pag.total} pages</p></div>
        <div className="flex gap-2"><button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button><button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Page</button></div></div>
      <div className="card p-4"><SearchBar value={search} onChange={setSearch} placeholder="Search pages…" className="max-w-sm" /></div>
      <div className="card"><Table columns={columns} data={items} loading={loading} onRowClick={(r) => viewModal.open(r)} />
        <Pagination {...pag} onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} /></div>

      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.title} size="lg" icon={<FileText size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={viewModal.close} className="btn-secondary">Close</button><button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary"><Pencil size={14} /> Edit</button></div>}>
        {viewModal.data && (<div className="space-y-4">
          <ModalGrid><ModalField label="Slug" value={viewModal.data.slug} /><ModalField label="Status" value={<Badge status={viewModal.data.is_published ? 'published' : 'draft'} label={viewModal.data.is_published ? 'Published' : 'Draft'} />} /></ModalGrid>
          {viewModal.data.content && <div className="prose prose-sm max-w-none text-slate-700 bg-surface-50 p-4 rounded-xl border border-surface-200" dangerouslySetInnerHTML={{ __html: viewModal.data.content }} />}
        </div>)}
      </Modal>

      <Modal isOpen={formModal.isOpen} onClose={formModal.close} title={editing ? 'Edit Page' : 'New Page'} size="lg" icon={<FileText size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button></div>}>
        <div className="space-y-4">
          <ModalGrid><div className="input-group"><label className="input-label">Title *</label><input className="input" value={form.title} onChange={(e) => upd('title', e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Slug</label><input className="input" value={form.slug} onChange={(e) => upd('slug', e.target.value)} /></div></ModalGrid>
          <div className="input-group"><label className="input-label">Content</label><textarea className="input min-h-[200px]" value={form.content} onChange={(e) => upd('content', e.target.value)} placeholder="Page content (HTML supported)…" /></div>
          <ModalGrid><div className="input-group"><label className="input-label">Meta Title</label><input className="input" value={form.meta_title} onChange={(e) => upd('meta_title', e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Meta Description</label><input className="input" value={form.meta_description} onChange={(e) => upd('meta_description', e.target.value)} /></div></ModalGrid>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_published} onChange={(e) => upd('is_published', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Published</span></label>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete" title="Delete this page?" />
    </div>
  )
}