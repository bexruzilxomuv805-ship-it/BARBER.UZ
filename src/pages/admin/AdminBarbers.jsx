import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaEdit, FaTrash, FaPlus, FaPhoneAlt, FaCamera, FaTimes, FaKey, FaTelegramPlane } from 'react-icons/fa'
import { SkeletonCardGrid } from '../../components/Skeleton'
import Modal from '../../components/admin/Modal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import RatingStars from '../../components/RatingStars'
import AutoText from '../../components/AutoText'
import WeeklyScheduleEditor from '../../components/admin/WeeklyScheduleEditor'
import { getBarberImage } from '../../assets/images'
import { fetchBarbers, createBarber, updateBarber, removeBarber } from '../../features/barbers/barbersSlice'
import { fetchCustomers, createCustomer, updateCustomer } from '../../features/customers/customersSlice'
import { fetchShops } from '../../features/sartaroshxonalar/sartaroshxonalarSlice'
import { showToast } from '../../features/ui/uiSlice'
import { formatSum, formatDateShort } from '../../utils/format'
import { getWeekdayOptions, getWeeklySchedule, defaultJadval, isBarberOff, toLocalDateIso } from '../../utils/schedule'

const emptyForm = {
  ism: '', familiya: '', mutaxassislik: '', telefon: '', tajriba: 1,
  reyting: 5, rasm: 'barber-aziz', narxBoshlanishi: 30000, jadval: defaultJadval(), bio: '',
  taillar: [], sartaroshxonaId: '',
}
const emptyRange = { boshlanish: '', tugash: '' }
const emptyCredForm = { email: '', parol: '' }

