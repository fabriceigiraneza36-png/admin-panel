import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI }        from '@api/auth'
import { setTokens, clearTokens, getStoredAdmin } from '@utils/helpers'
import { TOKEN_KEY, REFRESH_KEY } from '@utils/constants'

/* ── Async thunks ── */
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.login(credentials)
      setTokens({
        token:        data.token        || data.data?.token,
        refreshToken: data.refreshToken || data.data?.refreshToken,
        admin:        data.admin        || data.data?.user || data.data?.admin,
      })
      return data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed',
      )
    }
  },
)

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async () => {
    try { await authAPI.logout() } catch { /* silent */ }
    clearTokens()
  },
)

export const fetchMeThunk = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.me()
      return data.data || data.admin || data.user
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Session expired',
      )
    }
  },
)

/* ── Slice ── */
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    admin:       getStoredAdmin(),
    token:       localStorage.getItem(TOKEN_KEY)   || null,
    refresh:     localStorage.getItem(REFRESH_KEY) || null,
    loading:     false,
    error:       null,
    // Start as TRUE if we have no token — no need to fetch
    initialized: !localStorage.getItem(TOKEN_KEY),
  },
  reducers: {
    clearError:  (state)           => { state.error = null },
    setAdmin:    (state, { payload }) => { state.admin = payload },
    setInitialized: (state)        => { state.initialized = true },
  },
  extraReducers: (builder) => {
    /* login */
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error   = null
        console.log('[Auth] loginThunk pending')
      })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading     = false
        state.initialized = true
        state.admin       = payload.admin   || payload.data?.admin || payload.data?.user
        state.token       = payload.token   || payload.data?.token
        state.refresh     = payload.refreshToken || payload.data?.refreshToken
        console.log('[Auth] loginThunk fulfilled, admin=', !!state.admin, 'token=', !!state.token)
      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading     = false
        state.initialized = true
        state.error       = payload
        console.log('[Auth] loginThunk rejected:', payload)
      })

    /* logout */
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.admin       = null
      state.token       = null
      state.refresh     = null
      state.initialized = true
      console.log('[Auth] logoutThunk fulfilled')
    })

    /* fetchMe */
    builder
      .addCase(fetchMeThunk.pending, (state) => {
        state.loading = true
        console.log('[Auth] fetchMeThunk pending')
      })
      .addCase(fetchMeThunk.fulfilled, (state, { payload }) => {
        state.admin       = payload
        state.initialized = true
        state.loading     = false
        console.log('[Auth] fetchMeThunk fulfilled, admin=', !!payload)
      })
      .addCase(fetchMeThunk.rejected, (state) => {
        // CRITICAL: always set initialized even on failure
        state.initialized = true
        state.loading     = false
        state.admin       = null
        state.token       = null
        state.refresh     = null
        clearTokens()
        console.log('[Auth] fetchMeThunk rejected — cleared tokens')
      })
  },
})

export const { clearError, setAdmin, setInitialized } = authSlice.actions

/* ── Selectors ── */
export const selectAdmin       = (s) => s.auth.admin
export const selectIsLoggedIn  = (s) => !!s.auth.token && !!s.auth.admin
export const selectAuthLoading = (s) => s.auth.loading
export const selectAuthError   = (s) => s.auth.error
export const selectInitialized = (s) => s.auth.initialized

export default authSlice.reducer