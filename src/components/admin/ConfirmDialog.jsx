import { useTranslation } from 'react-i18next'
import Modal from './Modal'
import { FaExclamationTriangle } from 'react-icons/fa'

export default function ConfirmDialog({ open, onClose, onConfirm, title, text }) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} title={title || t('admin.confirmTitle')}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 text-xl">
          <FaExclamationTriangle />
        </span>
        <p className="mt-4 text-sm text-ink-400">{text || t('admin.deleteDefaultText')}</p>
        <div className="mt-6 flex w-full gap-3">
          <button onClick={onClose} className="btn-outline flex-1 !py-2 text-sm">{t('common.cancel')}</button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            {t('admin.delete')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
