import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FaCheckCircle, FaArrowLeft, FaArrowRight, FaCalendarAlt } from 'react-icons/fa'
import PageHero from '../../components/PageHero'
import Loader from '../../components/Loader'
import ServiceIcon from '../../components/ServiceIcon'
import AutoText from '../../components/AutoText'
import { getBarberImage } from '../../assets/images'
import { fetchServices } from '../../features/services/servicesSlice'
import { fetchBarbers } from '../../features/barbers/barbersSlice'
import { fetchAppointments, createAppointment } from '../../features/appointments/appointmentsSlice'
import { showToast } from '../../features/ui/uiSlice'
import useAuth from '../../hooks/useAuth'
import { formatSum } from '../../utils/format'
import { isBarberOff } from '../../utils/schedule'

const WORK_HOURS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']

function nextDays(count = 7) {
  const days = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    days.push(d)
  }
  return days
}

export default function Booking() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const STEPS = t('booking.steps', { returnObjects: true })
  const weekdaysShort = t('common.weekdaysShort', { returnObjects: true })
  const monthsShort = t('common.monthsShort', { returnObjects: true })

  const { items: services, status: servicesStatus } = useSelector((s) => s.services)
  const { items: barbers, status: barbersStatus } = useSelector((s) => s.barbers)
  const { items: appointments } = useSelector((s) => s.appointments)

  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState(location.state?.serviceId || '')
  const [barberId, setBarberId] = useState(location.state?.barberId || '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [form, setForm] = useState({
    ism: user ? `${user.ism} ${user.familiya}` : '',
    telefon: user?.telefon || '',
    izoh: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    dispatch(fetchServices())
    dispatch(fetchBarbers())
    dispatch(fetchAppointments())
  }, [dispatch])

  const days = useMemo(() => nextDays(7), [])
  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId])
  const selectedBarber = useMemo(() => barbers.find((b) => b.id === barberId), [barbers, barberId])

  const takenSlots = useMemo(() => {
    if (!barberId || !date) return new Set()
    return new Set(
      appointments
        .filter((a) => a.barberId === barberId && a.sana === date && a.holat !== 'bekor qilingan')
        .map((a) => a.vaqt)
    )
  }, [appointments, barberId, date])

  const canNext = useMemo(() => {
    if (step === 0) return !!serviceId
    if (step === 1) return !!barberId
    if (step === 2) return !!date && !!time
    if (step === 3) return form.ism.trim() && form.telefon.trim()
    return true
  }, [step, serviceId, barberId, date, time, form])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await dispatch(
        createAppointment({
          mijozId: user?.id || null,
          mijozIsmi: form.ism,
          mijozTelefon: form.telefon,
          barberId,
          barberIsmi: `${selectedBarber.ism} ${selectedBarber.familiya}`,
          xizmatId: serviceId,
          xizmatNomi: selectedService.nomi,
          sana: date,
          vaqt: time,
          holat: 'kutilmoqda',
          narxi: selectedService.narxi,
          izoh: form.izoh,
          createdAt: new Date().toISOString(),
        })
      ).unwrap()
      setDone(true)
      dispatch(showToast({ type: 'success', text: t('booking.successToast') }))
    } catch {
      dispatch(showToast({ type: 'error', text: t('booking.errorToast') }))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto max-w-md">
          <FaCheckCircle className="mx-auto text-6xl text-emerald-400" />
          <h2 className="mt-6 font-display text-2xl font-bold text-white">{t('booking.doneTitle')}</h2>
          <p className="mt-3 text-ink-400">
            {t('booking.doneMessage', { barber: selectedBarber?.ism, date, time })}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => navigate('/profil')} className="btn-gold">{t('booking.viewMyAppointments')}</button>
            <button onClick={() => navigate('/')} className="btn-outline">{t('booking.backHome')}</button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div>
      <PageHero eyebrow={t('booking.eyebrow')} title={t('booking.title')} subtitle={t('booking.subtitle')} />

      <section className="container-x pb-24 max-w-3xl">
        {/* progress */}
        <div className="mb-10 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                    i < step
                      ? 'bg-gold-500 border-gold-500 text-ink-950'
                      : i === step
                      ? 'border-gold-500 text-gold-400'
                      : 'border-ink-800 text-ink-600'
                  }`}
                >
                  {i < step ? <FaCheckCircle /> : i + 1}
                </div>
                <span className={`hidden sm:block text-xs ${i <= step ? 'text-ink-200' : 'text-ink-600'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${i < step ? 'bg-gold-500' : 'bg-ink-800'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <div>
                {servicesStatus === 'loading' ? (
                  <Loader />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setServiceId(s.id)}
                        className={`card flex items-center gap-4 p-4 text-left transition-colors ${
                          serviceId === s.id ? 'border-gold-500 bg-gold-500/5' : 'hover:border-gold-500/40'
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 text-lg">
                          <ServiceIcon name={s.rasm} />
                        </span>
                        <div className="flex-1">
                          <AutoText as="p" className="font-medium text-white text-sm" text={s.nomi} />
                          <p className="text-xs text-ink-500">{t('booking.minutes', { count: s.davomiyligi })}</p>
                        </div>
                        <span className="text-sm font-semibold text-gold-400">{formatSum(s.narxi)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div>
                {barbersStatus === 'loading' ? (
                  <Loader />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {barbers.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { setBarberId(b.id); setDate(''); setTime('') }}
                        className={`card flex items-center gap-4 p-4 text-left transition-colors ${
                          barberId === b.id ? 'border-gold-500 bg-gold-500/5' : 'hover:border-gold-500/40'
                        }`}
                      >
                        <img src={getBarberImage(b.rasm)} alt={b.ism} className="h-14 w-14 rounded-full object-cover shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{b.ism} {b.familiya}</p>
                          <AutoText as="p" className="text-xs text-gold-400" text={b.mutaxassislik} />
                        </div>
                        <span className="text-xs text-ink-500">{b.ishVaqti}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-300"><FaCalendarAlt className="text-gold-400" /> {t('booking.chooseDate')}</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {days.map((d) => {
                    const iso = d.toISOString().slice(0, 10)
                    const active = date === iso
                    const off = isBarberOff(selectedBarber, iso)
                    return (
                      <button
                        key={iso}
                        disabled={off}
                        onClick={() => { setDate(iso); setTime('') }}
                        className={`flex min-w-[72px] flex-col items-center rounded-xl border px-3 py-3 transition-colors ${
                          off
                            ? 'border-ink-900 text-ink-700 line-through cursor-not-allowed'
                            : active
                            ? 'border-gold-500 bg-gold-500/10 text-gold-300'
                            : 'border-ink-800 text-ink-400 hover:border-gold-500/40'
                        }`}
                      >
                        <span className="text-[11px] uppercase">{weekdaysShort[d.getDay()]}</span>
                        <span className="text-lg font-bold">{d.getDate()}</span>
                        <span className="text-[11px]">{monthsShort[d.getMonth()]}</span>
                      </button>
                    )
                  })}
                </div>
                {selectedBarber && <p className="mt-2 text-[11px] text-ink-600">{t('booking.offDayNote')}</p>}

                <p className="mb-3 mt-8 text-sm font-medium text-ink-300">{t('booking.chooseTime')}</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {WORK_HOURS.map((t) => {
                    const isTaken = takenSlots.has(t)
                    const active = time === t
                    return (
                      <button
                        key={t}
                        disabled={isTaken || !date}
                        onClick={() => setTime(t)}
                        className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? 'border-gold-500 bg-gold-500 text-ink-950'
                            : isTaken
                            ? 'border-ink-900 text-ink-700 line-through cursor-not-allowed'
                            : 'border-ink-800 text-ink-300 hover:border-gold-500/50'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
                {!date && <p className="mt-3 text-xs text-ink-600">{t('booking.selectDateFirst')}</p>}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="card p-5">
                  <p className="text-xs text-ink-500 mb-3">{t('booking.orderSummary')}</p>
                  <div className="space-y-1.5 text-sm text-ink-300">
                    <p>{t('booking.serviceLabel')}: <span className="text-white font-medium"><AutoText text={selectedService?.nomi} /></span></p>
                    <p>{t('booking.barberLabel')}: <span className="text-white font-medium">{selectedBarber?.ism} {selectedBarber?.familiya}</span></p>
                    <p>{t('booking.dateTimeLabel')}: <span className="text-white font-medium">{date} — {time}</span></p>
                    <p>{t('booking.priceLabel')}: <span className="text-gold-400 font-semibold">{formatSum(selectedService?.narxi)}</span></p>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-ink-300">{t('booking.fullNameLabel')}</label>
                  <input
                    value={form.ism}
                    onChange={(e) => setForm((f) => ({ ...f, ism: e.target.value }))}
                    className="input-field"
                    placeholder={t('booking.fullNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-ink-300">{t('booking.phoneLabel')}</label>
                  <input
                    value={form.telefon}
                    onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                    className="input-field"
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-ink-300">{t('booking.notesLabel')}</label>
                  <textarea
                    value={form.izoh}
                    onChange={(e) => setForm((f) => ({ ...f, izoh: e.target.value }))}
                    className="input-field resize-none"
                    rows={3}
                    placeholder={t('booking.notesPlaceholder')}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-outline !px-5 disabled:opacity-30"
          >
            <FaArrowLeft /> {t('booking.back')}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn-gold disabled:opacity-30">
              {t('booking.next')} <FaArrowRight />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!canNext || submitting} className="btn-gold disabled:opacity-40">
              {submitting ? t('booking.submitting') : t('booking.confirm')}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
