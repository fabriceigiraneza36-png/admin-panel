// admin/src/pages/Posts.jsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText, Plus, Eye, Pencil, Trash2, RefreshCw,
  Globe2, EyeOff, Star, ChevronRight, ChevronLeft,
  Check, Image, Tag, Settings, AlignLeft, User,
} from 'lucide-react'
import { postsAPI }        from '@api/posts'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination          from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
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
import { formatDate, formatNumber, formatTimeAgo } from '@utils/formatters'
import { getErrorMessage } from '@api/client'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const INIT = {
  title: '', slug: '', content: '', excerpt: '', image_url: '', cover_image_url: '',
  author_name: '', author_avatar: '', category: '', tags: [],
  is_published: false, is_featured: false, meta_title: '', meta_description: '',
}

const STEPS = [
  { id: 'content', label: 'Content',    icon: AlignLeft, desc: 'Title, body & excerpt'    },
  { id: 'author',  label: 'Author',     icon: User,      desc: 'Author & category'         },
  { id: 'media',   label: 'Media',      icon: Image,     desc: 'Images & tags'             },
  { id: 'publish', label: 'Publish',    icon: Settings,  desc: 'SEO & visibility options'  },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current, completed, onGoTo }) {
  return (
    <div className="flex items-center mb-6">
      {steps.map((step, idx) => {
        const isActive = step.id === current
        const isDone   = completed.includes(step.id)
        const isLast   = idx === steps.length - 1
        const Icon     = step.icon

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => isDone && onGoTo(step.id)}
              className={`flex flex-col items-center gap-1.5 flex-1 transition-all
                ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-9 h-9 rounded-xl border-2 flex items-center
                justify-center transition-all duration-300 shadow-sm
                ${isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-100'
                  : isActive
                    ? 'bg-white border-emerald-500 text-emerald-600'
                    : 'bg-white border-slate-200 text-slate-300'
                }`}>
                {isDone ? <Check size={15} className="stroke-[2.5]" /> : <Icon size={14} />}
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap
                ${isActive ? 'text-emerald-700' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </button>
            {!isLast && (
              <div className={`h-0.5 flex-shrink-0 w-8 mx-1 rounded-full transition-all
                ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-emerald-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── Toggle Option ────────────────────────────────────────────────────────────

function ToggleOption({ checked, onChange, label, desc, color = 'emerald' }) {
  return (
    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer
      transition-all duration-200
      ${checked
        ? `border-${color}-400 bg-${color}-50/70`
        : 'border-slate-200 bg-white hover:border-slate-300'
      }`}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
        shrink-0 mt-0.5 transition-all
        ${checked ? `bg-${color}-500 border-${color}-500` : 'border-slate-300'}`}>
        {checked && <Check size={11} className="text-white stroke-[3]" />}
      </div>
      <input type="checkbox" className="sr-only"
        checked={checked} onChange={e => onChange(e.target.checked)} />
      <div>
        <p className={`text-sm font-semibold ${checked ? `text-${color}-800` : 'text-slate-700'}`}>
          {label}
        </p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Posts() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [pubFilter, setPub]       = useState('')
  const [sortBy,    setSortBy]    = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [form,      setForm]      = useState(INIT)
  const [editing,   setEditing]   = useState(null)
  const [step,      setStep]      = useState('content')
  const [completed, setCompleted] = useState([])

  const dSearch = useDebounce(search, 400)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(dSearch    && { search: dSearch }),
        ...(pubFilter  && { published: pubFilter === 'true' }),
      }
      const { data } = await postsAPI.getAll(params)
      setItems(data.data || data.posts || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, pubFilter])

  useEffect(() => { load() }, [load])

  // ── Form helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(INIT)
    setEditing(null)
    setStep('content')
    setCompleted([])
    formModal.open()
  }

  const openEdit = (p) => {
    const f = { ...INIT }
    Object.keys(f).forEach(k => { if (p[k] !== undefined && p[k] !== null) f[k] = p[k] })
    setForm(f)
    setEditing(p)
    setStep('content')
    setCompleted(['content', 'author', 'media'])
    formModal.open()
  }

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Step navigation ───────────────────────────────────────────────────────

  const stepIds   = STEPS.map(s => s.id)
  const stepIndex = stepIds.indexOf(step)

  const goNext = () => {
    if (step === 'content' && !form.title.trim())
      return toast.error('Please enter a title first')
    if (!completed.includes(step)) setCompleted(p => [...p, step])
    const next = stepIds[stepIndex + 1]
    if (next) setStep(next)
  }

  const goPrev = () => {
    const prev = stepIds[stepIndex - 1]
    if (prev) setStep(prev)
  }

  const goTo = (id) => setStep(id)

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-'),
      }
      if (editing) {
        await postsAPI.update(editing.id, payload)
        toast.success('Post updated')
      } else {
        await postsAPI.create(payload)
        toast.success('Post created')
      }
      formModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  // ── Publish toggle ────────────────────────────────────────────────────────

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

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await postsAPI.remove(deleteModal.data.id)
      toast.success('Post deleted')
      deleteModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  // ── Table columns ─────────────────────────────────────────────────────────

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
    {
      key: 'author_name', label: 'Author',
      render: v => v
        ? (
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <User size={13} className="text-slate-400" /> {v}
          </span>
        ) : '—',
    },
    {
      key: 'is_published', label: 'Status',
      render: v => (
        <Badge
          status={v ? 'published' : 'draft'}
          label={v ? 'Published' : 'Draft'}
        />
      ),
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: v => v
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'view_count', label: 'Views', align: 'right', sortable: true,
      render: v => (
        <span className="font-semibold text-slate-600 text-sm">
          {formatNumber(v || 0)}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: v => <span className="text-sm text-slate-500">{formatTimeAgo(v)}</span>,
    },
    {
      key: 'actions', label: '', align: 'right', width: '140px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye} label="View" onClick={() => viewModal.open(r)} />
          <TableAction
            icon={r.is_published ? EyeOff : Globe2}
            label={r.is_published ? 'Unpublish' : 'Publish'}
            onClick={() => handleTogglePublish(r)}
            variant={r.is_published ? 'warning' : 'success'}
          />
          <TableAction icon={Pencil} label="Edit"   onClick={() => openEdit(r)} />
          <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      case 'content': return (
        <motion.div key="content" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          <Field label="Post Title" required>
            <input
              className="input text-base font-medium"
              value={form.title}
              onChange={e => upd('title', e.target.value)}
              placeholder="Write a compelling title…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug" hint="Auto-generated if left blank">
              <input className="input font-mono text-sm"
                value={form.slug}
                onChange={e => upd('slug', e.target.value)}
                placeholder="my-post-slug" />
            </Field>
            <div /> {/* spacer */}
          </div>

          <Field label="Excerpt" hint="A short summary shown in previews">
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.excerpt}
              onChange={e => upd('excerpt', e.target.value)}
              placeholder="Brief summary of this post…"
            />
          </Field>

          <Field label="Content (HTML supported)" required>
            <textarea
              className="input min-h-[200px] resize-y font-mono text-sm"
              value={form.content}
              onChange={e => upd('content', e.target.value)}
              placeholder="Write your full post content here…"
            />
          </Field>
        </motion.div>
      )

      case 'author': return (
        <motion.div key="author" className="space-y-4"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Author Name">
              <input className="input" value={form.author_name}
                onChange={e => upd('author_name', e.target.value)}
                placeholder="e.g., Jane Smith" />
            </Field>
            <Field label="Author Avatar URL">
              <input className="input" value={form.author_avatar}
                onChange={e => upd('author_avatar', e.target.value)}
                placeholder="https://…" />
            </Field>
          </div>

          <Field label="Category">
            <input className="input" value={form.category}
              onChange={e => upd('category', e.target.value)}
              placeholder="e.g., Safari Tips, Wildlife, Travel Guides" />
          </Field>

          {/* Author preview */}
          {(form.author_name || form.author_avatar) && (
            <div className="flex items-center gap-3 p-4 rounded-2xl
              bg-emerald-50 border border-emerald-200">
              {form.author_avatar
                ? <img src={form.author_avatar} alt={form.author_name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-300" />
                : <Avatar name={form.author_name} size="md" rounded="lg" />
              }
              <div>
                <p className="font-bold text-slate-800">
                  {form.author_name || 'Author Name'}
                </p>
                {form.category && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100
                    px-2 py-0.5 rounded-full border border-emerald-200">
                    {form.category}
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )

      case 'media': return (
        <motion.div key="media" className="space-y-5"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Featured Image
              </p>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl
                bg-emerald-50/30 p-2">
                <ImageUpload label="" value={form.image_url}
                  onChange={v => upd('image_url', v)} folder="posts" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Cover / Banner Image
              </p>
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl
                bg-emerald-50/30 p-2">
                <ImageUpload label="" value={form.cover_image_url}
                  onChange={v => upd('cover_image_url', v)} folder="posts" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Tags
            </p>
            <TagInput label="" value={form.tags} onChange={v => upd('tags', v)}
              placeholder="Add tags and press Enter…" />
            {form.tags.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1">
                {form.tags.length} tag{form.tags.length !== 1 ? 's' : ''} added
              </p>
            )}
          </div>
        </motion.div>
      )

      case 'publish': return (
        <motion.div key="publish" className="space-y-5"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>

          {/* SEO */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              SEO Settings
            </p>
            <div className="space-y-3">
              <Field label="Meta Title" hint={`${form.meta_title.length}/60 chars recommended`}>
                <input className="input" value={form.meta_title}
                  onChange={e => upd('meta_title', e.target.value)}
                  placeholder="SEO title (defaults to post title)" />
              </Field>
              <Field label="Meta Description" hint={`${form.meta_description.length}/160 chars recommended`}>
                <textarea className="input min-h-[70px] resize-none"
                  value={form.meta_description}
                  onChange={e => upd('meta_description', e.target.value)}
                  placeholder="Short description for search engines…" />
              </Field>
            </div>
          </div>

          {/* Publishing options */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Publishing Options
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleOption
                checked={form.is_published}
                onChange={v => upd('is_published', v)}
                label="Publish"
                desc="Make this post visible to all users"
              />
              <ToggleOption
                checked={form.is_featured}
                onChange={v => upd('is_featured', v)}
                label="Featured"
                desc="Show in featured / homepage sections"
                color="amber"
              />
            </div>
          </div>

          {/* Final summary */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
            border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-3">
              ✓ Ready to {editing ? 'update' : 'publish'}
            </p>
            <div className="space-y-1.5 text-xs">
              {[
                ['Title',    form.title || '—'],
                ['Author',   form.author_name || '—'],
                ['Category', form.category || '—'],
                ['Tags',     form.tags.length ? `${form.tags.length} tag(s)` : '—'],
                ['Status',   form.is_published ? '🟢 Published' : '⚪ Draft'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-400 w-16 shrink-0">{k}:</span>
                  <span className="font-semibold text-slate-700 truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )

      default: return null
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 page-enter">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText size={28} className="text-emerald-600" /> Blog Posts
          </h1>
          <p className="page-subtitle">Manage articles ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Post
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch}
            placeholder="Search posts…" className="max-w-sm" />
          <FilterSelect label="Status" value={pubFilter}
            onChange={v => { setPub(v); pag.reset() }}
            options={[
              { value: '',      label: 'All'       },
              { value: 'true',  label: 'Published' },
              { value: 'false', label: 'Drafts'    },
            ]} />
        </FilterBar>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <Table columns={columns} data={items} loading={loading}
          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
          onRowClick={r => viewModal.open(r)} />
        <Pagination
          page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          VIEW MODAL
          ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={viewModal.data?.title}
        size="lg"
        icon={<FileText size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">Close</button>
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
            {viewModal.data.cover_image_url && (
              <img src={viewModal.data.cover_image_url} alt=""
                className="w-full h-48 object-cover rounded-2xl" />
            )}
            <ModalSection title="Details">
              <ModalGrid>
                <ModalField label="Author"   value={viewModal.data.author_name} />
                <ModalField label="Category" value={viewModal.data.category} />
                <ModalField label="Status"
                  value={
                    <Badge
                      status={viewModal.data.is_published ? 'published' : 'draft'}
                      label={viewModal.data.is_published ? 'Published' : 'Draft'}
                    />
                  }
                />
                <ModalField label="Views"     value={formatNumber(viewModal.data.view_count)} />
                <ModalField label="Read Time" value={`${viewModal.data.read_time || 0} min`} />
                <ModalField label="Created"   value={formatDate(viewModal.data.created_at)} />
              </ModalGrid>
            </ModalSection>
            {viewModal.data.excerpt && (
              <ModalField label="Excerpt" value={viewModal.data.excerpt} />
            )}
            {viewModal.data.tags?.length > 0 && (
              <ModalSection title="Tags">
                <div className="flex flex-wrap gap-2">
                  {viewModal.data.tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                      text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
              </ModalSection>
            )}
            {viewModal.data.content && (
              <ModalSection title="Content Preview">
                <div className="prose prose-sm max-w-none text-slate-700 max-h-64 overflow-y-auto
                  p-4 bg-slate-50 rounded-xl border border-slate-100"
                  dangerouslySetInnerHTML={{ __html: viewModal.data.content }} />
              </ModalSection>
            )}
          </div>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          MULTI-STEP FORM MODAL
          ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? 'Edit Post' : 'New Blog Post'}
        size="xl"
        icon={<FileText size={20} />}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button onClick={goPrev} className="btn-secondary btn-sm" disabled={saving}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              {stepIndex < STEPS.length - 1 ? (
                <button onClick={goNext} className="btn-primary btn-sm">
                  Continue <ChevronRight size={15} />
                </button>
              ) : (
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white
                        rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : editing ? (
                    <><Check size={15} /> Update Post</>
                  ) : (
                    <><Check size={15} /> Publish Post</>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div>
          <StepIndicator
            steps={STEPS}
            current={step}
            completed={completed}
            onGoTo={goTo}
          />
          <div className="min-h-[360px]">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this post?"
        description="This permanently removes the blog post and cannot be undone."
      />
    </div>
  )
}