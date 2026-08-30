import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { FaInstagram, FaTelegramPlane, FaPhoneAlt, FaMapMarkerAlt, FaClock } from 'react-icons/fa'
import Logo from './Logo'
import AutoText from './AutoText'
import useAuth from '../hooks/useAuth'

const FALLBACK_INFO = {
  manzil: 'Toshkent sh., Chilonzor tumani, Bunyodkor ko‘chasi 12',
  telefon: '+998 90 123 45 67',
  ishVaqti: 'Har kuni 09:00 – 21:00',
  instagram: '',
  telegram: '',
}

export default function Footer() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { info } = useSelector((s) => s.contact)
  const contact = info || FALLBACK_INFO

  return (
    <footer className="relative hidden border-t border-ink-800 bg-ink-950 pt-16 pb-8 overflow-hidden lg:block">
      <div className="pointer-events-none absolute inset-0 bg-barber-radial" />
      <div className="container-x relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-ink-400 leading-relaxed">
            {t('footer.tagline')}
          </p>
          <div className="mt-5 flex gap-3">
            {contact.instagram && (
              <a href={contact.instagram} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-800 text-gold-400 hover:border-gold-500 transition-colors">
                <FaInstagram />
              </a>
            )}
            {contact.telegram && (
              <a href={contact.telegram} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-800 text-gold-400 hover:border-gold-500 transition-colors">
                <FaTelegramPlane />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">{t('footer.pagesTitle')}</h4>
          <ul className="space-y-2 text-sm text-ink-400">
            <li><Link to="/" className="hover:text-gold-400 transition-colors">{t('nav.home')}</Link></li>
            <li><Link to="/xizmatlar" className="hover:text-gold-400 transition-colors">{t('nav.services')}</Link></li>
            <li><Link to="/ustalar" className="hover:text-gold-400 transition-colors">{t('nav.barbers')}</Link></li>
            <li><Link to="/aloqa" className="hover:text-gold-400 transition-colors">{t('nav.contact')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">{t('footer.accountTitle')}</h4>
          <ul className="space-y-2 text-sm text-ink-400">
            {isAuthenticated ? (
              <li><Link to="/profil" className="hover:text-gold-400 transition-colors">{t('nav.myAppointments')}</Link></li>
            ) : (
              <>
                <li><Link to="/kirish" className="hover:text-gold-400 transition-colors">{t('nav.login')}</Link></li>
                <li><Link to="/royxatdan-otish" className="hover:text-gold-400 transition-colors">{t('nav.register')}</Link></li>
              </>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">{t('footer.contactTitle')}</h4>
          <ul className="space-y-3 text-sm text-ink-400">
            <li className="flex items-start gap-2">
              <FaMapMarkerAlt className="mt-0.5 text-gold-400 shrink-0" />
              <AutoText text={contact.manzil} />
            </li>
            <li className="flex items-center gap-2">
              <FaPhoneAlt className="text-gold-400 shrink-0" />
              {contact.telefon}
            </li>
            <li className="flex items-center gap-2">
              <FaClock className="text-gold-400 shrink-0" />
              <AutoText text={contact.ishVaqti} />
            </li>
          </ul>
        </div>
      </div>

      <div className="container-x mt-12 flex flex-col items-center gap-3 border-t border-ink-800 pt-6 text-center text-xs text-ink-500 sm:flex-row sm:justify-between">
        <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
        <span>{t('footer.builtWith')}</span>
      </div>
    </footer>
  )
}
