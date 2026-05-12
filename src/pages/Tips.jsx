import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Lightbulb, Plus, Pencil, Trash2, RefreshCw,
  Eye, Star, Download, FileSpreadsheet, FileText,
  ChevronDown,
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
import { formatDate }       from '@utils/formatters'
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
  const [exporting, setExporting] = useState(false)

  const [items,   setItems]    = useState([])
  const [loading, setLoading]  = useState(true)
  const [saving,  setSaving]   = useState(false)
  const [search,  setSearch]   = useState('')
  const [catFilt, setCatFilt]  = useState('')
  const [sortBy,  setSortBy]   = useState('sort_order')
  const [sortOrd, setSortOrd]  = useState('asc')
  const [form,    setForm]     = useState(INIT)
  const [editing, setEditing]  = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportBtnRef = useRef(null)

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
    // Map backend fields to our form fields
    f.summary = t.title || t.summary || ''
    f.body = t.content || t.body || ''
    f.category = t.category || ''
    f.trip_phase = t.trip_phase || ''
    f.priority_level = t.priority_level || 3
    f.read_time_minutes = t.read_time_minutes || 3
    f.checklist = t.checklist || []
    f.tags = t.tags || []
    f.icon = t.icon || ''
    f.image_url = t.image_url || ''
    f.sort_order = t.sort_order || 0
    f.is_featured = t.is_featured || false
    f.is_active = t.is_active ?? true
    f.slug = t.slug || ''
    f.audience = t.audience || 'all-travelers'
    f.difficulty_level = t.difficulty_level || 'all-levels'
    setForm(f); setEditing(t); formModal.open()
  }
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.summary.trim()) return toast.error('Title is required')
    if (!form.body?.trim()) return toast.error('Content is required')
    setSaving(true)
    try {
      const payload = {
        title:       form.summary.trim(),
        content:     form.body.trim(),
        slug:        form.slug || form.summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
        category:    form.category,
        trip_phase:  form.trip_phase,
        priority_level: form.priority_level,
        read_time_minutes: form.read_time_minutes,
        checklist:   form.checklist,
        tags:        form.tags,
        icon:        form.icon,
        image_url:   form.image_url,
        sort_order:  form.sort_order,
        is_featured: form.is_featured,
        is_active:   form.is_active,
        audience:    form.audience,
        difficulty_level: form.difficulty_level,
      }
      if (editing) {
        await tipsAPI.update(editing.id, payload)
        toast.success('Tip updated')
      } else {
        await tipsAPI.create(payload)
        toast.success('Tip created')
      }
      formModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await tipsAPI.remove(deleteModal.data.id); toast.success('Tip deleted'); deleteModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // EXPORT: Generate clean CSV from current (filtered/sorted) items
  // ════════════════════════════════════════════════════════════════════════════════
  const generateCSV = (rows) => {
    const headers = ['Title', 'Content', 'Category', 'Trip Phase', 'Priority', 'Read Time (min)', 'Checklist', 'Tags', 'Featured', 'Status']
    const csvRows = [headers.join(',')]
    for (const r of rows) {
      const title = `"${(r.title || r.summary || '').replace(/"/g, '""')}"`
      const content = `"${(r.content || r.body || '').replace(/"/g, '""')}"`
      const category = `"${(r.category || '').replace(/"/g, '""')}"`
      const phase = `"${(r.trip_phase || '').replace(/"/g, '""')}"`
      const priority = r.priority_level || 3
      const readTime = r.read_time_minutes || 3
      const checklist = `"${(Array.isArray(r.checklist) ? r.checklist.join('; ') : '').replace(/"/g, '""')}"`
      const tags = `"${(Array.isArray(r.tags) ? r.tags.join(', ') : '').replace(/"/g, '""')}"`
      const featured = r.is_featured ? 'Yes' : 'No'
      const status = r.is_active ? 'Active' : 'Inactive'
      csvRows.push([title, content, category, phase, priority, readTime, checklist, tags, featured, status].join(','))
    }
    return csvRows.join('\n')
  }

  // Pretty HTML table for PDF/print
  const generateHTML = (rows) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Travel Tips Export</title>
  <style>
    @page { size: auto; margin: 0.5in }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 1rem; color: #1f2937; background: #fff }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem }
    .header h1 { margin: 0; font-size: 1.5rem; color: #059669; font-weight: 700 }
    .header .meta { font-size: 0.875rem; color: #6b7280 }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem }
    th, td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; vertical-align: top }
    th { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); color: #065f46; font-weight: 600; position: sticky; top: 0 }
    tr:nth-child(even) { background: #f9fafb }
    tr:hover { background: #f3f4f6 }
    .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em }
    .badge-publication { background: #dbeafe; color: #1e40af }
    .badge-draft { background: #f3f4f6; color: #374151 }
    .badge-featured { background: #fef3c7; color: #92400e }
    .badge-general { background: #e0e7ff; color: #3730a3 }
    .checklist { margin: 0; padding-left: 1.25rem; font-size: 0.8125rem; color: #4b5563 }
    .tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.25rem }
    .tag { background: #f3f4f6; color: #374151; padding: 0.125rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem }
    .footer { margin-top: 1.5rem; font-size: 0.75rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 0.75rem; text-align: center }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }
  </style>
</head>
<body>
  <div class="header">
    <h1>✈️ Travel Tips Export</h1>
    <div class="meta">Generated ${new Date().toLocaleString()}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Content</th>
        <th>Category</th>
        <th>Trip Phase</th>
        <th>Priority</th>
        <th>Read Time</th>
        <th>Checklist</th>
        <th>Tags</th>
        <th>Featured</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
${rows.map(r => `
      <tr>
        <td><strong>${(r.title || r.summary || '').replace(/\n/g, '<br/>')}</strong></td>
        <td>${(r.content || r.body || '').replace(/\n/g, '<br/>')}</td>
        <td><span class="badge badge-general">${r.category || '—'}</span></td>
        <td>${r.trip_phase || '—'}</td>
        <td>${r.priority_level || 3}</td>
        <td>${r.read_time_minutes || 3} min</td>
        <td><ul class="checklist">${(Array.isArray(r.checklist) ? r.checklist.map(c => `<li>${c}</li>`) : '')}</ul></td>
        <td><div class="tags">${(Array.isArray(r.tags) ? r.tags.map(t => `<span class="tag">${t}</span>`) : '')}</div></td>
        <td>${r.is_featured ? '<span class="badge badge-featured">★ Featured</span>' : '—'}</td>
        <td><span class="badge ${r.is_active ? 'badge-publication' : 'badge-draft'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
      </tr>
`).join('')}
    </tbody>
  </table>
  <div class="footer">Exported from Altuvera Admin • ${rows.length} tip${rows.length !== 1 ? 's' : ''}</div>
</body>
</html>
`
  }

  const handleExport = async (format = 'csv') => {
    if (!items.length) {
      toast.error('No tips to export')
      return
    }
    setExporting(true)
    setShowExportMenu(false)
    try {
      const filename = `travel-tips-export-${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        const csv = generateCSV(items)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Exported CSV successfully')
      } else if (format === 'print' || format === 'pdf') {
        // Print stylesheet already available — user can Save as PDF
        const html = generateHTML(items)
        const win = window.open('', '_blank', 'width=1200,height=800')
        win.document.write(html)
        win.document.close()
        win.focus()
        toast.success('Print dialog opened — choose Save as PDF')
      }
    } catch (err) {
      console.error('[Export]', err)
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (exportBtnRef.current && !exportBtnRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const columns = [
    {
      key: 'summary', label: 'Tip', sortable: true,
      render: (_, r) => (
        <div className="max-w-[300px]">
          <p className="font-semibold text-slate-800 text-sm truncate">{r.title || r.summary}</p>
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
           {/* ── Export dropdown ── */}
           <div className="relative" ref={exportBtnRef}>
             <button
               onClick={() => setShowExportMenu(!showExportMenu)}
               disabled={exporting}
               className="btn-outline btn-sm flex items-center gap-1.5"
               title="Export tips"
             >
               <Download size={14} />
               <span>Export</span>
               <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
             </button>
             {showExportMenu && (
               <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-surface-200 py-1.5 z-50 animate-fade-in">
                 <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-primary-50/50 transition-colors">
                   <FileSpreadsheet size={16} className="text-emerald-600" />
                   <span>Download CSV</span>
                 </button>
                 <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-primary-50/50 transition-colors">
                   <FileText size={16} className="text-rose-600" />
                   <span>Print / PDF</span>
                 </button>
               </div>
             )}
           </div>
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
             <ModalField label="Title" value={viewModal.data.title || viewModal.data.summary} />
             {viewModal.data.content && <ModalField label="Content" value={viewModal.data.content} />}
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