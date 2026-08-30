import { useTranslation } from 'react-i18next'
import { GiRazor } from 'react-icons/gi'

export default function Loader({ label, full = false }) {
  const { t } = useTranslation()
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-gold-400 ${full ? 'min-h-[60vh]' : 'py-10'}`}>
      <GiRazor className="text-3xl animate-spinSlow" />
      <span className="text-sm text-ink-400">{label || t('common.loading')}</span>
    </div>
  )
}
