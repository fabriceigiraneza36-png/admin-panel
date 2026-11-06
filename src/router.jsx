// admin/src/router.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER v2.2 — per-route browser tab titles
// ═══════════════════════════════════════════════════════════════════════════════

import React, { Component, useEffect, Suspense, lazy } from 'react'
import {
    createBrowserRouter,
    RouterProvider,
    Navigate,
} from 'react-router-dom'
import ProtectedRoute from '@components/common/ProtectedRoute'
import Loader         from '@components/common/Loader'
import { AdminLayout } from '@components/common/Sidebar'
import { ErrorTraceModal } from '@components/common/ErrorTraceModal'

// Route-level splitting keeps rarely used admin screens out of the initial bundle.
// A one-time reload recovers gracefully when a visitor has an older HTML shell cached
// while a new deployment has already replaced its hashed JavaScript chunks.
const CHUNK_RELOAD_KEY = 'altuvera:chunk-reload-at'

function lazyRoute(loader) {
    return lazy(async () => {
        try {
            const page = await loader()
            try { sessionStorage.removeItem(CHUNK_RELOAD_KEY) } catch { /* storage may be unavailable */ }
            return page
        } catch (error) {
            const message = String(error?.message || error)
            const isChunkLoadFailure = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError/i.test(message)
            if (isChunkLoadFailure && typeof window !== 'undefined') {
                let shouldReload = false
                try {
                    const lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
                    if (!lastAttempt || Date.now() - lastAttempt > 30_000) {
                        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
                        shouldReload = true
                    }
                } catch { /* continue to the route error boundary */ }
                if (shouldReload) {
                    window.location.reload()
                    return new Promise(() => {})
                }
            }
            throw error
        }
    })
}

const Login = lazyRoute(() => import('@pages/Login'))
const Dashboard = lazyRoute(() => import('@pages/Dashboard'))
const Notifications = lazyRoute(() => import('@pages/Notifications'))
const Countries = lazyRoute(() => import('@pages/Countries'))
const Destinations = lazyRoute(() => import('@pages/Destinations'))
const Comments = lazyRoute(() => import('@pages/Comments'))
const DestinationRatings = lazyRoute(() => import('@pages/DestinationRatings'))
const Bookings = lazyRoute(() => import('@pages/Bookings'))
const Packages = lazyRoute(() => import('@pages/Packages'))
const Users = lazyRoute(() => import('@pages/Users'))
const Posts = lazyRoute(() => import('@pages/Posts'))
const FAQs = lazyRoute(() => import('@pages/FAQs'))
const Tips = lazyRoute(() => import('@pages/Tips'))
const Team = lazyRoute(() => import('@pages/Team'))
const Testimonials = lazyRoute(() => import('@pages/Testimonials'))
const Gallery = lazyRoute(() => import('@pages/Gallery'))
const Contact = lazyRoute(() => import('@pages/Contact'))
const Subscribers = lazyRoute(() => import('@pages/Subscribers'))
const Settings = lazyRoute(() => import('@pages/Settings'))
const PagesPage = lazyRoute(() => import('@pages/Pages'))
const Broadcast = lazyRoute(() => import('@pages/Broadcast'))
const MessagesPage = lazyRoute(() => import('@pages/Messages'))
const LikesPage = lazyRoute(() => import('@pages/Likes'))
const Maintenance = lazyRoute(() => import('@pages/Maintenance'))
const ItinerariesPage = lazyRoute(() => import('@pages/Itineraries'))
const TripOperations = lazyRoute(() => import('@pages/TripOperations'))
const TourismAnalytics = lazyRoute(() => import('@pages/TourismAnalytics'))
const ItineraryBuilder = lazyRoute(() => import('@pages/ItineraryBuilder'))
const AccountRecovery = lazyRoute(() => import('@pages/AccountRecovery'))
const AccountActivityReview = lazyRoute(() => import('@pages/AccountActivityReview'))
const AuthDiagnostics = lazyRoute(() => import('@pages/AuthDiagnostics'))

/**
 * AdminLayout — eager import ensures Sidebar is bundled in the main chunk.
 * This avoids Vercel CDN edge-cache 404s on the old dynamic Sidebar chunk.
 */

// ── App name ──────────────────────────────────────────────────────────────────

const APP_NAME = 'Altuvera Admin'

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
            <ErrorTraceModal
                error={this.state.error}
                errorInfo={this.state.errorInfo}
                onRetry={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                onDismiss={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            />
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
                    path:    'destination-ratings',
                    element: <Page title="Destination Ratings"><DestinationRatings /></Page>,
                },
                {
                    path:    'bookings',
                    element: <Page title="Bookings"><Bookings /></Page>,
                },
                {
                    path:    'trip-operations',
                    element: <Page title="Trip Operations"><TripOperations /></Page>,
                },
                {
                    path:    'tourism-analytics',
                    element: <Page title="Tourism Analytics"><TourismAnalytics /></Page>,
                },
                {
                    path:    'itineraries',
                    element: <Page title="Itineraries"><ItinerariesPage /></Page>,
                },
                {
                    path:    'itineraries/:bookingId',
                    element: <Page title="Itinerary Builder"><ItineraryBuilder /></Page>,
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
                    path:    'account-recovery',
                    element: <Page title="Account Recovery"><AccountRecovery /></Page>,
                },
                {
                    path:    'account-activity-review',
                    element: <Page title="Account Activity Review"><AccountActivityReview /></Page>,
                },
                {
                    path:    'auth-diagnostics',
                    element: <Page title="Auth Diagnostics"><AuthDiagnostics /></Page>,
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