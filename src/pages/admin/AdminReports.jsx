import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { FaDownload, FaChartPie } from 'react-icons/fa'
import Loader from '../../components/Loader'
import AutoText from '../../components/AutoText'
import { useAutoTranslateMap } from '../../hooks/useAutoTranslate'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { fetchPayments } from '../../features/payments/paymentsSlice'
import { fetchServices } from '../../features/services/servicesSlice'
import { fetchBarbers } from '../../features/barbers/barbersSlice'
import { formatSum } from '../../utils/format'

const COLORS = ['#c9a227', '#38bdf8', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#f472b6', '#22d3ee']

export default function AdminReports() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: appointments, status } = useSelector((s) => s.appointments)
  const { items: payments } = useSelector((s) => s.payments)
  const { items: services } = useSelector((s) => s.services)
  const { items: barbers } = useSelector((s) => s.barbers)
  const [range, setRange] = useState(30)

  const RANGES = [
    { label: t('admin.reports.range7'), days: 7 },
    { label: t('admin.reports.range14'), days: 14 },
    { label: t('admin.reports.range30'), days: 30 },
    { label: t('admin.reports.rangeAll'), days: 9999 },
  ]

  useEffect(() => {
    dispatch(fetchAppointments())
    dispatch(fetchPayments())
    dispatch(fetchServices())
    dispatch(fetchBarbers())
  }, [dispatch])

  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - range)
    return d
  }, [range])

  const scopedAppointments = useMemo(
    () => appointments.filter((a) => new Date(a.sana) >= cutoff),
    [appointments, cutoff]
  )
  const scopedPayments = useMemo(() => payments.filter((p) => new Date(p.sana) >= cutoff), [payments, cutoff])

  const serviceCounts = useMemo(() => {
    const counts = {}
    scopedAppointments.forEach((a) => {
      counts[a.xizmatNomi] = (counts[a.xizmatNomi] || 0) + 1
    })
    return counts
  }, [scopedAppointments])

  const translatedServiceNames = useAutoTranslateMap(Object.keys(serviceCounts))

  const serviceBreakdown = useMemo(
    () => Object.entries(serviceCounts).map(([name, value]) => ({ name: translatedServiceNames[name] || name, value })),
    [serviceCounts, translatedServiceNames]
  )

  const barberLoad = useMemo(() => {
    const counts = {}
    scopedAppointments.forEach((a) => {
      counts[a.barberIsmi] = (counts[a.barberIsmi] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name: name.split(' ')[0], count }))
  }, [scopedAppointments])

  const totalRevenue = useMemo(() => scopedPayments.reduce((sum, p) => sum + p.summa, 0), [scopedPayments])
  const avgTicket = scopedPayments.length ? Math.round(totalRevenue / scopedPayments.length) : 0

  const handleExport = () => {
    const header = 'Mijoz,Sana,Usul,Summa\n'
    const rows = scopedPayments.map((p) => `${p.mijozIsmi},${p.sana},${p.usul},${p.summa}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hisobot-${range}kun.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (status === 'loading' && appointments.length === 0) return <Loader full />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.reports.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.reports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-ink-800 p-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r.days)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r.days ? 'bg-gold-500 text-ink-950' : 'text-ink-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="btn-outline !py-2 text-sm">
            <FaDownload /> {t('admin.reports.export')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="card p-5">
          <p className="text-xs text-ink-500">{t('admin.reports.periodRevenue')}</p>
          <p className="font-display text-2xl font-bold text-gold-400 mt-1">{formatSum(totalRevenue)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500">{t('admin.reports.appointmentsCount')}</p>
          <p className="font-display text-2xl font-bold text-white mt-1">{scopedAppointments.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500">{t('admin.reports.avgTicket')}</p>
          <p className="font-display text-2xl font-bold text-white mt-1">{formatSum(avgTicket)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <FaChartPie className="text-gold-400" /> {t('admin.reports.servicesBreakdownTitle')}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={serviceBreakdown} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>
                {serviceBreakdown.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#181818', border: '1px solid #2b2b2b', borderRadius: 10, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">{t('admin.reports.barbersLoadTitle')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barberLoad} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2b2b2b" horizontal={false} />
              <XAxis type="number" stroke="#6d6d6d" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="#6d6d6d" fontSize={11} tickLine={false} axisLine={false} width={70} />
              <Tooltip
                contentStyle={{ background: '#181818', border: '1px solid #2b2b2b', borderRadius: 10, fontSize: 12 }}
                formatter={(value) => [value, t('admin.reports.appointmentsCount')]}
              />
              <Bar dataKey="count" fill="#c9a227" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-left text-ink-500">
              <th className="px-4 py-3 font-medium">{t('admin.reports.tableBarber')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.reports.tableSpecialty')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.reports.tableRating')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.reports.tableAppointmentsInPeriod')}</th>
            </tr>
          </thead>
          <tbody>
            {barbers.map((b) => {
              const count = scopedAppointments.filter((a) => a.barberId === b.id).length
              return (
                <tr key={b.id} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                  <td className="px-4 py-3 font-medium text-white">{b.ism} {b.familiya}</td>
                  <td className="px-4 py-3 text-ink-300"><AutoText text={b.mutaxassislik} /></td>
                  <td className="px-4 py-3 text-gold-400">{b.reyting} ★</td>
                  <td className="px-4 py-3 text-ink-300">{count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
