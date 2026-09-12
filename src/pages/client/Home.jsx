import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FaArrowRight, FaCheckCircle, FaChevronLeft, FaChevronRight, FaClock, FaMapMarkerAlt, FaPhoneAlt,
  FaShieldAlt, FaStar, FaGem,
} from 'react-icons/fa'
import { GiRazor } from 'react-icons/gi'
import Reveal from '../../components/Reveal'
import BarberPole from '../../components/BarberPole'
import AnimatedCounter from '../../components/AnimatedCounter'
import RatingStars from '../../components/RatingStars'
import ServiceIcon from '../../components/ServiceIcon'
import Loader from '../../components/Loader'
import AutoText from '../../components/AutoText'
import InstallPwaPrompt from '../../components/InstallPwaPrompt'
import { fetchServices } from '../../features/services/servicesSlice'
import { fetchBarbers } from '../../features/barbers/barbersSlice'
import { fetchReviews } from '../../features/reviews/reviewsSlice'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { getBarberImage } from '../../assets/images'
import { formatSum } from '../../utils/format'

const FEATURE_ICONS = [FaShieldAlt, FaClock, FaGem, FaCheckCircle]

// Matches Tailwind's `sm` breakpoint — the reviews grid switches from 1 to
// 2/3 columns there, so the page size switches from 3 to 6 at the same point.
const REVIEWS_DESKTOP_QUERY = '(min-width: 640px)'
const REVIEWS_MOBILE_PAGE_SIZE = 3
const REVIEWS_DESKTOP_PAGE_SIZE = 6

const FALLBACK_CONTACT = {
  manzil: 'Toshkent sh., Chilonzor tumani, Bunyodkor ko‘chasi 12',
  telefon: '+998 90 123 45 67',
  ishVaqti: 'Har kuni 09:00 – 21:00',
}

