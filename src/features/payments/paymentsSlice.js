import { createCrudSlice } from '../common/createCrudSlice'

const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'payments',
  endpoint: '/payments',
})

export const fetchPayments = fetchAll
export const createPayment = createItem
export const updatePayment = updateItem
export const removePayment = removeItem
export default slice.reducer
