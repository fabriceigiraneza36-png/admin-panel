import React, { useEffect, useRef } from 'react'
import { createPortal }    from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle }  from 'lucide-react'

const SIZES = {
  xs:   'max-w-sm',
  sm:   'max-w-lg',
  md:   'max-w-2xl',
  lg:   'max-w-4xl',
  xl:   'max-w-6xl',
  full: 'max-w-[95vw]',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size      = 'md',
  children,
  footer,
  icon,
  noPadding = false,
  closable  = true,
  className = '',
}) {
  const overlayRef = useRef(null)

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape' && closable) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose, closable])

  /* Lock body scroll */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleOverlayClick = (e) => {
    if (closable && e.target === overlayRef.current) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4
                     bg-black/50 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96, y: 16  }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className={`
              bg-white rounded-3xl shadow-2xl w-full
              max-h-[92vh] min-w-0 flex flex-col overflow-hidden
              ${SIZES[size] || SIZES.md}
              ${className}
            `}
          >
            {/* ── Header ── */}
            {(title || closable) && (
              <div className="flex items-start gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-surface-100 flex-shrink-0 min-w-0">
                {icon && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl
                                  bg-primary-50 flex items-center justify-center">
                    <span className="text-primary-600">{icon}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight break-words">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
                {closable && (
                  <button
                    onClick={onClose}
                    className="flex-shrink-0 btn-icon text-slate-400
                               hover:text-slate-600 hover:bg-surface-100
                               focus:ring-slate-200 ml-2 -mr-1 -mt-1"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* ── Body ── */}
            <div className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden ${noPadding ? '' : 'px-4 sm:px-6 py-4 sm:py-5'}`}>
              {children}
            </div>

            {/* ── Footer ── */}
            {footer && (
              <div className="flex-shrink-0 min-w-0 px-3 sm:px-6 py-3 sm:py-4 border-t border-surface-100
                              bg-surface-50 rounded-b-3xl">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ── Section within modal body ── */
export function ModalSection({ title, children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h3 className="text-sm font-bold text-primary-700 uppercase tracking-wider
                       flex items-center gap-2">
          <span className="w-1 h-4 bg-primary-500 rounded-full inline-block" />
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

/* ── Two-column grid inside modal ── */
export function ModalGrid({ children, cols = 2 }) {
  return (
    <div className={`grid gap-4 ${cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : `grid-cols-${cols}`}`}>
      {children}
    </div>
  )
}

/* ── Media-aware values for detail views ── */
const IMAGE_FIELD_HINT = /image|photo|gallery|flag|cover|hero|banner|thumbnail|avatar|poster|portrait|media|picture|logo/i;
const IMAGE_URL_PATTERN = /^(?:https?:\/\/|blob:|data:image\/|\/uploads\/|\/media\/|\/storage\/)/i;
const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|webp|svg|bmp|tiff?)(?:[?#].*)?$/i;
const IMAGE_OBJECT_KEYS = ['url', 'image_url', 'imageUrl', 'src', 'path', 'image', 'photo_url', 'photoUrl'];

function getImageValueUrl(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  for (const key of IMAGE_OBJECT_KEYS) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  return '';
}

function looksLikeImageUrl(url, label = '') {
  if (!url || !IMAGE_URL_PATTERN.test(url)) return false;
  return IMAGE_FIELD_HINT.test(String(label)) || IMAGE_EXTENSION_PATTERN.test(url);
}

function ImageDetailPreview({ url, label = 'Image' }) {
  const readableLabel = String(label).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  return (
    <div className="w-full max-w-xl space-y-1.5">
      <a href={url} target="_blank" rel="noreferrer"
        className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        <img src={url} alt={readableLabel || 'Saved image'} loading="lazy"
          className="block max-h-56 min-h-24 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.parentElement?.querySelector('[data-image-fallback]');
            if (fallback) fallback.style.display = 'flex';
          }} />
        <span data-image-fallback style={{ display: 'none' }}
          className="min-h-24 w-full flex-col items-center justify-center gap-1 px-3 py-5 text-center text-xs font-semibold text-slate-500">
          <span className="text-sm">Image unavailable</span>
          <span className="font-normal">The saved image could not be loaded.</span>
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-slate-950/65 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          View full image
        </span>
      </a>
      <p className="break-all text-[10px] text-slate-400" title={url}>{readableLabel || 'Image'} preview</p>
    </div>
  );
}

/**
 * Renders values from saved records without exposing raw image URLs.
 * Image fields, image-looking URLs, nested media objects and galleries become
 * visual previews; ordinary text and non-image links remain readable.
 */
export function DetailValue({ label = '', value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 italic">—</span>;
  }
  if (React.isValidElement(value)) return value;
  if (typeof value === 'boolean') {
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${value ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{value ? 'Yes' : 'No'}</span>;
  }
  if (typeof value === 'number') {
    return <span className="tabular-nums">{Number.isFinite(value) ? value.toLocaleString() : '—'}</span>;
  }

  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== null && item !== undefined && item !== '');
    if (!items.length) return <span className="text-slate-400 italic">—</span>;
    const imageItems = items.map((item) => ({ item, url: getImageValueUrl(item) || (typeof item === 'string' ? item.trim() : '') }))
      .filter(({ url }) => looksLikeImageUrl(url, label));
    if (imageItems.length === items.length) {
      return (
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {imageItems.map(({ item, url }, index) => (
            <ImageDetailPreview key={item?.id ?? url ?? index} url={url}
              label={item?.caption || item?.title || (items.length > 1 ? `${label || 'Image'} ${index + 1}` : label || 'Image')} />
          ))}
        </div>
      );
    }
    return <div className="flex flex-wrap gap-1.5">{items.map((item, index) => (
      <span key={item?.id ?? index} className="inline-flex max-w-full items-center rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
        <DetailValue label={label} value={item} />
      </span>
    ))}</div>;
  }

  if (typeof value === 'object') {
    const objectUrl = getImageValueUrl(value);
    if (looksLikeImageUrl(objectUrl, label)) {
      return <ImageDetailPreview url={objectUrl} label={value.caption || value.title || label || 'Image'} />;
    }
    const entries = Object.entries(value).filter(([key, child]) =>
      !/^(id|created_at|updated_at|deleted_at|createdAt|updatedAt)$/i.test(key) &&
      child !== null && child !== undefined && child !== ''
    );
    if (!entries.length) return <span className="text-slate-400">No details provided</span>;
    return (
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map(([key, child]) => (
          <div key={key} className="min-w-0 rounded-lg border border-slate-100 bg-white p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')}</p>
            <div className="min-w-0 break-words text-sm text-slate-700"><DetailValue label={key} value={child} /></div>
          </div>
        ))}
      </div>
    );
  }

  const textValue = String(value).trim();
  if (looksLikeImageUrl(textValue, label)) {
    return <ImageDetailPreview url={textValue} label={label || 'Image'} />;
  }
  if (IMAGE_URL_PATTERN.test(textValue)) {
    return <a href={textValue} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline">Open link</a>;
  }
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

/* ── Field display row inside modal ── */
export function ModalField({ label, value, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="min-w-0 text-sm font-medium text-slate-800 break-words whitespace-pre-wrap">
        <DetailValue label={label} value={value} />
      </div>
    </div>
  )
}