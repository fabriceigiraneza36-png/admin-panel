import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check, RefreshCw, X } from 'lucide-react'

const stringify = value => {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
  if (typeof value === 'string') return value
  try { return JSON.stringify(value, null, 2) } catch { return String(value ?? 'Unknown error') }
}

export function ErrorTraceMonitor() {
  const [incident, setIncident] = useState(null)
  useEffect(() => {
    const onError = e => {
      if (e.target && e.target !== window) {
        const target = e.target
        setIncident({ error: new Error(`Resource failed to load: ${target.src || target.href || target.tagName}`), message: 'A page resource failed to load.', source: target.src || target.href || '', kind: 'Resource loading error', time: new Date().toISOString() })
        return
      }
      const error = e.error || new Error(e.message || 'Unknown browser error')
      setIncident({ error, message: e.message || error.message, source: e.filename, line: e.lineno, column: e.colno, kind: 'Uncaught JavaScript error', time: new Date().toISOString() })
    }
    const onRejection = e => setIncident({ error: e.reason, message: stringify(e.reason), kind: 'Unhandled promise rejection', time: new Date().toISOString() })
    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onRejection)
    return () => { window.removeEventListener('error', onError, true); window.removeEventListener('unhandledrejection', onRejection) }
  }, [])
  if (!incident) return null
  return <ErrorTraceModal incident={incident} onDismiss={() => setIncident(null)} />
}

export function ErrorTraceModal({ error, errorInfo, incident, onRetry, onDismiss }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const data = incident || { error, errorInfo, kind: 'React rendering error', time: new Date().toISOString() }
  const err = data.error
  const message = data.message || err?.message || stringify(err) || 'Unknown error'
  const stack = err?.stack || ''
  const tree = data.errorInfo?.componentStack || ''
  const report = useMemo(() => [
    'ALTUVERA ADMIN — ERROR REPORT', `Type: ${data.kind || 'Application error'}`,
    `Time: ${data.time || new Date().toISOString()}`,
    `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
    `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    `Message: ${message}`, data.source ? `Source: ${data.source}` : '',
    data.line ? `Line/column: ${data.line}:${data.column || 0}` : '',
    '', 'STACK TRACE', stack || stringify(err), tree ? `\nREACT COMPONENT STACK\n${tree}` : ''
  ].filter(Boolean).join('\n'), [data, message, stack, tree, err])
  const copy = async () => {
    try { await navigator.clipboard.writeText(report) }
    catch {
      const area = document.createElement('textarea'); area.value = report
      area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area)
      area.select(); document.execCommand('copy'); area.remove()
    }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }
  useEffect(() => {
    const key = e => { if (e.key === 'Escape') onDismiss?.() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onDismiss])
  return <motion.div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-md sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (e.target === e.currentTarget) onDismiss?.() }}>
    <motion.section role="dialog" aria-modal="true" aria-labelledby="error-trace-title" className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl" initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: .98 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
      <header className="relative overflow-hidden bg-gradient-to-br from-rose-950 via-red-900 to-slate-900 px-5 py-5 text-white sm:px-6">
        <div className="relative flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10"><AlertTriangle size={22}/></div><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-rose-200">Runtime diagnostics</p><h2 id="error-trace-title" className="mt-1 text-xl font-bold">Something went wrong</h2><p className="mt-1 text-sm text-rose-100/80">{data.kind || 'Application error'} · {new Date(data.time || Date.now()).toLocaleTimeString()}</p></div><button onClick={onDismiss} aria-label="Dismiss error report" className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"><X size={19}/></button></div>
      </header>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50"><div className="flex items-center gap-2 border-b border-rose-200 px-4 py-3"><span className="h-2 w-2 rounded-full bg-rose-500"/><span className="text-xs font-bold uppercase tracking-wider text-rose-900">Error message</span></div><div className="max-h-24 overflow-auto px-4 py-3 font-mono text-sm leading-6 text-rose-950">{message}</div></div>
        <div className="flex flex-wrap gap-2"><button onClick={copy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied full report' : 'Copy full error'}</button>{onRetry && <button onClick={onRetry} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16}/> Try again</button>}</div>
        <button onClick={() => setExpanded(v => !v)} aria-expanded={expanded} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"><span><span className="block text-sm font-bold text-slate-800">{expanded ? 'Hide full diagnostics' : 'View full error details'}</span><span className="mt-0.5 block text-xs text-slate-500">Stack trace, component tree, URL and browser information</span></span>{expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>
        <AnimatePresence initial={false}>{expanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><pre className="max-h-[38dvh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-5 text-emerald-100 sm:text-xs">{report}</pre></motion.div>}</AnimatePresence>
        <p className="text-center text-[11px] leading-5 text-slate-400">Review diagnostic details before sharing; they may contain URLs and technical information.</p>
      </div>
    </motion.section>
  </motion.div>
}
export default ErrorTraceModal
