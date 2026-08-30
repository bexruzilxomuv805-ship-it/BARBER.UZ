import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { FaGlobe } from 'react-icons/fa'
import { SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0]

  const handleSelect = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 rounded-full border border-ink-800 bg-ink-900 px-3 py-2 text-xs font-semibold uppercase text-ink-200 hover:border-gold-500/60 transition-colors"
        aria-label={SUPPORTED_LANGUAGES.find((l) => l.code === 'uz')?.label}
      >
        <FaGlobe className="text-gold-400" /> {current.code}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 z-10 mt-2 w-36 card p-1.5 shadow-xl"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onMouseDown={() => handleSelect(lang.code)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  lang.code === current.code ? 'text-gold-400' : 'text-ink-200 hover:bg-ink-800 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
