import Anthropic from '@anthropic-ai/sdk'
import { getContactInfo } from './api.js'

const { ANTHROPIC_API_KEY } = process.env

// Same "feature stays off if unconfigured" pattern as TELEGRAM_BOT_TOKEN —
// no key means the Support chat just works as a plain human-only inbox.
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null

export function isAiEnabled() {
  return !!anthropic
}

const MODEL = 'claude-opus-5'
const MAX_REPLY_TOKENS = 400

// contactInfo rarely changes mid-conversation — avoid refetching it for
// every single client message in a poll batch.
let cachedContact = null
let cachedContactAt = 0
const CONTACT_CACHE_MS = 5 * 60 * 1000

async function getGroundedContact() {
  const now = Date.now()
  if (cachedContact && now - cachedContactAt < CONTACT_CACHE_MS) return cachedContact
  try {
    cachedContact = await getContactInfo()
  } catch {
    cachedContact = null
  }
  cachedContactAt = now
  return cachedContact
}

function buildSystemPrompt(contact) {
  return [
    'Sen "Zolotoy Barber" sartaroshxonasi saytining Support chatida ishlaydigan AI yordamchisan — mijozlarning birinchi murojaatiga darhol javob berasan, admin esa istalgan payt suhbatga qo\'shilishi mumkin.',
    '',
    'Ohang: samimiy, hurmatli, qisqa va tabiiy — o\'zbek tilida, "siz" murojaati bilan, ortiqcha rasmiylashtirmasdan. 1-3 gapdan oshmasin, mijoz aniq batafsil so\'ramasa.',
    '',
    'Bilishing mumkin bo\'lgan aloqa ma\'lumotlari (faqat so\'ralsa yoki kerak bo\'lsa ayt, har safar takrorlama):',
    `— Manzil: ${contact?.manzil || 'saytning "Aloqa" bo\'limida bor'}`,
    `— Ish vaqti: ${contact?.ishVaqti || 'saytning "Aloqa" bo\'limida bor'}`,
    `— Telefon: ${contact?.telefon || 'saytning "Aloqa" bo\'limida bor'}`,
    '',
    'Qat\'iy qoidalar:',
    '1. Xizmat narxlari, davomiyligi yoki ustalarning bo\'sh vaqti haqida so\'ralsa — hech qachon raqamni o\'zing to\'qib chiqarma. Saytning "Xizmatlar" yoki "Ustalar" sahifasiga, yoxud "Navbat olish" formasiga yo\'naltir.',
    '2. Mavjud bron holati (masalan "mening navbatim tasdiqlandimi") haqida so\'ralsa — buni bilmasliging va profildagi "Mening navbatlarim" bo\'limidan yoki admindan aniqlash kerakligini ayt.',
    '3. Shikoyat, pul qaytarish, maxsus istisno so\'ralsa yoki xabar noaniq/g\'alati bo\'lsa — o\'zing hal qilishga urinma, faqat: "Buni administratorga yetkazdim, tez orada javob beradi" deb javob ber.',
    '4. Hech qachon va\'da, muddat yoki chegirma to\'qib chiqarma.',
    '5. Faqat sartaroshxona xizmatlariga oid savollarga javob ber — boshqa mavzu so\'ralsa, muloyimlik bilan mavzuga qaytar.',
  ].join('\n')
}

const ROLE_BY_SENDER = { client: 'user', admin: 'assistant' }

// `history` is this conversation's recent messages (oldest first, as
// returned by getConversationMessages) — the triggering client message is
// already its last entry. Returns null on any failure or when AI is
// unconfigured, so callers can just skip auto-replying.
export async function generateAiReply(history) {
  if (!anthropic || !history?.length) return null

  const messages = history
    .map((m) => ({ role: ROLE_BY_SENDER[m.sender], content: m.text }))
    .filter((m) => m.role)
  // The API requires the first message to be role "user" — if the fetched
  // window happens to start mid-conversation on an admin/AI message (e.g.
  // this conversation has more history than the window covers), drop
  // leading assistant turns rather than sending an invalid request.
  while (messages.length && messages[0].role !== 'user') messages.shift()
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null

  try {
    const contact = await getGroundedContact()
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      output_config: { effort: 'low' },
      system: buildSystemPrompt(contact),
      messages,
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.text?.trim() || null
  } catch (err) {
    console.error('[bot] AI reply error:', err?.message || err)
    return null
  }
}
