import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
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

// Shared OpenStreetMap (free, no API key) map + pin, used both by the admin
// LocationPicker (editable: drag/click to set) and the client shop-detail
// page (read-only: a single fixed marker at the shop's saved coordinates).
export default function ShopMap({ lat, lng, editable = false, onChange, mapRef, className = 'h-56 w-full' }) {
  const position = lat != null && lng != null ? { lat, lng } : TASHKENT_CENTER

  return (
    <div className={`${className} overflow-hidden rounded-xl border border-ink-800`}>
      <MapContainer center={position} zoom={14} className="h-full w-full" ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {editable ? <EditableMarker position={position} onChange={onChange} /> : <Marker position={position} />}
      </MapContainer>
    </div>
  )
}
