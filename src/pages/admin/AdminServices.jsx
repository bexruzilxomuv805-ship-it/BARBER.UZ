import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaEdit, FaTrash, FaPlus, FaClock } from 'react-icons/fa'
import Loader from '../../components/Loader'
import Modal from '../../components/admin/Modal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import ServiceIcon from '../../components/ServiceIcon'
import AutoText from '../../components/AutoText'
import { fetchServices, createService, updateService, removeService } from '../../features/services/servicesSlice'
import { showToast } from '../../features/ui/uiSlice'
import { formatSum } from '../../utils/format'

const emptyForm = { nomi: '', narxi: 30000, davomiyligi: 30, kategoriya: 'Soch', tavsif: '', rasm: 'cut' }
const ICON_OPTIONS = ['cut', 'beard', 'combo', 'kids', 'color', 'facial', 'design', 'vip']

export default function AdminServices() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: services, status } = useSelector((s) => s.services)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchServices())
  }, [dispatch])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm(s)
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, narxi: Number(form.narxi), davomiyligi: Number(form.davomiyligi) }
    if (editing) {
      await dispatch(updateService({ id: editing.id, changes: payload }))
      dispatch(showToast({ type: 'success', text: t('admin.services.updatedToast') }))
    } else {
      await dispatch(createService(payload))
      dispatch(showToast({ type: 'success', text: t('admin.services.addedToast') }))
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    dispatch(removeService(id))
    dispatch(showToast({ type: 'success', text: t('admin.services.deletedToast') }))
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.services.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.services.subtitle', { count: services.length })}</p>
        </div>
        <button onClick={openCreate} className="btn-gold !py-2 text-sm">
          <FaPlus /> {t('admin.services.addService')}
        </button>
      </div>

      {status === 'loading' ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-ink-500">
                <th className="px-4 py-3 font-medium">{t('admin.services.tableService')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.services.tableCategory')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.services.tableDuration')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.services.tablePrice')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400">
                        <ServiceIcon name={s.rasm} />
                      </span>
                      <div>
                        <AutoText as="p" className="font-medium text-white" text={s.nomi} />
                        <AutoText as="p" className="text-xs text-ink-500 max-w-xs truncate" text={s.tavsif} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-300"><AutoText text={s.kategoriya} /></td>
                  <td className="px-4 py-3 text-ink-300"><span className="flex items-center gap-1"><FaClock className="text-xs" /> {t('admin.services.minutes', { count: s.davomiyligi })}</span></td>
                  <td className="px-4 py-3 text-gold-400 font-medium">{formatSum(s.narxi)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10"><FaEdit /></button>
                      <button onClick={() => setToDelete(s.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.services.editTitle') : t('admin.services.newTitle')}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.services.nameLabel')}</label>
            <input required value={form.nomi} onChange={(e) => setForm((f) => ({ ...f, nomi: e.target.value }))} placeholder={t('admin.services.namePlaceholder')} className="input-field !py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.services.priceLabel')}</label>
              <input required type="number" min={0} step={1000} value={form.narxi} onChange={(e) => setForm((f) => ({ ...f, narxi: e.target.value }))} placeholder="30000" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.services.durationLabel')}</label>
              <input required type="number" min={5} step={5} value={form.davomiyligi} onChange={(e) => setForm((f) => ({ ...f, davomiyligi: e.target.value }))} placeholder="30" className="input-field !py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.services.categoryLabel')}</label>
            <input required value={form.kategoriya} onChange={(e) => setForm((f) => ({ ...f, kategoriya: e.target.value }))} placeholder={t('admin.services.categoryPlaceholder')} className="input-field !py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.services.iconLabel')}</label>
            <select value={form.rasm} onChange={(e) => setForm((f) => ({ ...f, rasm: e.target.value }))} className="input-field !py-2 text-sm">
              {ICON_OPTIONS.map((opt) => <option key={opt} value={opt}>{t(`admin.services.icons.${opt}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.services.descriptionLabel')}</label>
            <textarea rows={3} value={form.tavsif} onChange={(e) => setForm((f) => ({ ...f, tavsif: e.target.value }))} placeholder={t('admin.services.descriptionPlaceholder')} className="input-field resize-none text-sm" />
          </div>
          <button type="submit" className="btn-gold w-full !py-2.5 text-sm">{t('common.save')}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => handleDelete(toDelete)} text={t('admin.services.deleteConfirmText')} />
    </div>
  )
}
