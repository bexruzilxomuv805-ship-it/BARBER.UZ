import { useCallback, useEffect, useState } from 'react'

const IOS_REGEX = /iphone|ipad|ipod/i
const MOBILE_REGEX = /android|iphone|ipod|ipad|windows phone|mobile|tablet/i

function isStandalone() {
  if (typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone)
}

// Desktop Chrome/Edge fire `beforeinstallprompt` too, but this prompt should
// only ever show on phones/tablets — never on a notebook/PC. iPadOS 13+
// reports its UA as "Macintosh", so a touch-capable "Mac" is treated as a
// tablet here rather than a desktop.
function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (MOBILE_REGEX.test(ua)) return true
  return /macintosh/i.test(ua) && navigator.maxTouchPoints > 1
}

// Wraps the browser's native PWA install flow. Android/desktop Chrome and
// Edge fire `beforeinstallprompt` when the manifest/service-worker install
// criteria are met (see vite.config.js) — capturing and replaying that
// event is the only way to trigger the native "Install" dialog from a
// custom button instead of waiting for the browser's own address-bar icon.
// iOS Safari never fires this event at all (no such API exists there); the
// only way to install is the manual Share -> "Add to Home Screen" flow, so
// `isIOS` lets InstallPwaPrompt show instructions instead of a button that
// would otherwise silently do nothing.
export default function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === 'accepted'
  }, [deferredPrompt])

  const isIOS = typeof navigator !== 'undefined' && IOS_REGEX.test(navigator.userAgent)

  return {
    installed,
    isIOS,
    isMobileOrTablet: isMobileOrTablet(),
    canInstall: Boolean(deferredPrompt),
    promptInstall,
  }
}
