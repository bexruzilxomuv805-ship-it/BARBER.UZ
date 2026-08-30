import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FaMapMarkerAlt, FaPhoneAlt, FaClock, FaEnvelope, FaPaperPlane, FaInstagram, FaTelegramPlane } from 'react-icons/fa'
import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import AutoText from '../../components/AutoText'
import useConversationId from '../../hooks/useConversationId'
import { fetchContactInfo } from '../../features/contact/contactSlice'
import { sendMessage } from '../../features/chat/chatSlice'

const FALLBACK_INFO = {
  manzil: 'Toshkent sh., Chilonzor tumani, Bunyodkor ko‘chasi 12',
  telefon: '+998 90 123 45 67',
  email: 'info@zolotoybarber.uz',
  ishVaqti: 'Har kuni 09:00 – 21:00',
  instagram: '',
  telegram: '',
}

export default function Contact() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { info } = useSelector((s) => s.contact)
  const contact = info || FALLBACK_INFO
  const conversationId = useConversationId()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ ism: '', telefon: '', xabar: '' })

  useEffect(() => {
    dispatch(fetchContactInfo())
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    setSending(true)
    await dispatch(
      sendMessage({
        conversationId,
        userId: conversationId,
        userName: form.ism,
        sender: 'client',
        text: `${form.xabar}\n\n— ${form.ism}, ${form.telefon}`,
      })
    )
    setSending(false)
    setSent(true)
    setForm({ ism: '', telefon: '', xabar: '' })
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <div>
      <PageHero eyebrow={t('contact.eyebrow')} title={t('contact.title')} subtitle={t('contact.subtitle')} />

      <section className="container-x pb-24 grid gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="card p-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-gold-400"><FaMapMarkerAlt /></span>
              <div>
                <p className="text-sm font-semibold text-white">{t('contact.addressLabel')}</p>
                <AutoText as="p" className="text-sm text-ink-400" text={contact.manzil} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-gold-400"><FaPhoneAlt /></span>
              <div>
                <p className="text-sm font-semibold text-white">{t('contact.phoneLabel')}</p>
                <p className="text-sm text-ink-400">{contact.telefon}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-gold-400"><FaEnvelope /></span>
              <div>
                <p className="text-sm font-semibold text-white">{t('contact.emailLabel')}</p>
                <p className="text-sm text-ink-400">{contact.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-gold-400"><FaClock /></span>
              <div>
                <p className="text-sm font-semibold text-white">{t('contact.hoursLabel')}</p>
                <AutoText as="p" className="text-sm text-ink-400" text={contact.ishVaqti} />
              </div>
            </div>
            {(contact.instagram || contact.telegram) && (
              <div className="flex gap-3 pt-2">
                {contact.instagram && (
                  <a href={contact.instagram} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-800 text-gold-400 hover:border-gold-500">
                    <FaInstagram />
                  </a>
                )}
                {contact.telegram && (
                  <a href={contact.telegram} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-800 text-gold-400 hover:border-gold-500">
                    <FaTelegramPlane />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-ink-800 shadow-gold">
            <iframe
              title={t('common.mapTitle')}
              src="https://www.openstreetmap.org/export/embed.html?bbox=69.2154%2C41.2755%2C69.2554%2C41.2955&layer=mapnik&marker=41.2855%2C69.2354"
              className="h-72 w-full grayscale-[40%] contrast-125"
              loading="lazy"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-white">{t('contact.formTitle')}</h3>
            {sent ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-emerald-300"
              >
                {t('contact.sentMessage')}
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <input
                  required
                  value={form.ism}
                  onChange={(e) => setForm((f) => ({ ...f, ism: e.target.value }))}
                  placeholder={t('contact.namePlaceholder')}
                  className="input-field"
                />
                <input
                  required
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                  placeholder={t('contact.phonePlaceholder')}
                  className="input-field"
                />
                <textarea
                  required
                  rows={5}
                  value={form.xabar}
                  onChange={(e) => setForm((f) => ({ ...f, xabar: e.target.value }))}
                  placeholder={t('contact.messagePlaceholder')}
                  className="input-field resize-none"
                />
                <button type="submit" disabled={sending} className="btn-gold w-full disabled:opacity-60">
                  <FaPaperPlane /> {t('contact.submit')}
                </button>
                <p className="text-center text-xs text-ink-600">
                  {t('contact.supportHint')}
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  )
}
