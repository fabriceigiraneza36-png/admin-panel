import React, { useEffect, useState, useCallback } from 'react'
import { Image as ImageIcon, Plus, Pencil, Trash2, RefreshCw, Eye, Star, Maximize2 } from 'lucide-react'
import { galleryAPI }        from '@api/gallery'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                 from '@components/common/Badge'
import ConfirmDialog         from '@components/common/ConfirmDialog'
import ImageUpload           from '@components/common/ImageUpload'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Pagination            from '@components/common/Pagination'
import EmptyState            from '@components/common/EmptyState'
import { useModal }          from '@hooks/useModal'
import { useToast }          from '@hooks/useToast'
import { usePagination }     from '@hooks/usePagination'
import { useDebounce }       from '@hooks/useDebounce'
import { formatDate }        from '@utils/formatters'
import { getErrorMessage }   from '@api/client'
import { motion }            from 'framer-motion'

const INIT = { title: '', description: '', image_url: '', thumbnail_url: '', category: '', location: '', photographer: '', sort_order: 0, is_featured: false, is_active: true }
const GAL_CATS = ['destinations', 'wildlife', 'culture', 'landscapes', 'people', 'food', 'adventure', 'accommodation']

export default function Gallery() {
  const toast = useToast(), pag = usePagination(), viewModal = useModal(), formModal = useModal(), deleteModal = useModal()
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [search, setSearch] = useState(''), [catFilt, setCatFilt] = useState('')
  const [form, setForm] = useState(INIT), [editing, setEditing] = useState(null)
  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await galleryAPI.getAll({ page: pag.page, limit: pag.limit, ...(dSearch && { search: dSearch }), ...(catFilt && { category: catFilt }) })
      setItems(data.data || data.gallery || []); pag.setTotal(data.pagination?.total || data.total || 0) }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setLoading(false) }
  }, [pag.page, pag.limit, dSearch, catFilt])
  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(INIT); setEditing(null); formModal.open() }
  const openEdit = (g) => { const f = { ...INIT }; Object.keys(f).forEach((k) => { if (g[k] != null) f[k] = g[k] }); setForm(f); setEditing(g); formModal.open() }
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const handleSave = async () => { if (!form.image_url) return toast.error('Image required'); setSaving(true)
    try { if (editing) { await galleryAPI.update(editing.id, form); toast.success('Updated') } else { await galleryAPI.create(form); toast.success('Added') }; formModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setSaving(false) } }
  const handleDelete = async () => { try { await galleryAPI.remove(deleteModal.data.id); toast.success('Removed'); deleteModal.close(); load() } catch (e) { toast.error(getErrorMessage(e)) } }

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header"><div><h1 className="page-title flex items-center gap-2"><ImageIcon size={28} className="text-primary-600" /> Gallery</h1><p className="page-subtitle">{pag.total} images</p></div>
        <div className="flex gap-2"><button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button><button onClick={openCreate} className="btn-primary"><Plus size={16} /> Upload</button></div></div>

      <div className="card p-4"><FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search gallery…" className="max-w-sm" />
        <FilterSelect label="Category" value={catFilt} onChange={(v) => { setCatFilt(v); pag.reset() }}
          options={[{ value: '', label: 'All' }, ...GAL_CATS.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
      </FilterBar></div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer aspect-[4/3] rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState type="empty" title="Gallery is empty" description="Upload your first image" action={openCreate} actionLabel="Upload Image" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((img) => (
            <motion.div key={img.id} whileHover={{ y: -4 }} className="card-hover group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl" onClick={() => viewModal.open(img)}>
              <img src={img.thumbnail_url || img.image_url} alt={img.title || ''} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <p className="text-white text-sm font-semibold truncate">{img.title || 'Untitled'}</p>
                {img.category && <span className="text-white/70 text-xs">{img.category}</span>}
              </div>
              {img.is_featured && <Star size={16} className="absolute top-2 right-2 text-amber-500 fill-amber-500 drop-shadow" />}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(img)} className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center text-slate-600 hover:text-primary-600"><Pencil size={12} /></button>
                <button onClick={() => deleteModal.open(img)} className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-600"><Trash2 size={12} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Pagination {...pag} onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} />

      {/* Lightbox view */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.title || 'Image'} size="lg" noPadding
        footer={<div className="flex justify-end gap-2 px-6"><button onClick={viewModal.close} className="btn-secondary">Close</button><button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary"><Pencil size={14} /> Edit</button></div>}>
        {viewModal.data && (<div>
          <img src={viewModal.data.image_url} alt={viewModal.data.title || ''} className="w-full max-h-[60vh] object-contain bg-black" />
          <div className="p-5 space-y-3">
            {viewModal.data.description && <p className="text-sm text-slate-600">{viewModal.data.description}</p>}
            <ModalGrid><ModalField label="Category" value={viewModal.data.category} /><ModalField label="Location" value={viewModal.data.location} /><ModalField label="Photographer" value={viewModal.data.photographer} /><ModalField label="Created" value={formatDate(viewModal.data.created_at)} /></ModalGrid>
          </div>
        </div>)}
      </Modal>

      {/* Form */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.close} title={editing ? 'Edit Image' : 'Upload Image'} size="md" icon={<ImageIcon size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Upload'}</button></div>}>
        <div className="space-y-4">
          <ImageUpload label="Image *" value={form.image_url} onChange={(v) => upd('image_url', v)} folder="gallery" />
          <ModalGrid>
            <div className="input-group"><label className="input-label">Title</label><input className="input" value={form.title} onChange={(e) => upd('title', e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Category</label><select className="input cursor-pointer" value={form.category} onChange={(e) => upd('category', e.target.value)}><option value="">Select…</option>{GAL_CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
            <div className="input-group"><label className="input-label">Location</label><input className="input" value={form.location} onChange={(e) => upd('location', e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Photographer</label><input className="input" value={form.photographer} onChange={(e) => upd('photographer', e.target.value)} /></div>
          </ModalGrid>
          <div className="input-group"><label className="input-label">Description</label><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => upd('description', e.target.value)} /></div>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_featured} onChange={(e) => upd('is_featured', e.target.checked)} className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 cursor-pointer" /><span className="text-sm font-medium text-slate-700">Featured</span></label>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete" title="Delete this image?" />
    </div>
  )
}