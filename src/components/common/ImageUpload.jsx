import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image, Link2, Loader2, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import apiClient from '@api/client'

export default function ImageUpload({
  value,
  onChange,
  label       = 'Image',
  accept      = { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
  maxSize     = 10 * 1024 * 1024,
  aspectRatio,
  placeholder = 'Drag & drop an image or click to browse',
  urlMode     = true,
  folder      = 'general',
}) {
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [urlInput,  setUrlInput]  = useState('')
  const [mode,      setMode]      = useState('upload') // 'upload' | 'url'

  const uploadFile = useCallback(async (file) => {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('image',  file)
      form.append('folder', folder)

      const { data } = await apiClient.post('/uploads/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      onChange(data.data?.url || data.url || data.secure_url)
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [folder, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && uploadFile(files[0]),
    accept,
    maxSize,
    maxFiles: 1,
    onDropRejected: (fileRejections) => {
      const err = fileRejections[0]?.errors[0]
      if (err?.code === 'file-too-large') setError('File too large (max 10MB)')
      else setError(err?.message || 'Invalid file')
    },
  })

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim())
      setUrlInput('')
      setMode('upload')
    }
  }

  const clear = () => { onChange(''); setError('') }

  return (
    <div className="space-y-2">
      {label && <label className="input-label">{label}</label>}

      {/* Mode tabs */}
      {urlMode && !value && (
        <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit mb-3">
          {['upload', 'url'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs font-semibold rounded-md
                          transition-all duration-150 capitalize
                          ${mode === m
                            ? 'bg-white text-primary-700 shadow-card'
                            : 'text-slate-500 hover:text-slate-700'
                          }`}
            >
              {m === 'upload' ? '⬆ Upload' : '🔗 URL'}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {value ? (
          /* Preview */
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative group rounded-2xl overflow-hidden border-2
                       border-primary-200 bg-surface-50"
            style={{ aspectRatio: aspectRatio || '16/9' }}
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30
                            transition-all duration-200 flex items-center justify-center">
              <button
                type="button"
                onClick={clear}
                className="opacity-0 group-hover:opacity-100 transition-opacity
                           duration-200 btn-danger btn-sm"
              >
                <X size={14} /> Remove
              </button>
            </div>
            {/* Success badge */}
            <div className="absolute top-2 right-2">
              <CheckCircle size={20} className="text-primary-500 drop-shadow" />
            </div>
          </motion.div>
        ) : mode === 'upload' ? (
          /* Dropzone */
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={`
                relative border-2 border-dashed rounded-2xl
                flex flex-col items-center justify-center
                gap-3 cursor-pointer transition-all duration-200 p-8
                ${isDragActive
                  ? 'border-primary-400 bg-primary-50 scale-[1.01]'
                  : 'border-surface-300 hover:border-primary-300 hover:bg-primary-50/30'
                }
              `}
              style={{ minHeight: '140px' }}
            >
              <input {...getInputProps()} />

              {uploading ? (
                <>
                  <Loader2 size={36} className="text-primary-500 animate-spin" />
                  <p className="text-sm font-medium text-primary-600">Uploading…</p>
                </>
              ) : (
                <>
                  <div className={`w-14 h-14 rounded-2xl flex items-center
                                   justify-center transition-all duration-200
                                   ${isDragActive
                                     ? 'bg-primary-100'
                                     : 'bg-surface-100'
                                   }`}>
                    {isDragActive
                      ? <Image size={26} className="text-primary-500" />
                      : <Upload size={26} className="text-slate-400" />
                    }
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      {isDragActive ? 'Drop it here!' : placeholder}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PNG, JPG, WebP · Max 10MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          /* URL input */
          <motion.div
            key="url"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-2"
          >
            <div className="flex-1 relative">
              <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2
                                          text-slate-400 pointer-events-none" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                className="input pl-9"
              />
            </div>
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className="btn-primary flex-shrink-0"
            >
              Apply
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
          <X size={12} /> {error}
        </p>
      )}
    </div>
  )
}