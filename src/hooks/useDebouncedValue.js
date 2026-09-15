import { useEffect, useState } from 'react'

// Delays reacting to a fast-changing value (typically a search input) until
// it's stopped changing for `delay` ms, so list filtering doesn't re-run on
// every keystroke.
export default function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
