import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth }  from '@hooks/useAuth'
import Loader       from './Loader'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isLoggedIn, initialized, admin } = useAuth()
  const location = useLocation()

  /* ── Wait for auth to initialize before making routing decisions ── */
  if (!initialized) {
    return <Loader fullScreen />
  }

  /* ── Not logged in → redirect to login ── */
  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  /* ── Role check (optional) ── */
  if (requiredRole && admin?.role !== requiredRole && admin?.role !== 'admin') {
    return (
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '100vh',
          flexDirection:  'column',
          gap:            '12px',
          fontFamily:     'Inter, sans-serif',
        }}
      >
        <div style={{ fontSize: '48px' }}>🚫</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>
          Access Denied
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          You don't have permission to view this page.
        </p>
      </div>
    )
  }

  return children
}