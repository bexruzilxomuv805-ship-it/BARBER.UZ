import { GiRazor } from 'react-icons/gi'
import { Link } from 'react-router-dom'

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2 group ${className}`}>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/60 bg-ink-900 shadow-gold transition-transform duration-300 group-hover:rotate-12">
        <GiRazor className="text-gold-400 text-lg" />
      </span>
      <span className="font-display text-xl font-bold tracking-wide text-white">
        Zolotoy <span className="gold-text">Barber</span>
      </span>
    </Link>
  )
}
