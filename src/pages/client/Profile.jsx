import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaUserCircle, FaEnvelope, FaPhoneAlt, FaEdit, FaTimes, FaSave, FaCalendarCheck } from 'react-icons/fa'
import PageHero from '../../components/PageHero'
import Loader from '../../components/Loader'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/admin/Modal'
import useAuth from '../../hooks/useAuth'
import { fetchAppointments, updateAppointment } from '../../features/appointments/appointmentsSlice'
import { updateProfile } from '../../features/auth/authSlice'
import { showToast } from '../../features/ui/uiSlice'
import { formatSum } from '../../utils/format'

export default function Profile() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { items: appointments, status } = useSelector((s) => s.appointments)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ism: user?.ism || '', familiya: user?.familiya || '', telefon: user?.telefon || '' })
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReasonIndex, setCancelReasonIndex] = useState(0)
  const [customReason, setCustomReason] = useState('')

  const cancelReasons = t('profile.cancelReasons', { returnObjects: true })
  const otherReasonIndex = cancelReasons.length - 1

  useEffect(() => {
    dispatch(fetchAppointments())
  }, [dispatch])

  const myAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.mijozId === user?.id)
        .sort((a, b) => new Date(`${b.sana}T${b.vaqt}`) - new Date(`${a.sana}T${a.vaqt}`)),
    [appointments, user]
  )

  const stats = useMemo(() => {
    const total = myAppointments.length
    const completed = myAppointments.filter((a) => a.holat === 'yakunlangan').length
    const spent = myAppointments
      .filter((a) => a.holat === 'yakunlangan')
      .reduce((sum, a) => sum + (a.narxi || 0), 0)
    return { total, completed, spent }
  }, [myAppointments])

  const openCancel = (id) => {
    setCancelTarget(id)
    setCancelReasonIndex(0)
    setCustomReason('')
  }

  const closeCancel = () => setCancelTarget(null)

  const handleCancelSubmit = (e) => {
    e.preventDefault()
    const sabab = cancelReasonIndex === otherReasonIndex ? customReason.trim() : cancelReasons[cancelReasonIndex]
    if (!sabab) return
    dispatch(updateAppointment({ id: cancelTarget, changes: { holat: 'bekor qilingan', bekorSababi: sabab } }))
    dispatch(showToast({ type: 'success', text: t('profile.cancelledToast') }))
    closeCancel()
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    await dispatch(updateProfile({ id: user.id, changes: form }))
    dispatch(showToast({ type: 'success', text: t('profile.profileUpdatedToast') }))
    setEditing(false)
  }

  return (
    <div>
      <PageHero eyebrow={t('profile.eyebrow')} title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <section className="container-x pb-24 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            {!editing ? (
              <>
                <div className="flex items-center gap-3">
                  <FaUserCircle className="text-5xl text-gold-400" />
                  <div>
                    <p className="font-semibold text-white">{user?.ism} {user?.familiya}</p>
                    <p className="text-xs text-ink-500">{user?.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleClient')}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2 text-sm text-ink-300">
                  <p className="flex items-center gap-2"><FaEnvelope className="text-gold-400" /> {user?.email || (user?.telegramUsername && `@${user.telegramUsername}`)}</p>
                  <p className="flex items-center gap-2"><FaPhoneAlt className="text-gold-400" /> {user?.telefon}</p>
                </div>
                <button onClick={() => setEditing(true)} className="btn-outline mt-5 w-full !py-2 text-sm">
                  <FaEdit /> {t('profile.edit')}
                </button>
              </>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <input
                  value={form.ism}
                  onChange={(e) => setForm((f) => ({ ...f, ism: e.target.value }))}
                  className="input-field !py-2 text-sm"
                  placeholder={t('profile.firstNamePlaceholder')}
                />
                <input
                  value={form.familiya}
                  onChange={(e) => setForm((f) => ({ ...f, familiya: e.target.value }))}
                  className="input-field !py-2 text-sm"
                  placeholder={t('profile.lastNamePlaceholder')}
                />
                <input
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                  className="input-field !py-2 text-sm"
                  placeholder={t('profile.phonePlaceholder')}
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-gold flex-1 !py-2 text-sm"><FaSave /> {t('profile.save')}</button>
                  <button type="button" onClick={() => setEditing(false)} className="btn-outline !py-2 !px-3"><FaTimes /></button>
                </div>
              </form>
            )}
          </div>

          <div className="card p-6 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-xl font-bold text-white">{stats.total}</p>
              <p className="text-[11px] text-ink-500 mt-1">{t('profile.statTotal')}</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-emerald-400">{stats.completed}</p>
              <p className="text-[11px] text-ink-500 mt-1">{t('profile.statCompleted')}</p>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-gold-400">{formatSum(stats.spent)}</p>
              <p className="text-[11px] text-ink-500 mt-1">{t('profile.statSpent')}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <FaCalendarCheck className="text-gold-400" /> {t('profile.myAppointments')}
          </h3>
          {status === 'loading' ? (
            <Loader />
          ) : myAppointments.length === 0 ? (
            <div className="card p-10 text-center text-ink-500">{t('profile.noAppointments')}</div>
          ) : (
            <div className="space-y-3">
              {myAppointments.map((a) => (
                <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-white text-sm">{a.xizmatNomi}</p>
                    <p className="text-xs text-ink-500 mt-1">
                      {a.barberIsmi} • {a.sana} • {a.vaqt}
                    </p>
                    {a.holat === 'bekor qilingan' && a.bekorSababi && (
                      <p className="text-xs text-red-400/80 mt-1">{t('profile.cancelledReasonPrefix')} {a.bekorSababi}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gold-400">{formatSum(a.narxi)}</span>
                    <StatusBadge status={a.holat} />
                    {(a.holat === 'kutilmoqda' || a.holat === 'tasdiqlangan') && (
                      <button
                        onClick={() => openCancel(a.id)}
                        className="text-xs text-red-400 hover:text-red-300 hover:underline"
                      >
                        {t('profile.cancelAction')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal open={!!cancelTarget} onClose={closeCancel} title={t('profile.cancelModalTitle')}>
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('profile.cancelReasonLabel')}</label>
            <select
              value={cancelReasonIndex}
              onChange={(e) => setCancelReasonIndex(Number(e.target.value))}
              className="input-field !py-2 text-sm"
            >
              {cancelReasons.map((r, i) => (
                <option key={r} value={i}>{r}</option>
              ))}
            </select>
          </div>
          {cancelReasonIndex === otherReasonIndex && (
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('profile.cancelReasonCustomLabel')}</label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
                rows={3}
                placeholder={t('profile.cancelReasonCustomPlaceholder')}
                className="input-field text-sm"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-gold flex-1 !py-2 text-sm">{t('profile.cancelSubmit')}</button>
            <button type="button" onClick={closeCancel} className="btn-outline !py-2 text-sm">{t('profile.cancelClose')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
