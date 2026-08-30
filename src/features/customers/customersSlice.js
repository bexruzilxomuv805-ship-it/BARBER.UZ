import { createCrudSlice } from '../common/createCrudSlice'

// "Customers" reuses the /users endpoint, filtered to role=client in selectors.
const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'customers',
  endpoint: '/users',
})

export const fetchCustomers = fetchAll
export const createCustomer = createItem
export const updateCustomer = updateItem
export const removeCustomer = removeItem
export default slice.reducer
