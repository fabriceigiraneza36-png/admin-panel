// admin/src/router.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER v2.2 — per-route browser tab titles
// ═══════════════════════════════════════════════════════════════════════════════

import React, { Component, useEffect, Suspense } from 'react'
import {
    createBrowserRouter,
    RouterProvider,
    Navigate,
} from 'react-router-dom'
import ProtectedRoute from '@components/common/ProtectedRoute'
import Loader         from '@components/common/Loader'
import { AdminLayout } from '@components/common/Sidebar'

// ── Page imports — all eager to avoid Vercel chunk 404s ──────────────────────

import Login         from '@pages/Login'
import Dashboard     from '@pages/Dashboard'
import Notifications from '@pages/Notifications'
import Countries     from '@pages/Countries'
import Destinations  from '@pages/Destinations'
import Comments      from '@pages/Comments'
import Bookings      from '@pages/Bookings'
import Packages      from '@pages/Packages'
import Users         from '@pages/Users'
import Posts         from '@pages/Posts'
import FAQs          from '@pages/FAQs'
import Tips          from '@pages/Tips'
import Team          from '@pages/Team'
import Testimonials  from '@pages/Testimonials'
import Gallery       from '@pages/Gallery'
import Contact       from '@pages/Contact'
import Subscribers   from '@pages/Subscribers'
import Settings      from '@pages/Settings'
import PagesPage     from '@pages/Pages'
import Broadcast     from '@pages/Broadcast'
import MessagesPage  from '@pages/Messages'
import LikesPage     from '@pages/Likes'
import Maintenance   from '@pages/Maintenance'

/**
 * AdminLayout — eager import ensures Sidebar is bundled in the main chunk.
 * This avoids Vercel CDN edge-cache 404s on the old dynamic Sidebar chunk.
 */

// ── App name ──────────────────────────────────────────────────────────────────

const APP_NAME = 'Travel Admin'

// ── Error boundary ────────────────────────────────────────────────────────────

class RouteErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('[Router] Caught render error:', error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div
                style={{
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    justifyContent: 'center',
                    minHeight:      '100vh',
                    gap:            '12px',
                    fontFamily:     'Inter, system-ui, sans-serif',
                    background:     '#f9fafb',
                    padding:        '24px',
                    textAlign:      'center',
                }}
            >
                <p style={{ fontSize: '16px', color: '#dc2626', fontWeight: 600, margin: 0 }}>
                    {this.state.error?.message || 'Something went wrong loading this page.'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding:      '8px 24px',
                        background:   '#059669',
                        color:        '#fff',
                        border:       'none',
                        borderRadius: '8px',
                        cursor:       'pointer',
                        fontWeight:   600,
                        fontSize:     '14px',
                    }}
                >
                    Reload
                </button>
            </div>
        )
    }
}

// ── Title setter ──────────────────────────────────────────────────────────────

/**
 * Sets document.title while mounted, restores on unmount.
 * Usage: <TitleSetter title="Dashboard" />
 */
function TitleSetter({ title }) {
    useEffect(() => {
        const prev = document.title
        document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
        return () => {
            document.title = prev
        }
    }, [title])

    return null
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

/**
 * Wraps every lazy page in Suspense + ErrorBoundary + sets browser tab title.
 *
 * @param {React.ReactNode} children  — the page component
 * @param {string}          title     — browser tab label (e.g. "Dashboard")
 */
const Page = ({ children, title }) => (
    <RouteErrorBoundary>
        <TitleSetter title={title} />
        <Suspense fallback={<Loader fullScreen />}>
            {children}
        </Suspense>
    </RouteErrorBoundary>
)

// ── v7 future flags ───────────────────────────────────────────────────────────

const FUTURE_FLAGS = {
    v7_startTransition:             true,
    v7_relativeSplatPath:           true,
    v7_fetcherPersist:              true,
    v7_normalizeFormMethod:         true,
    v7_partialHydration:            true,
    v7_skipActionErrorRevalidation: true,
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createBrowserRouter(
    [
        // ── Public ────────────────────────────────────────────────────────────
        {
            path: '/login',
            element: (
                <Page title="Login">
                    <Login />
                </Page>
            ),
        },

        // ── Protected admin shell ─────────────────────────────────────────────
        {
            path: '/',
            element: (
                <ProtectedRoute>
                    <RouteErrorBoundary>
                        <AdminLayout />
                    </RouteErrorBoundary>
                </ProtectedRoute>
            ),
            children: [
                // Index → dashboard
                {
                    index:   true,
                    element: <Navigate to="/dashboard" replace />,
                },

                // ── Pages ─────────────────────────────────────────────────────
                {
                    path:    'dashboard',
                    element: <Page title="Dashboard"><Dashboard /></Page>,
                },
                {
                    path:    'countries',
                    element: <Page title="Countries"><Countries /></Page>,
                },
                {
                    path:    'destinations',
                    element: <Page title="Destinations"><Destinations /></Page>,
                },
                {
                    path:    'comments',
                    element: <Page title="Comments"><Comments /></Page>,
                },
                {
                    path:    'bookings',
                    element: <Page title="Bookings"><Bookings /></Page>,
                },
                {
                    path:    'packages',
                    element: <Page title="Packages"><Packages /></Page>,
                },
                {
                    path:    'users',
                    element: <Page title="Users"><Users /></Page>,
                },
                {
                    path:    'posts',
                    element: <Page title="Posts"><Posts /></Page>,
                },
                {
                    path:    'faqs',
                    element: <Page title="FAQs"><FAQs /></Page>,
                },
                {
                    path:    'tips',
                    element: <Page title="Travel Tips"><Tips /></Page>,
                },
                {
                    path:    'team',
                    element: <Page title="Team"><Team /></Page>,
                },
                {
                    path:    'notifications',
                    element: <Page title="Notifications"><Notifications /></Page>,
                },
                {
                    path:    'testimonials',
                    element: <Page title="Testimonials"><Testimonials /></Page>,
                },
                {
                    path:    'gallery',
                    element: <Page title="Gallery"><Gallery /></Page>,
                },
                {
                    path:    'contact',
                    element: <Page title="Contact"><Contact /></Page>,
                },
                {
                    path:    'subscribers',
                    element: <Page title="Subscribers"><Subscribers /></Page>,
                },
                {
                    path:    'settings',
                    element: <Page title="Settings"><Settings /></Page>,
                },
                {
                    path:    'broadcast',
                    element: <Page title="Broadcast"><Broadcast /></Page>,
                },
                {
                    path:    'messages',
                    element: <Page title="Messages"><MessagesPage /></Page>,
                },
                {
                    path:    'likes',
                    element: <Page title="Likes"><LikesPage /></Page>,
                },
                {
                    path:    'maintenance',
                    element: <Page title="Maintenance"><Maintenance /></Page>,
                },
                {
                    path:    'pages',
                    element: <Page title="Pages"><PagesPage /></Page>,
                },
            ],
        },

        // ── Catch-all ─────────────────────────────────────────────────────────
        {
            path:    '*',
            element: <Navigate to="/dashboard" replace />,
        },
    ],
    { future: FUTURE_FLAGS },
)

// ── Export ────────────────────────────────────────────────────────────────────

export default function AppRouter() {
    return (
        <RouterProvider
            router={router}
            future={FUTURE_FLAGS}
        />
    )
}