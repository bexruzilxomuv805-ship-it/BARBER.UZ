import { motion } from 'framer-motion'
import { GiRazor } from 'react-icons/gi'

export default function PageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="relative overflow-hidden pt-16 pb-16 sm:pt-20 sm:pb-20">
      <div className="pointer-events-none absolute inset-0 bg-barber-radial" />
      <div className="pointer-events-none absolute top-10 right-10 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl animate-float" />
      <div className="container-x relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-xs font-medium text-gold-300">
              <GiRazor /> {eyebrow}
            </span>
          )}
          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-4 max-w-xl mx-auto text-ink-400">{subtitle}</p>}
        </motion.div>
      </div>
    </section>
  )
}
