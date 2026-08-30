const CACHE_PREFIX = 'zolotoy_tr_'
const EN_STOPWORDS = /\b(the|and|is|of|a|an|to|with|for|our|we|you|your|this|that|are|from)\b/gi

function detectSourceLang(text) {
  if (/[а-яёА-ЯЁ]/.test(text)) return 'ru'
  const enMatches = text.match(EN_STOPWORDS)
  if (enMatches && enMatches.length >= 2) return 'en'
  return 'uz'
}

function hashKey(text, targetLang) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0
  }
  return `${CACHE_PREFIX}${targetLang}_${hash}`
}

function readCache(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore storage quota / private-mode errors */
  }
}

/**
 * Translates free-text content (admin-entered barber bios, service
 * descriptions, etc.) into targetLang using the free MyMemory API.
 * Source language is guessed client-side so it works regardless of
 * which language the text was originally written in. Falls back to
 * the original text on any error, rate limit, or offline state.
 */
export async function translateText(text, targetLang) {
  const trimmed = (text || '').trim()
  if (!trimmed) return text

  const source = detectSourceLang(trimmed)
  if (source === targetLang) return text

  const key = hashKey(trimmed, targetLang)
  const cached = readCache(key)
  if (cached) return cached

  try {
    const params = new URLSearchParams({ q: trimmed, langpair: `${source}|${targetLang}` })
    const res = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`)
    if (!res.ok) return text
    const data = await res.json()
    const result = data?.responseData?.translatedText
    if (!result || data.responseStatus !== 200) return text
    writeCache(key, result)
    return result
  } catch {
    return text
  }
}
