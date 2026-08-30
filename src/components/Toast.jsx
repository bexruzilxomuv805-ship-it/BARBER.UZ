import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa'
import { clearToast } from '../features/ui/uiSlice'

export default function Toast() {
  const toast = useSelector((s) => s.ui.toast)
  const dispatch = useDispatch()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => dispatch(clearToast()), 3500)
    return () => clearTimeout(t)
  }, [toast, dispatch])

  return (
    <div className="fixed top-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-sm">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`card flex items-start gap-3 px-4 py-3 shadow-lg border-l-4 ${
              toast.type === 'error' ? 'border-l-red-500' : 'border-l-gold-500'
            }`}
          >
            {toast.type === 'error' ? (
              <FaExclamationCircle className="text-red-400 mt-0.5 shrink-0" />
            ) : (
              <FaCheckCircle className="text-gold-400 mt-0.5 shrink-0" />
            )}
            <p className="text-sm text-ink-100 flex-1">{toast.text}</p>
            <button onClick={() => dispatch(clearToast())} className="text-ink-500 hover:text-white">
              <FaTimes />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
