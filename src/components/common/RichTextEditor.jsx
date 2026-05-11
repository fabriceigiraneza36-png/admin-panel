import React, { useMemo } from 'react'

let ReactQuill
try { ReactQuill = require('react-quill') } catch { ReactQuill = null }

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ align: [] }],
    ['clean'],
  ],
}

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'blockquote', 'code-block',
  'link', 'image', 'align',
]

export default function RichTextEditor({ value, onChange, label, placeholder = 'Write content…', className = '' }) {
  if (!ReactQuill) {
    return (
      <div className={`input-group ${className}`}>
        {label && <label className="input-label">{label}</label>}
        <textarea
          className="input min-h-[200px]"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={MODULES}
        formats={FORMATS}
        placeholder={placeholder}
      />
    </div>
  )
}