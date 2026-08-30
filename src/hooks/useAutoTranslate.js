import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { translateText } from '../utils/translateText'

/**
 * Auto-translates admin/user-entered free text into the current site
 * language, regardless of which language it was originally written in.
 * Shows the original text immediately, then swaps in the translation
 * once it resolves (or keeps the original if translation fails).
 */
export default function useAutoTranslate(text) {
  const { i18n } = useTranslation()
  const key = `${text}|${i18n.language}`
  const [resolvedKey, setResolvedKey] = useState(key)
  const [translated, setTranslated] = useState(text)

  if (key !== resolvedKey) {
    setResolvedKey(key)
    setTranslated(text)
  }

  useEffect(() => {
    let cancelled = false
    if (!text) return undefined

    translateText(text, i18n.language).then((result) => {
      if (!cancelled) setTranslated(result)
    })

    return () => {
      cancelled = true
    }
  }, [text, i18n.language])

  return translated
}

/**
 * Same translation as useAutoTranslate, but for a batch of distinct strings
 * that can't be wrapped individually in <AutoText> — e.g. Recharts labels,
 * which render raw SVG text from data props rather than React children.
 * Returns a { originalText: translatedText } map, filled in as each
 * translation resolves; callers should fall back to the original text for
 * any key not yet present.
 */
export function useAutoTranslateMap(texts = []) {
  const { i18n } = useTranslation()
  const unique = [...new Set(texts.filter(Boolean))]
  const depsKey = unique.slice().sort().join('|')
  const [map, setMap] = useState({})

  useEffect(() => {
    let cancelled = false
    unique.forEach((text) => {
      translateText(text, i18n.language).then((result) => {
        if (cancelled || result === text) return
        setMap((m) => (m[text] === result ? m : { ...m, [text]: result }))
      })
    })
    return () => {
      cancelled = true
    }
    // unique is derived from depsKey; re-running only when the actual set of texts (or language) changes is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, i18n.language])

  return map
}
