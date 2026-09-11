import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaDownload, FaTimes, FaShareSquare, FaPlusSquare } from 'react-icons/fa'
import usePwaInstall from '../hooks/usePwaInstall'

const DISMISS_KEY = 'zolotoy_pwa_install_dismissed_at'

function isDismissedToday() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return !!raw && new Date(raw).toDateString() === new Date().toDateString()
  } catch {
    return false
  }
}

function dismissForToday() {
  try {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString())
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

// variant="banner" (Home page): dismissible for the rest of the day via the
// X — reappears automatically the next day for anyone who still hasn't
// installed, instead of being gone for good after one dismissal.
// variant="card" (Profile page): no dismiss at all — this is the prompt's
// permanent home once someone has closed the banner for today, so there's
// always an easy way back to installing without waiting for tomorrow.
// Either way, it disappears for good the moment the app is actually
// installed (usePwaInstall's `installed` flips via the `appinstalled` event
// or an already-standalone display-mode check).
export default function InstallPwaPrompt({ variant = 'banner' }) {
  const { t } = useTranslation()
  const { installed, isIOS, canInstall, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(() => variant === 'banner' && isDismissedToday())
  const [showIosSteps, setShowIosSteps] = useState(false)

  if (installed || dismissed || (!canInstall && !isIOS)) return null

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall()
      return
    }
    setShowIosSteps((v) => !v)
  }

  const handleDismiss = () => {
    dismissForToday()
    setDismissed(true)
  }

  return (
    <div className="relative">
      <div className="card flex flex-col gap-3 border-gold-500/30 bg-gold-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 pr-6 sm:pr-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
            <FaDownload />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{t('pwaInstall.title')}</p>
            <p className="mt-0.5 text-xs text-ink-400">{t('pwaInstall.subtitle')}</p>
          </div>
        </div>
        <button onClick={handleInstallClick} className="btn-gold shrink-0 whitespace-nowrap !py-2 text-sm">
          {t('pwaInstall.installButton')}
        </button>
        {variant === 'banner' && (
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 text-ink-500 hover:text-white"
            aria-label={t('common.close')}
          >
            <FaTimes />
          </button>
        )}
      </div>

      {showIosSteps && (
        <div className="card mt-2 space-y-2 p-4 text-sm text-ink-300">
          <p className="flex items-center gap-2">
            <FaShareSquare className="shrink-0 text-gold-400" /> {t('pwaInstall.iosStep1')}
          </p>
          <p className="flex items-center gap-2">
            <FaPlusSquare className="shrink-0 text-gold-400" /> {t('pwaInstall.iosStep2')}
          </p>
        </div>
      )}
    </div>
  )
}
