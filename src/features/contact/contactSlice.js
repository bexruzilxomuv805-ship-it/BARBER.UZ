import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import client from '../../api/client'

export const fetchContactInfo = createAsyncThunk(
  'contact/fetchInfo',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await client.get('/contactInfo')
      return data
    } catch (err) {
      return rejectWithValue(err?.message || 'Aloqa ma’lumotlarini olishda xatolik.')
    }
  }
)

export const updateContactInfo = createAsyncThunk(
  'contact/updateInfo',
  async (changes, { rejectWithValue }) => {
    try {
      const { data } = await client.patch('/contactInfo', changes)
      return data
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Aloqa ma’lumotlarini yangilashda xatolik.')
    }
  }
)

const contactSlice = createSlice({
  name: 'contact',
  initialState: {
    info: null,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchContactInfo.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchContactInfo.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.info = action.payload
      })
      .addCase(fetchContactInfo.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(updateContactInfo.fulfilled, (state, action) => {
        state.info = action.payload
      })
  },
})

export default contactSlice.reducer
