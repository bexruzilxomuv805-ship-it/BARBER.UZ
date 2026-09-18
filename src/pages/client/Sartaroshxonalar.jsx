import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaClock, FaMapMarkerAlt, FaArrowRight, FaLocationArrow, FaSearch } from 'react-icons/fa'
import Reveal from '../../components/Reveal'
import { SkeletonCardGrid } from '../../components/Skeleton'
import PageHero from '../../components/PageHero'
import AutoText from '../../components/AutoText'
import { fetchShops } from '../../features/sartaroshxonalar/sartaroshxonalarSlice'
import { getCurrentPosition } from '../../utils/geocode'
import { distanceKm, formatDistanceKm } from '../../utils/distance'

const TIER_BADGE = {
  oddiy: 'bg-ink-800 text-ink-300',
  premium: 'bg-gold-500/15 text-gold-400',
  vip: 'bg-violet-500/15 text-violet-300',
}
const TIERS = ['oddiy', 'premium', 'vip']

export default function Sartaroshxonalar() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: shops, status } = useSelector((s) => s.sartaroshxonalar)
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')

  useEffect(() => {
    dispatch(fetchShops())
  }, [dispatch])

  const filteredShops = useMemo(() => {
    const query = search.trim().toLowerCase()
    return shops.filter((s) => {
      if (tierFilter && s.tur !== tierFilter) return false
      if (!query) return true
      return s.nomi?.toLowerCase().includes(query) || s.manzilMatni?.toLowerCase().includes(query)
    })
  }, [shops, search, tierFilter])

  // Once the visitor shares their location, every shop that has its own
  // coordinates (set by the admin via LocationPicker) gets a distance and
  // the list re-sorts nearest-first — shops with no coordinates yet just
  // stay in their original order at the end.
  const sortedShops = useMemo(() => {
    if (!userLocation) return filteredShops
    const withDistance = filteredShops.map((s) => ({
      ...s,
      distance: s.lat != null && s.lng != null ? distanceKm(userLocation, { lat: s.lat, lng: s.lng }) : null,
    }))
    return [...withDistance].sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })
  }, [filteredShops, userLocation])

  const handleFindNearest = async () => {
    setLocationError('')
    setLocating(true)
    try {
      const pos = await getCurrentPosition()
      setUserLocation(pos)
    } catch {
      setLocationError(t('shops.locationError'))
    } finally {
      setLocating(false)
    }
  }

  return (
    <div>
      <PageHero
        eyebrow={t('shops.eyebrow')}
        title={t('shops.title')}
        subtitle={t('shops.subtitle')}
      />

      <section className="container-x pb-24">
        {shops.length > 0 && (
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="mx-auto w-full max-w-md">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-600" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('shops.searchPlaceholder')}
                  className="input-field !py-2 !pl-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setTierFilter('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  tierFilter === '' ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-ink-800 text-ink-400 hover:border-gold-500/40'
                }`}
              >
                {t('shops.filterAll')}
              </button>
              {TIERS.map((tier) => (
                <button
                  type="button"
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    tierFilter === tier ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-ink-800 text-ink-400 hover:border-gold-500/40'
                  }`}
                >
                  {t(`shops.tier.${tier}`)}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <button
                type="button"
                onClick={handleFindNearest}
                disabled={locating}
                className="btn-outline !py-2 text-sm disabled:opacity-50"
              >
                <FaLocationArrow /> {locating ? t('shops.locating') : t('shops.findNearest')}
              </button>
              {locationError && <p className="text-xs text-red-400">{locationError}</p>}
              {userLocation && !locationError && <p className="text-xs text-ink-500">{t('shops.sortedByDistance')}</p>}
            </div>
          </div>
        )}

        {status === 'loading' ? (
          <SkeletonCardGrid count={9} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" />
        ) : shops.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">{t('shops.notFound')}</p>
        ) : sortedShops.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">{t('shops.noResults')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedShops.map((s, i) => (
              <Reveal key={s.id} delay={(i % 8) * 0.06}>
                <Link
                  to={`/sartaroshxonalar/${s.id}`}
                  className="card group block h-full overflow-hidden transition-colors duration-300 hover:border-gold-500/50"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-ink-800">
                    {s.rasmlar?.[0] && (
                      <img
                        src={s.rasmlar[0]}
                        alt={s.nomi}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-strong">{s.nomi}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_BADGE[s.tur] || TIER_BADGE.oddiy}`}>
                        {t(`shops.tier.${s.tur || 'oddiy'}`)}
                      </span>
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-500">
                      <FaMapMarkerAlt className="mt-0.5 shrink-0 text-gold-400" />
                      <AutoText text={s.manzilMatni} />
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
                      <FaClock className="shrink-0 text-gold-400" /> {s.ishVaqti}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3 text-xs font-medium text-ink-500 group-hover:text-gold-400">
                      {s.distance != null ? (
                        <span className="flex items-center gap-1 text-gold-400">
                          <FaLocationArrow className="text-[10px]" /> {formatDistanceKm(s.distance)}
                          {i === 0 && userLocation && ` — ${t('shops.nearestBadge')}`}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="flex items-center">
                        {t('shops.detailsAction')} <FaArrowRight className="ml-1 text-[10px]" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
