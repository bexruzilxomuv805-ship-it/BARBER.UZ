/**
 * Looks up an address's approximate coordinates using OpenStreetMap's free
 * Nominatim geocoding API (no key/account needed) — mirrors translateText.js's
 * pattern of calling a free public API directly from the browser. Returns
 * null on any error/empty-result so callers can fall back to a manual pin
 * placement instead of failing the whole form.
 */
export async function geocodeAddress(query) {
  const trimmed = (query || '').trim()
  if (!trimmed) return null

  try {
    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      'accept-language': 'uz',
      q: trimmed,
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
    if (!res.ok) return null
    const data = await res.json()
    const first = data?.[0]
    if (!first) return null
    const lat = Number(first.lat)
    const lng = Number(first.lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}
