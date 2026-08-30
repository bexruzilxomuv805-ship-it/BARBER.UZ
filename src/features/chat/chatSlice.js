import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import client from '../../api/client'

// Support chat backed by json-server. There's no WebSocket server here, so
// "real-time" is simulated with short-interval polling (see useChatPolling
// hook) — messages persist to db.json so the conversation survives reloads.

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await client.get('/conversations', { params: { _sort: 'updatedAt', _order: 'desc' } })
      return data
    } catch (err) {
      return rejectWithValue(err?.message)
    }
  }
)

export const fetchConversation = createAsyncThunk(
  'chat/fetchConversation',
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await client.get(`/conversations/${conversationId}`)
      return data
    } catch (err) {
      if (err?.response?.status === 404) return null
      return rejectWithValue(err?.message)
    }
  }
)

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await client.get('/messages', {
        params: { conversationId, _sort: 'createdAt', _order: 'asc' },
      })
      return { conversationId, messages: data }
    } catch (err) {
      return rejectWithValue(err?.message)
    }
  }
)

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ conversationId, userId, userName, sender, text }, { rejectWithValue }) => {
    try {
      const message = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        conversationId,
        userId,
        userName,
        sender,
        text,
        createdAt: new Date().toISOString(),
        read: sender === 'admin',
      }
      const { data } = await client.post('/messages', message)

      // upsert conversation summary
      try {
        await client.get(`/conversations/${conversationId}`)
        await client.patch(`/conversations/${conversationId}`, {
          lastMessage: text,
          updatedAt: message.createdAt,
          ...(sender === 'client'
            ? { unreadForAdmin: 1 }
            : { unreadForClient: 1 }),
        })
      } catch {
        await client.post('/conversations', {
          id: conversationId,
          userId,
          userName,
          lastMessage: text,
          updatedAt: message.createdAt,
          unreadForAdmin: sender === 'client' ? 1 : 0,
          unreadForClient: sender === 'admin' ? 1 : 0,
        })
      }

      return data
    } catch (err) {
      return rejectWithValue(err?.message)
    }
  }
)

export const updateMessage = createAsyncThunk(
  'chat/updateMessage',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const { data } = await client.patch(`/messages/${id}`, changes)
      return data
    } catch (err) {
      return rejectWithValue(err?.message)
    }
  }
)

export const removeMessage = createAsyncThunk(
  'chat/removeMessage',
  async ({ id, conversationId }, { rejectWithValue }) => {
    try {
      await client.delete(`/messages/${id}`)
      return { id, conversationId }
    } catch (err) {
      return rejectWithValue(err?.message)
    }
  }
)

export const removeConversation = createAsyncThunk(
  'chat/removeConversation',
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data: messages } = await client.get('/messages', { params: { conversationId } })
      await Promise.all(messages.map((m) => client.delete(`/messages/${m.id}`)))
      try {
        await client.delete(`/conversations/${conversationId}`)
      } catch {
        /* conversation record may not exist — ignore */
      }
      return conversationId
    } catch (err) {
      return rejectWithValue(err?.message)
    }
  }
)

export const markConversationRead = createAsyncThunk(
  'chat/markConversationRead',
  async ({ conversationId, forRole }, { rejectWithValue }) => {
    try {
      const changes = forRole === 'admin' ? { unreadForAdmin: 0 } : { unreadForClient: 0 }
      const { data } = await client.patch(`/conversations/${conversationId}`, changes)
      return data
    } catch (err) {
      return rejectWithValue(err?.message)
    }
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    myConversation: null,
    messagesByConversation: {},
    activeConversationId: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.myConversation = action.payload
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messagesByConversation[action.payload.conversationId] = action.payload.messages
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const cid = action.payload.conversationId
        const list = state.messagesByConversation[cid] || []
        if (!list.find((m) => m.id === action.payload.id)) {
          state.messagesByConversation[cid] = [...list, action.payload]
        }
      })
      .addCase(updateMessage.fulfilled, (state, action) => {
        const cid = action.payload.conversationId
        const list = state.messagesByConversation[cid] || []
        const idx = list.findIndex((m) => m.id === action.payload.id)
        if (idx !== -1) list[idx] = action.payload
      })
      .addCase(removeMessage.fulfilled, (state, action) => {
        const { id, conversationId } = action.payload
        const list = state.messagesByConversation[conversationId]
        if (list) state.messagesByConversation[conversationId] = list.filter((m) => m.id !== id)
      })
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const idx = state.conversations.findIndex((c) => c.id === action.payload.id)
        if (idx !== -1) state.conversations[idx] = action.payload
        if (state.myConversation?.id === action.payload.id) state.myConversation = action.payload
      })
      .addCase(removeConversation.fulfilled, (state, action) => {
        const cid = action.payload
        delete state.messagesByConversation[cid]
        state.conversations = state.conversations.filter((c) => c.id !== cid)
        if (state.myConversation?.id === cid) state.myConversation = null
        if (state.activeConversationId === cid) state.activeConversationId = null
      })
  },
})

export const { setActiveConversation } = chatSlice.actions
export default chatSlice.reducer
