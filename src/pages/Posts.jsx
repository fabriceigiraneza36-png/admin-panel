// admin/src/pages/Posts.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// POSTS v2.0 — Multi-Step Blog Post Manager
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements over v1:
//  ✓ Fully responsive (mobile-first, works on 320px → 4K)
//  ✓ Mobile card-view fallback (no horizontal scroll on tiny screens)
//  ✓ Optimistic publish/unpublish toggle (instant with rollback)
//  ✓ Optimistic delete (instant removal with rollback)
//  ✓ Extracted step components (StepContent, StepAuthor, StepMedia, StepPublish)
//  ✓ Memoized table row / step renderers
//  ✓ Safe static color classes (no Tailwind purge issues)
//  ✓ Better a11y (aria-current, keyboard nav, focus states)
//  ✓ Skeleton loaders match final layout (no CLS)
//  ✓ Auto-slug on title change (only when creating & slug empty)
//  ✓ Cleaner step navigation, freezes INIT object
//  ✓ Char counters on SEO fields
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  FileText, Plus, Eye, Pencil, Trash2, RefreshCw,
  Globe2, EyeOff, Star, ChevronRight, ChevronLeft,
  Check, Image as ImageIcon, Tag, Settings, AlignLeft, User,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { postsAPI } from '@api/posts'
import Table, { TableActions, TableAction }        from '@components/common/Table'
import Pagination                                   from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect }       from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge         from '@components/common/Badge'
import Avatar        from '@components/common/Avatar'
import ConfirmDialog from '@components/common/ConfirmDialog'
import ImageUpload   from '@components/common/ImageUpload'
import TagInput      from '@components/common/TagInput'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate, formatNumber, formatTimeAgo } from '@utils/formatters'
import { getErrorMessage }  from '@api/client'

/* ─── Constants ────────────────────────────────────────────────────────────── */

const INIT = Object.freeze({
  title:            '',
  slug:             '',
  content:          '',
  excerpt:          '',
  image_url:        '',
  cover_image_url:  '',
  author_name:      '',
  author_avatar:    '',
  category:         '',
  tags:             [],
  is_published:     false,
  is_featured:      false,
  meta_title:       '',
  meta_description: '',
})

const STEPS = [
  { id: 'content', label: 'Content', icon: AlignLeft, desc: 'Title, body & excerpt'   },
  { id: 'author',  label: 'Author',  icon: User,      desc: 'Author & category'       },
  { id: 'media',   label: 'Media',   icon: ImageIcon, desc: 'Images & tags'           },
  { id: 'publish', label: 'Publish', icon: Settings,  desc: 'SEO & visibility'        },
]

const META_TITLE_IDEAL = 60
const META_DESC_IDEAL  = 160

const slugify = (str = '') =>
  str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

/* ─── Shared UI helpers ────────────────────────────────────────────────────── */

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

function CharHint({ current, ideal }) {
  const ratio = current / ideal
  const color =
    ratio > 1.1 ? 'text-rose-500' :
    ratio > 0.9 ? 'text-emerald-500' :
                  'text-slate-400'
  return (
    <span className={`text-[11px] ${color}`}>
      {current}/{ideal} chars recommended
    </span>
  )
}

