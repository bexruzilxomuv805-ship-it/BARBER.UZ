import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaHome, FaCut, FaCalendarAlt, FaUserCircle } from 'react-icons/fa'
import { GiRazor } from 'react-icons/gi'

const HIDDEN_PATHS = ['/kirish', '/royxatdan-otish']

export default function MobileTabBar() {
  const { t } = useTranslation()
  const location = useLocation()

  if (HIDDEN_PATHS.includes(location.pathname)) return null

  const TABS = [
    { to: '/', label: t('nav.home'), icon: FaHome, end: true },
    { to: '/xizmatlar', label: t('nav.services'), icon: FaCut },
    { to: '/ustalar', label: t('nav.barbers'), icon: GiRazor },
    { to: '/navbat-olish', label: t('home.ctaBook'), icon: FaCalendarAlt },
    { to: '/profil', label: t('profile.title'), icon: FaUserCircle },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid grid-cols-5">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-gold-400' : 'text-ink-500'
              }`
            }
          >
            <tab.icon className="text-lg" />
            <span className="truncate max-w-full px-1">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
