import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { refreshUser, ACCOUNT_DELETED } from './features/auth/authSlice'
import { showToast } from './features/ui/uiSlice'
import usePolling from './hooks/usePolling'
import ClientLayout from './layouts/ClientLayout'
import AdminLayout from './layouts/AdminLayout'
import AdminRoute from './routes/AdminRoute'

import Home from './pages/client/Home'
import Services from './pages/client/Services'
import Barbers from './pages/client/Barbers'
import Booking from './pages/client/Booking'
import Login from './pages/client/Login'
import Register from './pages/client/Register'
import Profile from './pages/client/Profile'
import Contact from './pages/client/Contact'
import NotFound from './pages/client/NotFound'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminBarbers from './pages/admin/AdminBarbers'
import AdminServices from './pages/admin/AdminServices'
import AdminInventory from './pages/admin/AdminInventory'
import AdminPayments from './pages/admin/AdminPayments'
import AdminReports from './pages/admin/AdminReports'
import AdminChat from './pages/admin/AdminChat'
import AdminSettings from './pages/admin/AdminSettings'

const SESSION_CHECK_MS = 15000

export default function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const userId = useSelector((s) => s.auth.user?.id)

  // Sync role/profile changes an admin made elsewhere (e.g. promoting this
  // user from Mijozlar) onto this browser's cached session, so a plain page
  // reload picks them up instead of requiring a full logout/login. Also
  // catches an admin deleting THIS account while the person is still
  // actively using the site — refreshUser rejects with ACCOUNT_DELETED (see
  // authSlice.js), which force-logs-out an already-open session within one
  // poll instead of leaving it looking normal until something breaks.
  const checkSession = async () => {
    if (!userId) return
    const result = await dispatch(refreshUser(userId))
    if (refreshUser.rejected.match(result) && result.payload === ACCOUNT_DELETED) {
      dispatch(showToast({ type: 'error', text: t('authErrors.sessionRevoked') }))
      navigate('/kirish')
    }
  }

  useEffect(() => {
    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  usePolling(checkSession, userId ? SESSION_CHECK_MS : null)

  return (
    <Routes>
      {/* Public / client-facing site */}
      <Route element={<ClientLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/xizmatlar" element={<Services />} />
        <Route path="/ustalar" element={<Barbers />} />
        <Route path="/aloqa" element={<Contact />} />
        <Route path="/navbat-olish" element={<Booking />} />
        <Route path="/kirish" element={<Login />} />
        <Route path="/royxatdan-otish" element={<Register />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin panel */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="navbatlar" element={<AdminAppointments />} />
        <Route path="mijozlar" element={<AdminCustomers />} />
        <Route path="ustalar" element={<AdminBarbers />} />
        <Route path="xizmatlar" element={<AdminServices />} />
        <Route path="ombor" element={<AdminInventory />} />
        <Route path="tolovlar" element={<AdminPayments />} />
        <Route path="hisobotlar" element={<AdminReports />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="sozlamalar" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}
