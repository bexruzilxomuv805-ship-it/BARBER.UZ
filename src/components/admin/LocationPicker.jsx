import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa'
import ShopMap from '../ShopMap'
import { geocodeAddress } from '../../utils/geocode'

// Admin-only, editable pin picker used by AdminSartaroshxonalar.jsx's form:
// type an address and geocode it (free, no API key — see utils/geocode.js),
// then drag the pin (or click the map) to fine-tune an imprecise result
// before saving lat/lng onto the shop record.
export default function LocationPicker({ address, lat, lng, onChange }) {
  const { t } = useTranslation()
  const [searching, setSearching] = useState(false)
  const mapRef = useRef(null)

  const handleSearch = async () => {
    if (!address?.trim()) return
    setSearching(true)
    const result = await geocodeAddress(address)
    setSearching(false)
    if (result) {
      onChange(result)
      mapRef.current?.flyTo([result.lat, result.lng], 15)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !address?.trim()}
          className="btn-outline !py-2 shrink-0 text-sm disabled:opacity-50"
        >
          <FaSearch /> {searching ? t('admin.shops.locating') : t('admin.shops.findLocation')}
        </button>
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <FaMapMarkerAlt className="shrink-0 text-gold-400" /> {t('admin.shops.dragPinHint')}
        </p>
      </div>
      <ShopMap lat={lat} lng={lng} editable onChange={onChange} mapRef={mapRef} />
    </div>
  )
}
