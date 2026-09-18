const STORAGE_KEY = 'zolotoy_theme'
const META_COLORS = { dark: '#0a0a0a', light: '#faf8f3' }
const listeners = new Set()

// Dark is the brand default; only an explicit saved 'light' choice overrides it.
// The inline script in index.html applies the class before first paint, so this
// just mirrors what is already on <html>.
let current =
  typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? 'light' : 'dark'

function apply(theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme])
}

export function getTheme() {
  return current
}

export function setTheme(theme) {
  if (theme === current) return
  current = theme
  apply(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* storage blocked (private mode) — the choice just won't persist */
  }
  listeners.forEach((fn) => fn())
}

export function subscribeTheme(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
