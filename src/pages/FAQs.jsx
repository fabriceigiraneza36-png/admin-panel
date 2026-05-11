import React, { useEffect, useState, useCallback } from 'react'
import {
  HelpCircle, Plus, Pencil, Trash2, RefreshCw,
  Eye, EyeOff, GripVertical, ChevronDown, ChevronUp,
} from 'lucide-react'
import { faqsAPI }          from '@api/faqs'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge                from '@components/common/Badge'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import EmptyState           from '@components/common/EmptyState'
import Pagination           from '@components/common/Pagination'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate }       from '@utils/formatters'
import { getErrorMessage }  from '@api/client'
import { motion, AnimatePresence } from 'framer-motion'

const INIT = { question: '', answer: '', category: '', sort_order: 0, is_active: true }
const CATEGORIES = ['general', 'booking', 'travel', 'safety', 'payment', 'visa', 'accommodation', 'transport']

export default function FAQs() {
  const toast       = useToast()
  const pag         = usePagination(1, 50)
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')
  const [catFilter,setCat]      = useState('')
  const [form,     setForm]     = useState(INIT)
  const [editing,  setEditing]  = useState(null)
  const [expanded, setExpanded] = useState({})

  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit,
        ...(dSearch && { search: dSearch }),
        ...(catFilter && { category: catFilter }),
        sortBy: 'sort_order', order: 'asc',
      }
      const { data } = await faqsAPI.getAll(params)
      setItems(data.data || data.faqs || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [pag.page, pag.limit, dSearch, catFilter])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(INIT); setEditing(null); formModal.open() }
  const openEdit = (f) => {
    setForm({
      question: f.question || '', answer: f.answer || '',
      category: f.category || '', sort_order: f.sort_order || 0,
      is_active: f.is_active !== false,
    })
    setEditing(f); formModal.open()
  }

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.question.trim()) return toast.error('Question is required')
    if (!form.answer.trim())   return toast.error('Answer is required')
    setSaving(true)
    try {
      if (editing) {
        await faqsAPI.update(editing.id, form)
        toast.success('FAQ updated')
      } else {
        await faqsAPI.create(form)
        toast.success('FAQ created')
      }
      formModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const handleToggle = async (faq) => {
    try {
      await faqsAPI.toggle(faq.id)
      toast.success(faq.is_active ? 'FAQ hidden' : 'FAQ visible')
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleDelete = async () => {
    try {
      await faqsAPI.remove(deleteModal.data.id)
      toast.success('FAQ deleted')
      deleteModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HelpCircle size={28} className="text-primary-600" /> FAQs
          </h1>
          <p className="page-subtitle">Manage frequently asked questions ({pag.total})</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add FAQ</button>
        </div>
      </div>

      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search FAQs…" className="max-w-sm" />
          <FilterSelect label="Category" value={catFilter}
            onChange={(v) => { setCat(v); pag.reset() }}
            options={[{ value: '', label: 'All Categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
        </FilterBar>
      </div>

      {/* Accordion list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-2">
              <div className="shimmer h-5 w-3/4 rounded" />
              <div className="shimmer h-3 w-1/2 rounded" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState type="empty" title="No FAQs yet" description="Create your first FAQ"
            action={openCreate} actionLabel="Add FAQ" />
        ) : (
          items.map((faq) => (
            <motion.div key={faq.id} layout
              className={`card overflow-hidden transition-all duration-200
                          ${!faq.is_active ? 'opacity-60' : ''}`}>
              {/* Question header */}
              <div
                onClick={() => toggle(faq.id)}
                className="flex items-center gap-3 px-5 py-4 cursor-pointer
                           hover:bg-primary-50/40 transition-colors"
              >
                <GripVertical size={16} className="text-slate-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{faq.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {faq.category && <span className="badge-green text-[10px]">{faq.category}</span>}
                    <Badge status={faq.is_active ? 'active' : 'inactive'}
                      label={faq.is_active ? 'Visible' : 'Hidden'} size="xs" />
                    <span className="text-[10px] text-slate-400">Order: {faq.sort_order}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleToggle(faq)}
                    className="btn-icon text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                    title={faq.is_active ? 'Hide' : 'Show'}>
                    {faq.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => openEdit(faq)}
                    className="btn-icon text-slate-400 hover:text-primary-600 hover:bg-primary-50">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteModal.open(faq)}
                    className="btn-icon text-slate-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
                <span className="text-slate-400">
                  {expanded[faq.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>

              <AnimatePresence>
                {expanded[faq.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pl-12 border-t border-surface-100 pt-3">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Updated {formatDate(faq.updated_at)}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total}
        limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
        onPageSizeChange={pag.setPageSize} />

      {/* Form modal */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.close}
        title={editing ? 'Edit FAQ' : 'Add FAQ'} size="md" icon={<HelpCircle size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
        </div>}>
        <div className="space-y-4">
          <div className="input-group"><label className="input-label">Question *</label>
            <textarea className="input min-h-[70px]" value={form.question}
              onChange={(e) => upd('question', e.target.value)} placeholder="What is…?" /></div>
          <div className="input-group"><label className="input-label">Answer *</label>
            <textarea className="input min-h-[120px]" value={form.answer}
              onChange={(e) => upd('answer', e.target.value)} /></div>
          <ModalGrid>
            <div className="input-group"><label className="input-label">Category</label>
              <select className="input cursor-pointer" value={form.category}
                onChange={(e) => upd('category', e.target.value)}>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select></div>
            <div className="input-group"><label className="input-label">Sort Order</label>
              <input className="input" type="number" value={form.sort_order}
                onChange={(e) => upd('sort_order', Number(e.target.value))} /></div>
          </ModalGrid>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => upd('is_active', e.target.checked)}
              className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 focus:ring-primary-500 cursor-pointer" />
            <span className="text-sm font-medium text-slate-700">Active / Visible</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close}
        onConfirm={handleDelete} type="delete" title="Delete this FAQ?"
        description="This action cannot be undone." />
    </div>
  )
}