import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useAuth from './useAuth'
import { fetchConversations } from '../features/chat/chatSlice'
import { fetchAppointments } from '../features/appointments/appointmentsSlice'

const POLL_MS = 8000

/**
 * Polls unread support messages and pending appointments for admins, so
 * notification badges stay live everywhere (client Navbar, admin sidebar)
 * regardless of which page/layout is currently mounted.
 */
export default function useAdminNotifications() {
  const dispatch = useDispatch()
  const { isAdmin, isUsta, user } = useAuth()
  const isStaff = isAdmin || isUsta
  const conversations = useSelector((s) => s.chat.conversations)
  const appointments = useSelector((s) => s.appointments.items)

  useEffect(() => {
    if (!isStaff) return undefined
    dispatch(fetchConversations())
    dispatch(fetchAppointments())
    const timer = setInterval(() => {
      dispatch(fetchConversations())
      dispatch(fetchAppointments())
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [isStaff, dispatch])

  if (!isStaff) return { unreadMessages: 0, pendingAppointments: 0 }

  const scopeBarberId = isUsta ? user.barberId : null
  // Same private scoping as AdminChat.jsx: admin's badge only counts
  // general (barberId-less) conversations, not an usta's own chats.
  const scopedConversations = conversations.filter((c) => (scopeBarberId ? c.barberId === scopeBarberId : !c.barberId))
  const scopedAppointments = scopeBarberId
    ? appointments.filter((a) => a.barberId === scopeBarberId)
    : appointments

  const unreadMessages = scopedConversations.reduce((sum, c) => sum + (c.unreadForAdmin || 0), 0)
  const pendingAppointments = scopedAppointments.filter((a) => a.holat === 'kutilmoqda').length

  return { unreadMessages, pendingAppointments }
}
