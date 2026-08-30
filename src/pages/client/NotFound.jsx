import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { GiRazor } from 'react-icons/gi'
import { FaHome } from 'react-icons/fa'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center overflow-hidden text-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-barber-radial" />
      <motion.div
        animate={{ rotate: [0, -15, 15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative text-gold-400 text-6xl"
      >
        <GiRazor />
      </motion.div>
      <h1 className="relative mt-6 font-display text-6xl font-bold text-white">{t('notFound.title')}</h1>
      <p className="relative mt-3 text-ink-400 max-w-sm">
        {t('notFound.message')}
      </p>
      <Link to="/" className="btn-gold relative mt-8">
        <FaHome /> {t('notFound.backHome')}
      </Link>
    </div>
  )
}
