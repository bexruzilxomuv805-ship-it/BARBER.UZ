import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaTelegramPlane, FaCheckCircle } from 'react-icons/fa'
import client from '../api/client'
import { refreshUser } from '../features/auth/authSlice'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME
const POLL_MS = 2000
const MAX_ATTEMPTS = 180 // ~6 daqiqa

// Mandatory post-registration step for accounts created via the site's own
// Register form (as opposed to TelegramLoginButton, which already creates
// a Telegram-linked account by construction) — every account should end up
// reachable through the bot (admin chat, reminders, confirmations), so this
// blocks continuing until Telegram is linked instead of leaving it optional.
//
// Reuses the same telegramLogins token/polling mechanism as
// TelegramLoginButton, but the token carries linkUserId (this specific
// already-created account) instead of letting the bot create/find a
// different user by Telegram id — see handleTelegramLinkExisting in
// server/bot/index.js.
export default function TelegramLinkGate({ userId, onLinked }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [status, setStatus] = useState('creating') // creating | waiting | error
  const [deepLink, setDeepLink] = useState('')
  const intervalRef = useRef(null)
  const tokenRef = useRef(null)

  const startLinking = async () => {
    setStatus('creating')
    clearInterval(intervalRef.current)
    const token = `tglink-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    tokenRef.current = token

    try {
      await client.post('/telegramLogins', {
        id: token,
        status: 'pending',
        linkUserId: userId,
        createdAt: new Date().toISOString(),
      })
    } catch {
      setStatus('error')
      return
    }

    setDeepLink(`https://t.me/${BOT_USERNAME}?start=${token}`)
    setStatus('waiting')

    let attempts = 0
    intervalRef.current = setInterval(async () => {
      attempts += 1
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(intervalRef.current)
        setStatus('error')
        return
      }
      try {
        const { data } = await client.get(`/telegramLogins/${token}`)
        if (data.status === 'confirmed') {
          clearInterval(intervalRef.current)
          await dispatch(refreshUser(userId))
          onLinked?.()
        }
      } catch {
        // token yozuvi hali yaratilmagan bo'lishi mumkin — polling davom etadi
      }
    }, POLL_MS)
  }

  useEffect(() => {
    // No bot configured at all (e.g. local dev without TELEGRAM_BOT_TOKEN) —
    // nothing to link to, so don't lock registration behind it.
    if (!BOT_USERNAME) {
      onLinked?.()
      return
    }
    startLinking()
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!BOT_USERNAME) return null

  return (
    <div className="space-y-4 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-2xl text-sky-400">
        <FaTelegramPlane />
      </span>
      <div>
        <h2 className="font-display text-xl font-bold text-white">{t('telegramLink.title')}</h2>
        <p className="mt-1 text-sm text-ink-400">{t('telegramLink.subtitle')}</p>
      </div>

      {status === 'error' ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {t('telegramLink.error')}
          </p>
          <button type="button" onClick={startLinking} className="btn-gold w-full">
            {t('telegramLink.retry')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <a
            href={deepLink || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={status === 'creating'}
            className={`btn-gold flex w-full items-center justify-center gap-2 ${
              status === 'creating' ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <FaTelegramPlane /> {t('telegramLink.openBot')}
          </a>
          <p className="flex items-center justify-center gap-2 text-xs text-ink-500">
            {status === 'waiting' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold-400" />
            )}
            {status === 'creating' ? t('telegramLink.preparing') : t('telegramLink.waiting')}
          </p>
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-600">
        <FaCheckCircle className="text-green-500/70" /> {t('telegramLink.mandatoryNote')}
      </p>
    </div>
  )
}
