import { createCrudSlice } from '../common/createCrudSlice'

const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'barbers',
  endpoint: '/barbers',
})

export const fetchBarbers = fetchAll
export const createBarber = createItem
export const updateBarber = updateItem
export const removeBarber = removeItem
export default slice.reducer
