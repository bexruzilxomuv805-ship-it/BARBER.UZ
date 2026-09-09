import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FaUser, FaEnvelope, FaPhoneAlt, FaLock, FaUserPlus } from 'react-icons/fa'
import { GiRazor } from 'react-icons/gi'
import { registerUser, clearAuthError } from '../../features/auth/authSlice'
import { showToast } from '../../features/ui/uiSlice'
import TelegramLoginButton from '../../components/TelegramLoginButton'

export default function Register() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { status, error } = useSelector((s) => s.auth)
  const [form, setForm] = useState({ ism: '', familiya: '', email: '', telefon: '', parol: '', parol2: '' })
  const [localError, setLocalError] = useState('')

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    dispatch(clearAuthError())

    if (form.parol.length < 4) {
      setLocalError(t('register.errorPasswordShort'))
      return
    }
    if (form.parol !== form.parol2) {
      setLocalError(t('register.errorPasswordMismatch'))
      return
    }

    const result = await dispatch(registerUser(form))
    if (registerUser.fulfilled.match(result)) {
      dispatch(showToast({ type: 'success', text: t('register.welcomeToast', { name: result.payload.ism }) }))
      navigate('/')
    }
  }

  const handleTelegramSuccess = (user) => {
    dispatch(showToast({ type: 'success', text: t('register.welcomeToast', { name: user.ism }) }))
    navigate(user.role === 'admin' ? '/admin' : '/')
  }

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden py-16">
      <div className="pointer-events-none absolute inset-0 bg-barber-radial" />
      <div className="pointer-events-none absolute bottom-10 -right-20 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl animate-floatSlow" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md px-4"
      >
        <div className="card p-8 shadow-gold">
          <div className="flex flex-col items-center text-center mb-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/50 bg-gold-500/10 text-2xl text-gold-400">
              <GiRazor />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-white">{t('register.title')}</h1>
            <p className="mt-1 text-sm text-ink-400">{t('register.subtitle')}</p>
          </div>

          {(error || localError) && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                <input required value={form.ism} onChange={handleChange('ism')} placeholder={t('register.firstNamePlaceholder')} className="input-field pl-11" />
              </div>
              <div className="relative">
                <input required value={form.familiya} onChange={handleChange('familiya')} placeholder={t('register.lastNamePlaceholder')} className="input-field" />
              </div>
            </div>
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input type="email" required value={form.email} onChange={handleChange('email')} placeholder={t('register.emailPlaceholder')} className="input-field pl-11" />
            </div>
            <div className="relative">
              <FaPhoneAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input required value={form.telefon} onChange={handleChange('telefon')} placeholder={t('register.phonePlaceholder')} className="input-field pl-11" />
            </div>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input type="password" required value={form.parol} onChange={handleChange('parol')} placeholder={t('register.passwordPlaceholder')} className="input-field pl-11" />
            </div>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input type="password" required value={form.parol2} onChange={handleChange('parol2')} placeholder={t('register.password2Placeholder')} className="input-field pl-11" />
            </div>

            <button type="submit" disabled={status === 'loading'} className="btn-gold w-full disabled:opacity-60">
              <FaUserPlus /> {status === 'loading' ? t('register.submitting') : t('register.submit')}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-500">
            <span className="h-px flex-1 bg-ink-700" />
            {t('telegramLogin.divider')}
            <span className="h-px flex-1 bg-ink-700" />
          </div>

          <TelegramLoginButton onSuccess={handleTelegramSuccess} />

          <p className="mt-6 text-center text-sm text-ink-400">
            {t('register.haveAccount')}{' '}
            <Link to="/kirish" className="font-semibold text-gold-400 hover:underline">
              {t('register.loginLink')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
