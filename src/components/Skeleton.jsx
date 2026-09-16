// Shimmering placeholder shapes shown in place of <Loader/> wherever the
// eventual content has a predictable shape (a table, a card grid) — reads
// as "this is loading" instead of "something's spinning, who knows what
// shows up." Uses the .skeleton background (src/index.css) + the
// already-defined-but-previously-unused animate-shimmer utility.

export function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton animate-shimmer ${className}`} />
}

// Mirrors the standard admin table shell (`card overflow-x-auto` wrapping a
// `<table>`) so swapping it in for the real table on load doesn't shift
// layout once data arrives.
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-ink-800/60 last:border-b-0">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-4">
                  <SkeletonBlock className={`h-4 ${c === 0 ? 'w-36' : 'w-16'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// For grids of image+text cards (barbers, shops).
export function SkeletonCardGrid({ count = 6, className = '' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <SkeletonBlock className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
