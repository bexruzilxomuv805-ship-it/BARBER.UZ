import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FaBars, FaTimes, FaUserCircle, FaSignOutAlt, FaCalendarCheck, FaCog } from 'react-icons/fa'
import Logo from './Logo'
import LanguageSwitcher from './LanguageSwitcher'
import Modal from './admin/Modal'
import useAuth from '../hooks/useAuth'
import useAdminNotifications from '../hooks/useAdminNotifications'
import { logout } from '../features/auth/authSlice'
import { toggleMobileMenu, closeMobileMenu, showToast } from '../features/ui/uiSlice'

export default function Navbar() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const isMobileMenuOpen = useSelector((s) => s.ui.isMobileMenuOpen)
  const { isAuthenticated, isAdmin, user } = useAuth()
  const { unreadMessages, pendingAppointments } = useAdminNotifications()
  const adminBadgeCount = unreadMessages + pendingAppointments
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const LINKS = [
    { to: '/', label: t('nav.home') },
    { to: '/xizmatlar', label: t('nav.services') },
    { to: '/ustalar', label: t('nav.barbers') },
    { to: '/aloqa', label: t('nav.contact') },
  ]

  // Bosh sahifa / Xizmatlar / Ustalar / Profil already live in the mobile
  // bottom tab bar, so the mobile dropdown only needs what isn't there.
  const MOBILE_LINKS = [{ to: '/aloqa', label: t('nav.contact') }]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const requestLogout = () => {
    setMenuOpen(false)
    dispatch(closeMobileMenu())
    setLogoutConfirmOpen(true)
  }

  const confirmLogout = () => {
    setLogoutConfirmOpen(false)
    dispatch(logout())
    dispatch(showToast({ type: 'success', text: t('nav.loggedOutToast') }))
    navigate('/')
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-ink-950/85 backdrop-blur-md border-b border-ink-800/80 shadow-lg' : 'bg-transparent'
      }`}
    >
      <nav className="container-x flex items-center justify-between py-4">
        <Logo />

        <div className="hidden lg:flex items-center gap-8">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `relative text-sm font-medium tracking-wide transition-colors ${
                  isActive ? 'text-gold-400' : 'text-ink-200 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="relative flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-ink-100 hover:border-gold-500/60 transition-colors"
              >
                <FaUserCircle className="text-gold-400" />
                {user?.ism}
                {isAdmin && adminBadgeCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {adminBadgeCount > 9 ? '9+' : adminBadgeCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-52 card p-2 shadow-xl"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    {isAdmin && (
                      <button
                        onClick={() => {
                          navigate('/admin')
                          setMenuOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-ink-800 hover:text-gold-400"
                      >
                        <FaCog /> <span className="flex-1 text-left">{t('nav.adminPanel')}</span>
                        {adminBadgeCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {adminBadgeCount > 9 ? '9+' : adminBadgeCount}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigate('/profil')
                        setMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-ink-800 hover:text-gold-400"
                    >
                      <FaCalendarCheck /> {t('nav.myAppointments')}
                    </button>
                    <button
                      onClick={requestLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      <FaSignOutAlt /> {t('nav.logout')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <NavLink to="/kirish" className="btn-outline !px-5 !py-2 text-sm">
                {t('nav.login')}
              </NavLink>
              <NavLink to="/royxatdan-otish" className="btn-gold !px-5 !py-2 text-sm">
                {t('nav.register')}
              </NavLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <button
            className="relative text-2xl text-gold-400"
            onClick={() => dispatch(toggleMobileMenu())}
            aria-label={t('nav.menuAria')}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
            {isAdmin && adminBadgeCount > 0 && !isMobileMenuOpen && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden border-t border-ink-800 bg-ink-950/95 backdrop-blur-md"
          >
            <div className="container-x py-4 flex flex-col gap-3">
              {MOBILE_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => dispatch(closeMobileMenu())}
                  className={({ isActive }) =>
                    `py-2 text-sm font-medium ${isActive ? 'text-gold-400' : 'text-ink-200'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="shimmer-line" />
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <NavLink to="/admin" onClick={() => dispatch(closeMobileMenu())} className="flex items-center gap-2 py-2 text-sm text-ink-200">
                      <span className="flex-1">{t('nav.adminPanel')}</span>
                      {adminBadgeCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {adminBadgeCount > 9 ? '9+' : adminBadgeCount}
                        </span>
                      )}
                    </NavLink>
                  )}
                  <button
                    onClick={requestLogout}
                    className="py-2 text-left text-sm text-red-400"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <div className="flex gap-3 pt-1">
                  <NavLink
                    to="/kirish"
                    onClick={() => dispatch(closeMobileMenu())}
                    className="btn-outline flex-1 !py-2 text-sm"
                  >
                    {t('nav.login')}
                  </NavLink>
                  <NavLink
                    to="/royxatdan-otish"
                    onClick={() => dispatch(closeMobileMenu())}
                    className="btn-gold flex-1 !py-2 text-sm"
                  >
                    {t('nav.registerShort')}
                  </NavLink>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </header>
  )
}
