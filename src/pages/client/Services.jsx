import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaClock, FaArrowRight } from 'react-icons/fa'
import Reveal from '../../components/Reveal'
import ServiceIcon from '../../components/ServiceIcon'
import Loader from '../../components/Loader'
import PageHero from '../../components/PageHero'
import AutoText from '../../components/AutoText'
import { fetchServices } from '../../features/services/servicesSlice'
import { formatSum } from '../../utils/format'

const ALL = '__ALL__'

export default function Services() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: services, status } = useSelector((s) => s.services)
  const [activeCategory, setActiveCategory] = useState(ALL)

  useEffect(() => {
    dispatch(fetchServices())
  }, [dispatch])

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.kategoriya))
    return [ALL, ...Array.from(set)]
  }, [services])

  const filtered = useMemo(() => {
    if (activeCategory === ALL) return services
    return services.filter((s) => s.kategoriya === activeCategory)
  }, [services, activeCategory])

  return (
    <div>
      <PageHero
        eyebrow={t('services.eyebrow')}
        title={t('services.title')}
        subtitle={t('services.subtitle')}
      />

      <section className="container-x pb-24">
        <Reveal className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'border-gold-500 bg-gold-500/15 text-gold-300'
                  : 'border-ink-800 text-ink-400 hover:border-gold-500/40 hover:text-white'
              }`}
            >
              {cat === ALL ? t('services.all') : <AutoText text={cat} />}
            </button>
          ))}
        </Reveal>

        {status === 'loading' ? (
          <Loader full />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s, i) => (
              <Reveal key={s.id} delay={(i % 6) * 0.05}>
                <div className="card group h-full p-6 hover:border-gold-500/50 transition-colors duration-300">
                  <div className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 text-xl group-hover:scale-110 transition-transform">
                      <ServiceIcon name={s.rasm} />
                    </span>
                    <span className="text-xs text-ink-500 flex items-center gap-1">
                      <FaClock /> {t('services.minutes', { count: s.davomiyligi })}
                    </span>
                  </div>
                  <AutoText as="h3" className="mt-4 font-semibold text-white" text={s.nomi} />
                  <AutoText as="p" className="mt-1.5 text-sm text-ink-400 leading-relaxed" text={s.tavsif} />
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-display text-lg font-bold text-gold-400">{formatSum(s.narxi)}</span>
                    <Link to="/navbat-olish" state={{ serviceId: s.id }} className="btn-outline !px-4 !py-1.5 text-xs">
                      {t('services.bookAction')} <FaArrowRight className="text-[10px]" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-ink-500 py-10">{t('services.noResults')}</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
