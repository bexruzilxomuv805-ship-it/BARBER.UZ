import { createCrudSlice } from '../common/createCrudSlice'

// "Customers" reuses the /users endpoint, filtered to role=client in selectors.
// There's no removeCustomer here: deleting a customer must stay recoverable
// (see AdminCustomers' restore button), so it's done via updateCustomer
// setting `deleted`/`deletedAt` instead of a real DELETE.
const { slice, fetchAll, createItem, updateItem } = createCrudSlice({
  name: 'customers',
  endpoint: '/users',
})

export const fetchCustomers = fetchAll
export const createCustomer = createItem
export const updateCustomer = updateItem
export default slice.reducer
