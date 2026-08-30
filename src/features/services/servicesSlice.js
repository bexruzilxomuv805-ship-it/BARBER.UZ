import { createCrudSlice } from '../common/createCrudSlice'

const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'services',
  endpoint: '/services',
})

export const fetchServices = fetchAll
export const createService = createItem
export const updateService = updateItem
export const removeService = removeItem
export default slice.reducer
