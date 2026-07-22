import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import AppRouter from './router'
import { AuthProvider } from '@context/AuthContext'
import { SocketProvider } from '@context/SocketContext'
import { NotificationProvider } from '@context/NotificationContext'

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
                <SocketProvider>
                    <NotificationProvider>
                        <AppRouter />
                        <Analytics />
                    </NotificationProvider>
                </SocketProvider>
            </AuthProvider>
        </AppErrorBoundary>
    )
}