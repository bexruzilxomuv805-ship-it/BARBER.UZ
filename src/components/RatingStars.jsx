import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa'

export default function RatingStars({ value = 5, className = '' }) {
  const full = Math.floor(value)
  const hasHalf = value - full >= 0.5
  const empty = 5 - full - (hasHalf ? 1 : 0)

  return (
    <div className={`flex items-center gap-0.5 text-gold-400 ${className}`}>
      {Array.from({ length: full }).map((_, i) => (
        <FaStar key={`f${i}`} />
      ))}
      {hasHalf && <FaStarHalfAlt />}
      {Array.from({ length: empty }).map((_, i) => (
        <FaRegStar key={`e${i}`} />
      ))}
    </div>
  )
}
