// admin/src/pages/Login.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN v7.0 — Modern Aurora Design
// ═══════════════════════════════════════════════════════════════════════════════
// • Full-viewport aurora green gradient with animated blobs
// • Central floating glassmorphic card
// • Innovative "orbital" logo animation
// • Micro-interactions everywhere
// • Email autocomplete dropdown preserved
// • Fully responsive · pure green/white theme
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
    useState, useEffect, useCallback, useMemo, useRef,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Shield,
    AlertCircle, CheckCircle, Sparkles, Globe2,
    Compass, BarChart3, Zap,
} from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import apiClient from '@api/client'

/* ═══════════════════════════════════════════════════════════════════════════
   KNOWN ADMIN ACCOUNTS (autocomplete)
═══════════════════════════════════════════════════════════════════════════ */
const KNOWN_ADMINS = [
    { email: 'admin@altuvera.com', username: 'admin', label: 'Super Admin' },
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
   AURORA BACKGROUND — animated colored blobs
═══════════════════════════════════════════════════════════════════════════ */
function AuroraBackground() {
    const blobs = useMemo(() => [
        { size: 500, top: '-10%', left: '-8%',  color1: '#10b981', color2: '#059669', dur: 22, delay: 0 },
        { size: 420, top: '55%',  left: '68%',  color1: '#34d399', color2: '#10b981', dur: 26, delay: 3 },
        { size: 380, top: '65%',  left: '-5%',  color1: '#6ee7b7', color2: '#34d399', dur: 24, delay: 1.5 },
        { size: 460, top: '-5%',  left: '65%',  color1: '#a7f3d0', color2: '#6ee7b7', dur: 28, delay: 5 },
        { size: 300, top: '30%',  left: '45%',  color1: '#059669', color2: '#047857', dur: 30, delay: 2 },
    ], [])

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Base gradient */}
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 25%, #ffffff 50%, #f0fdf4 100%)',
            }} />

            {/* Animated blobs */}
            {blobs.map((b, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: b.size,
                        height: b.size,
                        top: b.top,
                        left: b.left,
                        background: `radial-gradient(circle at 30% 30%, ${b.color1}22, ${b.color2}11 50%, transparent 70%)`,
                        filter: 'blur(60px)',
                        willChange: 'transform',
                    }}
                    animate={{
                        x: [0, 60, -40, 30, 0],
                        y: [0, -50, 40, -20, 0],
                        scale: [1, 1.15, 0.9, 1.08, 1],
                    }}
                    transition={{
                        duration: b.dur,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: b.delay,
                    }}
                />
            ))}

            {/* Subtle grid overlay */}
            <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: 'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)',
                backgroundSize: '60px 60px',
            }} />

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.4) 100%)',
            }} />
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ORBITAL LOGO — animated brand centerpiece
═══════════════════════════════════════════════════════════════════════════ */
function OrbitalLogo() {
    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Orbit ring 1 */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1.5px dashed rgba(5,150,105,0.25)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            {/* Orbit ring 2 */}
            <motion.div
                className="absolute rounded-full"
                style={{ inset: '8px', border: '1px solid rgba(52,211,153,0.3)' }}
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />
            {/* Orbiting dot */}
            <motion.div
                className="absolute w-2 h-2 rounded-full"
                style={{
                    background: '#10b981',
                    boxShadow: '0 0 12px #10b981',
                    top: 0,
                    left: '50%',
                    marginLeft: '-4px',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            {/* Center core */}
            <motion.div
                className="w-11 h-11 rounded-2xl flex items-center justify-center relative z-10"
                style={{
                    background: 'linear-gradient(135deg, #059669, #10b981, #34d399)',
                    boxShadow: '0 8px 24px rgba(5,150,105,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Sparkles size={20} className="text-white" strokeWidth={2.5} />
            </motion.div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL AUTOCOMPLETE DROPDOWN
═══════════════════════════════════════════════════════════════════════════ */
function EmailDropdown({ items, inputValue, onSelect, activeIndex }) {
    if (!items || items.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden"
            style={{
                background: 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(5,150,105,0.15)',
                boxShadow: '0 20px 50px rgba(5,150,105,0.18), 0 4px 12px rgba(0,0,0,0.06)',
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
                        className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-100 cursor-pointer"
                        style={{
                            background: isActive
                                ? 'linear-gradient(90deg, #f0fdf4, #ecfdf5)'
                                : 'transparent',
                            borderBottom: i < items.length - 1 ? '1px solid #f0fdf4' : 'none',
                        }}
                    >
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center
                            justify-center text-[11px] font-black transition-all"
                            style={{
                                background: isActive
                                    ? 'linear-gradient(135deg, #059669, #10b981)'
                                    : '#f3f4f6',
                                color: isActive ? '#fff' : '#6b7280',
                                boxShadow: isActive ? '0 4px 12px rgba(5,150,105,0.25)' : 'none',
                            }}>
                            {email.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm truncate">
                                {mi >= 0 && q.length > 0 ? (
                                    <>
                                        <span style={{ color: '#9ca3af' }}>{email.slice(0, mi)}</span>
                                        <span style={{ color: '#059669', fontWeight: 700 }}>{email.slice(mi, me)}</span>
                                        <span style={{ color: '#4b5563' }}>{email.slice(me)}</span>
                                    </>
                                ) : (
                                    <span style={{ color: '#4b5563' }}>{email}</span>
                                )}
                            </p>
                            <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#9ca3af' }}>
                                {item.label || item.username || 'Admin'}
                            </p>
                        </div>

                        {isActive && (
                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex-shrink-0 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider"
                                style={{
                                    background: 'linear-gradient(135deg, #059669, #10b981)',
                                    color: '#fff',
                                }}>
                                Tab
                            </motion.span>
                        )}
                    </button>
                )
            })}

            <div className="px-4 py-2"
                style={{ background: 'linear-gradient(90deg,#fafffe,#f0fdf4,#fafffe)', borderTop: '1px solid #f0fdf4' }}>
                <p className="text-[10px] text-center font-medium" style={{ color: '#94a3b8' }}>
                    <kbd style={{ color: '#059669', fontWeight: 800 }}>Tab</kbd> or{' '}
                    <kbd style={{ color: '#059669', fontWeight: 800 }}>Enter</kbd> to select ·{' '}
                    <kbd style={{ color: '#059669', fontWeight: 800 }}>↑↓</kbd> to navigate
                </p>
            </div>
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE STATS HOOK
═══════════════════════════════════════════════════════════════════════════ */
function useLiveStats() {
    const [stats, setStats] = useState({
        countries: 0, destinations: 0, services: 0, team: 0,
    })

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            const tryFetch = async (url) => {
                try {
                    const res = await apiClient.get(url, { params: { limit: 1, page: 1 } })
                    const d = res?.data
                    return d?.pagination?.total ?? d?.total ?? d?.count ?? 0
                } catch { return 0 }
            }

            const [countries, destinations, services, team] = await Promise.all([
                tryFetch('/countries'),
                tryFetch('/destinations'),
                tryFetch('/services'),
                tryFetch('/team'),
            ])

            if (!cancelled) setStats({ countries, destinations, services, team })
        }
        load()
        return () => { cancelled = true }
    }, [])

    return stats
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE CHIP
═══════════════════════════════════════════════════════════════════════════ */
function FeatureChip({ icon: Icon, label, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + delay * 0.08 }}
            whileHover={{ y: -2, scale: 1.03 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full cursor-default"
            style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(5,150,105,0.15)',
                boxShadow: '0 2px 8px rgba(5,150,105,0.05)',
            }}
        >
            <Icon size={12} className="text-emerald-600" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold" style={{ color: '#065f46' }}>{label}</span>
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT PILL — floating around card
═══════════════════════════════════════════════════════════════════════════ */
function StatPill({ label, value, position, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.9 + delay * 0.15, type: 'spring' }}
            className="absolute hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
            style={{
                ...position,
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(5,150,105,0.15)',
                boxShadow: '0 10px 30px rgba(5,150,105,0.12), 0 2px 6px rgba(0,0,0,0.04)',
            }}
        >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                }}>
                <span className="text-white text-[11px] font-black">
                    <AnimatedCounter target={value} duration={2} delay={delay} />
                </span>
            </div>
            <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#059669' }}>
                    Live
                </p>
                <p className="text-[11px] font-bold leading-tight" style={{ color: '#065f46' }}>
                    {label}
                </p>
            </div>
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LOGIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login, loading, error, isLoggedIn, dismissError } = useAuth()
    const { success: toastSuccess } = useToast()

    const liveStats = useLiveStats()

    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw]     = useState(false)
    const [touched, setTouched]   = useState({ email: false, password: false })
    const [shake, setShake]       = useState(false)

    const [emailFocused, setEmailFocused] = useState(false)
    const [passFocused, setPassFocused]   = useState(false)
    const [showDrop, setShowDrop]         = useState(false)
    const [dropIdx, setDropIdx]           = useState(0)

    const emailRef = useRef(null)
    const passRef  = useRef(null)

    const from = location.state?.from?.pathname || '/dashboard'

    useEffect(() => { if (isLoggedIn) navigate(from, { replace: true }) }, [isLoggedIn, navigate, from])
    useEffect(() => { if (error) { setShake(true); setTimeout(() => setShake(false), 600) } }, [error])
    useEffect(() => { if (error) dismissError() }, [email, password]) // eslint-disable-line

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const passValid  = password.length >= 6
    const canSubmit  = emailValid && passValid && !loading

    const suggestions = useMemo(() => {
        const q = email.toLowerCase().trim()
        if (!q) return KNOWN_ADMINS
        return KNOWN_ADMINS.filter((a) =>
            a.email.toLowerCase().includes(q) && a.email.toLowerCase() !== q
        )
    }, [email])

    useEffect(() => {
        setShowDrop(emailFocused && suggestions.length > 0 && !emailValid)
        setDropIdx(0)
    }, [emailFocused, suggestions.length, emailValid])

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

    const selectAdmin = useCallback((admin) => {
        setEmail(admin.email)
        setShowDrop(false)
        setTouched((t) => ({ ...t, email: true }))
        setTimeout(() => passRef.current?.focus(), 60)
    }, [])

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
            if (e.key === 'Escape') { setShowDrop(false); return }
        }
    }, [showDrop, suggestions, dropIdx, selectAdmin])

    const handlePassKey = useCallback((e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSubmit(e) }
    }, [handleSubmit])

    const emailErr = touched.email && email && !emailValid
    const passErr  = touched.password && password && !passValid

    /* ─── Input styling helpers ─── */
    const inputBorder = (hasErr, valid, focused) => {
        if (hasErr) return '#f87171'
        if (valid)  return '#10b981'
        if (focused) return '#34d399'
        return 'rgba(5,150,105,0.15)'
    }
    const inputShadow = (hasErr, valid, focused) => {
        if (hasErr) return '0 0 0 4px rgba(239,68,68,0.08)'
        if (valid)  return '0 0 0 4px rgba(16,185,129,0.1)'
        if (focused) return '0 0 0 4px rgba(5,150,105,0.08)'
        return 'none'
    }

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center p-4 md:p-8 overflow-hidden">

            {/* ═══ Aurora Background ═══ */}
            <AuroraBackground />

            {/* ═══ Floating Stat Pills (desktop only) ═══ */}
            <StatPill label="Countries"    value={liveStats.countries}    delay={0}
                position={{ top: '12%',  left: '6%' }} />
            <StatPill label="Destinations" value={liveStats.destinations} delay={1}
                position={{ top: '18%',  right: '7%' }} />
            <StatPill label="Services"     value={liveStats.services}     delay={2}
                position={{ bottom: '18%', left: '5%' }} />
            <StatPill label="Team"         value={liveStats.team}         delay={3}
                position={{ bottom: '12%', right: '6%' }} />

            {/* ═══ Main Card ═══ */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Glow behind card */}
                <div className="absolute -inset-8 rounded-[40px] pointer-events-none" style={{
                    background: 'radial-gradient(circle, rgba(5,150,105,0.15), transparent 70%)',
                    filter: 'blur(30px)',
                }} />

                {/* Glassmorphic card */}
                <motion.div
                    animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative rounded-[32px] p-8 md:p-10"
                    style={{
                        background: 'rgba(255,255,255,0.75)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        boxShadow: [
                            '0 30px 80px rgba(5,150,105,0.15)',
                            '0 8px 24px rgba(0,0,0,0.04)',
                            'inset 0 1px 0 rgba(255,255,255,1)',
                        ].join(', '),
                    }}
                >
                    {/* ─── Header ─── */}
                    <div className="flex flex-col items-center mb-8">
                        <OrbitalLogo />

                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-5 flex items-center gap-2 px-3 py-1 rounded-full"
                            style={{
                                background: 'linear-gradient(90deg, rgba(5,150,105,0.08), rgba(16,185,129,0.08))',
                                border: '1px solid rgba(5,150,105,0.2)',
                            }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#059669' }}>
                                Admin Portal
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-4 text-center font-black tracking-tight"
                            style={{ fontSize: '28px', lineHeight: 1.15 }}
                        >
                            <span style={{ color: '#0f172a' }}>Welcome to </span>
                            <span style={{
                                background: 'linear-gradient(135deg, #059669, #10b981, #34d399)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>Altuvera</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-2 text-center text-sm"
                            style={{ color: '#6b7280' }}
                        >
                            Sign in to manage your travel platform
                        </motion.p>
                    </div>

                    {/* ─── Form ─── */}
                    <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-4">

                        {/* Error alert */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -8, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl"
                                        style={{
                                            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                            border: '1px solid #fecaca',
                                        }}>
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: '#fecaca' }}>
                                            <AlertCircle size={14} className="text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold" style={{ color: '#991b1b' }}>
                                                Login failed
                                            </p>
                                            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#dc2626' }}>
                                                {typeof error === 'string' ? error : 'Invalid email or password.'}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ─── Email ─── */}
                        <div className="relative">
                            <label htmlFor="lg-email"
                                className="block text-[11px] font-black mb-2 uppercase tracking-wider"
                                style={{ color: '#065f46' }}>
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-20">
                                    <Mail size={16} style={{
                                        color: emailErr ? '#f87171'
                                            : email && emailValid ? '#10b981'
                                            : emailFocused ? '#34d399' : '#9ca3af',
                                    }} />
                                </div>

                                {/* Ghost hint text */}
                                {emailFocused && !emailValid && suggestions.length > 0 && email.length >= 1 && (
                                    <div className="absolute inset-0 flex items-center pl-11 pr-4 pointer-events-none select-none z-0">
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
                                    className="w-full py-3.5 text-sm rounded-2xl outline-none transition-all duration-200 relative z-10"
                                    style={{
                                        paddingLeft: '44px',
                                        paddingRight: email && emailValid ? '44px' : '16px',
                                        color: '#0f172a',
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        border: `1.5px solid ${inputBorder(emailErr, email && emailValid, emailFocused)}`,
                                        boxShadow: inputShadow(emailErr, email && emailValid, emailFocused),
                                        fontWeight: 500,
                                    }}
                                />

                                {email && emailValid && (
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
                                        <CheckCircle size={16} style={{ color: '#10b981' }} />
                                    </motion.div>
                                )}
                            </div>

                            {emailErr && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-1.5 text-[11px] font-semibold flex items-center gap-1"
                                    style={{ color: '#ef4444' }}>
                                    <AlertCircle size={10} /> Please enter a valid email
                                </motion.p>
                            )}

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

                        {/* ─── Password ─── */}
                        <div>
                            <label htmlFor="lg-pass"
                                className="block text-[11px] font-black mb-2 uppercase tracking-wider"
                                style={{ color: '#065f46' }}>
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-20">
                                    <Lock size={16} style={{
                                        color: passErr ? '#f87171'
                                            : password && passValid ? '#10b981'
                                            : passFocused ? '#34d399' : '#9ca3af',
                                    }} />
                                </div>

                                <input
                                    ref={passRef}
                                    id="lg-pass"
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setPassFocused(true)}
                                    onBlur={() => {
                                        setPassFocused(false)
                                        setTouched((t) => ({ ...t, password: true }))
                                    }}
                                    onKeyDown={handlePassKey}
                                    placeholder="Enter your password"
                                    autoComplete="off"
                                    className="w-full py-3.5 pr-12 text-sm rounded-2xl outline-none transition-all duration-200"
                                    style={{
                                        paddingLeft: '44px',
                                        color: '#0f172a',
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        border: `1.5px solid ${inputBorder(passErr, password && passValid, passFocused)}`,
                                        boxShadow: inputShadow(passErr, password && passValid, passFocused),
                                        fontWeight: 500,
                                    }}
                                />

                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8
                                       rounded-lg flex items-center justify-center
                                       transition-all duration-150 z-20"
                                    style={{
                                        color: showPw ? '#10b981' : '#9ca3af',
                                        background: showPw ? 'rgba(16,185,129,0.1)' : 'transparent',
                                    }}
                                >
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            {passErr && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-1.5 text-[11px] font-semibold flex items-center gap-1"
                                    style={{ color: '#ef4444' }}>
                                    <AlertCircle size={10} /> At least 6 characters required
                                </motion.p>
                            )}
                        </div>

                        {/* ─── Submit Button ─── */}
                        <motion.button
                            type="submit"
                            disabled={!canSubmit}
                            whileHover={canSubmit ? { y: -2, scale: 1.01 } : {}}
                            whileTap={canSubmit ? { scale: 0.98 } : {}}
                            className="relative w-full py-3.5 rounded-2xl text-sm font-bold
                                 flex items-center justify-center gap-2 mt-2 overflow-hidden group"
                            style={{
                                color: '#ffffff',
                                background: canSubmit
                                    ? 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)'
                                    : 'linear-gradient(135deg, #d1d5db, #e5e7eb)',
                                boxShadow: canSubmit
                                    ? '0 10px 30px rgba(5,150,105,0.35), 0 4px 10px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
                                    : 'none',
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {/* Shimmer effect */}
                            {canSubmit && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                                        transform: 'translateX(-100%)',
                                        animation: 'shimmer 1.5s infinite',
                                    }} />
                            )}

                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 rounded-full animate-spin"
                                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={15} strokeWidth={2.5} className="relative z-10" />
                                    <span className="relative z-10">Sign In Securely</span>
                                    <ArrowRight size={15} strokeWidth={2.5} className="relative z-10
                                        group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* ─── Divider ─── */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(5,150,105,0.15), transparent)',
                        }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
                            Trusted by
                        </span>
                        <div className="flex-1 h-px" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(5,150,105,0.15), transparent)',
                        }} />
                    </div>

                    {/* ─── Feature chips ─── */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <FeatureChip icon={Shield}    label="256-bit SSL"       delay={0} />
                        <FeatureChip icon={Globe2}    label="Global CDN"        delay={1} />
                        <FeatureChip icon={Compass}   label="Live Sync"         delay={2} />
                        <FeatureChip icon={BarChart3} label="Real-time Data"    delay={3} />
                    </div>

                    {/* ─── Footer ─── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="mt-7 pt-5 flex items-center justify-center gap-2"
                        style={{ borderTop: '1px solid rgba(5,150,105,0.08)' }}
                    >
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                            <p className="text-[10px] font-semibold" style={{ color: '#9ca3af' }}>
                                JWT Encrypted
                            </p>
                        </div>
                        <span style={{ color: '#d1d5db', fontSize: '10px' }}>·</span>
                        <p className="text-[10px] font-semibold" style={{ color: '#9ca3af' }}>
                            Altuvera Admin v7.0
                        </p>
                    </motion.div>
                </motion.div>

                {/* Tab hint below card */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-5 text-center text-[11px]"
                    style={{ color: '#6b7280' }}
                >
                    💡 Press <kbd className="mx-1 px-1.5 py-0.5 rounded font-bold"
                        style={{ background: '#f0fdf4', border: '1px solid #d1fae5', color: '#059669' }}>Tab</kbd>
                    in the email field for autocomplete
                </motion.p>
            </motion.div>   

            {/* Shimmer keyframes */}
            <style>{`
                @keyframes shimmer {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(100%);  }
                }
            `}</style>
        </div>
    )
}