export default function AdminBarbers() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: barbers, status } = useSelector((s) => s.barbers)
  const { items: users } = useSelector((s) => s.customers)
  const { items: shops } = useSelector((s) => s.sartaroshxonalar)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)
  const [newRange, setNewRange] = useState(emptyRange)
  const [credBarber, setCredBarber] = useState(null)
  const [credForm, setCredForm] = useState(emptyCredForm)
  const [resettingPassword, setResettingPassword] = useState(false)

  useEffect(() => {
    dispatch(fetchBarbers())
    dispatch(fetchCustomers())
    dispatch(fetchShops())
  }, [dispatch])

  const ustaByBarberId = useMemo(
    () => Object.fromEntries(users.filter((u) => u.role === 'usta' && !u.deleted).map((u) => [u.barberId, u])),
    [users]
  )

  const weekdayOptions = useMemo(() => getWeekdayOptions(t('common.weekdaysShort', { returnObjects: true })), [t])
  const todayIso = useMemo(() => toLocalDateIso(), [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setNewRange(emptyRange)
    setModalOpen(true)
  }

  const openEdit = (b) => {
    setEditing(b)
    setForm({ ...emptyForm, ...b, jadval: getWeeklySchedule(b) })
    setNewRange(emptyRange)
    setModalOpen(true)
  }

  const addVacationRange = () => {
    if (!newRange.boshlanish || !newRange.tugash || newRange.boshlanish > newRange.tugash) return
    setForm((f) => ({ ...f, taillar: [...(f.taillar || []), newRange] }))
    setNewRange(emptyRange)
  }

  const removeVacationRange = (idx) => {
    setForm((f) => ({ ...f, taillar: f.taillar.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, tajriba: Number(form.tajriba), reyting: Number(form.reyting), narxBoshlanishi: Number(form.narxBoshlanishi) }
    const result = editing
      ? await dispatch(updateBarber({ id: editing.id, changes: payload }))
      : await dispatch(createBarber(payload))

    const succeeded = editing ? updateBarber.fulfilled.match(result) : createBarber.fulfilled.match(result)
    if (!succeeded) {
      dispatch(showToast({ type: 'error', text: result.payload || t('admin.barbers.saveError') }))
      return
    }
    dispatch(showToast({ type: 'success', text: t(editing ? 'admin.barbers.updatedToast' : 'admin.barbers.addedToast') }))
    setModalOpen(false)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, rasm: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleDelete = (id) => {
    dispatch(removeBarber(id))
    dispatch(showToast({ type: 'success', text: t('admin.barbers.deletedToast') }))
  }

  const openCredentials = (b) => {
    setCredBarber(b)
    setCredForm({ email: '', parol: '' })
    setResettingPassword(false)
  }

  const handleCreateUsta = async (e) => {
    e.preventDefault()
    await dispatch(
      createCustomer({
        id: `u-usta-${credBarber.id}`,
        ism: credBarber.ism,
        familiya: credBarber.familiya,
        email: credForm.email,
        telefon: credBarber.telefon,
        parol: credForm.parol,
        role: 'usta',
        barberId: credBarber.id,
        avatar: '',
        createdAt: new Date().toISOString(),
      })
    )
    dispatch(showToast({ type: 'success', text: t('admin.barbers.credentialsCreatedToast') }))
    setCredBarber(null)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    const usta = ustaByBarberId[credBarber.id]
    await dispatch(updateCustomer({ id: usta.id, changes: { parol: credForm.parol } }))
    dispatch(showToast({ type: 'success', text: t('admin.barbers.passwordResetToast') }))
    setCredBarber(null)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.barbers.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.barbers.subtitle', { count: barbers.length })}</p>
        </div>
        <button onClick={openCreate} className="btn-gold !py-2 text-sm">
          <FaPlus /> {t('admin.barbers.addBarber')}
        </button>
      </div>

      {status === 'loading' ? (
        <SkeletonCardGrid count={8} className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {barbers.map((b) => (
            <div key={b.id} className="card overflow-hidden flex flex-col">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={getBarberImage(b.rasm)} alt={b.ism} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="truncate text-sm font-semibold text-white">{b.ism} {b.familiya}</p>
                <AutoText as="p" className="truncate text-xs text-gold-400" text={b.mutaxassislik} />
                <div className="mt-1"><RatingStars value={b.reyting} /></div>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-500"><FaPhoneAlt className="shrink-0" /> {b.telefon}</p>
                {isBarberOff(b, todayIso) && (
                  <span className="mt-1 w-fit rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    {t('admin.barbers.offTodayBadge')}
                  </span>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-ink-800 pt-2.5">
                  <span className="text-xs font-semibold text-gold-400">{formatSum(b.narxBoshlanishi)}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openCredentials(b)}
                      title={t('admin.barbers.credentialsAction')}
                      className={`rounded-lg p-1.5 hover:bg-gold-500/10 ${ustaByBarberId[b.id] ? 'text-gold-400' : 'text-ink-500'}`}
                    >
                      <FaKey className="text-sm" />
                    </button>
                    <button onClick={() => openEdit(b)} className="rounded-lg p-1.5 text-sky-400 hover:bg-sky-500/10"><FaEdit className="text-sm" /></button>
                    <button onClick={() => setToDelete(b.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"><FaTrash className="text-sm" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.barbers.editTitle') : t('admin.barbers.newTitle')} wide>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.firstNameLabel')}</label>
              <input required value={form.ism} onChange={(e) => setForm((f) => ({ ...f, ism: e.target.value }))} placeholder={t('admin.barbers.firstNameLabel')} className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.lastNameLabel')}</label>
              <input required value={form.familiya} onChange={(e) => setForm((f) => ({ ...f, familiya: e.target.value }))} placeholder={t('admin.barbers.lastNameLabel')} className="input-field !py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.specialtyLabel')}</label>
            <input required value={form.mutaxassislik} onChange={(e) => setForm((f) => ({ ...f, mutaxassislik: e.target.value }))} placeholder={t('admin.barbers.specialtyPlaceholder')} className="input-field !py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.shopLabel')}</label>
            <select
              value={form.sartaroshxonaId}
              onChange={(e) => setForm((f) => ({ ...f, sartaroshxonaId: e.target.value }))}
              className="input-field !py-2 text-sm"
            >
              <option value="">{t('admin.barbers.shopUnassigned')}</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.nomi}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.phoneLabel')}</label>
            <input required value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} placeholder="+998 90 123 45 67" className="input-field !py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.experienceLabel')}</label>
              <input required type="number" min={0} value={form.tajriba} onChange={(e) => setForm((f) => ({ ...f, tajriba: e.target.value }))} placeholder="5" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.ratingLabel')}</label>
              <input required type="number" min={0} max={5} step={0.1} value={form.reyting} onChange={(e) => setForm((f) => ({ ...f, reyting: e.target.value }))} placeholder="4.8" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.startingPriceLabel')}</label>
              <input required type="number" min={0} step={1000} value={form.narxBoshlanishi} onChange={(e) => setForm((f) => ({ ...f, narxBoshlanishi: e.target.value }))} placeholder="30000" className="input-field !py-2 text-sm" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.photoLabel')}</p>
            <div className="flex items-center gap-4">
              <img src={getBarberImage(form.rasm)} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover border border-ink-800" />
              <label className="btn-outline !py-2 text-sm cursor-pointer">
                <FaCamera /> {t('admin.barbers.choosePhoto')}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.barbers.bioLabel')}</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder={t('admin.barbers.bioPlaceholder')} className="input-field resize-none text-sm" />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-ink-500">{t('admin.barbers.workHoursLabel')}</p>
            <WeeklyScheduleEditor
              value={form.jadval}
              onChange={(jadval) => setForm((f) => ({ ...f, jadval }))}
              weekdayOptions={weekdayOptions}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-ink-500">{t('admin.barbers.vacationLabel')}</p>
            {form.taillar?.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {form.taillar.map((r, i) => (
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
          <button type="submit" className="btn-gold w-full !py-2.5 text-sm">{t('common.save')}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => handleDelete(toDelete)} text={t('admin.barbers.deleteConfirmText')} />

      <Modal open={!!credBarber} onClose={() => setCredBarber(null)} title={t('admin.barbers.credentialsTitle', { name: credBarber?.ism })}>
        {credBarber && ustaByBarberId[credBarber.id] ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-ink-800 px-3.5 py-3 text-sm">
              <p className="text-ink-300">{ustaByBarberId[credBarber.id].email}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
                <FaTelegramPlane className={ustaByBarberId[credBarber.id].telegramId ? 'text-sky-400' : 'text-ink-600'} />
                {ustaByBarberId[credBarber.id].telegramId
                  ? t('admin.barbers.telegramLinkedYes')
                  : t('admin.barbers.telegramLinkedNo')}
              </p>
            </div>
            {resettingPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.passwordLabel')}</label>
                  <input
                    required
                    value={credForm.parol}
                    onChange={(e) => setCredForm((f) => ({ ...f, parol: e.target.value }))}
                    placeholder={t('admin.customers.passwordLabel')}
                    className="input-field !py-2 text-sm"
                  />
                </div>
                <button type="submit" className="btn-gold w-full !py-2.5 text-sm">{t('common.save')}</button>
              </form>
            ) : (
              <button type="button" onClick={() => setResettingPassword(true)} className="btn-outline w-full !py-2.5 text-sm">
                {t('admin.barbers.resetPasswordAction')}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateUsta} className="space-y-3">
            <p className="text-sm text-ink-400">{t('admin.barbers.credentialsIntro')}</p>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.emailLabel')}</label>
              <input
                required
                type="email"
                value={credForm.email}
                onChange={(e) => setCredForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
                className="input-field !py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.passwordLabel')}</label>
              <input
                required
                value={credForm.parol}
                onChange={(e) => setCredForm((f) => ({ ...f, parol: e.target.value }))}
                placeholder={t('admin.customers.passwordLabel')}
                className="input-field !py-2 text-sm"
              />
            </div>
            <button type="submit" className="btn-gold w-full !py-2.5 text-sm">{t('admin.barbers.credentialsAction')}</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
