import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaEdit, FaTrash, FaPlus, FaBoxes } from 'react-icons/fa'
import Loader from '../../components/Loader'
import Modal from '../../components/admin/Modal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import AutoText from '../../components/AutoText'
import { fetchInventory, createInventoryItem, updateInventoryItem, removeInventoryItem } from '../../features/inventory/inventorySlice'
import { showToast } from '../../features/ui/uiSlice'
import { formatSum } from '../../utils/format'

const emptyForm = { nomi: '', miqdor: 0, birlik: 'dona', minMiqdor: 5, narxi: 10000 }

function computeHolat(miqdor, minMiqdor) {
  return miqdor <= minMiqdor ? 'kam' : 'yetarli'
}

export default function AdminInventory() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items, status } = useSelector((s) => s.inventory)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchInventory())
  }, [dispatch])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm(item)
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const miqdor = Number(form.miqdor)
    const minMiqdor = Number(form.minMiqdor)
    const payload = { ...form, miqdor, minMiqdor, narxi: Number(form.narxi), holat: computeHolat(miqdor, minMiqdor) }
    if (editing) {
      await dispatch(updateInventoryItem({ id: editing.id, changes: payload }))
      dispatch(showToast({ type: 'success', text: t('admin.inventory.updatedToast') }))
    } else {
      await dispatch(createInventoryItem(payload))
      dispatch(showToast({ type: 'success', text: t('admin.inventory.addedToast') }))
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    dispatch(removeInventoryItem(id))
    dispatch(showToast({ type: 'success', text: t('admin.inventory.deletedToast') }))
  }

  const lowStock = items.filter((i) => i.holat === 'kam').length

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.inventory.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {t('admin.inventory.subtitle', { count: items.length })}
            {lowStock > 0 && <span className="text-amber-400"> • {t('admin.inventory.lowStockSuffix', { count: lowStock })}</span>}
          </p>
        </div>
        <button onClick={openCreate} className="btn-gold !py-2 text-sm">
          <FaPlus /> {t('admin.inventory.addItem')}
        </button>
      </div>

      {status === 'loading' ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-ink-500">
                <th className="px-4 py-3 font-medium">{t('admin.inventory.tableProduct')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.inventory.tableQuantity')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.inventory.tablePrice')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.inventory.tableStatus')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400"><FaBoxes /></span>
                      <AutoText as="p" className="font-medium text-white" text={i.nomi} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-300">{i.miqdor} <AutoText text={i.birlik} /></td>
                  <td className="px-4 py-3 text-gold-400 font-medium">{formatSum(i.narxi)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${
                      i.holat === 'kam' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {i.holat === 'kam' ? t('admin.inventory.lowStock') : t('admin.inventory.sufficient')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(i)} className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10"><FaEdit /></button>
                      <button onClick={() => setToDelete(i.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.inventory.editTitle') : t('admin.inventory.newTitle')}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.inventory.nameLabel')}</label>
            <input required value={form.nomi} onChange={(e) => setForm((f) => ({ ...f, nomi: e.target.value }))} placeholder={t('admin.inventory.namePlaceholder')} className="input-field !py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.inventory.quantityLabel')}</label>
              <input required type="number" min={0} value={form.miqdor} onChange={(e) => setForm((f) => ({ ...f, miqdor: e.target.value }))} placeholder="20" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.inventory.unitLabel')}</label>
              <input required value={form.birlik} onChange={(e) => setForm((f) => ({ ...f, birlik: e.target.value }))} placeholder={t('admin.inventory.unitPlaceholder')} className="input-field !py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.inventory.minQuantityLabel')}</label>
              <input required type="number" min={0} value={form.minMiqdor} onChange={(e) => setForm((f) => ({ ...f, minMiqdor: e.target.value }))} placeholder="5" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.inventory.priceLabel')}</label>
              <input required type="number" min={0} step={1000} value={form.narxi} onChange={(e) => setForm((f) => ({ ...f, narxi: e.target.value }))} placeholder="10000" className="input-field !py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="btn-gold w-full !py-2.5 text-sm">{t('common.save')}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => handleDelete(toDelete)} text={t('admin.inventory.deleteConfirmText')} />
    </div>
  )
}
