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

// Fallback only — used if a barber's own ishVaqti can't be parsed.
export const FALLBACK_WORK_RANGE = { start: 9 * 60, end: 19 * 60 }
export const SLOT_STEP_MIN = 30
export const DEFAULT_DURATION_MIN = 30

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Barbers set their own hours as free text (e.g. "10:00 - 20:00", see
// AdminBarbers.jsx) — pull out the two HH:MM stamps rather than assuming an
// exact separator/spacing.
export function parseWorkRange(ishVaqti) {
  const stamps = ishVaqti?.match(/\d{1,2}:\d{2}/g)
  if (!stamps || stamps.length < 2) return null
  const start = toMinutes(stamps[0])
  const end = toMinutes(stamps[1])
  return end > start ? { start, end } : null
}
