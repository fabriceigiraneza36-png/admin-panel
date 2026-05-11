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
      // We have a token — try to validate it
      dispatch(fetchMeThunk())
    } else {
      // No token — immediately mark as initialized so UI can render
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
      isLoggedIn,
      loading,
      error,
      initialized,
      login,
      logout,
      dismissError,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider')
  return ctx
}