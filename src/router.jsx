/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROUTER v2.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fixes applied:
 *  - v7 future flags on both createBrowserRouter AND RouterProvider
 *  - AdminLayoutLoader replaced with a clean lazy + error-boundary pattern
 *  - Suspense fallbacks consolidated — no nested duplicate Suspense wrappers
 *  - Catch-all redirects to /dashboard (authenticated) or /login (guest)
 *  - React Router deprecation warnings silenced
 */

import React, {
  lazy,
  Suspense,
  Component,
} from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import ProtectedRoute from '@components/common/ProtectedRoute'
import Loader         from '@components/common/Loader'

// ─── Lazy pages ───────────────────────────────────────────────────────────────

const Login         = lazy(() => import('@pages/Login'))
const Notifications = lazy(() => import('@pages/Notifications'))
const Dashboard     = lazy(() => import('@pages/Dashboard'))
const Countries     = lazy(() => import('@pages/Countries'))

const Destinations  = lazy(() => import('@pages/Destinations'))
const Comments      = lazy(() => import('@pages/Comments'))

const Bookings      = lazy(() => import('@pages/Bookings'))
const Packages      = lazy(() => import('@pages/Packages'))
const Users         = lazy(() => import('@pages/Users'))
const Posts         = lazy(() => import('@pages/Posts'))
const FAQs          = lazy(() => import('@pages/FAQs'))
const Tips          = lazy(() => import('@pages/Tips'))
const Team          = lazy(() => import('@pages/Team'))
const Testimonials  = lazy(() => import('@pages/Testimonials'))
const Gallery       = lazy(() => import('@pages/Gallery'))
const Contact       = lazy(() => import('@pages/Contact'))
const Subscribers   = lazy(() => import('@pages/Subscribers'))
const Chat          = lazy(() => import('@pages/Chat'))
const Settings      = lazy(() => import('@pages/Settings'))
const PagesPage     = lazy(() => import('@pages/Pages'))

/**
 * AdminLayout — imported lazily and handles both named + default export shapes.
 * Vite/Rollup always resolves the correct export; the factory handles both.
 */
const AdminLayout = lazy(() =>
  import('@components/common/Sidebar').then((mod) => ({
    // Support:  export default AdminLayout
    //           export { AdminLayout }
    default: mod.AdminLayout ?? mod.default,
  })),
)

// ─── Error boundary (catches lazy-load / render failures) ────────────────────

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

// ─── Suspense wrapper ─────────────────────────────────────────────────────────

/**
 * Wrap every lazy page in a single Suspense + ErrorBoundary.
 * No need to nest Suspense — one is enough per route subtree.
 */
const Page = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<Loader fullScreen />}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
)

// ─── Router definition ────────────────────────────────────────────────────────

/**
 * All v7 future flags are set here on createBrowserRouter.
 * They are also forwarded to RouterProvider for full compatibility.
 */
const FUTURE_FLAGS = {
  v7_startTransition:             true,
  v7_relativeSplatPath:           true,
  v7_fetcherPersist:              true,
  v7_normalizeFormMethod:         true,
  v7_partialHydration:            true,
  v7_skipActionErrorRevalidation: true,
}

const router = createBrowserRouter(
  [
    // ── Public ────────────────────────────────────────────────────────────────
    {
      path:    '/login',
      element: (
        <Page>
          <Login />
        </Page>
      ),
    },

    // ── Protected admin shell ─────────────────────────────────────────────────
    {
      path: '/',
      element: (
        <ProtectedRoute>
          {/*
           * One Suspense here covers the AdminLayout chunk.
           * Child route Suspenses cover each page chunk independently —
           * so navigating between pages shows a loader only for that page,
           * not the whole shell.
           */}
          <RouteErrorBoundary>
            <Suspense fallback={<Loader fullScreen />}>
              <AdminLayout />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      ),
      children: [
        // Index → redirect to dashboard
        {
          index:   true,
          element: <Navigate to="/dashboard" replace />,
        },

        // ── Admin pages ───────────────────────────────────────────────────────
        { path: 'dashboard',   element: <Page><Dashboard    /></Page> },
        { path: 'countries',   element: <Page><Countries    /></Page> },
        { path: 'destinations',element: <Page><Destinations /></Page> },
        { path: 'comments',    element: <Page><Comments     /></Page> },
        { path: 'bookings',    element: <Page><Bookings     /></Page> },
        { path: 'packages',    element: <Page><Packages    /></Page> },
        { path: 'users',       element: <Page><Users        /></Page> },
        { path: 'posts',       element: <Page><Posts        /></Page> },
        { path: 'faqs',        element: <Page><FAQs         /></Page> },
        { path: 'tips',        element: <Page><Tips         /></Page> },
        { path: 'team',        element: <Page><Team         /></Page> },
        {
  path: '/notifications',
  element: (
      <Notifications />
  ),
},
        { path: 'testimonials',element: <Page><Testimonials /></Page> },
        { path: 'gallery',     element: <Page><Gallery      /></Page> },
        { path: 'contact',     element: <Page><Contact      /></Page> },
        { path: 'subscribers', element: <Page><Subscribers  /></Page> },
        { path: 'chat',        element: <Page><Chat         /></Page> },
        { path: 'settings',    element: <Page><Settings     /></Page> },
        { path: 'pages',       element: <Page><PagesPage    /></Page> },
      ],
    },

    // ── Catch-all ─────────────────────────────────────────────────────────────
    {
      path:    '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ],
  { future: FUTURE_FLAGS },
)

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <RouterProvider
      router={router}
      future={FUTURE_FLAGS}
    />
  )
}