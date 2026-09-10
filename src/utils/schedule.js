// `Date#toISOString()` converts to UTC, which lands on the *previous*
// calendar day for part of the evening/night in Uzbekistan (UTC+5) — e.g.
// 2026-09-10 02:00 local is still 2026-09-09 in UTC. Every "what's today"
// comparison in this app (booking's date picker, admin's "today" stats,
// barber off-day badges) needs the viewer's actual local day, so this reads
// the local Y/M/D components instead of going through UTC.
export function toLocalDateIso(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Weekday values follow JS Date#getDay() (0 = Sunday ... 6 = Saturday).
// Display order starts on Monday to match the Uzbek work week.
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// `weekdaysShort` is common.weekdaysShort from the active i18n locale (index 0 = Sunday),
// not Intl.DateTimeFormat: this Chromium build has no CLDR data for 'uz', so
// toLocaleDateString('uz-UZ', { weekday: 'short' }) silently falls back to English.
export function getWeekdayOptions(weekdaysShort) {
  return WEEKDAY_DISPLAY_ORDER.map((value) => ({ value, label: weekdaysShort[value] }))
}

export function isBarberOff(barber, dateIso) {
  if (!barber || !dateIso) return false
  const dayOfWeek = new Date(`${dateIso}T00:00:00`).getDay()
  if (barber.damOlishKunlari?.includes(dayOfWeek)) return true
  if (barber.taillar?.some((r) => dateIso >= r.boshlanish && dateIso <= r.tugash)) return true
  return false
}
