import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Leaflet's default marker icon is referenced by a relative URL baked into
// the package, which breaks once a bundler (Vite) rewrites asset paths —
// fixed once here, centrally, instead of at every map usage.
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const TASHKENT_CENTER = { lat: 41.2855, lng: 69.2354 }

function EditableMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng()
          onChange({ lat, lng })
        },
      }}
    />
  )
}

// Pans/zooms the map to fit every shop marker once (and whenever the set of
// shops changes, e.g. after fetchShops resolves) — MapContainer's own
// center/zoom props only apply on first mount, so this is what actually
// keeps every pin in view instead of just the very first one.
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14)
      return
    }
    map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [32, 32] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => `${p.lat},${p.lng}`).join('|')])
  return null
}

/**
 * Shared OpenStreetMap (free, no API key) map, in three modes:
 * - editable: a single draggable/click-to-place pin (admin LocationPicker)
 * - single (default): one fixed pin at lat/lng (a shop's own detail page)
 * - shops: many fixed pins at once, each with a popup linking to that shop's
 *   detail page, auto-fit to include all of them (Contact.jsx's "all our
 *   branches" map)
 */
export default function ShopMap({
  lat,
  lng,
  shops,
  editable = false,
  onChange,
  mapRef,
  className = 'h-56 w-full',
}) {
  const points = shops?.filter((s) => s.lat != null && s.lng != null) || []
  const position = lat != null && lng != null ? { lat, lng } : TASHKENT_CENTER
  const initialCenter = points.length ? { lat: points[0].lat, lng: points[0].lng } : position

  return (
    <div className={`${className} overflow-hidden rounded-xl border border-ink-800`}>
      <MapContainer center={initialCenter} zoom={12} className="h-full w-full" ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {shops ? (
          <>
            <FitBounds points={points} />
            {points.map((s) => (
              <Marker key={s.id} position={{ lat: s.lat, lng: s.lng }}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{s.nomi}</p>
                    <Link to={`/sartaroshxonalar/${s.id}`} className="text-gold-600 hover:underline">
                      {s.linkLabel}
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        ) : editable ? (
          <EditableMarker position={position} onChange={onChange} />
        ) : (
          <Marker position={position} />
        )}
      </MapContainer>
    </div>
  )
}
