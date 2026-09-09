import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt } from 'react-icons/fa'
import { GiRazor } from 'react-icons/gi'
import { loginUser, clearAuthError } from '../../features/auth/authSlice'
import { showToast } from '../../features/ui/uiSlice'
import TelegramLoginButton from '../../components/TelegramLoginButton'

export default function Login() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error } = useSelector((s) => s.auth)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', parol: '' })

  const from = location.state?.from?.pathname

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearAuthError())
    const result = await dispatch(loginUser(form))
    if (loginUser.fulfilled.match(result)) {
      dispatch(showToast({ type: 'success', text: t('login.welcomeToast', { name: result.payload.ism }) }))
      navigate(result.payload.role === 'admin' ? '/admin' : from || '/')
    }
  }

  const handleTelegramSuccess = (user) => {
    dispatch(showToast({ type: 'success', text: t('login.welcomeToast', { name: user.ism }) }))
    navigate(user.role === 'admin' ? '/admin' : from || '/')
  }

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden py-16">
      <div className="pointer-events-none absolute inset-0 bg-barber-radial" />
      <div className="pointer-events-none absolute top-10 -left-20 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl animate-float" />

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
            <h1 className="mt-4 font-display text-2xl font-bold text-white">{t('login.title')}</h1>
            <p className="mt-1 text-sm text-ink-400">{t('login.subtitle')}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t('login.emailPlaceholder')}
                className="input-field pl-11"
              />
            </div>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={form.parol}
                onChange={(e) => setForm((f) => ({ ...f, parol: e.target.value }))}
                placeholder={t('login.passwordPlaceholder')}
                className="input-field pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-gold-400"
              >
                {showPass ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button type="submit" disabled={status === 'loading'} className="btn-gold w-full disabled:opacity-60">
              <FaSignInAlt /> {status === 'loading' ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-500">
            <span className="h-px flex-1 bg-ink-700" />
            {t('telegramLogin.divider')}
            <span className="h-px flex-1 bg-ink-700" />
          </div>

          <TelegramLoginButton onSuccess={handleTelegramSuccess} />

          <p className="mt-6 text-center text-sm text-ink-400">
            {t('login.noAccount')}{' '}
            <Link to="/royxatdan-otish" className="font-semibold text-gold-400 hover:underline">
              {t('login.registerLink')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
