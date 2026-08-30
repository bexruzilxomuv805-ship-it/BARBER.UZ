import { AnimatePresence, motion } from 'framer-motion'
import { FaTimes } from 'react-icons/fa'

export default function Modal({ open, onClose, title, children, wide = false }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[88vh] overflow-y-auto rounded-2xl border border-ink-800 bg-ink-900 shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-ink-800 px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
              <button onClick={onClose} className="text-ink-500 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
