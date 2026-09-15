import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FaSearch, FaTrash, FaMoneyBillWave, FaCreditCard, FaChartLine } from 'react-icons/fa'
import Loader from '../../components/Loader'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { fetchPayments, removePayment } from '../../features/payments/paymentsSlice'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { showToast } from '../../features/ui/uiSlice'
import useAuth from '../../hooks/useAuth'
import usePolling from '../../hooks/usePolling'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { formatSum, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/format'
import { toLocalDateIso } from '../../utils/schedule'

const POLL_MS = 8000

function daysAgoIso(count) {
  const d = new Date()
  d.setDate(d.getDate() - count)
  return toLocalDateIso(d)
}

export default function AdminPayments() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { isUsta, user } = useAuth()
  const scopeBarberId = isUsta ? user.barberId : null
  const { items: payments, status } = useSelector((s) => s.payments)
  const { items: appointments } = useSelector((s) => s.appointments)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchPayments())
    if (scopeBarberId) dispatch(fetchAppointments())
  }, [dispatch, scopeBarberId])

  usePolling(() => {
    dispatch(fetchPayments())
    if (scopeBarberId) dispatch(fetchAppointments())
  }, POLL_MS)

  // Payments don't carry a barberId directly — only their linked
  // appointment does — so scoping an usta's own earnings needs this lookup.
  const appointmentBarberMap = useMemo(
    () => Object.fromEntries(appointments.map((a) => [a.id, a.barberId])),
    [appointments]
  )
  const scopedPayments = useMemo(
    () => (scopeBarberId ? payments.filter((p) => appointmentBarberMap[p.appointmentId] === scopeBarberId) : payments),
    [payments, scopeBarberId, appointmentBarberMap]
  )

  const filtered = useMemo(
    () =>
      scopedPayments
        .filter((p) => (debouncedSearch ? p.mijozIsmi.toLowerCase().includes(debouncedSearch.toLowerCase()) : true))
        .sort((a, b) => new Date(b.sana) - new Date(a.sana)),
    [scopedPayments, debouncedSearch]
  )

  const total = useMemo(() => filtered.reduce((sum, p) => sum + p.summa, 0), [filtered])

  const todayIso = toLocalDateIso()
  const weekAgoIso = daysAgoIso(6)
  const monthAgoIso = daysAgoIso(29)
  const todayTotal = useMemo(
    () => scopedPayments.filter((p) => p.sana === todayIso).reduce((sum, p) => sum + p.summa, 0),
    [scopedPayments, todayIso]
  )
  const weekTotal = useMemo(
    () => scopedPayments.filter((p) => p.sana >= weekAgoIso).reduce((sum, p) => sum + p.summa, 0),
    [scopedPayments, weekAgoIso]
  )
  const monthTotal = useMemo(
    () => scopedPayments.filter((p) => p.sana >= monthAgoIso).reduce((sum, p) => sum + p.summa, 0),
    [scopedPayments, monthAgoIso]
  )
  const dailyChartData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const iso = daysAgoIso(i)
      const sum = scopedPayments.filter((p) => p.sana === iso).reduce((s, p) => s + p.summa, 0)
      days.push({ label: iso.slice(5), sum })
    }
    return days
  }, [scopedPayments])

  const handleDelete = (id) => {
    dispatch(removePayment(id))
    dispatch(showToast({ type: 'success', text: t('admin.payments.deletedToast') }))
  }

  const methodLabel = (usul) => {
    const key = PAYMENT_METHOD_LABELS[usul]?.key
    return key ? t(`payment.method.${key}`) : usul
  }

  const paymentStatusLabel = (holat) => {
    const key = PAYMENT_STATUS_LABELS[holat]?.key
    return key ? t(`status.${key}`) : holat
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.payments.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.payments.totalLabel')} <span className="text-gold-400 font-semibold">{formatSum(total)}</span></p>
        </div>
      </div>

      {scopeBarberId && (
        <div className="mb-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-xs text-ink-500">{t('admin.payments.todayTotal')}</p>
              <p className="font-display text-2xl font-bold text-gold-400 mt-1">{formatSum(todayTotal)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink-500">{t('admin.payments.weekTotal')}</p>
              <p className="font-display text-2xl font-bold text-white mt-1">{formatSum(weekTotal)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-ink-500">{t('admin.payments.monthTotal')}</p>
              <p className="font-display text-2xl font-bold text-white mt-1">{formatSum(monthTotal)}</p>
            </div>
          </div>
          <div className="card mt-4 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <FaChartLine className="text-gold-400" /> {t('admin.payments.dailyChartTitle')}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b2b2b" vertical={false} />
                <XAxis dataKey="label" stroke="#6d6d6d" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6d6d6d" fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: '#181818', border: '1px solid #2b2b2b', borderRadius: 10, fontSize: 12 }}
                  formatter={(value) => [formatSum(value), t('admin.payments.tableAmount')]}
                />
                <Bar dataKey="sum" fill="#c9a227" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 text-sm" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.payments.searchPlaceholder')}
          className="input-field !py-2.5 pl-10 text-sm"
        />
      </div>

      {status === 'loading' ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-ink-500">
                <th className="px-4 py-3 font-medium">{t('admin.payments.tableCustomer')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.payments.tableDate')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.payments.tableMethod')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.payments.tableAmount')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.payments.tableStatus')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                  <td className="px-4 py-3 font-medium text-white">{p.mijozIsmi}</td>
                  <td className="px-4 py-3 text-ink-300">{p.sana}</td>
                  <td className="px-4 py-3 text-ink-300">
                    <span className="inline-flex items-center gap-1.5">
                      {p.usul === 'karta' ? <FaCreditCard className="text-sky-400" /> : <FaMoneyBillWave className="text-emerald-400" />}
                      {methodLabel(p.usul)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gold-400 font-medium">{formatSum(p.summa)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                      {paymentStatusLabel(p.holat)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => setToDelete(p.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-500">{t('admin.payments.notFound')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => handleDelete(toDelete)} text={t('admin.payments.deleteConfirmText')} />
    </div>
  )
}
