import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaSave } from 'react-icons/fa'
import Loader from '../../components/Loader'
import { fetchContactInfo, updateContactInfo } from '../../features/contact/contactSlice'
import { showToast } from '../../features/ui/uiSlice'

export default function AdminSettings() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { status } = useSelector((s) => s.contact)
  const [form, setForm] = useState(null)

  useEffect(() => {
    dispatch(fetchContactInfo()).unwrap().then(setForm).catch(() => {})
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await dispatch(updateContactInfo(form))
    dispatch(showToast({ type: 'success', text: t('admin.settings.updatedToast') }))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">{t('admin.settings.title')}</h1>
        <p className="text-sm text-ink-500 mt-1">{t('admin.settings.subtitle')}</p>
      </div>

      {status === 'loading' && !form ? (
        <Loader />
      ) : (
        form && (
          <form onSubmit={handleSubmit} className="card max-w-xl space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.settings.addressLabel')}</label>
              <input
                required
                value={form.manzil}
                onChange={(e) => setForm((f) => ({ ...f, manzil: e.target.value }))}
                className="input-field !py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-ink-500">{t('admin.settings.phoneLabel')}</label>
                <input
                  required
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                  className="input-field !py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-ink-500">{t('admin.settings.emailLabel')}</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field !py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-500">{t('admin.settings.workHoursLabel')}</label>
              <input
                required
                value={form.ishVaqti}
                onChange={(e) => setForm((f) => ({ ...f, ishVaqti: e.target.value }))}
                className="input-field !py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-ink-500">{t('admin.settings.instagramLabel')}</label>
                <input
                  value={form.instagram}
                  onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                  placeholder="https://instagram.com/..."
                  className="input-field !py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-ink-500">{t('admin.settings.telegramLabel')}</label>
                <input
                  value={form.telegram}
                  onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
                  placeholder="https://t.me/..."
                  className="input-field !py-2 text-sm"
                />
              </div>
            </div>
            <button type="submit" className="btn-gold !py-2.5 text-sm">
              <FaSave /> {t('common.save')}
            </button>
          </form>
        )
      )}
    </div>
  )
}
