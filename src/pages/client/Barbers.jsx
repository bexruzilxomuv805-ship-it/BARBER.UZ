import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaPhoneAlt, FaArrowRight, FaClock } from 'react-icons/fa'
import Reveal from '../../components/Reveal'
import RatingStars from '../../components/RatingStars'
import Loader from '../../components/Loader'
import PageHero from '../../components/PageHero'
import Modal from '../../components/admin/Modal'
import AutoText from '../../components/AutoText'
import { fetchBarbers } from '../../features/barbers/barbersSlice'
import { getBarberImage } from '../../assets/images'
import { formatSum } from '../../utils/format'

export default function Barbers() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: barbers, status } = useSelector((s) => s.barbers)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    dispatch(fetchBarbers())
  }, [dispatch])

  return (
    <div>
      <PageHero
        eyebrow={t('barbers.eyebrow')}
        title={t('barbers.title')}
        subtitle={t('barbers.subtitle')}
      />

      <section className="container-x pb-24">
        {status === 'loading' ? (
          <Loader full />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {barbers.map((b, i) => (
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
              <img
                src={getBarberImage(selected.rasm)}
                alt={selected.ism}
                className="h-full w-full object-cover"
              />
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
            <div className="mt-5 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-gold-400">{t('barbers.startingFrom', { price: formatSum(selected.narxBoshlanishi) })}</span>
              <Link
                to="/navbat-olish"
                state={{ barberId: selected.id }}
                className="btn-gold !px-5 !py-2 text-sm"
              >
                {t('barbers.bookAction')} <FaArrowRight className="text-xs" />
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
