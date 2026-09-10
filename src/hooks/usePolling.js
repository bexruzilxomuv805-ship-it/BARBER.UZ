import { useEffect, useRef } from 'react'

// Re-runs `callback` every `ms` for as long as the component stays mounted —
// same "simulate live updates via polling" approach chatSlice/AdminChat.jsx
// already use (no WebSocket server here, see CLAUDE.md). Stores the latest
// callback in a ref so passing a fresh inline arrow each render doesn't
// reset the interval's timing (the classic React useInterval pattern).
export default function usePolling(callback, ms) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    if (ms == null) return
    const id = setInterval(() => savedCallback.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}
