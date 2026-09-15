import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaCamera, FaTimes, FaStore } from 'react-icons/fa'
import Loader from '../../components/Loader'
import RatingStars from '../../components/RatingStars'
import { getBarberImage } from '../../assets/images'
import { fetchBarbers, updateBarber } from '../../features/barbers/barbersSlice'
import { fetchShops } from '../../features/sartaroshxonalar/sartaroshxonalarSlice'
import { showToast } from '../../features/ui/uiSlice'
import useAuth from '../../hooks/useAuth'
import { formatDateShort } from '../../utils/format'
import { getWeekdayOptions } from '../../utils/schedule'

const emptyRange = { boshlanish: '', tugash: '' }

// Lets an usta edit their own barber profile (photo, hours, price, bio,
// days off/vacation) from their own panel, without needing the admin to do
// it for them — scoped to exactly their own barberId, with no access to
// anyone else's card. Shop assignment and rating stay admin/review-only,
// so they're shown read-only here rather than editable.
//
// Local edits are tracked as a sparse `changes` object layered on top of the
// fetched `barber` record (a `draft` merge of the two, recomputed on every
// render) instead of copying the async record into local state via an
// effect — avoids the "set state from an effect" footgun since there's
// nothing to resync: the draft always reflects the latest fetched barber
// plus whatever the admin hasn't saved yet.
export default function UstaProfile() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { items: barbers, status } = useSelector((s) => s.barbers)
  const { items: shops } = useSelector((s) => s.sartaroshxonalar)
  const [changes, setChanges] = useState({})
  const [newRange, setNewRange] = useState(emptyRange)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatch(fetchBarbers())
    dispatch(fetchShops())
  }, [dispatch])

  const barber = useMemo(() => barbers.find((b) => b.id === user.barberId), [barbers, user.barberId])
  const shop = useMemo(() => shops.find((s) => s.id === barber?.sartaroshxonaId), [shops, barber])
  const weekdayOptions = useMemo(() => getWeekdayOptions(t('common.weekdaysShort', { returnObjects: true })), [t])
  const draft = barber ? { ...barber, ...changes } : null

  const setField = (key, value) => setChanges((c) => ({ ...c, [key]: value }))

  const toggleDayOff = (value) => {
    const current = new Set(draft.damOlishKunlari || [])
    if (current.has(value)) current.delete(value)
    else current.add(value)
    setField('damOlishKunlari', Array.from(current).sort((a, b) => a - b))
  }

  const addVacationRange = () => {
    if (!newRange.boshlanish || !newRange.tugash || newRange.boshlanish > newRange.tugash) return
    setField('taillar', [...(draft.taillar || []), newRange])
    setNewRange(emptyRange)
  }

  const removeVacationRange = (idx) => {
    setField('taillar', draft.taillar.filter((_, i) => i !== idx))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setField('rasm', reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (Object.keys(changes).length === 0) return
    setSaving(true)
    const payload = { ...changes }
    if ('tajriba' in payload) payload.tajriba = Number(payload.tajriba)
    if ('narxBoshlanishi' in payload) payload.narxBoshlanishi = Number(payload.narxBoshlanishi)
    const result = await dispatch(updateBarber({ id: barber.id, changes: payload }))
    setSaving(false)
    if (!updateBarber.fulfilled.match(result)) {
      dispatch(showToast({ type: 'error', text: t('admin.shops.saveError') }))
      return
    }
    setChanges({})
    dispatch(showToast({ type: 'success', text: t('admin.ustaProfile.updatedToast') }))
  }

  if (status === 'loading' && !barber) return <Loader full />

  if (!draft) {
    return <p className="text-sm text-ink-500">{t('admin.ustaProfile.noProfile')}</p>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">{t('admin.ustaProfile.title')}</h1>
        <p className="text-sm text-ink-500 mt-1">{t('admin.ustaProfile.subtitle')}</p>
      </div>

      <div className="card max-w-2xl p-5">
        <div className="mb-5 border-b border-ink-800 pb-5">
          <div className="flex items-center gap-4">
            <img src={getBarberImage(draft.rasm)} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover border border-ink-800" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-white">{barber.ism} {barber.familiya}</p>
              <div className="mt-1"><RatingStars value={barber.reyting} /></div>
              {shop && (
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-500">
                  <FaStore className="shrink-0 text-gold-400" /> <span className="truncate">{shop.nomi}</span>
                </p>
              )}
            </div>
          </div>
          <label className="btn-outline !py-2 mt-4 inline-flex text-sm cursor-pointer">
            <FaCamera /> {t('admin.barbers.choosePhoto')}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.specialtyLabel')}</label>
            <input required value={draft.mutaxassislik} onChange={(e) => setField('mutaxassislik', e.target.value)} placeholder={t('admin.barbers.specialtyPlaceholder')} className="input-field !py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.phoneLabel')}</label>
              <input required value={draft.telefon} onChange={(e) => setField('telefon', e.target.value)} placeholder="+998 90 123 45 67" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.workHoursLabel')}</label>
              <input required value={draft.ishVaqti} onChange={(e) => setField('ishVaqti', e.target.value)} placeholder="09:00 - 18:00" className="input-field !py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.experienceLabel')}</label>
              <input required type="number" min={0} value={draft.tajriba} onChange={(e) => setField('tajriba', e.target.value)} placeholder="5" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.startingPriceLabel')}</label>
              <input required type="number" min={0} step={1000} value={draft.narxBoshlanishi} onChange={(e) => setField('narxBoshlanishi', e.target.value)} placeholder="30000" className="input-field !py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.bioLabel')}</label>
            <textarea rows={3} value={draft.bio} onChange={(e) => setField('bio', e.target.value)} placeholder={t('admin.barbers.bioPlaceholder')} className="input-field resize-none text-sm" />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-ink-500">{t('admin.barbers.daysOffLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {weekdayOptions.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => toggleDayOff(d.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    draft.damOlishKunlari?.includes(d.value)
                      ? 'border-red-500 bg-red-500/10 text-red-400'
                      : 'border-ink-800 text-ink-400 hover:border-gold-500/40'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-ink-500">{t('admin.barbers.vacationLabel')}</p>
            {draft.taillar?.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {draft.taillar.map((r, i) => (
                  <div key={`${r.boshlanish}-${r.tugash}-${i}`} className="flex items-center justify-between rounded-lg border border-ink-800 px-3 py-1.5 text-xs text-ink-300">
                    <span>{formatDateShort(r.boshlanish)} — {formatDateShort(r.tugash)}</span>
                    <button type="button" onClick={() => removeVacationRange(i)} className="text-red-400 hover:text-red-300">
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="date" value={newRange.boshlanish} onChange={(e) => setNewRange((r) => ({ ...r, boshlanish: e.target.value }))} className="input-field !py-1.5 text-xs" />
              <span className="shrink-0 text-ink-600">—</span>
              <input type="date" value={newRange.tugash} onChange={(e) => setNewRange((r) => ({ ...r, tugash: e.target.value }))} className="input-field !py-1.5 text-xs" />
              <button type="button" onClick={addVacationRange} className="btn-outline shrink-0 !py-1.5 px-3 text-xs">{t('admin.barbers.addVacation')}</button>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-gold w-full !py-2.5 text-sm disabled:opacity-60">
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>
    </div>
  )
}
