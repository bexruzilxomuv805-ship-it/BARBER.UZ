import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import client from '../../api/client'
import i18n from '../../i18n'

const STORAGE_KEY = 'zolotoy_auth_user'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistUser(user) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

function sanitize(user) {
  if (!user) return null
  const { parol, ...safe } = user
  return safe
}

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ ism, familiya, email, telefon, parol }, { rejectWithValue }) => {
    try {
      const { data: existing } = await client.get('/users', { params: { email } })
      if (existing.length > 0) {
        return rejectWithValue(i18n.t('authErrors.emailTaken'))
      }
      const newUser = {
        id: `u-${Date.now()}`,
        ism,
        familiya,
        email,
        telefon,
        parol,
        role: 'client',
        avatar: '',
        createdAt: new Date().toISOString(),
      }
      const { data } = await client.post('/users', newUser)
      const safe = sanitize(data)
      persistUser(safe)
      return safe
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || i18n.t('authErrors.registerFailed'))
    }
  }
)

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, parol }, { rejectWithValue }) => {
    try {
      const { data } = await client.get('/users', { params: { email } })
      const user = data[0]
      if (!user || user.parol !== parol) {
        return rejectWithValue(i18n.t('authErrors.invalidCredentials'))
      }
      if (user.deleted) {
        return rejectWithValue(i18n.t('authErrors.accountDeleted'))
      }
      const safe = sanitize(user)
      persistUser(safe)
      return safe
    } catch (err) {
      if (err?.code === 'ERR_NETWORK') {
        return rejectWithValue(i18n.t('authErrors.networkError'))
      }
      return rejectWithValue(err?.response?.data?.message || i18n.t('authErrors.loginFailed'))
    }
  }
)

export const completeTelegramLogin = createAsyncThunk(
  'auth/completeTelegramLogin',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await client.get(`/users/${userId}`)
      const safe = sanitize(data)
      persistUser(safe)
      return safe
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || i18n.t('authErrors.loginFailed'))
    }
  }
)

// Sentinel rejection value for refreshUser — lets App.jsx's poll (and the
// slice's own reducer below) tell "this account was deleted out from under
// an active session" apart from a plain network hiccup.
export const ACCOUNT_DELETED = 'ACCOUNT_DELETED'

// Re-fetches the logged-in user's own record so role/profile changes made
// elsewhere (e.g. an admin promoting them from the Mijozlar page) take
// effect without requiring a full logout/login — the stored user in
// localStorage is otherwise frozen at whatever it was when they last logged
// in. App.jsx polls this periodically (not just on mount) specifically so a
// session gets force-logged-out within seconds of an admin deleting that
// account elsewhere (site or bot), instead of the person only finding out
// the next time they happen to reload the page. Silently keeps the stale
// cached user on a network failure rather than logging them out for that.
export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await client.get(`/users/${id}`)
      if (data.deleted) {
        persistUser(null)
        return rejectWithValue(ACCOUNT_DELETED)
      }
      const safe = sanitize(data)
      persistUser(safe)
      return safe
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || 'refresh failed')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const { data } = await client.patch(`/users/${id}`, changes)
      const safe = sanitize(data)
      persistUser(safe)
      return safe
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || i18n.t('authErrors.updateProfileFailed'))
    }
  }
)

const initialUser = loadStoredUser()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    isAuthenticated: !!initialUser,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null
      state.isAuthenticated = false
      state.status = 'idle'
      state.error = null
      persistUser(null)
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(completeTelegramLogin.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(completeTelegramLogin.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(completeTelegramLogin.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(refreshUser.rejected, (state, action) => {
        if (action.payload === ACCOUNT_DELETED) {
          state.user = null
          state.isAuthenticated = false
          state.status = 'idle'
          state.error = null
        }
      })
  },
})

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
