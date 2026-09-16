import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    isChatOpen: false,
    chatBarberContext: null,
    isMobileMenuOpen: false,
    toast: null, // { type: 'success' | 'error', text: string }
  },
  reducers: {
    toggleChat(state) {
      state.isChatOpen = !state.isChatOpen
    },
    setChatOpen(state, action) {
      state.isChatOpen = action.payload
      if (!action.payload) state.chatBarberContext = null
    },
    openChatWithBarber(state, action) {
      state.isChatOpen = true
      state.chatBarberContext = action.payload
    },
    setChatBarberContext(state, action) {
      state.chatBarberContext = action.payload
    },
    toggleMobileMenu(state) {
      state.isMobileMenuOpen = !state.isMobileMenuOpen
    },
    closeMobileMenu(state) {
      state.isMobileMenuOpen = false
    },
    showToast(state, action) {
      state.toast = action.payload
    },
    clearToast(state) {
      state.toast = null
    },
  },
})

export const {
  toggleChat,
  setChatOpen,
  openChatWithBarber,
  setChatBarberContext,
  toggleMobileMenu,
  closeMobileMenu,
  showToast,
  clearToast,
} = uiSlice.actions
export default uiSlice.reducer
