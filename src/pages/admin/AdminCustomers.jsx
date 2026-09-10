import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaSearch, FaEdit, FaTrash, FaUserPlus, FaUserCircle, FaUserShield, FaTelegramPlane, FaComments } from 'react-icons/fa'
import Loader from '../../components/Loader'
import Modal from '../../components/admin/Modal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import {
  fetchCustomers, createCustomer, updateCustomer, removeCustomer,
} from '../../features/customers/customersSlice'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { showToast } from '../../features/ui/uiSlice'
import { formatSum } from '../../utils/format'
import useAuth from '../../hooks/useAuth'
import usePolling from '../../hooks/usePolling'

const emptyForm = { ism: '', familiya: '', email: '', telefon: '', parol: '1234' }
const POLL_MS = 8000

export default function AdminCustomers() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { user: currentUser } = useAuth()
  const { items: users, status } = useSelector((s) => s.customers)
  const { items: appointments } = useSelector((s) => s.appointments)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)
  // Telegram-registered accounts never collect a familiya/email (the bot
  // only asks for a phone number) — only require those two for accounts
  // created through the site's own Register form / this admin form itself.
  const isTelegramUser = !!editing?.telegramId

  useEffect(() => {
    dispatch(fetchCustomers())
    dispatch(fetchAppointments())
  }, [dispatch])

  // New signups (site or bot) and role changes should show up without a
  // manual reload.
  usePolling(() => {
    dispatch(fetchCustomers())
    dispatch(fetchAppointments())
  }, POLL_MS)

  // Everyone who signed up (client or promoted admin) — promoting someone to
  // admin should not make them vanish from this list, so we don't filter by
  // role here.
  const withStats = useMemo(() => {
    return users
      .filter((c) =>
        search ? `${c.ism} ${c.familiya} ${c.email}`.toLowerCase().includes(search.toLowerCase()) : true
      )
      .map((c) => {
        const myAppointments = appointments.filter((a) => a.mijozId === c.id)
        const spent = myAppointments
          .filter((a) => a.holat === 'yakunlangan')
          .reduce((sum, a) => sum + (a.narxi || 0), 0)
        return { ...c, visits: myAppointments.length, spent }
      })
  }, [users, appointments, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ ism: c.ism, familiya: c.familiya, email: c.email, telefon: c.telefon, parol: '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      const { parol, ...rest } = form
      await dispatch(updateCustomer({ id: editing.id, changes: rest }))
      dispatch(showToast({ type: 'success', text: t('admin.customers.updatedToast') }))
    } else {
      await dispatch(createCustomer({ ...form, role: 'client', avatar: '', createdAt: new Date().toISOString() }))
      dispatch(showToast({ type: 'success', text: t('admin.customers.addedToast') }))
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    dispatch(removeCustomer(id))
    dispatch(showToast({ type: 'success', text: t('admin.customers.deletedToast') }))
  }

  const handlePromote = (c) => {
    dispatch(updateCustomer({ id: c.id, changes: { role: 'admin' } }))
    dispatch(showToast({ type: 'success', text: t('admin.customers.promotedToast', { name: c.ism }) }))
  }

  const handleDemote = (c) => {
    dispatch(updateCustomer({ id: c.id, changes: { role: 'client' } }))
    dispatch(showToast({ type: 'success', text: t('admin.customers.demotedToast', { name: c.ism }) }))
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('admin.customers.title')}</h1>
          <p className="text-sm text-ink-500 mt-1">{t('admin.customers.subtitle', { count: users.length })}</p>
        </div>
        <button onClick={openCreate} className="btn-gold !py-2 text-sm">
          <FaUserPlus /> {t('admin.customers.addCustomer')}
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 text-sm" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.customers.searchPlaceholder')}
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
                <th className="px-4 py-3 font-medium">{t('admin.customers.tableCustomer')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.customers.tablePhone')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.customers.tableRole')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.customers.tableVisits')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.customers.tableSpent')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {withStats.map((c) => {
                const isSelf = c.id === currentUser?.id
                const isAdminRole = c.role === 'admin'
                return (
                  <tr key={c.id} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FaUserCircle className="text-2xl text-ink-600" />
                        <div>
                          <p className="font-medium text-white">{c.ism} {c.familiya}</p>
                          {c.email && <p className="text-xs text-ink-500">{c.email}</p>}
                          {c.telegramUsername && (
                            <a
                              href={`https://t.me/${c.telegramUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 flex items-center gap-1 text-xs text-sky-400 hover:underline"
                            >
                              <FaTelegramPlane /> @{c.telegramUsername}
                            </a>
                          )}
                          {c.telegramId && (
                            // Always show this, even alongside a public @username —
                            // tg://user?id= (or a t.me/username tap that opens the app)
                            // depends on Telegram's own privacy/contact resolution and
                            // can silently land on the wrong chat — this instead opens
                            // our own Support chat with exactly this person, which we
                            // fully control and which the bot already mirrors to their
                            // Telegram either way.
                            <Link
                              to={`/admin/chat?userId=${c.id}&userName=${encodeURIComponent(`${c.ism} ${c.familiya}`.trim())}`}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 flex items-center gap-1 text-xs text-sky-400 hover:underline"
                            >
                              <FaComments /> {t('admin.customers.openChat')}
                            </Link>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-300">{c.telefon}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          isAdminRole ? 'bg-gold-500/10 text-gold-400' : 'bg-ink-800 text-ink-400'
                        }`}
                      >
                        {isAdminRole ? t('admin.customers.roleAdmin') : t('admin.customers.roleClient')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-300">{c.visits}</td>
                    <td className="px-4 py-3 text-gold-400 font-medium">{formatSum(c.spent)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSelf ? (
                          <span className="px-2 text-xs text-ink-500">{t('admin.customers.you')}</span>
                        ) : (
                          <>
                            <button
                              onClick={() => (isAdminRole ? handleDemote(c) : handlePromote(c))}
                              title={isAdminRole ? t('admin.customers.removeAdmin') : t('admin.customers.makeAdmin')}
                              className="rounded-lg p-2 text-gold-400 hover:bg-gold-500/10"
                            >
                              <FaUserShield />
                            </button>
                            <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10">
                              <FaEdit />
                            </button>
                            <button onClick={() => setToDelete(c.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10">
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {withStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-500">{t('admin.customers.notFound')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.customers.editTitle') : t('admin.customers.newTitle')}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.firstNameLabel')}</label>
              <input required value={form.ism} onChange={(e) => setForm((f) => ({ ...f, ism: e.target.value }))} placeholder={t('admin.customers.firstNameLabel')} className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.lastNameLabel')}</label>
              <input required={!isTelegramUser} value={form.familiya} onChange={(e) => setForm((f) => ({ ...f, familiya: e.target.value }))} placeholder={t('admin.customers.lastNameLabel')} className="input-field !py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.emailLabel')}</label>
            <input required={!isTelegramUser} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="input-field !py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.phoneLabel')}</label>
            <input required value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} placeholder="+998 90 123 45 67" className="input-field !py-2 text-sm" />
          </div>
          {!editing && (
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.customers.passwordLabel')}</label>
              <input required value={form.parol} onChange={(e) => setForm((f) => ({ ...f, parol: e.target.value }))} placeholder={t('admin.customers.passwordLabel')} className="input-field !py-2 text-sm" />
            </div>
          )}
          <button type="submit" className="btn-gold w-full !py-2.5 text-sm">{t('common.save')}</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => handleDelete(toDelete)}
        text={t('admin.customers.deleteConfirmText')}
      />
    </div>
  )
}
