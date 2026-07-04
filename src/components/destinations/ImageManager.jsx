// admin/src/components/destinations/ImageManager.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Upload, Image, Trash2, Star, ArrowUp, ArrowDown,
  RefreshCw, AlertCircle, CheckCircle, Loader2, Eye,
  GripVertical, Plus, Link, Info
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
const getToken = () => localStorage.getItem('token') || ''

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, ...opts.headers },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

// ── Toast ─────────────────────────────────────────────────────────────────────

const Toast = ({ type, message, onDismiss }) => (
  <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm animate-slide-up ${
    type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  }`}>
    {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
    <span className="flex-1">{message}</span>
    <button onClick={onDismiss}><X size={14} /></button>
  </div>
)

// ── Image Card ────────────────────────────────────────────────────────────────

const ImageCard = ({
  img, index, total, onSetPrimary, onDelete, onMoveUp, onMoveDown,
  onCaptionChange, onPreview, loading
}) => {
  const [editCaption, setEditCaption] = useState(false)
  const [caption, setCaption] = useState(img.caption || '')

  return (
    <div className={`relative group bg-white rounded-xl overflow-hidden border-2 transition-all ${
      img.isPrimary ? 'border-green-500 shadow-md shadow-green-100' : 'border-gray-200 hover:border-green-300'
    } ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Image */}
      <div className="relative">
        <img
          src={img.imageUrl}
          alt={img.altText || img.caption || 'Destination image'}
          className="w-full h-44 object-cover"
          onError={e => { e.target.src = '/placeholder-image.jpg' }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onPreview(img)}
            className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
            title="Preview"
          >
            <Eye size={16} />
          </button>
          {!img.isPrimary && (
            <button
              onClick={() => onSetPrimary(img.id)}
              className="w-9 h-9 bg-yellow-500/90 rounded-full flex items-center justify-center text-white hover:bg-yellow-500 transition-colors"
              title="Set as primary"
            >
              <Star size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(img.id)}
            className="w-9 h-9 bg-red-500/90 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {img.isPrimary && (
            <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Star size={10} fill="currentColor" /> Primary
            </span>
          )}
          <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            #{index + 1}
          </span>
        </div>

        {/* Sort controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-40 transition-colors"
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-40 transition-colors"
          >
            <ArrowDown size={12} />
          </button>
        </div>
      </div>

      {/* Caption */}
      <div className="p-3">
        {editCaption ? (
          <div className="flex gap-1.5">
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Caption..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') { onCaptionChange(img.id, caption); setEditCaption(false) }
                if (e.key === 'Escape') { setCaption(img.caption || ''); setEditCaption(false) }
              }}
            />
            <button
              onClick={() => { onCaptionChange(img.id, caption); setEditCaption(false) }}
              className="text-green-600 hover:text-green-700"
            >
              <CheckCircle size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditCaption(true)}
            className="text-xs text-gray-500 hover:text-gray-700 truncate w-full text-left transition-colors"
            title="Click to edit caption"
          >
            {img.caption || <span className="italic text-gray-300">Add caption...</span>}
          </button>
        )}
        <p className="text-xs text-gray-300 mt-1 truncate">{img.imageUrl?.split('/').pop()}</p>
      </div>
    </div>
  )
}

// ── Upload Panel ──────────────────────────────────────────────────────────────

