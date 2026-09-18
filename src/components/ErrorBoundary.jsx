import { Component } from 'react'

// A crash anywhere in the tree used to unmount the whole app with nothing
// left on screen but the dark theme's own background (bg-ink-950) — i.e. a
// plain black screen with no way to recover except manually reloading and
// no clue what broke. This turns that into a visible, recoverable message.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught render error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-950 px-6 text-center text-ink-100">
        <p className="text-lg font-semibold text-strong">Nimadir noto‘g‘ri ketdi</p>
        <p className="max-w-sm text-sm text-ink-400">
          Sahifa yuklashda xatolik yuz berdi. Iltimos, sahifani qayta yuklang.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-gradient-to-r from-gold-500 to-gold-300 px-6 py-3 font-semibold text-on-gold shadow-gold transition-transform active:scale-95"
        >
          Qayta yuklash
        </button>
      </div>
    )
  }
}
