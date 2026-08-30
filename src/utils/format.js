export function formatSum(value = 0) {
  return `${Number(value).toLocaleString('uz-UZ')} so'm`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const STATUS_LABELS = {
  kutilmoqda: { key: 'kutilmoqda', label: 'Kutilmoqda', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  tasdiqlangan: { key: 'tasdiqlangan', label: 'Tasdiqlangan', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  yakunlangan: { key: 'yakunlangan', label: 'Yakunlangan', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  'bekor qilingan': { key: 'bekorQilingan', label: 'Bekor qilingan', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  kelmagan: { key: 'kelmagan', label: 'Kelmagan', color: 'text-ink-400 bg-ink-500/10 border-ink-500/30' },
}

export const PAYMENT_METHOD_LABELS = {
  naqd: { key: 'naqd' },
  karta: { key: 'karta' },
  onlayn: { key: 'onlayn' },
}

export const PAYMENT_STATUS_LABELS = {
  'to‘landi': { key: 'tolandi' },
  kutilmoqda: { key: 'kutilmoqda' },
  'bekor qilingan': { key: 'bekorQilingan' },
}
