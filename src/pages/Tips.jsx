import React, { useEffect, useState, useCallback } from 'react'
import {
  Lightbulb, Plus, Pencil, Trash2, RefreshCw,
  Eye, Star,
} from 'lucide-react'
import { tipsAPI }          from '@api/tips'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge } from '@components/common/Badge'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import ImageUpload          from '@components/common/ImageUpload'
import TagInput             from '@components/common/TagInput'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate, truncate } from '@utils/formatters'
import { TRIP_PHASES }      from '@utils/constants'
import { getErrorMessage }  from '@api/client'

const TIP_CATS = ['packing', 'safety', 'health', 'money', 'culture', 'transport', 'food', 'photography', 'general']
const INIT = {
  slug: '', summary: '', body: '', category: '', trip_phase: '',
  audience: 'all-travelers', difficulty_level: 'all-levels',
  priority_level: 3, read_time_minutes: 3, checklist: [], tags: [],
  icon: '', image_url: '', sort_order: 0, is_featured: false, is_active: true,
}

export default function Tips() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,   setItems]    = useState([])
  const [loading, setLoading]  = useState(true)
  const [saving,  setSaving]   = useState(false)
  const [search,  setSearch]   = useState('')
  const [catFilt, setCatFilt]  = useState('')
  const [sortBy,  setSortBy]   = useState('sort_order')
  const [sortOrd, setSortOrd]  = useState('asc')
  const [form,    setForm]     = useState(INIT)
  const [editing, setEditing]  = useState(null)

  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrd,
        ...(dSearch && { search: dSearch }), ...(catFilt && { category: catFilt }),
      }
      const { data } = await tipsAPI.getAll(params)
      setItems(data.data || data.tips || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [pag.page, pag.limit, sortBy, sortOrd, dSearch, catFilt])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(INIT); setEditing(null); formModal.open() }
  const openEdit = (t) => {
    const f = { ...INIT }
    Object.keys(f).forEach((k) => { if (t[k] !== undefined && t[k] !== null) f[k] = t[k] })
    setForm(f); setEditing(t); formModal.open()
  }
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.summary.trim()) return toast.error('Summary is required')
    setSaving(true)
    try {
      const payload = { ...form, slug: form.slug || form.summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) }
      if (editing) { await tipsAPI.update(editing.id, payload); toast.success('Tip updated') }
      else { await tipsAPI.create(payload); toast.success('Tip created') }
      formModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await tipsAPI.remove(deleteModal.data.id); toast.success('Tip deleted'); deleteModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const columns = [
    {
      key: 'summary', label: 'Tip', sortable: true,
      render: (_, r) => (
        <div className="max-w-[300px]">
          <p className="font-semibold text-slate-800 text-sm truncate">{r.summary}</p>
          <p className="text-xs text-slate-400 mt-0.5">{r.category || '—'} · {r.trip_phase || '—'}</p>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (v) => v ? <span className="badge-green capitalize">{v}</span> : '—' },
    { key: 'trip_phase', label: 'Phase', render: (v) => v ? <span className="badge-blue capitalize">{v}</span> : '—' },
    { key: 'priority_level', label: 'Priority', align: 'center', render: (v) => <span className="font-bold text-primary-700">{v || 3}</span> },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: (v) => v ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" /> : <span className="text-slate-300">—</span>,
    },
    { key: 'is_active', label: 'Status', render: (v) => <Badge status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions', label: '', align: 'right', width: '100px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"   onClick={() => viewModal.open(r)} />
          <TableAction icon={Pencil} label="Edit"   onClick={() => openEdit(r)} />
          <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Lightbulb size={28} className="text-primary-600" /> Travel Tips</h1>
          <p className="page-subtitle">Manage travel tips ({pag.total})</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Tip</button>
        </div>
      </div>

      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search tips…" className="max-w-sm" />
          <FilterSelect label="Category" value={catFilt}
            onChange={(v) => { setCatFilt(v); pag.reset() }}
            options={[{ value: '', label: 'All' }, ...TIP_CATS.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
        </FilterBar>
      </div>

      <div className="card">
        <Table columns={columns} data={items} loading={loading} sortBy={sortBy} sortOrder={sortOrd}
          onSort={(k, o) => { setSortBy(k); setSortOrd(o); pag.reset() }}
          onRowClick={(r) => viewModal.open(r)} />
        <Pagination {...pag} onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} />
      </div>

      {/* View */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close} title="Tip Details" size="md" icon={<Lightbulb size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={viewModal.close} className="btn-secondary">Close</button>
          <button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary"><Pencil size={14} /> Edit</button></div>}>
        {viewModal.data && (
          <div className="space-y-5">
            <ModalField label="Summary" value={viewModal.data.summary} />
            {viewModal.data.body && <ModalField label="Body" value={viewModal.data.body} />}
            <ModalGrid>
              <ModalField label="Category" value={viewModal.data.category} />
              <ModalField label="Trip Phase" value={viewModal.data.trip_phase} />
              <ModalField label="Priority" value={viewModal.data.priority_level} />
              <ModalField label="Read Time" value={`${viewModal.data.read_time_minutes} min`} />
            </ModalGrid>
            {viewModal.data.checklist?.length > 0 && (
              <ModalSection title="Checklist">
                <ul className="space-y-1">
                  {viewModal.data.checklist.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" /> {c}
                    </li>
                  ))}
                </ul>
              </ModalSection>
            )}
          </div>
        )}
      </Modal>

      {/* Form */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.close}
        title={editing ? 'Edit Tip' : 'Add Tip'} size="lg" icon={<Lightbulb size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
        </div>}>
        <div className="space-y-5">
          <div className="input-group"><label className="input-label">Summary *</label>
            <textarea className="input min-h-[80px]" value={form.summary} onChange={(e) => upd('summary', e.target.value)} /></div>
          <div className="input-group"><label className="input-label">Body</label>
            <textarea className="input min-h-[120px]" value={form.body} onChange={(e) => upd('body', e.target.value)} /></div>
          <ModalGrid>
            <div className="input-group"><label className="input-label">Category</label>
              <select className="input cursor-pointer" value={form.category} onChange={(e) => upd('category', e.target.value)}>
                <option value="">Select…</option>
                {TIP_CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select></div>
            <div className="input-group"><label className="input-label">Trip Phase</label>
              <select className="input cursor-pointer" value={form.trip_phase} onChange={(e) => upd('trip_phase', e.target.value)}>
                <option value="">Select…</option>
                {TRIP_PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select></div>
            <div className="input-group"><label className="input-label">Priority (1-5)</label>
              <input className="input" type="number" min={1} max={5} value={form.priority_level} onChange={(e) => upd('priority_level', Number(e.target.value))} /></div>
            <div className="input-group"><label className="input-label">Read Time (min)</label>
              <input className="input" type="number" min={1} value={form.read_time_minutes} onChange={(e) => upd('read_time_minutes', Number(e.target.value))} /></div>
          </ModalGrid>
          <TagInput label="Checklist Items" value={form.checklist} onChange={(v) => upd('checklist', v)} placeholder="Add checklist item" />
          <TagInput label="Tags" value={form.tags} onChange={(v) => upd('tags', v)} />
          <ImageUpload label="Image" value={form.image_url} onChange={(v) => upd('image_url', v)} folder="tips" />
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_featured} onChange={(e) => upd('is_featured', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 focus:ring-primary-500 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Featured</span></label>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => upd('is_active', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 focus:ring-primary-500 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Active</span></label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete" title="Delete this tip?" description="Cannot be undone." />
    </div>
  )
}