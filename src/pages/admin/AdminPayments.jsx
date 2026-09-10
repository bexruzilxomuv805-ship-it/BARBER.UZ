import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaSearch, FaTrash, FaMoneyBillWave, FaCreditCard } from 'react-icons/fa'
import Loader from '../../components/Loader'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { fetchPayments, removePayment } from '../../features/payments/paymentsSlice'
import { showToast } from '../../features/ui/uiSlice'
import usePolling from '../../hooks/usePolling'
import { formatSum, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/format'

const POLL_MS = 8000

export default function AdminPayments() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: payments, status } = useSelector((s) => s.payments)
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchPayments())
  }, [dispatch])

  usePolling(() => dispatch(fetchPayments()), POLL_MS)

  const filtered = useMemo(
    () =>
      payments
        .filter((p) => (search ? p.mijozIsmi.toLowerCase().includes(search.toLowerCase()) : true))
        .sort((a, b) => new Date(b.sana) - new Date(a.sana)),
    [payments, search]
  )

  const total = useMemo(() => filtered.reduce((sum, p) => sum + p.summa, 0), [filtered])

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
