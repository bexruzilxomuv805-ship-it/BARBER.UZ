import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaSearch, FaTrash, FaCheckCircle, FaTimesCircle, FaClock, FaUserSlash } from 'react-icons/fa'
import Loader from '../../components/Loader'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import AutoText from '../../components/AutoText'
import usePolling from '../../hooks/usePolling'
import { fetchAppointments, updateAppointment, removeAppointment } from '../../features/appointments/appointmentsSlice'
import { fetchPayments, createPayment } from '../../features/payments/paymentsSlice'
import { showToast } from '../../features/ui/uiSlice'
import { formatSum, STATUS_LABELS } from '../../utils/format'

const STATUSES = ['kutilmoqda', 'tasdiqlangan', 'yakunlangan', 'bekor qilingan', 'kelmagan']
const ALL = '__ALL__'
const POLL_MS = 8000

export default function AdminAppointments() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: appointments, status } = useSelector((s) => s.appointments)
  const { items: payments } = useSelector((s) => s.payments)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchAppointments())
    dispatch(fetchPayments())
  }, [dispatch])

  // Bookings come in from the bot/site at any moment — keep this list live
  // without the admin needing to manually reload.
  usePolling(() => {
    dispatch(fetchAppointments())
    dispatch(fetchPayments())
  }, POLL_MS)

  const statusLabel = (holat) => {
    const key = STATUS_LABELS[holat]?.key
    return key ? t(`status.${key}`) : holat
  }

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => (statusFilter === ALL ? true : a.holat === statusFilter))
      .filter((a) =>
        search
          ? `${a.mijozIsmi} ${a.barberIsmi} ${a.xizmatNomi}`.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .sort((a, b) => new Date(`${b.sana}T${b.vaqt}`) - new Date(`${a.sana}T${a.vaqt}`))
  }, [appointments, search, statusFilter])

  const handleStatusChange = (id, holat) => {
    dispatch(updateAppointment({ id, changes: { holat } }))
    if (holat === 'yakunlangan') {
      const appointment = appointments.find((a) => a.id === id)
      const alreadyBilled = payments.some((p) => p.appointmentId === id)
      if (appointment && !alreadyBilled) {
        dispatch(
          createPayment({
            appointmentId: id,
            mijozIsmi: appointment.mijozIsmi,
            sana: appointment.sana,
            usul: 'naqd',
            summa: appointment.narxi,
            holat: 'to‘landi',
            createdAt: new Date().toISOString(),
          })
        )
      }
    }
    dispatch(showToast({ type: 'success', text: t('admin.appointments.statusUpdatedToast') }))
  }

  const handleDelete = (id) => {
    dispatch(removeAppointment(id))
    dispatch(showToast({ type: 'success', text: t('admin.appointments.deletedToast') }))
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.appointments.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.appointments.subtitle', { count: appointments.length })}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.appointments.searchPlaceholder')}
            className="input-field !py-2.5 pl-10 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field !py-2.5 !w-auto text-sm"
        >
          <option value={ALL}>{t('admin.all')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {status === 'loading' ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-ink-500">
                <th className="px-4 py-3 font-medium">{t('admin.appointments.tableClient')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.appointments.tableService')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.appointments.tableBarber')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.appointments.tableDateTime')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.appointments.tablePrice')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.appointments.tableStatus')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{a.mijozIsmi}</p>
                    <p className="text-xs text-ink-500">{a.mijozTelefon}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-300"><AutoText text={a.xizmatNomi} /></td>
                  <td className="px-4 py-3 text-ink-300">{a.barberIsmi}</td>
                  <td className="px-4 py-3 text-ink-300 whitespace-nowrap">{a.sana} • {a.vaqt}</td>
                  <td className="px-4 py-3 text-gold-400 font-medium whitespace-nowrap">{formatSum(a.narxi)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.holat} />
                    {a.holat === 'bekor qilingan' && a.bekorSababi && (
                      <p className="mt-1 text-xs text-ink-500 max-w-[180px]">{a.bekorSababi}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {a.holat !== 'yakunlangan' && (
                        <button
                          title={t('admin.appointments.markCompleted')}
                          onClick={() => handleStatusChange(a.id, 'yakunlangan')}
                          className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                      {a.holat === 'kutilmoqda' && (
                        <button
                          title={t('admin.appointments.confirmAction')}
                          onClick={() => handleStatusChange(a.id, 'tasdiqlangan')}
                          className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10"
                        >
                          <FaClock />
                        </button>
                      )}
                      {a.holat !== 'bekor qilingan' && (
                        <button
                          title={t('admin.appointments.cancelAction')}
                          onClick={() => handleStatusChange(a.id, 'bekor qilingan')}
                          className="rounded-lg p-2 text-amber-400 hover:bg-amber-500/10"
                        >
                          <FaTimesCircle />
                        </button>
                      )}
                      {(a.holat === 'kutilmoqda' || a.holat === 'tasdiqlangan') && (
                        <button
                          title={t('admin.appointments.markNoShow')}
                          onClick={() => handleStatusChange(a.id, 'kelmagan')}
                          className="rounded-lg p-2 text-ink-400 hover:bg-ink-500/10"
                        >
                          <FaUserSlash />
                        </button>
                      )}
                      <button
                        title={t('admin.appointments.deleteAction')}
                        onClick={() => setToDelete(a.id)}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink-500">{t('admin.appointments.notFound')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => handleDelete(toDelete)}
        text={t('admin.appointments.deleteConfirmText')}
      />
    </div>
  )
}
