import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaClock, FaMapMarkerAlt, FaArrowRight } from 'react-icons/fa'
import Reveal from '../../components/Reveal'
import Loader from '../../components/Loader'
import PageHero from '../../components/PageHero'
import AutoText from '../../components/AutoText'
import { fetchShops } from '../../features/sartaroshxonalar/sartaroshxonalarSlice'

const TIER_BADGE = {
  oddiy: 'bg-ink-800 text-ink-300',
  premium: 'bg-gold-500/15 text-gold-400',
  vip: 'bg-violet-500/15 text-violet-300',
}

export default function Sartaroshxonalar() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: shops, status } = useSelector((s) => s.sartaroshxonalar)

  useEffect(() => {
    dispatch(fetchShops())
  }, [dispatch])

  return (
    <div>
      <PageHero
        eyebrow={t('shops.eyebrow')}
        title={t('shops.title')}
        subtitle={t('shops.subtitle')}
      />

      <section className="container-x pb-24">
        {status === 'loading' ? (
          <Loader full />
        ) : shops.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">{t('shops.notFound')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s, i) => (
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
                      <h3 className="font-semibold text-white">{s.nomi}</h3>
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
                    <div className="mt-3 flex items-center justify-end border-t border-ink-800 pt-3 text-xs font-medium text-ink-500 group-hover:text-gold-400">
                      {t('shops.detailsAction')} <FaArrowRight className="ml-1 text-[10px]" />
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
