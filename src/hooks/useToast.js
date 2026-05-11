import toast from 'react-hot-toast'
import { useCallback } from 'react'

/* ── Safe stringify any value to a displayable string ── */
const toStr = (msg) => {
  if (msg === null || msg === undefined) return 'An error occurred'
  if (typeof msg === 'string')  return msg || 'An error occurred'
  if (typeof msg === 'number')  return String(msg)
  if (typeof msg === 'boolean') return msg ? 'Success' : 'Failed'
  if (typeof msg === 'object') {
    /* Extract known message fields */
    const m = msg.message || msg.error || msg.msg || msg.detail || msg.text
    if (m && typeof m === 'string') return m
    /* Try to stringify */
    try { return JSON.stringify(msg) }
    catch { return 'An error occurred' }
  }
  return String(msg)
}

export const useToast = () => {
  const success = useCallback((msg) => {
    toast.success(toStr(msg), {
      duration: 3000,
      style: {
        background:   '#fff',
        color:        '#065f46',
        border:       '1px solid #bbf7d0',
        fontWeight:   600,
        borderRadius: '12px',
        padding:      '12px 16px',
        fontSize:     '14px',
      },
      iconTheme: { primary: '#059669', secondary: '#fff' },
    })
  }, [])

  const error = useCallback((msg) => {
    toast.error(toStr(msg), {
      duration: 4000,
      style: {
        background:   '#fff',
        color:        '#dc2626',
        border:       '1px solid #fecaca',
        fontWeight:   600,
        borderRadius: '12px',
        padding:      '12px 16px',
        fontSize:     '14px',
      },
    })
  }, [])

  const info = useCallback((msg) => {
    toast(toStr(msg), {
      icon: 'ℹ️',
      duration: 3000,
      style: {
        background:   '#fff',
        color:        '#1e40af',
        border:       '1px solid #bfdbfe',
        fontWeight:   500,
        borderRadius: '12px',
        fontSize:     '14px',
      },
    })
  }, [])

  const warn = useCallback((msg) => {
    toast(toStr(msg), {
      icon: '⚠️',
      duration: 3500,
      style: {
        background:   '#fff',
        color:        '#92400e',
        border:       '1px solid #fde68a',
        fontWeight:   500,
        borderRadius: '12px',
        fontSize:     '14px',
      },
    })
  }, [])

  const promise = useCallback((promiseFn, messages = {}) =>
    toast.promise(promiseFn, {
      loading: toStr(messages.loading) || 'Loading…',
      success: toStr(messages.success) || 'Done!',
      error:   toStr(messages.error)   || 'Something went wrong',
    }, {
      style: {
        fontWeight:   600,
        borderRadius: '12px',
        padding:      '12px 16px',
        fontSize:     '14px',
      },
      success: {
        style: { border: '1px solid #bbf7d0', color: '#065f46' },
        iconTheme: { primary: '#059669', secondary: '#fff' },
      },
      error: {
        style: { border: '1px solid #fecaca', color: '#dc2626' },
      },
    }),
  [])

  return { success, error, info, warn, promise }
}