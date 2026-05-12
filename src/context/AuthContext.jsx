import React, {
  createContext, useContext, useEffect, useCallback, useRef,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  loginThunk, logoutThunk, fetchMeThunk,
  selectAdmin, selectIsLoggedIn, selectAuthLoading,
  selectAuthError, selectInitialized, clearError, setInitialized,
} from '@store/authSlice'
import { getToken } from '@utils/helpers'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const dispatch    = useDispatch()
  const admin       = useSelector(selectAdmin)
  const isLoggedIn  = useSelector(selectIsLoggedIn)
  const loading     = useSelector(selectAuthLoading)
  const error       = useSelector(selectAuthError)
  const initialized = useSelector(selectInitialized)

  const fetchAttempted = useRef(false)

  /* Restore session on mount — only once */
  useEffect(() => {
    if (fetchAttempted.current) return
    fetchAttempted.current = true

    const token = getToken()
    if (token) {
      dispatch(fetchMeThunk())
    } else {
      dispatch(setInitialized())
    }
  }, [dispatch])

  const login = useCallback(
    (credentials) => dispatch(loginThunk(credentials)),
    [dispatch],
  )

  const logout = useCallback(
    () => dispatch(logoutThunk()),
    [dispatch],
  )

  const dismissError = useCallback(
    () => dispatch(clearError()),
    [dispatch],
  )

  return (
    <AuthContext.Provider value={{
      admin,
      user: admin,           // Alias for compatibility
      isLoggedIn,
      isAuthenticated: isLoggedIn,  // Alias
      isAdmin: admin?.role === 'admin' || admin?.type === 'admin',
      loading,
      isLoading: loading,   // Alias
      error,
      initialized,
      login,
      logout,
      dismissError,
      refreshUser: () => dispatch(fetchMeThunk()),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Primary hook — use this name */
export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider')
  return ctx
}

/** Alias hook — ChatContext uses this name */
export const useAuth = useAuthContext

export default AuthContext