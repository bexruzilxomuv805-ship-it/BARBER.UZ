import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import client from '../../api/client'

/**
 * Factory that builds a full CRUD Redux slice (fetch/create/update/remove)
 * backed by a REST resource on the Postgres API. Used for barbers, services,
 * appointments, inventory and payments so we don't repeat the same
 * boilerplate five times.
 */
export function createCrudSlice({ name, endpoint }) {
  const fetchAll = createAsyncThunk(`${name}/fetchAll`, async (_, { rejectWithValue }) => {
    try {
      const { data } = await client.get(endpoint)
      return data
    } catch (err) {
      return rejectWithValue(err?.message || `${name} ro'yxatini olishda xatolik.`)
    }
  })

  const createItem = createAsyncThunk(`${name}/create`, async (payload, { rejectWithValue }) => {
    try {
      const body = payload.id ? payload : { ...payload, id: `${name[0]}-${Date.now()}` }
      const { data } = await client.post(endpoint, body)
      return data
    } catch (err) {
      return rejectWithValue(err?.message || `${name} qo'shishda xatolik.`)
    }
  })

  const updateItem = createAsyncThunk(`${name}/update`, async ({ id, changes }, { rejectWithValue }) => {
    try {
      const { data } = await client.patch(`${endpoint}/${id}`, changes)
      return data
    } catch (err) {
      return rejectWithValue(err?.message || `${name} yangilashda xatolik.`)
    }
  })

  const removeItem = createAsyncThunk(`${name}/remove`, async (id, { rejectWithValue }) => {
    try {
      await client.delete(`${endpoint}/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(err?.message || `${name} o'chirishda xatolik.`)
    }
  })

  const slice = createSlice({
    name,
    initialState: {
      items: [],
      status: 'idle', // idle | loading | succeeded | failed
      error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(fetchAll.pending, (state) => {
          state.status = 'loading'
          state.error = null
        })
        .addCase(fetchAll.fulfilled, (state, action) => {
          state.status = 'succeeded'
          state.items = action.payload
        })
        .addCase(fetchAll.rejected, (state, action) => {
          state.status = 'failed'
          state.error = action.payload
        })
        .addCase(createItem.fulfilled, (state, action) => {
          state.items.push(action.payload)
        })
        .addCase(updateItem.fulfilled, (state, action) => {
          const idx = state.items.findIndex((it) => it.id === action.payload.id)
          if (idx !== -1) state.items[idx] = action.payload
        })
        .addCase(removeItem.fulfilled, (state, action) => {
          state.items = state.items.filter((it) => it.id !== action.payload)
        })
    },
  })

  return { slice, fetchAll, createItem, updateItem, removeItem }
}
