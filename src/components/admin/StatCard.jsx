import { useId } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

const ACCENT_HEX = { gold: '#c9a227', emerald: '#34d399', sky: '#38bdf8', red: '#f87171' }

// sparkline: optional array of { v: number } — recent daily values (oldest
// first). Rendered as a small trend strip under the number so a stat reads
// as "here's where this has been," not just "here's where it is right now."
export default function StatCard({ icon: Icon, label, value, trend, trendUp = true, accent = 'gold', sparkline }) {
  const gradientId = useId()
  const accentClasses = {
    gold: 'bg-gold-500/10 text-gold-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    sky: 'bg-sky-500/10 text-sky-400',
    red: 'bg-red-500/10 text-red-400',
  }
  const hasSparkline = sparkline?.length > 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-center gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${accentClasses[accent]}`}>
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-500">{label}</p>
          <p className="font-display text-xl font-bold text-white truncate">{value}</p>
          {trend && (
            <p className={`text-xs mt-0.5 ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {trendUp ? '▲' : '▼'} {trend}
            </p>
          )}
        </div>
      </div>
      {hasSparkline && (
        <div className="-mx-1 mt-3 h-9">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT_HEX[accent]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT_HEX[accent]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={ACCENT_HEX[accent]}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}
