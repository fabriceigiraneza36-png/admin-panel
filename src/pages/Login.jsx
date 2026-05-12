import React, {
    useState, useEffect, useCallback, useMemo, useRef,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Shield,
    Globe2, AlertCircle, CheckCircle, Compass,
    BarChart3, MapPin,
} from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import apiClient from '@api/client'

/* ─── Known admin accounts (from your confirmed DB) ──────────────────────── */
const KNOWN_ADMINS = [
    {
        email: 'admin@altuvera.com',
        username: 'admin',
        label: 'Super Admin',
    },
]

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════════════════════ */
function AnimatedCounter({ target, duration = 2, delay = 0 }) {
    const [count, setCount] = useState(0)
    const started = useRef(false)

    useEffect(() => {
        if (started.current) return
        started.current = true
        const t = typeof target === 'number' ? target : parseInt(target) || 0
        if (t === 0) return

        const timer = setTimeout(() => {
            const t0 = performance.now()
            const tick = (now) => {
                const prog = Math.min((now - t0) / (duration * 1000), 1)
                const eased = prog === 1 ? 1 : 1 - Math.pow(2, -10 * prog)
                setCount(Math.round(eased * t))
                if (prog < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
        }, delay * 1000)

        return () => clearTimeout(timer)
    }, [target, duration, delay])

    return <>{count.toLocaleString()}</>
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMOOTH FOG LAYER
   ═══════════════════════════════════════════════════════════════════════════ */
function FogLayer() {
    const fogs = useMemo(() => [
        { w: 600, h: 300, top: '-5%', left: '-15%', dur: 25, d: 0, o: 0.12 },
        { w: 500, h: 250, top: '15%', left: '60%', dur: 30, d: 3, o: 0.08 },
        { w: 700, h: 350, top: '40%', left: '-20%', dur: 28, d: 1.5, o: 0.10 },
        { w: 450, h: 220, top: '65%', left: '45%', dur: 22, d: 5, o: 0.09 },
        { w: 550, h: 280, top: '80%', left: '-10%', dur: 32, d: 2, o: 0.07 },
        { w: 400, h: 200, top: '25%', left: '75%', dur: 26, d: 4, o: 0.11 },
        { w: 650, h: 320, top: '50%', left: '30%', dur: 35, d: 6, o: 0.06 },
    ], [])

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {fogs.map((f, i) => (
                <motion.div key={i} className="absolute rounded-full"
                    style={{
                        width: f.w, height: f.h, top: f.top, left: f.left,
                        background: `radial-gradient(ellipse,
              rgba(167,243,208,${f.o}) 0%,
              rgba(110,231,183,${f.o * 0.4}) 40%,
              transparent 70%)`,
                        filter: 'blur(60px)',
                    }}
                    animate={{
                        x: [0, 40 + i * 10, -20 - i * 5, 30, 0],
                        y: [0, -25 + i * 8, 15 - i * 3, -10, 0],
                        scale: [1, 1.08, 0.95, 1.05, 1],
                        opacity: [f.o, f.o * 1.3, f.o * 0.7, f.o * 1.1, f.o],
                    }}
                    transition={{
                        duration: f.dur, repeat: Infinity,
                        repeatType: 'mirror', ease: 'easeInOut', delay: f.d,
                    }}
                />
            ))}
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE ITEM
   ═══════════════════════════════════════════════════════════════════════════ */
function FeatureItem({ icon: Icon, label, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + delay * 0.1 }}
            className="flex items-center gap-3"
        >
            <Icon size={17} className="text-emerald-300 flex-shrink-0" strokeWidth={1.8} />
            <span className="text-white/85 text-sm font-medium">{label}</span>
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL AUTOCOMPLETE DROPDOWN
   ═══════════════════════════════════════════════════════════════════════════ */
function EmailDropdown({ items, inputValue, onSelect, activeIndex }) {
    if (!items || items.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl overflow-hidden"
            style={{
                background: '#fff',
                border: '1.5px solid #d1fae5',
                boxShadow: '0 10px 36px rgba(5,150,105,0.13), 0 2px 8px rgba(0,0,0,0.05)',
            }}
        >
            {items.map((item, i) => {
                const isActive = i === activeIndex
                const q = (inputValue || '').toLowerCase()
                const email = item.email
                const mi = email.toLowerCase().indexOf(q)
                const me = mi >= 0 ? mi + q.length : -1

                return (
                    <button
                        key={email}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); onSelect(item) }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5
                       transition-all duration-100 cursor-pointer"
                        style={{
                            background: isActive ? '#f0fdf4' : 'transparent',
                            borderBottom: i < items.length - 1 ? '1px solid #f0fdf4' : 'none',
                        }}
                    >
                        {/* Avatar initial */}
                        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center
                            justify-center text-[11px] font-bold"
                            style={{
                                background: isActive ? '#dcfce7' : '#f3f4f6',
                                color: isActive ? '#059669' : '#6b7280',
                            }}>
                            {email.charAt(0).toUpperCase()}
                        </div>

                        {/* Email with match highlight */}
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm truncate" style={{ color: '#1a1a1a' }}>
                                {mi >= 0 && q.length > 0 ? (
                                    <>
                                        <span style={{ color: '#9ca3af' }}>{email.slice(0, mi)}</span>
                                        <span style={{ color: '#059669', fontWeight: 700 }}>
                                            {email.slice(mi, me)}
                                        </span>
                                        <span style={{ color: '#4b5563' }}>{email.slice(me)}</span>
                                    </>
                                ) : (
                                    <span style={{ color: '#4b5563' }}>{email}</span>
                                )}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>
                                {item.label || item.username || 'Admin'}
                            </p>
                        </div>

                        {/* Tab badge */}
                        {isActive && (
                            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5
                               rounded uppercase"
                                style={{ background: '#dcfce7', color: '#059669' }}>
                                Tab
                            </span>
                        )}
                    </button>
                )
            })}

            {/* Footer */}
            <div className="px-3.5 py-1.5"
                style={{ background: '#fafffe', borderTop: '1px solid #f0fdf4' }}>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                    <kbd style={{ color: '#059669', fontWeight: 700 }}>Tab</kbd>
                    {' '}or{' '}
                    <kbd style={{ color: '#059669', fontWeight: 700 }}>Enter</kbd>
                    {' '}to select
                    {' · '}
                    <kbd style={{ color: '#059669', fontWeight: 700 }}>↑ ↓</kbd>
                    {' '}to navigate
                </p>
            </div>
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE STATS — public endpoints only (no auth needed)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Replace useLiveStats in Login.jsx with this version ── */
function useLiveStats() {
    const [stats, setStats] = useState({
        countries: 0, destinations: 0, services: 0, team: 0,
    })

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            /* Only call endpoints confirmed to be public and working */
            const tryFetch = async (url) => {
                try {
                    const res = await apiClient.get(url, { params: { limit: 1, page: 1 } })
                    const d = res?.data
                    return d?.pagination?.total ?? d?.total ?? d?.count ?? 0
                } catch {
                    return 0  /* silently return 0 on any error */
                }
            }

            const [countries, destinations, services, team] = await Promise.all([
                tryFetch('/countries'),
                tryFetch('/destinations'),
                tryFetch('/services'),
                tryFetch('/team'),
            ])

            if (!cancelled) {
                setStats({ countries, destinations, services, team })
            }
        }

        load()
        return () => { cancelled = true }
    }, [])

    return stats
}


/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login, loading, error, isLoggedIn, dismissError } = useAuth()
    const { success: toastSuccess } = useToast()

    const liveStats = useLiveStats()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [touched, setTouched] = useState({ email: false, password: false })
    const [shake, setShake] = useState(false)

    /* Autocomplete state */
    const [emailFocused, setEmailFocused] = useState(false)
    const [showDrop, setShowDrop] = useState(false)
    const [dropIdx, setDropIdx] = useState(0)

    const emailRef = useRef(null)
    const passRef = useRef(null)

    const from = location.state?.from?.pathname || '/dashboard'

    useEffect(() => {
        if (isLoggedIn) navigate(from, { replace: true })
    }, [isLoggedIn, navigate, from])

    useEffect(() => {
        if (error) { setShake(true); setTimeout(() => setShake(false), 600) }
    }, [error])

    useEffect(() => {
        if (error) dismissError()
    }, [email, password]) // eslint-disable-line

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const passValid = password.length >= 6
    const canSubmit = emailValid && passValid && !loading

    /* Filtered admin suggestions */
    const suggestions = useMemo(() => {
        const q = email.toLowerCase().trim()
        if (!q) return KNOWN_ADMINS
        return KNOWN_ADMINS.filter((a) =>
            a.email.toLowerCase().includes(q) &&
            a.email.toLowerCase() !== q
        )
    }, [email])

    /* Show dropdown when focused and suggestions available */
    useEffect(() => {
        setShowDrop(emailFocused && suggestions.length > 0 && !emailValid)
        setDropIdx(0)
    }, [emailFocused, suggestions.length, emailValid])

    /* ── Submit ── */
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()
        setTouched({ email: true, password: true })
        setShowDrop(false)
        if (!canSubmit) return

        const result = await login({
            email: email.trim().toLowerCase(),
            password,
        })

        if (!result?.error) {
            toastSuccess('Welcome back! 🌍')
            navigate(from, { replace: true })
        }
    }, [canSubmit, login, email, password, navigate, from, toastSuccess])

    /* ── Select admin from dropdown ── */
    const selectAdmin = useCallback((admin) => {
        setEmail(admin.email)
        setShowDrop(false)
        setTouched((t) => ({ ...t, email: true }))
        /* Move focus to password field */
        setTimeout(() => passRef.current?.focus(), 60)
    }, [])

    /* ── Email keydown ── */
    const handleEmailKey = useCallback((e) => {
        if (showDrop && suggestions.length > 0) {
            if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault()
                selectAdmin(suggestions[dropIdx])
                return
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setDropIdx((p) => (p + 1) % suggestions.length)
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setDropIdx((p) => (p - 1 + suggestions.length) % suggestions.length)
                return
            }
            if (e.key === 'Escape') {
                setShowDrop(false)
                return
            }
        }

        /* Tab with no dropdown — just move to password */
        if (e.key === 'Tab' && !showDrop) {
            /* natural tab behavior */
        }
    }, [showDrop, suggestions, dropIdx, selectAdmin])

    /* ── Password keydown ── */
    const handlePassKey = useCallback((e) => {
        /* Enter submits form */
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit(e)
        }
    }, [handleSubmit])

    const emailErr = touched.email && email && !emailValid
    const passErr = touched.password && password && !passValid

    /* ─── Border color helper ─── */
    const borderColor = (hasErr, valid, focused) => {
        if (hasErr) return '#f87171'
        if (valid) return '#34d399'
        if (focused) return '#86efac'
        return '#d1fae5'
    }
    const shadowColor = (hasErr, valid, focused) => {
        if (hasErr) return '0 0 0 3px rgba(239,68,68,0.07)'
        if (valid) return '0 0 0 3px rgba(52,211,153,0.08)'
        if (focused) return '0 0 0 3px rgba(5,150,105,0.07)'
        return '0 1px 3px rgba(5,150,105,0.04)'
    }

    return (
        <div className="min-h-screen flex bg-white">

            {/* ══════════════════════════════════════════
          LEFT — Green animated panel
          ══════════════════════════════════════════ */}
            <div className="hidden lg:flex lg:w-[50%] xl:w-[52%]
                      relative overflow-hidden flex-col"
                style={{
                    background: 'linear-gradient(155deg,#022c22 0%,#064e3b 35%,#065f46 60%,#047857 85%,#059669 100%)',
                }}
            >
                <FogLayer />

                {/* Depth overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: [
                        'radial-gradient(ellipse at 30% 20%,rgba(16,185,129,0.06) 0%,transparent 50%)',
                        'radial-gradient(ellipse at 70% 80%,rgba(52,211,153,0.04) 0%,transparent 50%)',
                        'linear-gradient(180deg,rgba(0,0,0,0.08) 0%,transparent 30%,transparent 70%,rgba(0,0,0,0.12) 100%)',
                    ].join(','),
                }} />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full
                        px-10 xl:px-14 py-10 xl:py-14 justify-between">

                    {/* Top label */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-[11px] font-bold uppercase tracking-[0.25em]"
                        style={{ color: 'rgba(167,243,208,0.5)' }}
                    >
                        Admin Control Center
                    </motion.p>

                    {/* Hero */}
                    <div className="flex-1 flex flex-col justify-center py-8">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.15 }}
                            className="font-black leading-[1.08] tracking-tight mb-8"
                            style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.4rem)' }}
                        >
                            <span className="text-white">Your </span>
                            <span style={{
                                background: 'linear-gradient(135deg,#6ee7b7,#34d399)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>Travel</span>
                            <br />
                            <span style={{
                                background: 'linear-gradient(135deg,#a7f3d0,#6ee7b7)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>Dashboard</span>
                            <span className="text-white/70" style={{ fontSize: '1.8rem' }}> ✦</span>
                        </motion.h1>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 mb-10">
                            <FeatureItem delay={0} icon={Globe2} label="Destinations & Countries" />
                            <FeatureItem delay={1} icon={Compass} label="Live Booking Updates" />
                            <FeatureItem delay={2} icon={Shield} label="Role-Based Security" />
                            <FeatureItem delay={3} icon={BarChart3} label="Analytics & Reports" />
                        </div>
                    </div>

                    {/* Live stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="h-px w-full mb-5"
                            style={{ background: 'linear-gradient(90deg,transparent,rgba(167,243,208,0.18),transparent)' }} />

                        <div className="grid grid-cols-4 gap-2">
                            {/* Replace the stats grid items in Login.jsx left panel */}
                            {[
                                { val: liveStats.countries, label: 'Countries', delay: 0.2 },
                                { val: liveStats.destinations, label: 'Destinations', delay: 0.4 },
                                { val: liveStats.services, label: 'Services', delay: 0.6 },
                                { val: liveStats.team, label: 'Team', delay: 0.8 },
                            ].map((s) => (
                                <div key={s.label} className="text-center">
                                    <p className="font-black text-white leading-none"
                                        style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)' }}>
                                        <AnimatedCounter target={s.val} duration={2} delay={s.delay} />
                                    </p>
                                    <p className="font-bold uppercase mt-1.5"
                                        style={{ color: 'rgba(167,243,208,0.45)', fontSize: '9px', letterSpacing: '0.18em' }}>
                                        {s.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
          RIGHT — Login form
          ══════════════════════════════════════════ */}
            <div className="flex-1 flex items-center justify-center
                      p-6 md:p-10 xl:p-16 relative overflow-hidden"
                style={{ background: 'linear-gradient(170deg,#f0fdf4 0%,#fff 35%,#fff 100%)' }}>

                {/* Decorative radials */}
                <div className="absolute pointer-events-none"
                    style={{
                        top: '-80px', right: '-80px',
                        width: 240, height: 240, borderRadius: '50%',
                        background: 'radial-gradient(circle,rgba(5,150,105,0.04),transparent 70%)',
                    }} />
                <div className="absolute pointer-events-none"
                    style={{
                        bottom: '-60px', left: '-60px',
                        width: 180, height: 180, borderRadius: '50%',
                        background: 'radial-gradient(circle,rgba(16,185,129,0.03),transparent 70%)',
                    }} />

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 }}
                    className="relative z-10 w-full max-w-[390px]"
                >
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                            <MapPin size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-black text-xl" style={{ color: '#111827' }}>
                            Altuvera Admin
                        </span>
                    </div>

                    {/* Title — split green + dark */}
                    <div className="mb-7">
                        <h2 className="font-black leading-tight mb-2" style={{ fontSize: '26px' }}>
                            <span style={{ color: '#059669' }}>Wel</span>
                            <span style={{ color: '#111827' }}>come</span>
                            <span style={{ color: '#059669' }}> ba</span>
                            <span style={{ color: '#111827' }}>ck</span>
                            <span style={{ fontSize: '22px' }}> 👋</span>
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '13px' }}>
                            Enter your admin credentials to continue.
                        </p>
                    </div>

                    {/* ── FORM ── */}
                    <motion.form
                        onSubmit={handleSubmit}
                        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-4"
                        autoComplete="off"
                        noValidate
                    >

                        {/* Error alert */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -8, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-start gap-3 p-3.5 rounded-xl"
                                        style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
                                        <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold" style={{ color: '#b91c1c' }}>
                                                Login failed
                                            </p>
                                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#dc2626' }}>
                                                {typeof error === 'string'
                                                    ? error
                                                    : 'Invalid email or password. Please check your credentials.'}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Email field ── */}
                        <div>
                            <label htmlFor="lg-email"
                                className="block text-xs font-bold mb-1.5"
                                style={{ color: '#065f46' }}>
                                Email Address
                            </label>
                            <div className="relative">
                                {/* Icon */}
                                <div className="absolute left-3 top-1/2 -translate-y-1/2
                                pointer-events-none z-20">
                                    <Mail size={15} style={{
                                        color: emailErr ? '#f87171' :
                                            email && emailValid ? '#059669' : '#9ca3af',
                                    }} />
                                </div>

                                {/* Ghost hint text */}
                                {emailFocused && !emailValid && suggestions.length > 0 && email.length >= 1 && (
                                    <div className="absolute inset-0 flex items-center pl-9 pr-3
                                  pointer-events-none select-none z-0">
                                        <span style={{ color: '#d1d5db', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                            {suggestions[dropIdx]?.email || ''}
                                        </span>
                                    </div>
                                )}

                                <input
                                    ref={emailRef}
                                    id="lg-email"
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => {
                                        /* Delay so click on dropdown registers first */
                                        setTimeout(() => {
                                            setEmailFocused(false)
                                            setShowDrop(false)
                                        }, 200)
                                        setTouched((t) => ({ ...t, email: true }))
                                    }}
                                    onKeyDown={handleEmailKey}
                                    placeholder="admin@altuvera.com"
                                    autoComplete="off"
                                    autoFocus
                                    className="w-full py-2.5 text-sm rounded-xl outline-none
                             transition-all duration-200 relative z-10"
                                    style={{
                                        paddingLeft: '36px',
                                        paddingRight: email && emailValid ? '36px' : '12px',
                                        color: '#1a1a1a',
                                        backgroundColor: '#ffffff',
                                        border: `1.5px solid ${borderColor(emailErr, email && emailValid, emailFocused)}`,
                                        boxShadow: shadowColor(emailErr, email && emailValid, emailFocused),
                                    }}
                                />

                                {email && emailValid && (
                                    <CheckCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 z-20"
                                        style={{ color: '#059669' }} />
                                )}
                            </div>

                            {emailErr && (
                                <p className="mt-1 text-[11px] font-medium flex items-center gap-1"
                                    style={{ color: '#ef4444' }}>
                                    <AlertCircle size={10} /> Valid email required
                                </p>
                            )}

                            {/* Autocomplete dropdown */}
                            <AnimatePresence>
                                {showDrop && (
                                    <EmailDropdown
                                        items={suggestions}
                                        inputValue={email}
                                        onSelect={selectAdmin}
                                        activeIndex={dropIdx}
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── Password field ── */}
                        <div>
                            <label htmlFor="lg-pass"
                                className="block text-xs font-bold mb-1.5"
                                style={{ color: '#065f46' }}>
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2
                                pointer-events-none z-20">
                                    <Lock size={15} style={{
                                        color: passErr ? '#f87171' :
                                            password && passValid ? '#059669' : '#9ca3af',
                                    }} />
                                </div>

                                <input
                                    ref={passRef}
                                    id="lg-pass"
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                                    onKeyDown={handlePassKey}
                                    placeholder="Enter your password"
                                    autoComplete="off"
                                    className="w-full py-2.5 pr-10 text-sm rounded-xl outline-none
                             transition-all duration-200"
                                    style={{
                                        paddingLeft: '36px',
                                        color: '#1a1a1a',
                                        backgroundColor: '#ffffff',
                                        border: `1.5px solid ${borderColor(passErr, password && passValid, false)}`,
                                        boxShadow: shadowColor(passErr, password && passValid, false),
                                    }}
                                />

                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2
                             transition-colors duration-150 z-20"
                                    style={{ color: showPw ? '#059669' : '#9ca3af' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#059669' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = showPw ? '#059669' : '#9ca3af' }}
                                >
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            {passErr && (
                                <p className="mt-1 text-[11px] font-medium flex items-center gap-1"
                                    style={{ color: '#ef4444' }}>
                                    <AlertCircle size={10} /> At least 6 characters
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={!canSubmit}
                            whileHover={canSubmit ? { scale: 1.01, y: -1 } : {}}
                            whileTap={canSubmit ? { scale: 0.98 } : {}}
                            className="w-full py-3 rounded-xl text-sm font-bold
                         flex items-center justify-center gap-2
                         transition-all duration-200 mt-1"
                            style={{
                                color: '#ffffff',
                                background: canSubmit
                                    ? 'linear-gradient(135deg,#059669,#10b981)'
                                    : '#d1d5db',
                                boxShadow: canSubmit
                                    ? '0 6px 22px rgba(5,150,105,0.28), 0 2px 6px rgba(5,150,105,0.12)'
                                    : 'none',
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 rounded-full animate-spin"
                                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={15} strokeWidth={2.5} />
                                </>
                            )}
                        </motion.button>
                    </motion.form>

                    {/* Tab hint */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.6 }}
                        className="mt-4 flex items-center justify-center gap-1.5"
                    >
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>💡</span>
                        <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 500 }}>
                            Press
                        </span>
                        <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: '#f0fdf4', border: '1px solid #d1fae5', color: '#059669' }}>
                            Tab
                        </kbd>
                        <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 500 }}>
                            in the email field to autocomplete it.
                        </span>
                    </motion.div>

                    {/* Info box */}
                    <div className="mt-4 p-3.5 rounded-xl"
                        style={{ background: '#f0fdf4', border: '1.5px solid #d1fae5' }}>
                        <p className="text-[11px] font-bold flex items-center gap-1.5"
                            style={{ color: '#065f46' }}>
                            <Shield size={11} className="text-emerald-600" />
                            Authorized personnel only
                        </p>
                        <p className="text-[11px] mt-1 leading-relaxed"
                            style={{ color: '#047857' }}>
                            Use credentials provided by your system administration.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ecfdf5' }}>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                                style={{ background: '#34d399' }} />
                            <p style={{ color: '#9ca3af', fontSize: '11px' }}>
                                JWT secured · Encrypted · v6.2
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}