const UploadPanel = ({ destId, onSuccess }) => {
  const [mode, setMode]       = useState('file') // 'file' | 'url'
  const [files, setFiles]     = useState([])
  const [urls, setUrls]       = useState([''])
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const fileRef = useRef(null)
  const dropRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...dropped])
  }, [])

  const handleDragOver = (e) => { e.preventDefault() }

  const handleFileChange = (e) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files)])
  }

  const upload = async () => {
    if (mode === 'file' && !files.length) return
    if (mode === 'url' && !urls.filter(Boolean).length) return

    setUploading(true)
    setProgress(0)

    try {
      if (mode === 'file') {
        const total = files.length
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData()
          fd.append('images', files[i])
          if (caption) fd.append('caption', caption)
          await apiFetch(`/destinations/${destId}/images`, { method: 'POST', body: fd })
          setProgress(Math.round(((i + 1) / total) * 100))
        }
      } else {
        const validUrls = urls.filter(u => u.trim())
        const fd = new FormData()
        validUrls.forEach(u => fd.append('image_urls', u.trim()))
        if (caption) fd.append('caption', caption)
        await apiFetch(`/destinations/${destId}/images`, { method: 'POST', body: fd })
      }
      setFiles([])
      setUrls([''])
      setCaption('')
      onSuccess()
    } catch (e) {
      alert(e.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Plus size={16} className="text-green-600" /> Upload Images
      </h3>

      {/* Mode tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === 'file' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Upload size={14} /> Upload Files
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === 'url' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Link size={14} /> From URL
        </button>
      </div>

      {mode === 'file' ? (
        <>
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all"
          >
            <Upload size={28} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Drop images here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — up to 10MB each</p>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate w-20">{f.name}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={url}
                onChange={e => {
                  const next = [...urls]
                  next[i] = e.target.value
                  setUrls(next)
                }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {i === urls.length - 1 ? (
                <button type="button" onClick={() => setUrls([...urls, ''])} className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                  <Plus size={16} />
                </button>
              ) : (
                <button type="button" onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="px-3 py-2 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Caption (optional)</label>
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Caption for all uploaded images"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={upload}
        disabled={uploading || (mode === 'file' ? !files.length : !urls.filter(Boolean).length)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {uploading ? 'Uploading...' : `Upload ${mode === 'file' ? `${files.length} File${files.length !== 1 ? 's' : ''}` : 'URLs'}`}
      </button>
    </div>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

const PreviewModal = ({ img, onClose, onPrev, onNext, hasPrev, hasNext }) => (
  <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center" onClick={onClose}>
    <div className="relative max-w-5xl w-full mx-4" onClick={e => e.stopPropagation()}>
      <img src={img.imageUrl} alt={img.caption} className="w-full max-h-[80vh] object-contain rounded-xl" />
      {img.caption && (
        <p className="text-white text-center mt-3 text-sm">{img.caption}</p>
      )}
      <button onClick={onClose} className="absolute -top-4 -right-4 w-9 h-9 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 shadow-lg">
        <X size={18} />
      </button>
      {hasPrev && (
        <button onClick={onPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <ArrowUp size={20} className="rotate-[-90deg]" />
        </button>
      )}
      {hasNext && (
        <button onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <ArrowDown size={20} className="rotate-[-90deg]" />
        </button>
      )}
    </div>
  </div>
)

// ── Main Export ───────────────────────────────────────────────────────────────

export default function ImageManager({ destinationId, destinationName, onClose }) {
  const [images, setImages]   = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(null)     // imageId being mutated
  const [toast, setToast]     = useState(null)
  const [preview, setPreview] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    if (!destinationId) return
    setLoading(true)
    try {
      const data = await apiFetch(`/destinations/${destinationId}/images`)
      setImages(data.data || [])
    } catch (e) {
      showToast('error', e.message)
    } finally {
      setLoading(false)
    }
  }, [destinationId])

  useEffect(() => { load() }, [load])

  const setPrimary = async (imageId) => {
    setBusy(imageId)
    try {
      await apiFetch(`/destinations/${destinationId}/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      })
      showToast('success', 'Primary image updated')
      load()
    } catch (e) {
      showToast('error', e.message)
    } finally {
      setBusy(null)
    }
  }

  const deleteImage = async (imageId) => {
    if (!confirm('Delete this image permanently?')) return
    setBusy(imageId)
    try {
      await apiFetch(`/destinations/${destinationId}/images/${imageId}`, { method: 'DELETE' })
      showToast('success', 'Image deleted')
      load()
    } catch (e) {
      showToast('error', e.message)
    } finally {
      setBusy(null)
    }
  }

  const updateCaption = async (imageId, caption) => {
    try {
      await apiFetch(`/destinations/${destinationId}/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      })
      showToast('success', 'Caption saved')
      load()
    } catch (e) {
      showToast('error', e.message)
    }
  }

  const moveImage = async (fromIndex, direction) => {
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= images.length) return

    const newOrder = [...images]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    setImages(newOrder)

    try {
      await apiFetch(`/destinations/${destinationId}/images/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: newOrder.map(i => i.id) }),
      })
      showToast('success', 'Order saved')
    } catch (e) {
      showToast('error', e.message)
      load()
    }
  }

  const previewIdx = preview ? images.findIndex(i => i.id === preview.id) : -1

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
        <div className="h-full w-full max-w-5xl bg-gray-50 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Image size={16} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Image Manager</h2>
                <p className="text-xs text-gray-500">{destinationName} — {images.length} image{images.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(s => !s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showUpload ? 'bg-gray-100 text-gray-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                <Plus size={14} /> {showUpload ? 'Hide Upload' : 'Add Images'}
              </button>
              <button onClick={load} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Refresh">
                <RefreshCw size={16} />
              </button>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Upload Panel */}
            {showUpload && (
              <UploadPanel
                destId={destinationId}
                onSuccess={() => { load(); setShowUpload(false) }}
              />
            )}

            {/* Info Banner */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p>Hover over images to reveal actions. The first image marked as <strong>Primary</strong> appears on cards and listings. Use arrows to reorder.</p>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 size={32} className="animate-spin text-green-600" />
                <p className="text-gray-500 text-sm">Loading images...</p>
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <Image size={48} className="opacity-30" />
                <p className="font-medium">No images yet</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Add First Image
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <ImageCard
                    key={img.id}
                    img={img}
                    index={idx}
                    total={images.length}
                    onSetPrimary={setPrimary}
                    onDelete={deleteImage}
                    onMoveUp={() => moveImage(idx, -1)}
                    onMoveDown={() => moveImage(idx, 1)}
                    onCaptionChange={updateCaption}
                    onPreview={setPreview}
                    loading={busy === img.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
            <p className="text-xs text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''} total</p>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {preview && (
        <PreviewModal
          img={preview}
          onClose={() => setPreview(null)}
          hasPrev={previewIdx > 0}
          hasNext={previewIdx < images.length - 1}
          onPrev={() => setPreview(images[previewIdx - 1])}
          onNext={() => setPreview(images[previewIdx + 1])}
        />
      )}

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
    </>
  )
}