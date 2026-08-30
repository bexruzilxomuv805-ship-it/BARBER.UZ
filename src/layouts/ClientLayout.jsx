import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatWidget from '../components/ChatWidget'
import MobileTabBar from '../components/MobileTabBar'
import Toast from '../components/Toast'
import useAuth from '../hooks/useAuth'
import { fetchContactInfo } from '../features/contact/contactSlice'

const GUEST_ALLOWED_PATHS = ['/kirish', '/royxatdan-otish']

export default function ClientLayout() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  useEffect(() => {
    dispatch(fetchContactInfo())
  }, [dispatch])

  if (!isAuthenticated && !GUEST_ALLOWED_PATHS.includes(location.pathname)) {
    return <Navigate to="/kirish" state={{ from: location }} replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <Navbar />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      <ChatWidget />
      <Toast />
    </div>
  )
}
