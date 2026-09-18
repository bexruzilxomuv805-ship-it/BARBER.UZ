import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { FaSun, FaMoon } from 'react-icons/fa'
import useTheme from '../hooks/useTheme'

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { isLight, toggleTheme } = useTheme()
  const label = isLight ? t('theme.toDark') : t('theme.toLight')

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-800 bg-ink-900 text-gold-400 transition-colors hover:border-gold-500/60 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isLight ? 'moon' : 'sun'}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex"
        >
          {isLight ? <FaMoon /> : <FaSun />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
