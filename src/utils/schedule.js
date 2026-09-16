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

// Fallback only — used if a barber's own hours can't be parsed.
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

// A per-barber weekly schedule: keyed by JS Date#getDay() (0 = Sunday ...
// 6 = Saturday), each value is either `{ boshlanish, tugash }` (HH:MM
// strings) or `null` for a day off.
export function defaultJadval(range = { boshlanish: '09:00', tugash: '18:00' }) {
  return Object.fromEntries(WEEKDAY_DISPLAY_ORDER.map((d) => [d, { ...range }]))
}

// Barbers saved before the weekly-schedule editor existed only have the old
// single `ishVaqti` text range + `damOlishKunlari` full-days-off array —
// derive an equivalent per-weekday schedule from those so old records (and
// rows already migrated into the shared production DB) keep working without
// a manual re-save.
function legacyJadval(barber) {
  const range = parseWorkRange(barber?.ishVaqti)
  const hhmmRange = range && { boshlanish: minutesToHHMM(range.start), tugash: minutesToHHMM(range.end) }
  return Object.fromEntries(
    WEEKDAY_DISPLAY_ORDER.map((d) => [d, barber?.damOlishKunlari?.includes(d) ? null : hhmmRange])
  )
}

export function getWeeklySchedule(barber) {
  return barber?.jadval || legacyJadval(barber)
}

// This barber's working hours on one specific date — `null` if they're off
// that day, whether because it's a vacation date or their weekly day off.
export function getDaySchedule(barber, dateIso) {
  if (!barber || !dateIso) return null
  if (barber.taillar?.some((r) => dateIso >= r.boshlanish && dateIso <= r.tugash)) return null
  const dayOfWeek = new Date(`${dateIso}T00:00:00`).getDay()
  return getWeeklySchedule(barber)[dayOfWeek] || null
}

export function isBarberOff(barber, dateIso) {
  return getDaySchedule(barber, dateIso) == null
}

// A compact one-line summary of a weekly schedule for card/detail views:
// the shared hours if every working day uses the same range, or `null` to
// signal "varies by day" (caller shows a fallback string in that case).
export function summarizeWeeklyHours(jadval) {
  const ranges = WEEKDAY_DISPLAY_ORDER.map((d) => jadval[d]).filter(Boolean)
  if (ranges.length === 0) return null
  const [first, ...rest] = ranges
  const uniform = rest.every((r) => r.boshlanish === first.boshlanish && r.tugash === first.tugash)
  return uniform ? `${first.boshlanish} - ${first.tugash}` : null
}
