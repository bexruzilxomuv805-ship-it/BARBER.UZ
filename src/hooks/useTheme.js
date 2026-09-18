import { useSyncExternalStore } from 'react'
import { getTheme, setTheme, subscribeTheme } from '../utils/theme'

export default function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'dark')
  return {
    theme,
    isLight: theme === 'light',
    setTheme,
    toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
  }
}

// Recharts draws axes/grids as SVG attributes and inline styles, which can't
// use Tailwind classes — so charts pull their neutrals from here.
export function useChartTheme() {
  const { isLight } = useTheme()
  return isLight
    ? {
        grid: '#e5e1d7',
        axis: '#767676',
        tooltip: {
          background: '#ffffff',
          border: '1px solid #e5e1d7',
          borderRadius: 10,
          fontSize: 12,
          color: '#1c1c1c',
          boxShadow: '0 8px 24px -12px rgba(60,40,0,0.25)',
        },
        emptyCell: 'rgba(0,0,0,0.05)',
      }
    : {
        grid: '#2b2b2b',
        axis: '#6d6d6d',
        tooltip: { background: '#181818', border: '1px solid #2b2b2b', borderRadius: 10, fontSize: 12 },
        emptyCell: 'rgba(255,255,255,0.04)',
      }
}
