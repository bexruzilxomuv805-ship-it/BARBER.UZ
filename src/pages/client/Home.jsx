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
import { SkeletonBlock, SkeletonCardGrid } from '../../components/Skeleton'
import AutoText from '../../components/AutoText'
import InstallPwaPrompt from '../../components/InstallPwaPrompt'
import ShopMap from '../../components/ShopMap'
import { fetchServices } from '../../features/services/servicesSlice'
import { fetchBarbers } from '../../features/barbers/barbersSlice'
import { fetchReviews } from '../../features/reviews/reviewsSlice'
import { fetchAppointments } from '../../features/appointments/appointmentsSlice'
import { fetchShops } from '../../features/sartaroshxonalar/sartaroshxonalarSlice'
import { getBarberImage } from '../../assets/images'
import { formatSum } from '../../utils/format'
import {
  isBarberOff, toLocalDateIso, FALLBACK_WORK_RANGE, SLOT_STEP_MIN, DEFAULT_DURATION_MIN, toMinutes, parseWorkRange,
} from '../../utils/schedule'

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
  const { items: shops } = useSelector((s) => s.sartaroshxonalar)
  const contact = contactInfo || FALLBACK_CONTACT
  const features = t('home.features', { returnObjects: true }).map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] }))
  const mapShops = shops.map((s) => ({ ...s, linkLabel: t('shops.detailsAction') }))

  useEffect(() => {
    dispatch(fetchServices())
    dispatch(fetchBarbers())
    dispatch(fetchReviews())
    dispatch(fetchAppointments())
    dispatch(fetchShops())
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

  // Newest review first — the API returns them in no particular order, and
  // a freshly submitted review should always land in the first grid slot
  // instead of wherever the backend happened to return it. `id` (which
  // embeds its creation timestamp, see createReview) is the tiebreaker for
  // same-day reviews, since `sana` alone is just a date with no time.
  const sortedReviews = useMemo(
    () => [...reviews].sort((a, b) => (b.sana || '').localeCompare(a.sana || '') || (b.id || '').localeCompare(a.id || '')),
    [reviews]
  )

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
    () => sortedReviews.slice(safeReviewPage * reviewPageSize, safeReviewPage * reviewPageSize + reviewPageSize),
    [sortedReviews, safeReviewPage, reviewPageSize]
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

  // Real remaining slot count for today, across every working barber — not a
  // hardcoded "7 ta vaqt". Mirrors Booking.jsx's own per-barber slot math
  // (see utils/schedule.js), just summed over all barbers instead of one.
  const todayAvailableSlots = useMemo(() => {
    const todayIso = toLocalDateIso()
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    let count = 0
    barbers.forEach((barber) => {
      if (isBarberOff(barber, todayIso)) return
      const range = parseWorkRange(barber.ishVaqti) || FALLBACK_WORK_RANGE
      const occupied = appointments
        .filter((a) => a.barberId === barber.id && a.sana === todayIso && a.holat !== 'bekor qilingan')
        .map((a) => {
          const duration = services.find((s) => s.id === a.xizmatId)?.davomiyligi || DEFAULT_DURATION_MIN
          const start = toMinutes(a.vaqt)
          return [start, start + duration]
        })
      for (let m = range.start; m < range.end; m += SLOT_STEP_MIN) {
        if (m <= nowMinutes) continue
        const end = m + DEFAULT_DURATION_MIN
        if (end > range.end) continue
        const blocked = occupied.some(([s, e]) => m < e && end > s)
        if (!blocked) count++
      }
    })
    return count
  }, [barbers, appointments, services])

  // Most recent real review with actual text, so the hero testimonial isn't
  // a hardcoded quote — falls back to any review (even a text-less rating)
  // if nobody has left a written one yet.
  const latestReview = useMemo(() => {
    if (!sortedReviews.length) return null
    const withText = sortedReviews.filter((r) => r.matn?.trim())
    return (withText.length ? withText : sortedReviews)[0]
  }, [sortedReviews])

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
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.1] text-strong">
              {t('home.heroTitlePre')} <span className="gold-text">{t('home.heroTitleHighlight')}</span> {t('home.heroTitlePost')}
            </h1>
            <p className="mt-6 max-w-lg text-ink-400 leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/navbat-olish" className="btn-gold">
                {t('home.ctaBook')} <FaArrowRight />
              </Link>
              <Link to="/navbat-olish" className="btn-outline">
                {t('home.ctaServices')}
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <p className="font-display text-3xl font-bold text-strong">
                  <AnimatedCounter to={yearsExperience} />+
                </p>
                <p className="text-xs text-ink-500 mt-1">{t('home.statExperience')}</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-strong">
                  <AnimatedCounter to={happyClientsCount} />+
                </p>
                <p className="text-xs text-ink-500 mt-1">{t('home.statClients')}</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-strong flex items-center gap-1">
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
              className="absolute top-6 -left-24 card px-4 py-3 shadow-xl"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-xs text-ink-400">{t('home.todaySlotsLabel')}</p>
              <p className="text-lg font-bold text-gold-400">
                {t('home.todaySlotsValue', { count: todayAvailableSlots })}
              </p>
            </motion.div>
            <motion.div
              className="absolute bottom-10 -right-24 card px-4 py-3 shadow-xl"
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <RatingStars value={latestReview?.baho ?? 5} />
              </div>
              <p className="text-xs text-ink-400 mt-1 max-w-[11rem] line-clamp-2">
                {latestReview?.matn ? `“${latestReview.matn}”` : t('home.testimonialQuote')}
              </p>
              {latestReview?.mijozIsmi && (
                <p className="text-[10px] text-ink-500 mt-1">— {latestReview.mijozIsmi.split(' ')[0]}</p>
              )}
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
                  <h3 className="mt-4 font-semibold text-strong">{f.title}</h3>
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
            <Link to="/navbat-olish" className="btn-outline !px-5 !py-2 text-sm shrink-0">
              {t('home.viewAllServices')} <FaArrowRight />
            </Link>
          </Reveal>

          {servicesStatus === 'loading' ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-40 w-full" />
              ))}
            </div>
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
                    <AutoText as="h3" className="mt-4 font-semibold text-strong" text={s.nomi} />
                    <AutoText as="p" className="mt-1.5 text-sm text-ink-400 line-clamp-2" text={s.tavsif} />
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-display text-lg font-bold text-gold-400">{formatSum(s.narxi)}</span>
                      <Link to="/navbat-olish" className="text-xs font-semibold text-strong hover:text-gold-400">
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
            <SkeletonCardGrid count={4} className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4" />
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {topBarbers.map((b, i) => (
                <Reveal key={b.id} delay={i * 0.08}>
                  <Link
                    to={b.sartaroshxonaId ? `/sartaroshxonalar/${b.sartaroshxonaId}` : '/sartaroshxonalar'}
                    className="card group block overflow-hidden hover:border-gold-500/50 transition-colors duration-300"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={getBarberImage(b.rasm)}
                        alt={b.ism}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Hidden until hover/tap — reveals price + a CTA over a
                          dark gradient instead of permanently occupying card
                          space, so the plain card stays clean at rest. */}
                      <div className="keep-dark absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="translate-y-2 text-sm font-semibold text-gold-400 transition-transform duration-300 group-hover:translate-y-0">
                          {t('barbers.startingFrom', { price: formatSum(b.narxBoshlanishi) })}
                        </span>
                        <span className="mt-1 flex translate-y-2 items-center gap-1.5 text-xs font-medium text-white transition-transform duration-300 delay-75 group-hover:translate-y-0">
                          {t('barbers.detailsAction')} <FaArrowRight className="text-[10px]" />
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-strong">{b.ism} {b.familiya}</h3>
                      <AutoText as="p" className="text-xs text-gold-400 mt-0.5" text={b.mutaxassislik} />
                      <div className="mt-2 flex items-center justify-between">
                        <RatingStars value={b.reyting} />
                        <span className="text-xs text-ink-500">{t('home.yearsShort', { count: b.tajriba })}</span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}

          <Reveal className="mt-10 text-center">
            <Link to="/sartaroshxonalar" className="btn-outline">
              {t('home.viewAllShops')} <FaArrowRight />
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
                    <p className="mt-4 text-sm font-semibold text-strong">{r.mijozIsmi}</p>
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
          <Reveal delay={0.1} className="shadow-gold">
            {mapShops.length > 0 ? (
              <ShopMap shops={mapShops} className="h-80 w-full" />
            ) : (
              <ShopMap lat={41.2855} lng={69.2354} className="h-80 w-full" />
            )}
          </Reveal>
        </div>
      </section>
    </div>
  )
}
