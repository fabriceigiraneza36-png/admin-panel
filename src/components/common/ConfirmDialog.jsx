import React from 'react'
import { AlertTriangle, Trash2, CheckCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

const CONFIG = {
  delete: {
    icon:       Trash2,
    iconBg:     'bg-red-100',
    iconColor:  'text-red-600',
    btnClass:   'btn-danger',
    btnLabel:   'Delete',
  },
  warning: {
    icon:       AlertTriangle,
    iconBg:     'bg-amber-100',
    iconColor:  'text-amber-600',
    btnClass:   'btn bg-amber-500 text-white hover:bg-amber-600',
    btnLabel:   'Confirm',
  },
  confirm: {
    icon:       CheckCircle,
    iconBg:     'bg-primary-100',
    iconColor:  'text-primary-600',
    btnClass:   'btn-primary',
    btnLabel:   'Confirm',
  },
  info: {
    icon:       Info,
    iconBg:     'bg-blue-100',
    iconColor:  'text-blue-600',
    btnClass:   'btn bg-blue-500 text-white hover:bg-blue-600',
    btnLabel:   'OK',
  },
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type        = 'delete',
  title       = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel,
  loading     = false,
}) {
  const cfg = CONFIG[type] || CONFIG.confirm
  const Icon = cfg.icon

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4
                     bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1,   y: 0  }}
            exit={{   opacity: 0, scale: 0.9, y: 12  }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6
                       flex flex-col items-center text-center gap-4"
          >
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center
                             justify-center ${cfg.iconBg}`}>
              <Icon size={28} className={cfg.iconColor} strokeWidth={2} />
            </div>

            {/* Text */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5">
                {title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`${cfg.btnClass} flex-1`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40
                                     border-t-white rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (confirmLabel || cfg.btnLabel)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}