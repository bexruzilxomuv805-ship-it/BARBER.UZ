import { createCrudSlice } from '../common/createCrudSlice'

const { slice, fetchAll, createItem, updateItem, removeItem } = createCrudSlice({
  name: 'reviews',
  endpoint: '/reviews',
})

export const fetchReviews = fetchAll
export const createReview = createItem
export const updateReview = updateItem
export const removeReview = removeItem
export default slice.reducer
