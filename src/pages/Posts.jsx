import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText, Plus, Eye, Pencil, Trash2, RefreshCw,
  Globe2, EyeOff, Star,
} from 'lucide-react'
import { postsAPI }        from '@api/posts'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination          from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge } from '@components/common/Badge'
import Avatar              from '@components/common/Avatar'
import ConfirmDialog       from '@components/common/ConfirmDialog'
import ImageUpload         from '@components/common/ImageUpload'
import TagInput            from '@components/common/TagInput'
import { useModal }        from '@hooks/useModal'
import { useToast }        from '@hooks/useToast'
import { usePagination }   from '@hooks/usePagination'
import { useDebounce }     from '@hooks/useDebounce'
import { formatDate, formatNumber, formatTimeAgo, truncate } from '@utils/formatters'
import { getErrorMessage } from '@api/client'

const INIT = {
  title: '', slug: '', content: '', excerpt: '', image_url: '', cover_image_url: '',
  author_name: '', author_avatar: '', category: '', tags: [],
  is_published: false, is_featured: false, meta_title: '', meta_description: '',
}

export default function Posts() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,   setItems]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [search,  setSearch]    = useState('')
  const [pubFilter, setPub]     = useState('')
  const [sortBy,    setSortBy]  = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [form,    setForm]      = useState(INIT)
  const [editing, setEditing]   = useState(null)

  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(dSearch && { search: dSearch }),
        ...(pubFilter && { published: pubFilter === 'true' }),
      }
      const { data } = await postsAPI.getAll(params)
      setItems(data.data || data.posts || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, pubFilter])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(INIT); setEditing(null); formModal.open() }

  const openEdit = (p) => {
    const f = { ...INIT }
    Object.keys(f).forEach((k) => { if (p[k] !== undefined && p[k] !== null) f[k] = p[k] })
    setForm(f); setEditing(p); formModal.open()
  }

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const payload = { ...form, slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-') }
      if (editing) {
        await postsAPI.update(editing.id, payload)
        toast.success('Post updated')
      } else {
        await postsAPI.create(payload)
        toast.success('Post created')
      }
      formModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const handleTogglePublish = async (post) => {
    try {
      if (post.is_published) {
        await postsAPI.unpublish(post.id)
        toast.success('Post unpublished')
      } else {
        await postsAPI.publish(post.id)
        toast.success('Post published')
      }
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleDelete = async () => {
    try {
      await postsAPI.remove(deleteModal.data.id)
      toast.success('Post deleted')
      deleteModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  const columns = [
    {
      key: 'title', label: 'Title', sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar src={r.image_url} name={r.title} size="sm" rounded="lg" />
          <div>
            <p className="font-semibold text-slate-800 max-w-[200px] truncate">{r.title}</p>
            <p className="text-xs text-slate-400">{r.category || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'author_name', label: 'Author', render: (v) => v || '—' },
    {
      key: 'is_published', label: 'Status',
      render: (v) => <Badge status={v ? 'published' : 'draft'} label={v ? 'Published' : 'Draft'} />,
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: (v) => v ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" /> : <span className="text-slate-300">—</span>,
    },
    { key: 'view_count', label: 'Views', align: 'right', sortable: true, render: (v) => formatNumber(v) },
    { key: 'created_at', label: 'Created', sortable: true, render: (v) => formatTimeAgo(v) },
    {
      key: 'actions', label: '', align: 'right', width: '140px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"    onClick={() => viewModal.open(r)} />
          <TableAction
            icon={r.is_published ? EyeOff : Globe2}
            label={r.is_published ? 'Unpublish' : 'Publish'}
            onClick={() => handleTogglePublish(r)}
            variant={r.is_published ? 'warning' : 'success'}
          />
          <TableAction icon={Pencil} label="Edit"    onClick={() => openEdit(r)} />
          <TableAction icon={Trash2} label="Delete"  onClick={() => deleteModal.open(r)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText size={28} className="text-primary-600" /> Blog Posts
          </h1>
          <p className="page-subtitle">Manage articles ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Post</button>
        </div>
      </div>

      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search posts…" className="max-w-sm" />
          <FilterSelect label="Status" value={pubFilter}
            onChange={(v) => { setPub(v); pag.reset() }}
            options={[{ value: '', label: 'All' }, { value: 'true', label: 'Published' }, { value: 'false', label: 'Drafts' }]} />
        </FilterBar>
      </div>

      <div className="card">
        <Table columns={columns} data={items} loading={loading}
          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
          onRowClick={(r) => viewModal.open(r)} />
        <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize} />
      </div>

      {/* View */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close}
        title={viewModal.data?.title} size="lg" icon={<FileText size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={viewModal.close} className="btn-secondary">Close</button>
          <button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary">
            <Pencil size={14} /> Edit</button>
        </div>}>
        {viewModal.data && (
          <div className="space-y-6">
            {viewModal.data.cover_image_url && (
              <img src={viewModal.data.cover_image_url} alt="" className="w-full h-48 object-cover rounded-2xl" />
            )}
            <ModalSection title="Details">
              <ModalGrid>
                <ModalField label="Author" value={viewModal.data.author_name} />
                <ModalField label="Category" value={viewModal.data.category} />
                <ModalField label="Status" value={<Badge status={viewModal.data.is_published ? 'published' : 'draft'} label={viewModal.data.is_published ? 'Published' : 'Draft'} />} />
                <ModalField label="Views" value={formatNumber(viewModal.data.view_count)} />
                <ModalField label="Read Time" value={`${viewModal.data.read_time || 0} min`} />
                <ModalField label="Created" value={formatDate(viewModal.data.created_at)} />
              </ModalGrid>
            </ModalSection>
            {viewModal.data.excerpt && <ModalField label="Excerpt" value={viewModal.data.excerpt} />}
            {viewModal.data.tags?.length > 0 && (
              <ModalSection title="Tags">
                <div className="flex flex-wrap gap-2">
                  {viewModal.data.tags.map((t, i) => <span key={i} className="badge-green">{t}</span>)}
                </div>
              </ModalSection>
            )}
            {viewModal.data.content && (
              <ModalSection title="Content">
                <div className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: viewModal.data.content }} />
              </ModalSection>
            )}
          </div>
        )}
      </Modal>

      {/* Form */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.close}
        title={editing ? 'Edit Post' : 'New Post'} size="xl" icon={<FileText size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
        </div>}>
        <div className="space-y-6">
          <ModalSection title="Post Details">
            <ModalGrid>
              <div className="input-group sm:col-span-2"><label className="input-label">Title *</label>
                <input className="input" value={form.title} onChange={(e) => upd('title', e.target.value)}
                  placeholder="Post title" /></div>
              <div className="input-group"><label className="input-label">Slug</label>
                <input className="input" value={form.slug} onChange={(e) => upd('slug', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Category</label>
                <input className="input" value={form.category} onChange={(e) => upd('category', e.target.value)}
                  placeholder="e.g., travel, tips" /></div>
              <div className="input-group"><label className="input-label">Author</label>
                <input className="input" value={form.author_name} onChange={(e) => upd('author_name', e.target.value)} /></div>
            </ModalGrid>
            <div className="input-group"><label className="input-label">Excerpt</label>
              <textarea className="input min-h-[70px]" value={form.excerpt} onChange={(e) => upd('excerpt', e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Content</label>
              <textarea className="input min-h-[180px]" value={form.content} onChange={(e) => upd('content', e.target.value)}
                placeholder="Write your post content here (HTML supported)…" /></div>
          </ModalSection>

          <ModalSection title="Media & Tags">
            <ModalGrid>
              <ImageUpload label="Featured Image" value={form.image_url} onChange={(v) => upd('image_url', v)} folder="posts" />
              <ImageUpload label="Cover Image" value={form.cover_image_url} onChange={(v) => upd('cover_image_url', v)} folder="posts" />
            </ModalGrid>
            <TagInput label="Tags" value={form.tags} onChange={(v) => upd('tags', v)} />
          </ModalSection>

          <ModalSection title="SEO">
            <ModalGrid>
              <div className="input-group"><label className="input-label">Meta Title</label>
                <input className="input" value={form.meta_title} onChange={(e) => upd('meta_title', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Meta Description</label>
                <input className="input" value={form.meta_description} onChange={(e) => upd('meta_description', e.target.value)} /></div>
            </ModalGrid>
          </ModalSection>

          <ModalSection title="Options">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={(e) => upd('is_published', e.target.checked)}
                  className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 focus:ring-primary-500 cursor-pointer" />
                <span className="text-sm font-medium text-slate-700">Published</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => upd('is_featured', e.target.checked)}
                  className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 focus:ring-primary-500 cursor-pointer" />
                <span className="text-sm font-medium text-slate-700">Featured</span>
              </label>
            </div>
          </ModalSection>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close}
        onConfirm={handleDelete} type="delete" title="Delete this post?"
        description="This permanently removes the blog post." />
    </div>
  )
}