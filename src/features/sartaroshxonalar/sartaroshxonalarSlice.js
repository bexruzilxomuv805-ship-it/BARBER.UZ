import { createCrudSlice } from '../common/createCrudSlice'

const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'sartaroshxonalar',
  endpoint: '/sartaroshxonalar',
})

export const fetchShops = fetchAll
export const createShop = createItem
export const updateShop = updateItem
export const removeShop = removeItem
export default slice.reducer
