import { createCrudSlice } from '../common/createCrudSlice'

const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'inventory',
  endpoint: '/inventory',
})

export const fetchInventory = fetchAll
export const createInventoryItem = createItem
export const updateInventoryItem = updateItem
export const removeInventoryItem = removeItem
export default slice.reducer