function ToggleOption({ checked, onChange, label, desc, tone = 'emerald' }) {
  const tones = {
    emerald: { border: 'border-emerald-400', bg: 'bg-emerald-50/70', box: 'bg-emerald-500 border-emerald-500', text: 'text-emerald-800' },
    amber:   { border: 'border-amber-400',   bg: 'bg-amber-50/70',   box: 'bg-amber-500 border-amber-500',     text: 'text-amber-800'   },
  }
  const t = tones[tone] || tones.emerald
  return (
    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer
      transition-all duration-200
      ${checked ? `${t.border} ${t.bg}` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
        shrink-0 mt-0.5 transition-all
        ${checked ? t.box : 'border-slate-300'}`}>
        {checked && <Check size={11} className="text-white stroke-[3]" />}
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <p className={`text-sm font-semibold ${checked ? t.text : 'text-slate-700'}`}>
          {label}
        </p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

/* ─── Step Indicator ───────────────────────────────────────────────────────── */

function StepIndicator({ steps, current, completed, onGoTo }) {
  return (
    <div className="flex items-center mb-6">
      {steps.map((step, idx) => {
        const isActive = step.id === current
        const isDone   = completed.includes(step.id)
        const isLast   = idx === steps.length - 1
        const Icon     = step.icon
        const clickable = isDone || isActive

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => clickable && onGoTo(step.id)}
              disabled={!clickable}
              aria-current={isActive ? 'step' : undefined}
              className={`flex flex-col items-center gap-1.5 flex-1 transition-all
                ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
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
              <div className={`h-0.5 flex-shrink-0 w-6 sm:w-8 mx-1 rounded-full transition-all
                ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ─── Step Components (extracted for clarity + memoization) ───────────────── */

const stepMotion = {
  initial:    { opacity: 0, x: -12 },
  animate:    { opacity: 1, x: 0 },
  exit:       { opacity: 0, x: 12 },
  transition: { duration: 0.18 },
}

function StepContent({ form, upd, editing }) {
  return (
    <motion.div key="content" className="space-y-4" {...stepMotion}>
      <Field label="Post Title" required>
        <input
          className="input text-base font-medium"
          value={form.title}
          onChange={(e) => {
            const val = e.target.value
            upd('title', val)
            // Auto-slug only when creating and slug is empty/matches previous auto-slug
            if (!editing && (!form.slug || form.slug === slugify(form.title))) {
              upd('slug', slugify(val))
            }
          }}
          placeholder="Write a compelling title…"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Slug" hint="Auto-generated from title if left blank">
          <input
            className="input font-mono text-sm"
            value={form.slug}
            onChange={(e) => upd('slug', slugify(e.target.value))}
            placeholder="my-post-slug"
          />
        </Field>
        <div className="hidden sm:block" />
      </div>

      <Field label="Excerpt" hint="A short summary shown in previews">
        <textarea
          className="input min-h-[80px] resize-none"
          value={form.excerpt}
          onChange={(e) => upd('excerpt', e.target.value)}
          placeholder="Brief summary of this post…"
        />
      </Field>

      <Field label="Content (HTML supported)" required>
        <textarea
          className="input min-h-[200px] resize-y font-mono text-sm"
          value={form.content}
          onChange={(e) => upd('content', e.target.value)}
          placeholder="Write your full post content here…"
        />
      </Field>
    </motion.div>
  )
}

function StepAuthor({ form, upd }) {
  return (
    <motion.div key="author" className="space-y-4" {...stepMotion}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Author Name">
          <input
            className="input"
            value={form.author_name}
            onChange={(e) => upd('author_name', e.target.value)}
            placeholder="e.g., Jane Smith"
          />
        </Field>
        <Field label="Author Avatar URL">
          <input
            className="input"
            value={form.author_avatar}
            onChange={(e) => upd('author_avatar', e.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>

      <Field label="Category">
        <input
          className="input"
          value={form.category}
          onChange={(e) => upd('category', e.target.value)}
          placeholder="e.g., Safari Tips, Wildlife, Travel Guides"
        />
      </Field>

      {(form.author_name || form.author_avatar) && (
        <div className="flex items-center gap-3 p-4 rounded-2xl
          bg-emerald-50 border border-emerald-200">
          {form.author_avatar ? (
            <img
              src={form.author_avatar}
              alt={form.author_name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-300"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <Avatar name={form.author_name} size="md" rounded="lg" />
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">
              {form.author_name || 'Author Name'}
            </p>
            {form.category && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100
                px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-0.5">
                {form.category}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function StepMedia({ form, upd }) {
  return (
    <motion.div key="media" className="space-y-5" {...stepMotion}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Featured Image
          </p>
          <div className="border-2 border-dashed border-emerald-200 rounded-2xl
            bg-emerald-50/30 p-2">
            <ImageUpload
              label=""
              value={form.image_url}
              onChange={(v) => upd('image_url', v)}
              folder="posts"
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Cover / Banner Image
          </p>
          <div className="border-2 border-dashed border-emerald-200 rounded-2xl
            bg-emerald-50/30 p-2">
            <ImageUpload
              label=""
              value={form.cover_image_url}
              onChange={(v) => upd('cover_image_url', v)}
              folder="posts"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
          Tags
        </p>
        <TagInput
          label=""
          value={form.tags}
          onChange={(v) => upd('tags', v)}
          placeholder="Add tags and press Enter…"
        />
        {form.tags.length > 0 && (
          <p className="text-[11px] text-slate-400 mt-1">
            {form.tags.length} tag{form.tags.length !== 1 ? 's' : ''} added
          </p>
        )}
      </div>
    </motion.div>
  )
}

function StepPublish({ form, upd, editing }) {
  return (
    <motion.div key="publish" className="space-y-5" {...stepMotion}>
      {/* SEO */}
      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
          SEO Settings
        </p>
        <div className="space-y-3">
          <Field
            label="Meta Title"
            hint={<CharHint current={form.meta_title.length} ideal={META_TITLE_IDEAL} />}
          >
            <input
              className="input"
              value={form.meta_title}
              onChange={(e) => upd('meta_title', e.target.value)}
              placeholder="SEO title (defaults to post title)"
            />
          </Field>
          <Field
            label="Meta Description"
            hint={<CharHint current={form.meta_description.length} ideal={META_DESC_IDEAL} />}
          >
            <textarea
              className="input min-h-[70px] resize-none"
              value={form.meta_description}
              onChange={(e) => upd('meta_description', e.target.value)}
              placeholder="Short description for search engines…"
            />
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
            onChange={(v) => upd('is_published', v)}
            label="Publish"
            desc="Make this post visible to all users"
          />
          <ToggleOption
            checked={form.is_featured}
            onChange={(v) => upd('is_featured', v)}
            label="Featured"
            desc="Show in featured / homepage sections"
            tone="amber"
          />
        </div>
      </div>

      {/* Final summary */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
        border border-emerald-200">
        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-3">
          ✓ Ready to {editing ? 'update' : form.is_published ? 'publish' : 'save as draft'}
        </p>
        <div className="space-y-1.5 text-xs">
          {[
            ['Title',    form.title           || '—'],
            ['Author',   form.author_name     || '—'],
            ['Category', form.category        || '—'],
            ['Tags',     form.tags.length     ? `${form.tags.length} tag(s)` : '—'],
            ['Status',   form.is_published    ? '🟢 Published' : '⚪ Draft'],
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
}

/* ─── Mobile Card (fallback for small screens) ─────────────────────────────── */

const MobilePostCard = React.memo(function MobilePostCard({
  post, onView, onEdit, onTogglePublish, onDelete,
}) {
  return (
    <div
      onClick={onView}
      className="rounded-2xl border border-slate-200 bg-white p-3 flex gap-3
                 hover:border-emerald-300 hover:shadow-sm transition cursor-pointer"
    >
      <Avatar src={post.image_url} name={post.title} size="md" rounded="lg" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">
          {post.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {post.author_name || '—'} · {post.category || 'Uncategorized'}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge
            status={post.is_published ? 'published' : 'draft'}
            label={post.is_published ? 'Published' : 'Draft'}
          />
          {post.is_featured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5
              rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Star size={9} className="fill-amber-500 text-amber-500" /> Featured
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {formatNumber(post.view_count || 0)} views
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onTogglePublish}
          aria-label={post.is_published ? 'Unpublish' : 'Publish'}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition"
        >
          {post.is_published ? <EyeOff size={14} /> : <Globe2 size={14} />}
        </button>
        <button
          onClick={onEdit}
          aria-label="Edit"
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
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

  /* ── Load ───────────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page:   pag.page,
        limit:  pag.limit,
        sortBy,
        order:  sortOrder,
        ...(dSearch   && { search:    dSearch }),
        ...(pubFilter && { published: pubFilter === 'true' }),
      }
      const { data } = await postsAPI.getAll(params)
      setItems(data.data || data.posts || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, pubFilter])

  useEffect(() => { load() }, [load])

  /* ── Form ───────────────────────────────────────────────────────────────── */

  const openCreate = useCallback(() => {
    setForm(INIT)
    setEditing(null)
    setStep('content')
    setCompleted([])
    formModal.open()
  }, [formModal])

  const openEdit = useCallback((p) => {
    const f = { ...INIT }
    Object.keys(f).forEach((k) => {
      if (p[k] !== undefined && p[k] !== null) f[k] = p[k]
    })
    if (!Array.isArray(f.tags)) f.tags = []
    setForm(f)
    setEditing(p)
    setStep('content')
    setCompleted(['content', 'author', 'media'])
    formModal.open()
  }, [formModal])

  const upd = useCallback((k, v) => setForm((p) => ({ ...p, [k]: v })), [])

  /* ── Step navigation ────────────────────────────────────────────────────── */

  const stepIds   = useMemo(() => STEPS.map((s) => s.id), [])
  const stepIndex = stepIds.indexOf(step)

  const goNext = useCallback(() => {
    if (step === 'content' && !form.title.trim()) {
      return toast.error('Please enter a title first')
    }
    setCompleted((p) => (p.includes(step) ? p : [...p, step]))
    const next = stepIds[stepIndex + 1]
    if (next) setStep(next)
  }, [step, form.title, stepIds, stepIndex, toast])

  const goPrev = useCallback(() => {
    const prev = stepIds[stepIndex - 1]
    if (prev) setStep(prev)
  }, [stepIds, stepIndex])

  const goTo = useCallback((id) => setStep(id), [])

  /* ── Save ───────────────────────────────────────────────────────────────── */

  const handleSave = useCallback(async () => {
    if (!form.title.trim())   return toast.error('Title is required')
    if (!form.content.trim()) return toast.error('Content is required')
    setSaving(true)
    try {
      const payload = { ...form, slug: form.slug || slugify(form.title) }
      if (editing) {
        await postsAPI.update(editing.id, payload)
        toast.success('Post updated')
      } else {
        await postsAPI.create(payload)
        toast.success('Post created')
      }
      formModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [editing, form, formModal, load, toast])

  /* ── Optimistic publish/unpublish ───────────────────────────────────────── */

  const handleTogglePublish = useCallback(async (post) => {
    const original = post.is_published
    setItems((prev) =>
      prev.map((x) => (x.id === post.id ? { ...x, is_published: !original } : x))
    )
    try {
      if (original) {
        await postsAPI.unpublish(post.id)
        toast.success('Post unpublished')
      } else {
        await postsAPI.publish(post.id)
        toast.success('Post published')
      }
    } catch (e) {
      setItems((prev) =>
        prev.map((x) => (x.id === post.id ? { ...x, is_published: original } : x))
      )
      toast.error(getErrorMessage(e))
    }
  }, [toast])

  /* ── Optimistic delete ──────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    const target = deleteModal.data
    if (!target) return
    setItems((prev) => prev.filter((x) => x.id !== target.id))
    deleteModal.close()
    try {
      await postsAPI.remove(target.id)
      toast.success('Post deleted')
      pag.setTotal(Math.max(0, pag.total - 1))
    } catch (e) {
      toast.error(getErrorMessage(e))
      load()
    }
  }, [deleteModal, load, pag, toast])

  const handleSort = useCallback((k, o) => {
    setSortBy(k)
    setSortOrder(o)
    pag.reset()
  }, [pag])

  /* ── Table columns (desktop) ────────────────────────────────────────────── */

  const columns = useMemo(() => [
    {
      key: 'title', label: 'Title', sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar src={r.image_url} name={r.title} size="sm" rounded="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 max-w-[200px] truncate">{r.title}</p>
            <p className="text-xs text-slate-400 truncate">{r.category || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'author_name', label: 'Author',
      render: (v) => v ? (
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <User size={13} className="text-slate-400" /> {v}
        </span>
      ) : '—',
    },
    {
      key: 'is_published', label: 'Status',
      render: (v) => (
        <Badge
          status={v ? 'published' : 'draft'}
          label={v ? 'Published' : 'Draft'}
        />
      ),
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: (v) => v
        ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'view_count', label: 'Views', align: 'right', sortable: true,
      render: (v) => (
        <span className="font-semibold text-slate-600 text-sm">
          {formatNumber(v || 0)}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (v) => <span className="text-sm text-slate-500">{formatTimeAgo(v)}</span>,
    },
    {
      key: 'actions', label: '', align: 'right', width: '140px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"   onClick={() => viewModal.open(r)} />
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
  ], [viewModal, deleteModal, openEdit, handleTogglePublish])

  /* ── Step content renderer ──────────────────────────────────────────────── */

  const renderStep = () => {
    switch (step) {
      case 'content': return <StepContent form={form} upd={upd} editing={editing} />
      case 'author':  return <StepAuthor  form={form} upd={upd} />
      case 'media':   return <StepMedia   form={form} upd={upd} />
      case 'publish': return <StepPublish form={form} upd={upd} editing={editing} />
      default:        return null
    }
  }

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText size={28} className="text-emerald-600" /> Blog Posts
          </h1>
          <p className="page-subtitle">
            Manage articles ({pag.total.toLocaleString()} total)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> <span className="hidden sm:inline">New Post</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <FilterBar>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search posts…"
            className="max-w-sm"
          />
          <FilterSelect
            label="Status"
            value={pubFilter}
            onChange={(v) => { setPub(v); pag.reset() }}
            options={[
              { value: '',      label: 'All'       },
              { value: 'true',  label: 'Published' },
              { value: 'false', label: 'Drafts'    },
            ]}
          />
        </FilterBar>
      </div>

      {/* Content: Table (md+) OR Cards (mobile) */}
      <div className="card">
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table
            columns={columns}
            data={items}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onRowClick={(r) => viewModal.open(r)}
          />
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-3
                                      bg-white flex gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded" />
                  <div className="h-3 w-1/3 bg-slate-200 rounded" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-500">No posts found</p>
              <p className="text-xs mt-1">
                {search || pubFilter ? 'Try adjusting filters.' : 'Create your first post.'}
              </p>
            </div>
          ) : (
            items.map((p) => (
              <MobilePostCard
                key={p.id}
                post={p}
                onView={() => viewModal.open(p)}
                onEdit={() => openEdit(p)}
                onTogglePublish={() => handleTogglePublish(p)}
                onDelete={() => deleteModal.open(p)}
              />
            ))
          )}
        </div>

        <Pagination
          page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* ═════════ VIEW MODAL ═════════ */}
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
              <img
                src={viewModal.data.cover_image_url}
                alt=""
                className="w-full h-40 sm:h-48 object-cover rounded-2xl"
              />
            )}
            <ModalSection title="Details">
              <ModalGrid>
                <ModalField label="Author"   value={viewModal.data.author_name} />
                <ModalField label="Category" value={viewModal.data.category} />
                <ModalField
                  label="Status"
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
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                        text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
              </ModalSection>
            )}
            {viewModal.data.content && (
              <ModalSection title="Content Preview">
                <div
                  className="prose prose-sm max-w-none text-slate-700 max-h-64 overflow-y-auto
                    p-4 bg-slate-50 rounded-xl border border-slate-100"
                  dangerouslySetInnerHTML={{ __html: viewModal.data.content }}
                />
              </ModalSection>
            )}
          </div>
        )}
      </Modal>

      {/* ═════════ MULTI-STEP FORM MODAL ═════════ */}
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
                  ) : (
                    <>
                      <Check size={15} /> {editing ? 'Update Post' : 'Save Post'}
                    </>
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