export default function Home() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items: services, status: servicesStatus } = useSelector((s) => s.services)
  const { items: barbers, status: barbersStatus } = useSelector((s) => s.barbers)
  const { items: reviews } = useSelector((s) => s.reviews)
  const { items: appointments } = useSelector((s) => s.appointments)
  const { info: contactInfo } = useSelector((s) => s.contact)
  const contact = contactInfo || FALLBACK_CONTACT
  const features = t('home.features', { returnObjects: true }).map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] }))

  useEffect(() => {
    dispatch(fetchServices())
    dispatch(fetchBarbers())
    dispatch(fetchReviews())
    dispatch(fetchAppointments())
  }, [dispatch])

  const featuredServices = useMemo(() => services.slice(0, 6), [services])
  const topBarbers = useMemo(
    () => [...barbers].sort((a, b) => b.reyting - a.reyting).slice(0, 4),
    [barbers]
  )
  const avgRating = useMemo(() => {
    if (!reviews.length) return 5
    return (reviews.reduce((sum, r) => sum + r.baho, 0) / reviews.length).toFixed(1)
  }, [reviews])

  const [reviewPageSize, setReviewPageSize] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(REVIEWS_DESKTOP_QUERY).matches
      ? REVIEWS_DESKTOP_PAGE_SIZE
      : REVIEWS_MOBILE_PAGE_SIZE
  )
  const [reviewPage, setReviewPage] = useState(0)

  useEffect(() => {
    const mql = window.matchMedia(REVIEWS_DESKTOP_QUERY)
    const update = () => setReviewPageSize(mql.matches ? REVIEWS_DESKTOP_PAGE_SIZE : REVIEWS_MOBILE_PAGE_SIZE)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const reviewPageCount = Math.max(1, Math.ceil(reviews.length / reviewPageSize))
  // Clamp during render (instead of in an effect) in case the page size or
  // review count shrinks out from under whatever page was last selected.
  const safeReviewPage = Math.min(reviewPage, reviewPageCount - 1)

  const pagedReviews = useMemo(
    () => reviews.slice(safeReviewPage * reviewPageSize, safeReviewPage * reviewPageSize + reviewPageSize),
    [reviews, safeReviewPage, reviewPageSize]
  )

  // Real, computed stats instead of hardcoded demo numbers: years = the most
  // experienced barber's tenure, clients = completed appointment count.
  const yearsExperience = useMemo(
    () => (barbers.length ? Math.max(...barbers.map((b) => b.tajriba || 0)) : 0),
    [barbers]
  )
  const happyClientsCount = useMemo(
    () => appointments.filter((a) => a.holat === 'yakunlangan').length,
    [appointments]
  )

  return (
    <div>
      <div className="container-x pt-4">
        <InstallPwaPrompt variant="banner" />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-barber-radial" />
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-gold-700/10 blur-3xl animate-floatSlow" />

        <div className="container-x relative grid items-center gap-14 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-xs font-medium text-gold-300">
              <GiRazor /> {t('home.badge')}
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.1] text-white">
              {t('home.heroTitlePre')} <span className="gold-text">{t('home.heroTitleHighlight')}</span> {t('home.heroTitlePost')}
            </h1>
            <p className="mt-6 max-w-lg text-ink-400 leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/navbat-olish" className="btn-gold">
                {t('home.ctaBook')} <FaArrowRight />
              </Link>
              <Link to="/xizmatlar" className="btn-outline">
                {t('home.ctaServices')}
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <p className="font-display text-3xl font-bold text-white">
                  <AnimatedCounter to={yearsExperience} />+
                </p>
                <p className="text-xs text-ink-500 mt-1">{t('home.statExperience')}</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-white">
                  <AnimatedCounter to={happyClientsCount} />+
                </p>
                <p className="text-xs text-ink-500 mt-1">{t('home.statClients')}</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-white flex items-center gap-1">
                  {avgRating} <FaStar className="text-gold-400 text-xl" />
                </p>
                <p className="text-xs text-ink-500 mt-1">{t('home.statRating')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-md"
          >
            <BarberPole />
            <motion.div
              className="absolute top-6 -left-6 card px-4 py-3 shadow-xl"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-xs text-ink-400">{t('home.todaySlotsLabel')}</p>
              <p className="text-lg font-bold text-gold-400">{t('home.todaySlotsValue')}</p>
            </motion.div>
            <motion.div
              className="absolute bottom-10 -right-6 card px-4 py-3 shadow-xl"
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <RatingStars value={5} />
              </div>
              <p className="text-xs text-ink-400 mt-1">{t('home.testimonialQuote')}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 border-t border-ink-900">
        <div className="container-x">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="section-title">{t('home.featuresTitle')}</h2>
            <p className="mt-3 text-ink-400">{t('home.featuresSubtitle')}</p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <div className="card h-full p-6 hover:border-gold-500/50 hover:-translate-y-1 transition-all duration-300">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 text-xl">
                    <f.icon />
                  </span>
                  <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-ink-400 leading-relaxed">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-20 border-t border-ink-900 bg-ink-900/30">
        <div className="container-x">
          <Reveal className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="section-title">{t('home.servicesTitle')}</h2>
              <p className="mt-3 text-ink-400 max-w-lg">{t('home.servicesSubtitle')}</p>
            </div>
            <Link to="/xizmatlar" className="btn-outline !px-5 !py-2 text-sm shrink-0">
              {t('home.viewAllServices')} <FaArrowRight />
            </Link>
          </Reveal>

          {servicesStatus === 'loading' ? (
            <Loader />
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredServices.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.06}>
                  <div className="card group h-full p-6 hover:border-gold-500/50 transition-colors duration-300">
                    <div className="flex items-start justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 text-xl group-hover:scale-110 transition-transform">
                        <ServiceIcon name={s.rasm} />
                      </span>
                      <span className="text-xs text-ink-500 flex items-center gap-1">
                        <FaClock /> {t('home.minutesShort', { count: s.davomiyligi })}
                      </span>
                    </div>
                    <AutoText as="h3" className="mt-4 font-semibold text-white" text={s.nomi} />
                    <AutoText as="p" className="mt-1.5 text-sm text-ink-400 line-clamp-2" text={s.tavsif} />
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-display text-lg font-bold text-gold-400">{formatSum(s.narxi)}</span>
                      <Link to="/navbat-olish" className="text-xs font-semibold text-white hover:text-gold-400">
                        {t('home.bookAction')}
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BARBERS */}
      <section className="py-20 border-t border-ink-900">
        <div className="container-x">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="section-title">{t('home.barbersTitle')}</h2>
            <p className="mt-3 text-ink-400">{t('home.barbersSubtitle')}</p>
          </Reveal>

          {barbersStatus === 'loading' ? (
            <Loader />
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {topBarbers.map((b, i) => (
                <Reveal key={b.id} delay={i * 0.08}>
                  <div className="card group overflow-hidden hover:border-gold-500/50 transition-colors duration-300">
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={getBarberImage(b.rasm)}
                        alt={b.ism}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white">{b.ism} {b.familiya}</h3>
                      <AutoText as="p" className="text-xs text-gold-400 mt-0.5" text={b.mutaxassislik} />
                      <div className="mt-2 flex items-center justify-between">
                        <RatingStars value={b.reyting} />
                        <span className="text-xs text-ink-500">{t('home.yearsShort', { count: b.tajriba })}</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          <Reveal className="mt-10 text-center">
            <Link to="/ustalar" className="btn-outline">
              {t('home.viewAllBarbers')} <FaArrowRight />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {reviews.length > 0 && (
        <section className="py-20 border-t border-ink-900 bg-ink-900/30">
          <div className="container-x">
            <Reveal className="text-center max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-gold-400">
                <RatingStars value={Number(avgRating)} />
                <span className="text-sm text-ink-400">{t('home.reviewsCount', { rating: avgRating, count: reviews.length })}</span>
              </div>
              <h2 className="section-title mt-3">{t('home.testimonialsTitle')}</h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pagedReviews.map((r, i) => (
                <Reveal key={r.id} delay={i * 0.08}>
                  <div className="card h-full p-6">
                    <RatingStars value={r.baho} />
                    <p className="mt-4 text-sm text-ink-300 leading-relaxed">
                      “<AutoText text={r.matn} />”
                    </p>
                    <p className="mt-4 text-sm font-semibold text-white">{r.mijozIsmi}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            {reviewPageCount > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setReviewPage(Math.max(0, safeReviewPage - 1))}
                  disabled={safeReviewPage === 0}
                  aria-label={t('home.reviewsPrev')}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-ink-300 transition-colors hover:border-gold-500 hover:text-gold-400 disabled:opacity-30 disabled:hover:border-ink-700 disabled:hover:text-ink-300"
                >
                  <FaChevronLeft />
                </button>
                <span className="text-sm text-ink-400">{safeReviewPage + 1} / {reviewPageCount}</span>
                <button
                  type="button"
                  onClick={() => setReviewPage(Math.min(reviewPageCount - 1, safeReviewPage + 1))}
                  disabled={safeReviewPage === reviewPageCount - 1}
                  aria-label={t('home.reviewsNext')}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-ink-300 transition-colors hover:border-gold-500 hover:text-gold-400 disabled:opacity-30 disabled:hover:border-ink-700 disabled:hover:text-ink-300"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* LOCATION / CTA */}
      <section className="py-20 border-t border-ink-900">
        <div className="container-x grid gap-10 lg:grid-cols-2 items-center">
          <Reveal>
            <h2 className="section-title">{t('home.locationTitle')}</h2>
            <p className="mt-3 text-ink-400 max-w-md">{t('home.locationSubtitle')}</p>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex items-center gap-3 text-ink-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/10 text-gold-400"><FaMapMarkerAlt /></span>
                <AutoText text={contact.manzil} />
              </li>
              <li className="flex items-center gap-3 text-ink-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/10 text-gold-400"><FaPhoneAlt /></span>
                {contact.telefon}
              </li>
              <li className="flex items-center gap-3 text-ink-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/10 text-gold-400"><FaClock /></span>
                <AutoText text={contact.ishVaqti} />
              </li>
            </ul>
            <Link to="/navbat-olish" className="btn-gold mt-8">
              {t('home.bookNow')} <FaArrowRight />
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="overflow-hidden rounded-2xl border border-ink-800 shadow-gold">
            <iframe
              title={t('common.mapTitle')}
              src="https://www.openstreetmap.org/export/embed.html?bbox=69.2154%2C41.2755%2C69.2554%2C41.2955&layer=mapnik&marker=41.2855%2C69.2354"
              className="h-80 w-full grayscale-[40%] contrast-125"
              loading="lazy"
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
