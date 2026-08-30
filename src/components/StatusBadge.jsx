import { useTranslation } from 'react-i18next'
import { STATUS_LABELS } from '../utils/format'

export default function StatusBadge({ status }) {
  const { t } = useTranslation()
  const info = STATUS_LABELS[status] || { key: null, label: status, color: 'text-ink-400 bg-ink-500/10 border-ink-500/30' }
  const label = info.key ? t(`status.${info.key}`) : info.label
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${info.color}`}>
      {label}
    </span>
  )
}
