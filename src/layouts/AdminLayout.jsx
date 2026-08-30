import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaTachometerAlt, FaCalendarAlt, FaUsers, FaCut, FaBoxes, FaMoneyBillWave,
  FaChartBar, FaComments, FaSignOutAlt, FaBars, FaHome, FaCog,
} from 'react-icons/fa'
import { GiRazor } from 'react-icons/gi'
import useAuth from '../hooks/useAuth'
import useAdminNotifications from '../hooks/useAdminNotifications'
import { logout } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import Toast from '../components/Toast'
import LanguageSwitcher from '../components/LanguageSwitcher'
import Modal from '../components/admin/Modal'

export default function AdminLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const { user } = useAuth()
  const { unreadMessages, pendingAppointments } = useAdminNotifications()
  const badgeValues = { unreadMessages, pendingAppointments }
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const NAV = [
    { to: '/admin', label: t('admin.nav.dashboard'), icon: FaTachometerAlt, end: true },
    { to: '/admin/navbatlar', label: t('admin.nav.appointments'), icon: FaCalendarAlt, badgeKey: 'pendingAppointments' },
    { to: '/admin/mijozlar', label: t('admin.nav.customers'), icon: FaUsers },
    { to: '/admin/ustalar', label: t('admin.nav.barbers'), icon: GiRazor },
    { to: '/admin/xizmatlar', label: t('admin.nav.services'), icon: FaCut },
    { to: '/admin/ombor', label: t('admin.nav.inventory'), icon: FaBoxes },
    { to: '/admin/tolovlar', label: t('admin.nav.payments'), icon: FaMoneyBillWave },
    { to: '/admin/hisobotlar', label: t('admin.nav.reports'), icon: FaChartBar },
    { to: '/admin/chat', label: t('admin.nav.chat'), icon: FaComments, badgeKey: 'unreadMessages' },
    { to: '/admin/sozlamalar', label: t('admin.nav.settings'), icon: FaCog },
  ]

  const requestLogout = () => {
    setSidebarOpen(false)
    setLogoutConfirmOpen(true)
  }

  const confirmLogout = () => {
    setLogoutConfirmOpen(false)
    dispatch(logout())
    dispatch(showToast({ type: 'success', text: t('nav.loggedOutToast') }))
    navigate('/')
  }

  const SidebarContent = (
    <div className="flex h-full flex-col bg-ink-950 border-r border-ink-800">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-ink-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/60 bg-ink-900 text-gold-400">
          <GiRazor />
        </span>
        <span className="font-display text-lg font-bold text-white">
          Zolotoy <span className="gold-text">Admin</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const badgeCount = item.badgeKey ? badgeValues[item.badgeKey] : 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                    : 'text-ink-400 hover:bg-ink-900 hover:text-white'
                }`
              }
            >
              <item.icon className="text-base shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-ink-800 p-3 space-y-1">
        <NavLink to="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-400 hover:bg-ink-900 hover:text-white">
          <FaHome /> {t('admin.nav.backToSite')}
        </NavLink>
        <button
          onClick={requestLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
        >
          <FaSignOutAlt /> {t('nav.logout')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900 text-ink-100">
      <aside className="hidden lg:block w-64 shrink-0">{SidebarContent}</aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative z-20 flex items-center justify-between border-b border-ink-800 bg-ink-950/80 backdrop-blur-sm px-5 py-3.5">
          <button className="lg:hidden text-xl text-gold-400" onClick={() => setSidebarOpen(true)}>
            <FaBars />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.ism} {user?.familiya}</p>
              <p className="text-[11px] text-ink-500">{t('admin.role')}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/15 text-gold-400 font-semibold text-sm">
              {user?.ism?.[0]}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
      <Toast />

      <Modal open={logoutConfirmOpen} onClose={() => setLogoutConfirmOpen(false)} title={t('nav.logoutConfirmTitle')}>
        <p className="text-sm text-ink-400">{t('nav.logoutConfirmText')}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setLogoutConfirmOpen(false)} className="btn-outline flex-1 !py-2 text-sm">
            {t('common.no')}
          </button>
          <button
            onClick={confirmLogout}
            className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            {t('common.yes')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
