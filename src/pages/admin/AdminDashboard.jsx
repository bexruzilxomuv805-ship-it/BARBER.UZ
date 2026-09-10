import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { FaMoneyBillWave, FaUsers, FaCalendarCheck, FaCalendarTimes, FaArrowRight } from 'react-icons/fa'
import StatCard from '../../components/admin/StatCard'
import StatusBadge from '../../components/StatusBadge'
import Loader from '../../components/Loader'
import AutoText from '../../components/AutoText'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { fetchPayments } from '../../features/payments/paymentsSlice'
import { fetchCustomers } from '../../features/customers/customersSlice'
import { fetchBarbers } from '../../features/barbers/barbersSlice'
import { fetchServices } from '../../features/services/servicesSlice'
import usePolling from '../../hooks/usePolling'
import { formatSum, STATUS_LABELS } from '../../utils/format'
import { getWeekdayOptions, toLocalDateIso } from '../../utils/schedule'

const COLORS = ['#c9a227', '#38bdf8', '#34d399', '#f87171', '#a78bfa']
const HEATMAP_HOURS = ['09', '10', '11', '12', '14', '15', '16', '17', '18']
const POLL_MS = 8000

export default function AdminDashboard() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: appointments, status } = useSelector((s) => s.appointments)
  const { items: payments } = useSelector((s) => s.payments)
  const { items: customers } = useSelector((s) => s.customers)
  const { items: barbers } = useSelector((s) => s.barbers)
  const { items: services } = useSelector((s) => s.services)

  useEffect(() => {
    dispatch(fetchAppointments())
    dispatch(fetchPayments())
    dispatch(fetchCustomers())
    dispatch(fetchBarbers())
    dispatch(fetchServices())
  }, [dispatch])

  // Dashboard numbers (revenue, today's queue, etc.) shouldn't need a manual
  // reload to reflect a booking/payment that just came in. Barbers/services
  // change rarely, so only the fast-moving data is repolled.
  usePolling(() => {
    dispatch(fetchAppointments())
    dispatch(fetchPayments())
    dispatch(fetchCustomers())
  }, POLL_MS)

  const todayStr = useMemo(() => toLocalDateIso(), [])

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.summa || 0), 0)
    const appointmentsToday = appointments.filter((a) => a.sana === todayStr)
    const cancelled = appointments.filter((a) => a.holat === 'bekor qilingan')
    const clients = customers.filter((c) => c.role === 'client')
    return { totalRevenue, appointmentsToday: appointmentsToday.length, cancelled: cancelled.length, clients: clients.length }
  }, [payments, appointments, customers, todayStr])

  const revenueTrend = useMemo(() => {
    const byDate = {}
    payments.forEach((p) => {
      byDate[p.sana] = (byDate[p.sana] || 0) + p.summa
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([sana, summa]) => ({ sana: sana.slice(5), summa }))
  }, [payments])

  const statusBreakdown = useMemo(() => {
    const counts = {}
    appointments.forEach((a) => {
      counts[a.holat] = (counts[a.holat] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [appointments])

  const revenueByBarber = useMemo(() => {
    const map = {}
    appointments
      .filter((a) => a.holat === 'yakunlangan')
      .forEach((a) => {
        map[a.barberIsmi] = (map[a.barberIsmi] || 0) + (a.narxi || 0)
      })
    return Object.entries(map).map(([name, summa]) => ({ name: name.split(' ')[0], summa }))
  }, [appointments])

  const recentAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [appointments]
  )

  const weekdayOptions = useMemo(() => getWeekdayOptions(t('common.weekdaysShort', { returnObjects: true })), [t])

  const heatmap = useMemo(() => {
    const grid = {}
    let max = 0
    appointments.forEach((a) => {
      if (!a.sana || !a.vaqt) return
      const day = new Date(`${a.sana}T00:00:00`).getDay()
      const hour = a.vaqt.slice(0, 2)
      grid[day] = grid[day] || {}
      grid[day][hour] = (grid[day][hour] || 0) + 1
      if (grid[day][hour] > max) max = grid[day][hour]
    })
    return { grid, max }
  }, [appointments])

  const statusLabel = (holat) => {
    const key = STATUS_LABELS[holat]?.key
    return key ? t(`status.${key}`) : holat
  }

  if (status === 'loading' && appointments.length === 0) return <Loader full />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.dashboard.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.dashboard.subtitle')}</p>
        </div>
        <Link to="/admin/navbatlar" className="btn-gold !py-2 text-sm">
          {t('admin.dashboard.newAppointment')} <FaArrowRight />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FaMoneyBillWave} label={t('admin.dashboard.statRevenue')} value={formatSum(stats.totalRevenue)} accent="gold" trend={t('admin.dashboard.statRevenueTrend')} />
        <StatCard icon={FaUsers} label={t('admin.dashboard.statCustomers')} value={stats.clients} accent="sky" />
        <StatCard icon={FaCalendarCheck} label={t('admin.dashboard.statTodayAppointments')} value={stats.appointmentsToday} accent="emerald" />
        <StatCard icon={FaCalendarTimes} label={t('admin.dashboard.statCancelled')} value={stats.cancelled} accent="red" trendUp={false} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-white">{t('admin.dashboard.revenueChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a227" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#c9a227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2b2b2b" vertical={false} />
              <XAxis dataKey="sana" stroke="#6d6d6d" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6d6d6d" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: '#181818', border: '1px solid #2b2b2b', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [formatSum(v), t('admin.dashboard.tooltipRevenue')]}
              />
              <Area type="monotone" dataKey="summa" stroke="#c9a227" strokeWidth={2} fill="url(#goldFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">{t('admin.dashboard.statusChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {statusBreakdown.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#181818', border: '1px solid #2b2b2b', borderRadius: 10, fontSize: 12 }}
                formatter={(value, name) => [value, statusLabel(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {statusBreakdown.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {statusLabel(s.name)}
                </span>
                <span className="text-ink-300">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold text-white">{t('admin.dashboard.revenueByBarberTitle')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByBarber}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2b2b2b" vertical={false} />
              <XAxis dataKey="name" stroke="#6d6d6d" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#181818', border: '1px solid #2b2b2b', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [formatSum(v), t('admin.dashboard.tooltipRevenue')]}
              />
              <Bar dataKey="summa" fill="#c9a227" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{t('admin.dashboard.recentAppointmentsTitle')}</h3>
            <Link to="/admin/navbatlar" className="text-xs text-gold-400 hover:underline">{t('admin.dashboard.viewAll')}</Link>
          </div>
          <div className="space-y-2">
            {recentAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-ink-800 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{a.mijozIsmi}</p>
                  <p className="text-xs text-ink-500"><AutoText text={a.xizmatNomi} /> • {a.barberIsmi} • {a.sana} {a.vaqt}</p>
                </div>
                <StatusBadge status={a.holat} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">{t('admin.dashboard.heatmapTitle')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-[11px] text-ink-400">
              <thead>
                <tr>
                  <th className="w-10" />
                  {weekdayOptions.map((d) => (
                    <th key={d.value} className="pb-2 font-medium capitalize">{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEATMAP_HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="pr-2 text-right text-ink-600">{hour}:00</td>
                    {weekdayOptions.map((d) => {
                      const count = heatmap.grid[d.value]?.[hour] || 0
                      const intensity = heatmap.max ? count / heatmap.max : 0
                      return (
                        <td key={d.value} className="p-0.5">
                          <div
                            title={String(count)}
                            className="mx-auto flex h-7 min-w-[28px] items-center justify-center rounded-md text-[10px] font-medium text-white"
                            style={{ background: intensity ? `rgba(201,162,39,${0.15 + intensity * 0.75})` : 'rgba(255,255,255,0.04)' }}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-ink-600">
            <span>{t('admin.dashboard.heatmapLow')}</span>
            <span className="h-3 w-3 rounded" style={{ background: 'rgba(201,162,39,0.15)' }} />
            <span className="h-3 w-3 rounded" style={{ background: 'rgba(201,162,39,0.9)' }} />
            <span>{t('admin.dashboard.heatmapHigh')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
