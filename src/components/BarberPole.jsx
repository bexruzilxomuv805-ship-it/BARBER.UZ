import { motion } from 'framer-motion'

// Rendered entirely in CSS/SVG (no image file): a classic rotating barber
// pole with gold metal caps, a glass-highlight overlay for cylindrical depth,
// and a soft floor shadow — replaces the static hero-art.svg on the homepage.
const STRIPES = 'repeating-linear-gradient(45deg, #c8102e 0 18px, #f5f0e6 18px 36px, #14306b 36px 54px)'

export default function BarberPole() {
  return (
    <div className="relative flex aspect-square w-full items-center justify-center">
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />

      <motion.div
        animate={{ y: [0, -14, 0], rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex h-80 w-32 flex-col items-center sm:h-96 sm:w-40"
        style={{ filter: 'drop-shadow(0 25px 25px rgba(0,0,0,0.45))' }}
      >
        <div className="z-10 h-11 w-full shrink-0 rounded-t-2xl bg-gradient-to-b from-gold-100 via-gold-400 to-gold-700 shadow-gold" />

        <div className="relative w-full flex-1 overflow-hidden rounded-sm border-x-2 border-gold-600/60">
          <div className="animate-poleSpin absolute inset-0" style={{ backgroundImage: STRIPES }} />
          <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white/60 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/50 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent" />
        </div>

        <div className="z-10 h-11 w-full shrink-0 rounded-b-2xl bg-gradient-to-b from-gold-100 via-gold-400 to-gold-700 shadow-gold" />
      </motion.div>

      <div className="absolute bottom-8 h-7 w-36 rounded-full bg-black/50 blur-xl sm:bottom-4" />
    </div>
  )
}
