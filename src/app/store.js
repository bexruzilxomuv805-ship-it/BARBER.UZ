import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import barbersReducer from '../features/barbers/barbersSlice'
import servicesReducer from '../features/services/servicesSlice'
import appointmentsReducer from '../features/appointments/appointmentsSlice'
import inventoryReducer from '../features/inventory/inventorySlice'
import paymentsReducer from '../features/payments/paymentsSlice'
import customersReducer from '../features/customers/customersSlice'
import reviewsReducer from '../features/reviews/reviewsSlice'
import chatReducer from '../features/chat/chatSlice'
import contactReducer from '../features/contact/contactSlice'
import uiReducer from '../features/ui/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    barbers: barbersReducer,
    services: servicesReducer,
    appointments: appointmentsReducer,
    inventory: inventoryReducer,
    payments: paymentsReducer,
    customers: customersReducer,
    reviews: reviewsReducer,
    chat: chatReducer,
    contact: contactReducer,
    ui: uiReducer,
  },
})

export default store
