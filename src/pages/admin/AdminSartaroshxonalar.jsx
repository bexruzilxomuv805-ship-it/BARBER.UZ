import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaEdit, FaTrash, FaPlus, FaPhoneAlt, FaCamera, FaTimes, FaClock } from 'react-icons/fa'
import Loader from '../../components/Loader'
import Modal from '../../components/admin/Modal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import LocationPicker from '../../components/admin/LocationPicker'
import AutoText from '../../components/AutoText'
import { fetchShops, createShop, updateShop, removeShop } from '../../features/sartaroshxonalar/sartaroshxonalarSlice'
import { showToast } from '../../features/ui/uiSlice'
import { resizeImageFile } from '../../utils/image'

const MAX_PHOTOS = 10
const TIERS = ['oddiy', 'premium', 'vip']

const emptyForm = {
  nomi: '', manzilMatni: '', lat: null, lng: null, ishVaqti: '09:00 - 21:00',
  tur: 'oddiy', tavsif: '', telefon: '', rasmlar: [],
}

const TIER_BADGE = {
  oddiy: 'bg-ink-800 text-ink-300',
  premium: 'bg-gold-500/15 text-gold-400',
  vip: 'bg-violet-500/15 text-violet-300',
}

export default function AdminSartaroshxonalar() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: shops, status } = useSelector((s) => s.sartaroshxonalar)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchShops())
  }, [dispatch])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({ ...emptyForm, ...s })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      lat: form.lat != null ? Number(form.lat) : null,
      lng: form.lng != null ? Number(form.lng) : null,
    }
    if (editing) {
      await dispatch(updateShop({ id: editing.id, changes: payload }))
      dispatch(showToast({ type: 'success', text: t('admin.shops.updatedToast') }))
    } else {
      await dispatch(createShop({ ...payload, createdAt: new Date().toISOString() }))
      dispatch(showToast({ type: 'success', text: t('admin.shops.addedToast') }))
    }
    setModalOpen(false)
  }

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const room = MAX_PHOTOS - form.rasmlar.length
    const toAdd = files.slice(0, room)
    const resized = await Promise.all(toAdd.map((f) => resizeImageFile(f)))
    setForm((f) => ({ ...f, rasmlar: [...f.rasmlar, ...resized] }))
  }

  const removePhoto = (idx) => {
    setForm((f) => ({ ...f, rasmlar: f.rasmlar.filter((_, i) => i !== idx) }))
  }

  const handleDelete = (id) => {
    dispatch(removeShop(id))
    dispatch(showToast({ type: 'success', text: t('admin.shops.deletedToast') }))
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.shops.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.shops.subtitle', { count: shops.length })}</p>
        </div>
        <button onClick={openCreate} className="btn-gold !py-2 text-sm">
          <FaPlus /> {t('admin.shops.addShop')}
        </button>
      </div>

      {status === 'loading' ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {shops.map((s) => (
            <div key={s.id} className="card overflow-hidden flex flex-col">
              <div className="aspect-[4/3] overflow-hidden bg-ink-800">
                {s.rasmlar?.[0] && <img src={s.rasmlar[0]} alt={s.nomi} className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{s.nomi}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_BADGE[s.tur] || TIER_BADGE.oddiy}`}>
                    {t(`admin.shops.tier.${s.tur || 'oddiy'}`)}
                  </span>
                </div>
                <AutoText as="p" className="mt-1 truncate text-xs text-ink-500" text={s.manzilMatni} />
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-500"><FaClock className="shrink-0" /> {s.ishVaqti}</p>
                {s.telefon && (
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-500"><FaPhoneAlt className="shrink-0" /> {s.telefon}</p>
                )}
                <div className="mt-auto flex items-center justify-end gap-1 border-t border-ink-800 pt-2.5">
                  <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-sky-400 hover:bg-sky-500/10"><FaEdit className="text-sm" /></button>
                  <button onClick={() => setToDelete(s.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"><FaTrash className="text-sm" /></button>
                </div>
              </div>
            </div>
          ))}
          {shops.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-ink-500">{t('admin.shops.notFound')}</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.shops.editTitle') : t('admin.shops.newTitle')} wide>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.shops.nameLabel')}</label>
            <input required value={form.nomi} onChange={(e) => setForm((f) => ({ ...f, nomi: e.target.value }))} placeholder={t('admin.shops.nameLabel')} className="input-field !py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.shops.phoneLabel')}</label>
              <input required value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} placeholder="+998 90 123 45 67" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.shops.tierLabel')}</label>
              <select value={form.tur} onChange={(e) => setForm((f) => ({ ...f, tur: e.target.value }))} className="input-field !py-2 text-sm">
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>{t(`admin.shops.tier.${tier}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.shops.workHoursLabel')}</label>
            <input required value={form.ishVaqti} onChange={(e) => setForm((f) => ({ ...f, ishVaqti: e.target.value }))} placeholder="09:00 - 21:00" className="input-field !py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.shops.addressLabel')}</label>
            <input required value={form.manzilMatni} onChange={(e) => setForm((f) => ({ ...f, manzilMatni: e.target.value }))} placeholder={t('admin.shops.addressPlaceholder')} className="input-field !py-2 text-sm" />
          </div>
          <LocationPicker
            address={form.manzilMatni}
            lat={form.lat}
            lng={form.lng}
            onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))}
          />
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.shops.descriptionLabel')}</label>
            <textarea rows={3} value={form.tavsif} onChange={(e) => setForm((f) => ({ ...f, tavsif: e.target.value }))} placeholder={t('admin.shops.descriptionPlaceholder')} className="input-field resize-none text-sm" />
          </div>
          <div>
            <p className="mb-1.5 flex items-center justify-between text-xs text-ink-500">
              <span>{t('admin.shops.photosLabel')}</span>
              <span>{form.rasmlar.length}/{MAX_PHOTOS}</span>
            </p>
            {form.rasmlar.length > 0 && (
              <div className="mb-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {form.rasmlar.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-800">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.rasmlar.length < MAX_PHOTOS && (
              <label className="btn-outline w-fit !py-2 text-sm cursor-pointer">
                <FaCamera /> {t('admin.shops.addPhoto')}
                <input type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" />
              </label>
            )}
          </div>
          <button type="submit" className="btn-gold w-full !py-2.5 text-sm">{t('common.save')}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => handleDelete(toDelete)} text={t('admin.shops.deleteConfirmText')} />
    </div>
  )
}
