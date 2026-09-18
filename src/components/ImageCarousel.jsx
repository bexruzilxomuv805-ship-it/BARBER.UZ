import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

// A single-image-at-a-time gallery with prev/next arrows, replacing the old
// "first image big + up to 4 more in a grid" layout — that one silently
// dropped every image past the 5th and looked increasingly cluttered the
// more photos a shop had. This scales to any number of images the same way
// regardless of count.
export default function ImageCarousel({ images, alt }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  if (!images?.length) {
    return <div className="aspect-[16/10] rounded-xl border border-dashed border-ink-800" />
  }

  const hasMultiple = images.length > 1
  const goPrev = () => {
    if (index === 0) return
    setDirection(-1)
    setIndex((i) => i - 1)
  }
  const goNext = () => {
    if (index === images.length - 1) return
    setDirection(1)
    setIndex((i) => i + 1)
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-ink-900">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.img
            key={index}
            src={images[index]}
            alt={index === 0 ? alt : ''}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -40 : 40 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={index === 0}
              aria-label="Oldingi rasm"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80 disabled:opacity-0"
            >
              <FaChevronLeft className="text-sm" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={index === images.length - 1}
              aria-label="Keyingi rasm"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80 disabled:opacity-0"
            >
              <FaChevronRight className="text-sm" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {index + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > index ? 1 : -1)
                setIndex(i)
              }}
              aria-label={`${i + 1}-rasm`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-gold-400' : 'w-1.5 bg-ink-700 hover:bg-ink-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
