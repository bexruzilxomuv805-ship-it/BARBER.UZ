import { Navigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import useAuth from '../hooks/useAuth'
import TelegramLinkGate from '../components/TelegramLinkGate'
import { refreshUser } from '../features/auth/authSlice'

// Same shape as AdminRoute, plus one extra gate: an usta account is only
// useful once it's reachable on Telegram (that's how appointment/chat
// notifications for their own barber profile reach them), so first login
// blocks on TelegramLinkGate the same way Register.jsx already does for new
// site accounts, instead of leaving it optional.
export default function UstaRoute({ children }) {
  const { isAuthenticated, isUsta, user } = useAuth()
  const dispatch = useDispatch()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/kirish" state={{ from: location }} replace />
  }
  if (!isUsta) {
    return <Navigate to="/" replace />
  }
  if (!user.telegramId) {
    return (
      <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden py-16">
        <div className="pointer-events-none absolute inset-0 bg-barber-radial" />
        <div className="relative w-full max-w-md px-4">
          <div className="card p-8 shadow-gold">
            <TelegramLinkGate userId={user.id} onLinked={() => dispatch(refreshUser(user.id))} />
          </div>
        </div>
      </div>
    )
  }
  return children
}
