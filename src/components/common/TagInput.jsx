import React, { useState, useRef, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TagInput({
  value     = [],
  onChange,
  label,
  placeholder = 'Add item and press Enter',
  maxTags,
  suggestions = [],
  className   = '',
}) {
  const [input,  setInput]  = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const add = useCallback((tag) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) return
    if (maxTags && value.length >= maxTags) return
    onChange([...value, trimmed])
    setInput('')
  }, [value, onChange, maxTags])

  const remove = useCallback((idx) => {
    onChange(value.filter((_, i) => i !== idx))
  }, [value, onChange])

  const handleKey = (e) => {
    if (['Enter', ',', 'Tab'].includes(e.key)) {
      e.preventDefault()
      add(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value.length - 1)
    }
  }

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) &&
           !value.includes(s) && input.length > 0,
  )

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="input-label">{label}</label>}

      <div
        onClick={() => inputRef.current?.focus()}
        className={`
          input min-h-[42px] flex flex-wrap gap-1.5 cursor-text p-2
          ${focused ? 'border-primary-400 ring-2 ring-primary-100' : ''}
        `}
      >
        <AnimatePresence>
          {value.map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{   opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.1 }}
              className="inline-flex items-center gap-1 px-2 py-0.5
                         bg-primary-100 text-primary-800 text-xs
                         font-semibold rounded-lg flex-shrink-0"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(i) }}
                className="text-primary-500 hover:text-primary-800
                           transition-colors ml-0.5"
              >
                <X size={10} strokeWidth={3} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); add(input) }}
          placeholder={
            maxTags && value.length >= maxTags
              ? `Max ${maxTags} items`
              : value.length === 0 ? placeholder : ''
          }
          disabled={!!(maxTags && value.length >= maxTags)}
          className="flex-1 min-w-[120px] outline-none bg-transparent
                     text-sm text-slate-800 placeholder-slate-400
                     disabled:cursor-not-allowed"
        />
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {filteredSuggestions.length > 0 && focused && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap gap-1.5 p-2 bg-surface-50
                       border border-surface-200 rounded-xl"
          >
            {filteredSuggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(s) }}
                className="inline-flex items-center gap-1 px-2 py-0.5
                           bg-white border border-surface-300
                           text-slate-600 text-xs rounded-lg
                           hover:border-primary-300 hover:text-primary-700
                           hover:bg-primary-50 transition-all"
              >
                <Plus size={10} /> {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[11px] text-slate-400">
        {value.length > 0 && `${value.length} item${value.length !== 1 ? 's' : ''}`}
        {maxTags && value.length > 0 && ` / ${maxTags}`}
        {value.length === 0 && 'Press Enter or comma to add items'}
      </p>
    </div>
  )
}