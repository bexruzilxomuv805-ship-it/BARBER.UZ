import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaPhoneAlt, FaArrowRight, FaArrowLeft, FaClock, FaCommentDots, FaMapMarkerAlt } from 'react-icons/fa'
import Reveal from '../../components/Reveal'
import RatingStars from '../../components/RatingStars'
import Loader from '../../components/Loader'
import PageHero from '../../components/PageHero'
import Modal from '../../components/admin/Modal'
import AutoText from '../../components/AutoText'
import ShopMap from '../../components/ShopMap'
import { fetchBarbers } from '../../features/barbers/barbersSlice'
import { fetchShops } from '../../features/sartaroshxonalar/sartaroshxonalarSlice'
import { openChatWithBarber } from '../../features/ui/uiSlice'
import { getBarberImage } from '../../assets/images'
import { formatSum } from '../../utils/format'

const TIER_BADGE = {
  oddiy: 'bg-ink-800 text-ink-300',
  premium: 'bg-gold-500/15 text-gold-400',
  vip: 'bg-violet-500/15 text-violet-300',
}

export default function SartaroshxonaDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: shops, status: shopsStatus } = useSelector((s) => s.sartaroshxonalar)
  const { items: barbers, status: barbersStatus } = useSelector((s) => s.barbers)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    dispatch(fetchShops())
    dispatch(fetchBarbers())
  }, [dispatch])

  const shop = shops.find((s) => s.id === id)
  const shopBarbers = barbers.filter((b) => b.sartaroshxonaId === id)
  const loading = shopsStatus === 'loading' || barbersStatus === 'loading'

  if (loading && !shop) {
    return <Loader full />
  }

  if (!shop) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-ink-400">{t('shops.notFound')}</p>
        <Link to="/sartaroshxonalar" className="btn-gold mt-6 inline-flex !px-5 !py-2 text-sm">
          {t('shops.backToList')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHero eyebrow={t('shops.eyebrow')} title={shop.nomi} subtitle={shop.tavsif} />

      <div className="container-x pt-6">
        <Link to="/sartaroshxonalar" className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-gold-400">
          <FaArrowLeft className="text-xs" /> {t('shops.backToList')}
        </Link>
      </div>

      <section className="container-x pb-16 pt-4">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            {shop.rasmlar?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 aspect-[16/10] overflow-hidden rounded-xl">
                  <img src={shop.rasmlar[0]} alt={shop.nomi} className="h-full w-full object-cover" />
                </div>
                {shop.rasmlar.slice(1, 5).map((src, i) => (
                  <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-[16/10] rounded-xl border border-dashed border-ink-800" />
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TIER_BADGE[shop.tur] || TIER_BADGE.oddiy}`}>
                {t(`shops.tier.${shop.tur || 'oddiy'}`)}
              </span>
            </div>
            <p className="flex items-start gap-2 text-sm text-ink-300">
              <FaMapMarkerAlt className="mt-0.5 shrink-0 text-gold-400" />
              <AutoText text={shop.manzilMatni} />
            </p>
            <p className="flex items-center gap-2 text-sm text-ink-300">
              <FaClock className="shrink-0 text-gold-400" /> {shop.ishVaqti}
            </p>
            {shop.telefon && (
              <p className="flex items-center gap-2 text-sm text-ink-300">
                <FaPhoneAlt className="shrink-0 text-gold-400" /> {shop.telefon}
              </p>
            )}
            <ShopMap lat={shop.lat} lng={shop.lng} className="h-64 w-full" />
          </div>
        </div>
      </section>

      <section className="container-x pb-24">
        <h2 className="section-title mb-8">{t('shops.barbersTitle')}</h2>
        {shopBarbers.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">{t('shops.noBarbers')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {shopBarbers.map((b, i) => (
              <Reveal key={b.id} delay={(i % 8) * 0.06}>
                <button
                  type="button"
                  onClick={() => setSelected(b)}
                  className="card group w-full overflow-hidden text-left h-full flex flex-col hover:border-gold-500/50 transition-colors duration-300"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img
                      src={getBarberImage(b.rasm)}
                      alt={b.ism}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-white text-sm">{b.ism} {b.familiya}</h3>
                    <AutoText as="p" className="text-xs text-gold-400 mt-0.5" text={b.mutaxassislik} />
                    <div className="mt-2 flex items-center justify-between">
                      <RatingStars value={b.reyting} />
                      <span className="text-[11px] text-ink-500">{t('barbers.yearsExperience', { count: b.tajriba })}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3">
                      <span className="text-xs font-semibold text-gold-400">{t('barbers.startingFrom', { price: formatSum(b.narxBoshlanishi) })}</span>
                      <span className="text-[11px] text-ink-500 group-hover:text-gold-400">{t('barbers.detailsAction')}</span>
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.ism} ${selected.familiya}` : ''}>
        {selected && (
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-xl">
              <img src={getBarberImage(selected.rasm)} alt={selected.ism} className="h-full w-full object-cover" />
            </div>
            <AutoText as="p" className="mt-4 text-sm font-semibold text-gold-400" text={selected.mutaxassislik} />
            <div className="mt-2 flex items-center justify-between">
              <RatingStars value={selected.reyting} />
              <span className="text-xs text-ink-500">{t('barbers.yearsExperienceFull', { count: selected.tajriba })}</span>
            </div>
            <AutoText as="p" className="mt-3 text-sm text-ink-400 leading-relaxed" text={selected.bio} />
            <div className="mt-4 flex items-center justify-between text-xs text-ink-500 border-t border-ink-800 pt-3">
              <span className="flex items-center gap-1.5"><FaPhoneAlt /> {selected.telefon}</span>
              <span className="flex items-center gap-1.5"><FaClock /> {selected.ishVaqti}</span>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="font-display text-lg font-bold text-gold-400">{t('barbers.startingFrom', { price: formatSum(selected.narxBoshlanishi) })}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dispatch(openChatWithBarber(selected.id))
                    setSelected(null)
                  }}
                  className="btn-outline !px-4 !py-2 text-sm"
                >
                  <FaCommentDots className="text-xs" /> {t('barbers.messageAction')}
                </button>
                <Link
                  to="/navbat-olish"
                  state={{ barberId: selected.id, shopId: shop.id }}
                  className="btn-gold !px-5 !py-2 text-sm"
                >
                  {t('barbers.bookAction')} <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
