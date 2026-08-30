import { createCrudSlice } from '../common/createCrudSlice'

const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'appointments',
  endpoint: '/appointments',
})

export const fetchAppointments = fetchAll
export const createAppointment = createItem
export const updateAppointment = updateItem
export const removeAppointment = removeItem
export default slice.reducer
