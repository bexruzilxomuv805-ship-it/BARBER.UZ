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
