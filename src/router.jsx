import React, { lazy, Suspense, useState, useEffect } from 'react'
import {
    createBrowserRouter,
    RouterProvider,
    Navigate,
    Outlet,
} from 'react-router-dom'
import ProtectedRoute from '@components/common/ProtectedRoute'
import Loader from '@components/common/Loader'

/* ── Lazy pages ── */
const Login = lazy(() => import('@pages/Login'))
const Dashboard = lazy(() => import('@pages/Dashboard'))
const Countries = lazy(() => import('@pages/Countries'))
const Destinations = lazy(() => import('@pages/Destinations'))
const Bookings = lazy(() => import('@pages/Bookings'))
const Users = lazy(() => import('@pages/Users'))
const Posts = lazy(() => import('@pages/Posts'))
const FAQs = lazy(() => import('@pages/FAQs'))
const Tips = lazy(() => import('@pages/Tips'))
const Team = lazy(() => import('@pages/Team'))
const Testimonials = lazy(() => import('@pages/Testimonials'))
const Gallery = lazy(() => import('@pages/Gallery'))
const Contact = lazy(() => import('@pages/Contact'))
const Subscribers = lazy(() => import('@pages/Subscribers'))
const Chat = lazy(() => import('@pages/Chat'))
const Settings = lazy(() => import('@pages/Settings'))
const PagesPage = lazy(() => import('@pages/Pages'))

/* ── AdminLayout loaded dynamically to avoid named-export issues ── */
function AdminLayoutLoader() {
    const [Layout, setLayout] = useState(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        import('@components/common/Sidebar')
            .then((mod) => {
                const L = mod.AdminLayout || mod.default
                if (typeof L === 'function') setLayout(() => L)
                else setFailed(true)
            })
            .catch(() => setFailed(true))
    }, [])

    if (failed) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', flexDirection: 'column', gap: '12px',
                fontFamily: 'Inter, sans-serif',
            }}>
                <p style={{ fontSize: '16px', color: '#dc2626', fontWeight: 600 }}>
                    Failed to load layout
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '8px 20px', background: '#059669', color: '#fff',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                    }}
                >
                    Reload
                </button>
            </div>
        )
    }

    if (!Layout) return <Loader fullScreen />
    return <Layout />
}

/* ── Page suspense wrapper ── */
const P = ({ children }) => (
    <Suspense fallback={<Loader fullScreen />}>{children}</Suspense>
)

/* ── Router ── */
const router = createBrowserRouter(
    [
        {
            path: '/login',
            element: <P><Login /></P>,
        },
        {
            path: '/',
            element: (
                <ProtectedRoute>
                    <Suspense fallback={<Loader fullScreen />}>
                        <AdminLayoutLoader />
                    </Suspense>
                </ProtectedRoute>
            ),
            children: [
                { index: true, element: <Navigate to="/dashboard" replace /> },
                { path: 'dashboard', element: <P><Dashboard /></P> },
                { path: 'countries', element: <P><Countries /></P> },
                { path: 'destinations', element: <P><Destinations /></P> },
                { path: 'bookings', element: <P><Bookings /></P> },
                { path: 'users', element: <P><Users /></P> },
                { path: 'posts', element: <P><Posts /></P> },
                { path: 'faqs', element: <P><FAQs /></P> },
                { path: 'tips', element: <P><Tips /></P> },
                { path: 'team', element: <P><Team /></P> },
                { path: 'testimonials', element: <P><Testimonials /></P> },
                { path: 'gallery', element: <P><Gallery /></P> },
                { path: 'contact', element: <P><Contact /></P> },
                { path: 'subscribers', element: <P><Subscribers /></P> },
                { path: 'chat', element: <P><Chat /></P> },
                { path: 'settings', element: <P><Settings /></P> },
                { path: 'pages', element: <P><PagesPage /></P> },
            ],
        },
        { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
    {
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
            v7_fetcherPersist: true,
            v7_normalizeFormMethod: true,
            v7_partialHydration: true,
            v7_skipActionErrorRevalidation: true,
        },
    },
)

export default function AppRouter() {
    return <RouterProvider router={router} />
}