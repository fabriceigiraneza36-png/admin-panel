import React, { useEffect, useRef } from 'react'
import AppRouter from './router'
import { AuthProvider } from '@context/AuthContext'
import { SocketProvider } from '@context/SocketContext'
import { NotificationProvider } from '@context/NotificationContext'
import { PushProvider } from '@context/PushNotificationContext'
import { useAuth } from '@hooks/useAuth'
import apiClient from '@api/client'

const WARMUP_ENDPOINTS = [
    ['/countries', { limit: 50, page: 1 }],
    ['/destinations', { limit: 50, page: 1 }],
    ['/bookings', { limit: 20, page: 1, sortBy: 'created_at', order: 'desc' }],
    ['/users', { limit: 20, page: 1 }],
    ['/posts', { limit: 20, page: 1 }],
    ['/subscribers', { limit: 20, page: 1 }],
    ['/contact', { limit: 20, page: 1 }],
    ['/packages', { limit: 50, page: 1 }],
    ['/services', { limit: 50, page: 1 }],
    ['/faqs', { limit: 50, page: 1 }],
    ['/team', { limit: 50, page: 1 }],
    ['/gallery', { limit: 50, page: 1 }],
]

function AdminDataWarmup() {
    const { isLoggedIn } = useAuth()
    const warmedToken = useRef(null)

    useEffect(() => {
        if (!isLoggedIn) return
        const token = localStorage.getItem('altuvera_admin_token')
        if (!token || warmedToken.current === token) return
        warmedToken.current = token

        // Warm the shared GET cache in small batches so navigation is fast
        // without creating a burst of requests against the Render backend.
        let cancelled = false
        const run = async () => {
            for (let i = 0; i < WARMUP_ENDPOINTS.length && !cancelled; i += 3) {
                const batch = WARMUP_ENDPOINTS.slice(i, i + 3)
                await Promise.allSettled(
                    batch.map(([url, params]) => apiClient.get(url, { params }))
                )
            }
        }
        run()
        // Keep shared data fresh while the admin app stays open. Page components
        // still own their React state; this keeps the cache warm for navigation
        // without suppressing live/socket updates.
        const refreshId = window.setInterval(() => {
            if (!cancelled) run()
        }, 30_000)
        return () => {
            cancelled = true
            window.clearInterval(refreshId)
        }
    }, [isLoggedIn])

    return null
}

/* ── Error boundary for catching render errors ── */
class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('[App] Render error:', error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        flexDirection: 'column',
                        gap: '16px',
                        fontFamily: 'Inter, sans-serif',
                        padding: '24px',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: '48px' }}>⚠️</div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: 0 }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
                        style={{
                            padding: '10px 24px',
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        Reload Page
                    </button>
                    <details style={{ fontSize: '12px', color: '#9ca3af', maxWidth: '500px' }}>
                        <summary style={{ cursor: 'pointer' }}>Error details</summary>
                        <pre style={{ textAlign: 'left', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                            {this.state.error?.stack || String(this.state.error)}
                        </pre>
                    </details>
                </div>
            )
        }
        return this.props.children
    }
}

export default function App() {
    return (
        <AppErrorBoundary>
            <AuthProvider>
                <AdminDataWarmup />
                <SocketProvider>
                    <NotificationProvider>
                        <PushProvider>
                            <AppRouter />
                        </PushProvider>
                    </NotificationProvider>
                </SocketProvider>
            </AuthProvider>
        </AppErrorBoundary>
    )
}