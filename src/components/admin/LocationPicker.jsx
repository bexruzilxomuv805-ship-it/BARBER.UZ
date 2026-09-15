import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaSearch, FaMapMarkerAlt, FaLocationArrow } from 'react-icons/fa'
import ShopMap from '../ShopMap'
import { geocodeAddress, reverseGeocode, getCurrentPosition } from '../../utils/geocode'

// Admin-only, editable pin picker used by AdminSartaroshxonalar.jsx's form.
// Three ways to place the pin, all free/no-key: type an address and geocode
// it, tap "use my current location" (browser GPS — handy when the admin is
// physically standing at the shop), or drag/click the map directly. Whatever
// sets the pin also reverse-geocodes it, so the address text field fills in
// automatically instead of requiring it to be typed by hand.
export default function LocationPicker({ address, lat, lng, onChange, onAddressResolved }) {
  const { t } = useTranslation()
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const mapRef = useRef(null)

  const applyPosition = async (result) => {
    onChange(result)
    mapRef.current?.flyTo([result.lat, result.lng], 16)
    const resolvedAddress = await reverseGeocode(result.lat, result.lng)
    if (resolvedAddress) onAddressResolved?.(resolvedAddress)
  }

  const handleSearch = async () => {
    if (!address?.trim()) return
    setError('')
    setSearching(true)
    const result = await geocodeAddress(address)
    setSearching(false)
    if (result) {
      await applyPosition(result)
    } else {
      setError(t('admin.shops.locationNotFound'))
    }
  }

  const handleUseGps = async () => {
    setError('')
    setLocating(true)
    try {
      const result = await getCurrentPosition()
      await applyPosition(result)
    } catch {
      setError(t('admin.shops.gpsError'))
    } finally {
      setLocating(false)
    }
  }

  // The map's own click/drag handler only reports lat/lng — also resolve an
  // address for it here, same as the search/GPS paths above.
  const handleMapChange = async (result) => {
    onChange(result)
    const resolvedAddress = await reverseGeocode(result.lat, result.lng)
    if (resolvedAddress) onAddressResolved?.(resolvedAddress)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !address?.trim()}
          className="btn-outline !py-2 shrink-0 text-sm disabled:opacity-50"
        >
          <FaSearch /> {searching ? t('admin.shops.locating') : t('admin.shops.findLocation')}
        </button>
        <button
          type="button"
          onClick={handleUseGps}
          disabled={locating}
          className="btn-outline !py-2 shrink-0 text-sm disabled:opacity-50"
        >
          <FaLocationArrow /> {locating ? t('admin.shops.locatingGps') : t('admin.shops.useMyLocation')}
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink-500">
        <FaMapMarkerAlt className="shrink-0 text-gold-400" /> {t('admin.shops.dragPinHint')}
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <ShopMap lat={lat} lng={lng} editable onChange={handleMapChange} mapRef={mapRef} />
    </div>
  )
}
