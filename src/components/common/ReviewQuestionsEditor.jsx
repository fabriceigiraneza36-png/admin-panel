import React from 'react'
import { MessageSquarePlus, Plus, Trash2, HelpCircle, ListChecks } from 'lucide-react'

const QUESTION_TYPES = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'choice', label: 'Choose one option' },
  { value: 'rating', label: '1–5 rating' },
]

const makeId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* use a local fallback */ }
  return `review-question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ReviewQuestionsEditor({ value = [], onChange }) {
  const questions = Array.isArray(value) ? value : []
  const update = (index, patch) => onChange(questions.map((question, i) => i === index ? { ...question, ...patch } : question))
  const add = () => onChange([...questions, {
    id: makeId(),
    prompt: '',
    type: 'long_text',
    help_text: '',
    unit: '',
    options: [],
  }])
  const remove = (index) => onChange(questions.filter((_, i) => i !== index))

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <MessageSquarePlus size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-800">Traveller feedback questions</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Add experience-specific questions that appear after a traveller selects this destination or package. This step is optional and can always be skipped.
            </p>
          </div>
        </div>
        <button type="button" onClick={add} className="btn-primary btn-sm shrink-0 self-start">
          <Plus size={14} /> Add question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center">
          <ListChecks size={22} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No custom questions yet</p>
          <p className="mt-1 text-xs text-slate-500">Travellers will still see the standard expectations question. Add prompts to collect more specific feedback.</p>
          <button type="button" onClick={add} className="btn-secondary btn-sm mt-3">
            <Plus size={13} /> Create the first question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <article key={question.id || index} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Question {index + 1}</span>
                <button type="button" onClick={() => remove(index)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50" aria-label={`Remove question ${index + 1}`}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="input-group sm:col-span-2">
                  <span className="input-label">Question prompt</span>
                  <textarea
                    className="input min-h-[72px] resize-y"
                    value={question.prompt || ''}
                    maxLength={300}
                    onChange={event => update(index, { prompt: event.target.value })}
                    placeholder="e.g. Did you feel safe and well supported during the mountain climb?"
                  />
                </label>
                <label className="input-group">
                  <span className="input-label">Answer type</span>
                  <select className="input" value={question.type || 'short_text'} onChange={event => update(index, { type: event.target.value, options: event.target.value === 'choice' ? (question.options || []) : [] })}>
                    {QUESTION_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="input-group">
                  <span className="input-label">Helper text <span className="font-normal text-slate-400">· optional</span></span>
                  <input className="input" value={question.help_text || ''} maxLength={180} onChange={event => update(index, { help_text: event.target.value })} placeholder="Add context or explain what to include" />
                </label>
                {question.type === 'number' && (
                  <label className="input-group">
                    <span className="input-label">Unit <span className="font-normal text-slate-400">· optional</span></span>
                    <input className="input" value={question.unit || ''} maxLength={24} onChange={event => update(index, { unit: event.target.value })} placeholder="e.g. hours, km, days" />
                  </label>
                )}
                {question.type === 'choice' && (
                  <label className="input-group sm:col-span-2">
                    <span className="input-label">Answer options <span className="font-normal text-slate-400">· one per line</span></span>
                    <textarea className="input min-h-[90px] resize-y" value={(question.options || []).join('\n')} onChange={event => update(index, { options: [...new Set(event.target.value.split('\n').map(option => option.trim()).filter(Boolean))].slice(0, 12) })} placeholder={'Excellent\nGood\nNeeds improvement'} />
                  </label>
                )}
              </div>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                <HelpCircle size={13} className="mt-0.5 shrink-0 text-slate-400" />
                Every question is optional for the traveller. Use a clear prompt and choose the answer type that best fits the information you need.
              </p>
            </article>
          ))}
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-slate-500">Tip: keep prompts specific to the real experience—for example, safety support during a climb, guide communication, accommodation quality, itinerary accuracy or wildlife-viewing conditions.</p>
    </section>
  )
}
