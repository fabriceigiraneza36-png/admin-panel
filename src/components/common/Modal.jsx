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
          className="fixed inset-0 z-50 flex items-center justify-center p-4
                     bg-black/50 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96, y: 16  }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className={`
              bg-white rounded-3xl shadow-2xl w-full
              max-h-[92vh] flex flex-col
              ${SIZES[size] || SIZES.md}
              ${className}
            `}
          >
            {/* ── Header ── */}
            {(title || closable) && (
              <div className="flex items-start gap-3 px-6 pt-5 pb-4
                              border-b border-surface-100 flex-shrink-0">
                {icon && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl
                                  bg-primary-50 flex items-center justify-center">
                    <span className="text-primary-600">{icon}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className="text-xl font-bold text-slate-800 leading-tight">
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
            <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'px-6 py-5'}`}>
              {children}
            </div>

            {/* ── Footer ── */}
            {footer && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-surface-100
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

/* ── Field display row inside modal ── */
export function ModalField({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-800">
        {value || <span className="text-slate-400 italic">—</span>}
      </p>
    </div>
  )
}