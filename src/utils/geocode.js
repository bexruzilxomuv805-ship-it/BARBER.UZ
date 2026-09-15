/**
 * Free OpenStreetMap Nominatim geocoding (no key/account needed) — mirrors
 * translateText.js's pattern of calling a free public API directly from the
 * browser. Every lookup is biased to Uzbekistan (countrycodes=uz + an
 * appended "O'zbekiston" hint) since typed addresses here are usually just a
 * district/neighbourhood with no city/country context, which Nominatim
 * otherwise fails to resolve or resolves to the wrong country entirely.
 */

const UZ_HINT = /o'zbekiston|ozbekiston|uzbekistan|узбекистан/i

function withCountryHint(query) {
  return UZ_HINT.test(query) ? query : `${query}, O'zbekiston`
}

// Nominatim's usage policy asks every caller to self-identify, either via a
// custom User-Agent header or an `email` param — a browser's fetch() can't
// set the former (User-Agent is on the forbidden-header list), so this is
// the only one actually available from client-side JS.
const NOMINATIM_CONTACT_EMAIL = 'bexruz@gmail.com'

export async function geocodeAddress(query) {
  const trimmed = (query || '').trim()
  if (!trimmed) return null

  try {
    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      countrycodes: 'uz',
      'accept-language': 'uz',
      email: NOMINATIM_CONTACT_EMAIL,
      q: withCountryHint(trimmed),
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

// Builds a short, readable address ("district, city" style) out of
// Nominatim's structured address components, instead of its very long
// display_name (which includes postcode/country/etc.) — falls back to
// display_name only when the structured pieces are too sparse to be useful.
function buildShortAddress(result) {
  const a = result.address || {}
  const parts = [
    a.road || a.pedestrian,
    a.suburb || a.neighbourhood || a.quarter,
    a.city_district || a.county,
    a.city || a.town || a.village,
  ].filter(Boolean)
  const unique = [...new Set(parts)]
  return unique.length >= 2 ? unique.join(', ') : result.display_name
}

/**
 * Reverse-geocodes coordinates (from a map drag/click or the browser's GPS)
 * back into a human-readable address, so the admin doesn't have to type one
 * by hand after placing/finding a pin. Returns null on any error.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(lat),
      lon: String(lng),
      addressdetails: '1',
      'accept-language': 'uz',
      email: NOMINATIM_CONTACT_EMAIL,
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.error) return null
    return buildShortAddress(data)
  } catch {
    return null
  }
}

/**
 * Wraps the browser's Geolocation API in a promise — used for the "use my
 * current location" button so an admin standing at the actual shop can
 * capture its exact coordinates in one tap instead of typing an address.
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
