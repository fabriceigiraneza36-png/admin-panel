// admin/src/pages/FAQs.jsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  HelpCircle, Plus, Pencil, Trash2, RefreshCw,
  Eye, EyeOff, GripVertical, ChevronDown, ChevronUp,
  Check, ChevronRight, ChevronLeft, Tag, Settings,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const INIT = { question: '', answer: '', category: '', sort_order: 0, is_active: true }

const CATEGORIES = [
  'general', 'booking', 'travel', 'safety',
  'payment', 'visa', 'accommodation', 'transport',
]

const CATEGORY_COLORS = {
  general:       'bg-slate-100 text-slate-700 border-slate-200',
  booking:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  travel:        'bg-blue-50 text-blue-700 border-blue-200',
  safety:        'bg-red-50 text-red-700 border-red-200',
  payment:       'bg-amber-50 text-amber-700 border-amber-200',
  visa:          'bg-purple-50 text-purple-700 border-purple-200',
  accommodation: 'bg-teal-50 text-teal-700 border-teal-200',
  transport:     'bg-orange-50 text-orange-700 border-orange-200',
}

const STEPS = [
  { id: 'content',  label: 'Q&A Content', icon: HelpCircle, desc: 'Write the question and answer' },
  { id: 'settings', label: 'Settings',    icon: Settings,   desc: 'Category, order & visibility' },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current, onGoTo, completed }) {
  return (
    <div className="flex items-center gap-0 mb-5">
      {steps.map((step, idx) => {
        const isActive    = step.id === current
        const isDone      = completed.includes(step.id)
        const isLast      = idx === steps.length - 1
        const Icon        = step.icon

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onGoTo(step.id)}
              className="flex items-center gap-2.5 group flex-1 min-w-0"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center
                border-2 shrink-0 transition-all duration-300
                ${isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : isActive
                    ? 'bg-white border-emerald-500 text-emerald-600'
                    : 'bg-white border-slate-200 text-slate-400 group-hover:border-emerald-300'
                }`}>
                {isDone ? <Check size={14} /> : <Icon size={13} />}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className={`text-xs font-bold truncate
                  ${isActive ? 'text-emerald-700' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{step.desc}</p>
              </div>
            </button>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-2 rounded-full max-w-[40px]
                ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FAQs() {
  const toast       = useToast()
  const pag         = usePagination(1, 50)
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,     setItems]    = useState([])
  const [loading,   setLoading]  = useState(true)
  const [saving,    setSaving]   = useState(false)
  const [search,    setSearch]   = useState('')
  const [catFilter, setCat]      = useState('')
  const [form,      setForm]     = useState(INIT)
  const [editing,   setEditing]  = useState(null)
  const [expanded,  setExpanded] = useState({})
  const [step,      setStep]     = useState('content')
  const [completed, setCompleted]= useState([])

  const dSearch = useDebounce(search, 400)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit,
        ...(dSearch    && { search: dSearch }),
        ...(catFilter  && { category: catFilter }),
        sortBy: 'sort_order', order: 'asc',
      }
      const { data } = await faqsAPI.getAll(params)
      setItems(data.data || data.faqs || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [pag.page, pag.limit, dSearch, catFilter])

  useEffect(() => { load() }, [load])

  // ── Form helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(INIT)
    setEditing(null)
    setStep('content')
    setCompleted([])
    formModal.open()
  }

  const openEdit = (f) => {
    setForm({
      question:   f.question   || '',
      answer:     f.answer     || '',
      category:   f.category   || '',
      sort_order: f.sort_order || 0,
      is_active:  f.is_active  !== false,
    })
    setEditing(f)
    setStep('content')
    setCompleted(['content'])
    formModal.open()
  }

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Step navigation ───────────────────────────────────────────────────────

  const goNext = () => {
    if (!form.question.trim()) return toast.error('Please write the question first')
    if (!form.answer.trim())   return toast.error('Please write the answer first')
    if (!completed.includes('content')) setCompleted(p => [...p, 'content'])
    setStep('settings')
  }

  const goPrev = () => setStep('content')

  // ── Save ──────────────────────────────────────────────────────────────────

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
      formModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  // ── Toggle visibility ─────────────────────────────────────────────────────

  const handleToggle = async (faq) => {
    try {
      await faqsAPI.toggle(faq.id)
      toast.success(faq.is_active ? 'FAQ hidden' : 'FAQ visible')
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await faqsAPI.remove(deleteModal.data.id)
      toast.success('FAQ deleted')
      deleteModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 page-enter">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HelpCircle size={28} className="text-emerald-600" /> FAQs
          </h1>
          <p className="page-subtitle">
            Manage frequently asked questions ({pag.total})
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add FAQ
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch}
            placeholder="Search FAQs…" className="max-w-sm" />
          <FilterSelect label="Category" value={catFilter}
            onChange={v => { setCat(v); pag.reset() }}
            options={[
              { value: '', label: 'All Categories' },
              ...CATEGORIES.map(c => ({
                value: c, label: c.charAt(0).toUpperCase() + c.slice(1),
              })),
            ]} />
        </FilterBar>
      </div>

      {/* ── Accordion FAQ List ── */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-2">
              <div className="shimmer h-5 w-3/4 rounded" />
              <div className="shimmer h-3 w-1/2 rounded" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            type="empty"
            title="No FAQs yet"
            description="Create your first FAQ to help users"
            action={openCreate}
            actionLabel="Add FAQ"
          />
        ) : (
          items.map((faq, idx) => (
            <motion.div
              key={faq.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`rounded-2xl border-2 overflow-hidden transition-all duration-200
                bg-white shadow-sm
                ${!faq.is_active
                  ? 'opacity-60 border-slate-200'
                  : expanded[faq.id]
                    ? 'border-emerald-300 shadow-emerald-100'
                    : 'border-slate-200 hover:border-emerald-200'
                }`}
            >
              {/* Question header */}
              <div
                onClick={() => toggle(faq.id)}
                className="flex items-center gap-3 px-5 py-4 cursor-pointer
                  hover:bg-emerald-50/40 transition-colors"
              >
                {/* Order badge */}
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500
                  text-xs font-bold flex items-center justify-center shrink-0">
                  {faq.sort_order ?? idx + 1}
                </span>

                <GripVertical size={14} className="text-slate-300 shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-snug">
                    {faq.question}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {faq.category && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                        border capitalize ${CATEGORY_COLORS[faq.category] || CATEGORY_COLORS.general}`}>
                        {faq.category}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                      ${faq.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                      {faq.is_active ? '● Visible' : '○ Hidden'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleToggle(faq)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center
                      text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                    title={faq.is_active ? 'Hide' : 'Show'}
                  >
                    {faq.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    onClick={() => openEdit(faq)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center
                      text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteModal.open(faq)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center
                      text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <span className="text-slate-400 shrink-0">
                  {expanded[faq.id]
                    ? <ChevronUp size={15} />
                    : <ChevronDown size={15} />
                  }
                </span>
              </div>

              {/* Answer */}
              <AnimatePresence>
                {expanded[faq.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pl-[3.75rem] border-t border-emerald-100 pt-4">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-3">
                        Last updated {formatDate(faq.updated_at)}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      <Pagination
        page={pag.page} totalPages={pag.totalPages} total={pag.total}
        limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo}
        onPageSizeChange={pag.setPageSize}
      />

      {/* ════════════════════════════════════════════════════════════════
          MULTI-STEP FORM MODAL
          ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? 'Edit FAQ' : 'Add New FAQ'}
        size="md"
        icon={<HelpCircle size={20} />}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Step {step === 'content' ? 1 : 2} of {STEPS.length}
            </span>
            <div className="flex gap-2">
              {step === 'settings' && (
                <button onClick={goPrev} className="btn-secondary btn-sm" disabled={saving}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              {step === 'content' ? (
                <button onClick={goNext} className="btn-primary btn-sm">
                  Continue <ChevronRight size={15} />
                </button>
              ) : (
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? (
                    <><Check size={14} /> Update FAQ</>
                  ) : (
                    <><Check size={14} /> Create FAQ</>
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
            onGoTo={id => {
              // Only allow going back or to completed steps
              if (id === 'content') setStep('content')
            }}
            completed={completed}
          />

          <AnimatePresence mode="wait">
            {step === 'content' ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Question */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Question <span className="text-emerald-500">*</span>
                  </label>
                  <textarea
                    className="input min-h-[90px] resize-none text-sm"
                    value={form.question}
                    onChange={e => upd('question', e.target.value)}
                    placeholder="What would a user typically ask? e.g. How do I book a safari?"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {form.question.length} characters
                  </p>
                </div>

                {/* Answer */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Answer <span className="text-emerald-500">*</span>
                  </label>
                  <textarea
                    className="input min-h-[160px] resize-none text-sm"
                    value={form.answer}
                    onChange={e => upd('answer', e.target.value)}
                    placeholder="Write a clear, helpful answer. Be concise and friendly…"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {form.answer.length} characters
                  </p>
                </div>

                {/* Preview */}
                {(form.question || form.answer) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
                    border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
                      Preview
                    </p>
                    {form.question && (
                      <p className="text-sm font-semibold text-slate-800 mb-2">
                        Q: {form.question}
                      </p>
                    )}
                    {form.answer && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        A: {form.answer}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                    Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => upd('category', c)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold
                          border-2 transition-all capitalize text-center
                          ${form.category === c
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => upd('category', '')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold
                        border-2 transition-all col-span-2 sm:col-span-4
                        ${!form.category
                          ? 'border-slate-400 bg-slate-100 text-slate-700'
                          : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                    >
                      No category / General
                    </button>
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Display Order
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min="0" max="100"
                      value={form.sort_order}
                      onChange={e => upd('sort_order', Number(e.target.value))}
                      className="flex-1 accent-emerald-500"
                    />
                    <input
                      type="number"
                      className="input w-20 text-center"
                      value={form.sort_order}
                      onChange={e => upd('sort_order', Number(e.target.value))}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Lower numbers appear first
                  </p>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                    Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: true,  label: 'Visible',       desc: 'Show to users',  cls: 'border-emerald-400 bg-emerald-50' },
                      { val: false, label: 'Hidden',         desc: 'Hide from users', cls: 'border-slate-400 bg-slate-50' },
                    ].map(opt => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => upd('is_active', opt.val)}
                        className={`p-3 rounded-xl border-2 text-left transition-all
                          ${form.is_active === opt.val
                            ? opt.cls
                            : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                      >
                        <p className="text-sm font-bold text-slate-700">{opt.label}</p>
                        <p className="text-xs text-slate-400">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50
                  border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
                    ✓ Ready to {editing ? 'update' : 'create'}
                  </p>
                  <p className="text-xs font-semibold text-slate-700 truncate">{form.question}</p>
                  <div className="flex gap-2 mt-2">
                    {form.category && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize
                        ${CATEGORY_COLORS[form.category] || CATEGORY_COLORS.general}`}>
                        {form.category}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border
                      bg-slate-100 text-slate-600 border-slate-200">
                      Order: {form.sort_order}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title="Delete this FAQ?"
        description="This action cannot be undone."
      />
    </div>
  )
}