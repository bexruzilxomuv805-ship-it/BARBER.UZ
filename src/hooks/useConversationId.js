import { useEffect, useState } from 'react'
import useAuth from './useAuth'

const GUEST_KEY = 'zolotoy_guest_id'

function getOrCreateGuestId() {
  try {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  } catch {
    return `guest-${Date.now()}`
  }
}

/** Returns a stable conversation id: the user's id when logged in, otherwise a persisted guest id. */
export default function useConversationId() {
  const { user, isAuthenticated } = useAuth()
  const [guestId] = useState(getOrCreateGuestId)
  return isAuthenticated ? user.id : guestId
}
