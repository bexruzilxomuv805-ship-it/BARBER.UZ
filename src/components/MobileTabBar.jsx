import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FaHome, FaCalendarAlt, FaUserCircle } from 'react-icons/fa'
import { GiRazor } from 'react-icons/gi'

const HIDDEN_PATHS = ['/kirish', '/royxatdan-otish']

const MotionNavLink = motion.create(NavLink)

export default function MobileTabBar() {
  const { t } = useTranslation()
  const location = useLocation()

  if (HIDDEN_PATHS.includes(location.pathname)) return null

  const TABS = [
    { to: '/', label: t('nav.home'), icon: FaHome, end: true },
    { to: '/sartaroshxonalar', label: t('nav.shops'), icon: GiRazor },
    { to: '/navbat-olish', label: t('home.ctaBook'), icon: FaCalendarAlt },
    { to: '/profil', label: t('profile.title'), icon: FaUserCircle },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = !!matchPath({ path: tab.to, end: tab.end }, location.pathname)
          return (
            <MotionNavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              whileTap={{ scale: 0.88 }}
              className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
            >
              {active && (
                <motion.span
                  layoutId="mobileTabPill"
                  className="absolute inset-x-2 top-1 bottom-1 rounded-2xl bg-gold-500/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className="relative flex h-5 w-5 items-center justify-center">
                {active && (
                  <motion.span
                    className="absolute inset-0 -z-10 rounded-full bg-gold-400/40 blur-md"
                    initial={{ opacity: 0.35, scale: 0.85 }}
                    animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.85, 1.15, 0.85] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <motion.span
                  animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={`text-lg transition-colors duration-200 ${active ? 'text-gold-400' : 'text-ink-500'}`}
                >
                  <tab.icon />
                </motion.span>
              </span>
              <span
                className={`relative truncate max-w-full px-1 transition-colors duration-200 ${
                  active ? 'text-gold-400' : 'text-ink-500'
                }`}
              >
                {tab.label}
              </span>
            </MotionNavLink>
          )
        })}
      </div>
    </nav>
  )
}
