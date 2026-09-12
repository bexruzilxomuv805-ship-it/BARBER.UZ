// A 3D-styled take on the original hero-art.svg composition (the same gold
// pole-in-a-ring layout), rendered in CSS instead of a static picture. Only
// the pole's stripe texture spins in place to read as a real rotating
// cylinder — the background rings and dots stay fixed, nothing sways or
// tilts as a whole.
const STRIPES = 'repeating-linear-gradient(45deg, #c9a227 0 20px, #f5ecc6 20px 40px)'

export default function BarberPole() {
  return (
    <div className="relative flex aspect-square w-full items-center justify-center">
      <div className="pointer-events-none absolute h-72 w-72 rounded-full border border-gold-500/30" />
      <div className="pointer-events-none absolute h-56 w-56 rounded-full border border-gold-500/20" />
      <span className="pointer-events-none absolute left-[16%] top-[18%] h-1.5 w-1.5 rounded-full bg-gold-500/70" />
      <span className="pointer-events-none absolute right-[14%] top-[24%] h-1 w-1 rounded-full bg-gold-500/60" />
      <span className="pointer-events-none absolute bottom-[16%] right-[18%] h-2 w-2 rounded-full bg-gold-500/60" />
      <span className="pointer-events-none absolute bottom-[22%] left-[18%] h-1 w-1 rounded-full bg-gold-500/60" />

      <div className="relative flex h-64 w-24 flex-col items-center sm:h-80 sm:w-28" style={{ filter: 'drop-shadow(0 20px 24px rgba(0,0,0,0.5))' }}>
        <div className="z-10 h-11 w-11 shrink-0 -mb-5 rounded-full bg-ink-950 shadow-inner ring-4 ring-gold-500/70" style={{ backgroundImage: 'radial-gradient(circle at 35% 30%, #f5ecc6, #c9a227 45%, #6b511b 100%)' }} />

        <div className="relative w-full flex-1 overflow-hidden rounded-[28px] border-2 border-gold-600/70">
          <div className="animate-poleSpin absolute inset-0" style={{ backgroundImage: STRIPES }} />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/50 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/40 to-transparent" />
        </div>

        <div className="z-10 h-11 w-11 shrink-0 -mt-5 rounded-full bg-ink-950 shadow-inner ring-4 ring-gold-500/70" style={{ backgroundImage: 'radial-gradient(circle at 35% 30%, #f5ecc6, #c9a227 45%, #6b511b 100%)' }} />
      </div>
    </div>
  )
}
