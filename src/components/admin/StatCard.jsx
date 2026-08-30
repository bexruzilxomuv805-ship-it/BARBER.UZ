import { motion } from 'framer-motion'

export default function StatCard({ icon: Icon, label, value, trend, trendUp = true, accent = 'gold' }) {
  const accentClasses = {
    gold: 'bg-gold-500/10 text-gold-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    sky: 'bg-sky-500/10 text-sky-400',
    red: 'bg-red-500/10 text-red-400',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 flex items-center gap-4"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${accentClasses[accent]}`}>
        <Icon />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="font-display text-xl font-bold text-white truncate">{value}</p>
        {trend && (
          <p className={`text-xs mt-0.5 ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </p>
        )}
      </div>
    </motion.div>
  )
}
