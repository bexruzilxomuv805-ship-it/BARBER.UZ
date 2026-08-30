import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    isChatOpen: false,
    isMobileMenuOpen: false,
    toast: null, // { type: 'success' | 'error', text: string }
  },
  reducers: {
    toggleChat(state) {
      state.isChatOpen = !state.isChatOpen
    },
    setChatOpen(state, action) {
      state.isChatOpen = action.payload
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
  toggleMobileMenu,
  closeMobileMenu,
  showToast,
  clearToast,
} = uiSlice.actions
export default uiSlice.reducer
