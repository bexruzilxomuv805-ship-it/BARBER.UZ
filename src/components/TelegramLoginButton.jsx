import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaTelegramPlane } from 'react-icons/fa'
import client from '../api/client'
import { completeTelegramLogin } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME
const POLL_MS = 2000
const MAX_ATTEMPTS = 180 // ~6 daqiqa — telefon raqamini tasdiqlashga vaqt beradi

export default function TelegramLoginButton({ onSuccess }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [status, setStatus] = useState('idle') // idle | waiting | error
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  if (!BOT_USERNAME) return null

  const stopPolling = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const handleClick = async () => {
    setStatus('waiting')
    const token = `tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Opened synchronously, still inside the click gesture, before any
    // `await` — mobile Safari/Chrome block window.open() called from an
    // async continuation (after the network request below resolves) as a
    // popup, since by then the browser no longer considers it a direct
    // response to the tap. The URL is filled in once the token is confirmed
    // created, whichever order those two finish in.
    const tgWindow = window.open('about:blank', '_blank', 'noopener')

    try {
      await client.post('/telegramLogins', { id: token, status: 'pending', createdAt: new Date().toISOString() })
    } catch {
      tgWindow?.close()
      setStatus('error')
      return
    }

    if (tgWindow) tgWindow.location.href = `https://t.me/${BOT_USERNAME}?start=${token}`
    else window.open(`https://t.me/${BOT_USERNAME}?start=${token}`, '_blank', 'noopener')

    let attempts = 0
    intervalRef.current = setInterval(async () => {
      attempts += 1
      if (attempts > MAX_ATTEMPTS) {
        stopPolling()
        setStatus('error')
        return
      }

      try {
        const { data } = await client.get(`/telegramLogins/${token}`)
        if (data.status === 'confirmed' && data.userId) {
          stopPolling()
          const result = await dispatch(completeTelegramLogin(data.userId))
          if (completeTelegramLogin.fulfilled.match(result)) {
            setStatus('idle')
            onSuccess?.(result.payload)
          } else {
            setStatus('error')
            dispatch(showToast({ type: 'error', text: t('telegramLogin.error') }))
          }
        }
      } catch {
        // token yozuvi hali yaratilmagan bo'lishi mumkin — polling davom etadi
      }
    }, POLL_MS)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'waiting'}
      className="btn-outline w-full disabled:opacity-60"
    >
      <FaTelegramPlane />
      {status === 'waiting' ? t('telegramLogin.waiting') : t('telegramLogin.button')}
    </button>
  )
}
