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
  },
})

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
