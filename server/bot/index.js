import 'dotenv/config'
import http from 'node:http'
import TelegramBot from 'node-telegram-bot-api'

// Render's free tier only exists for "Web Service" instances, which require
// binding to $PORT for health checks — this bot has no HTTP API of its own
// (it only long-polls Telegram), so this dummy server exists purely to keep
// the free-tier deploy alive.
if (process.env.PORT) {
  http
    .createServer((_req, res) => res.end('ok'))
    .listen(process.env.PORT, () => console.log(`[bot] health check server on :${process.env.PORT}`))
}

// A single bad request (e.g. Telegram rejecting a malformed button URL) must
// never take the whole bot down — log and keep running instead of crashing.
process.on('unhandledRejection', (err) => {
  console.error('[bot] unhandled rejection:', err?.message || err)
})
process.on('uncaughtException', (err) => {
  console.error('[bot] uncaught exception:', err?.message || err)
})
import {
  getUnnotifiedClientMessages,
  postAdminReply,
  getConversation,
  getUnnotifiedPendingAppointments,
  markAppointmentNotified,
  setAppointmentStatus,
  getAllAppointments,
  markAppointmentReminded,
  markAppointmentArrivalAsked,
  setAppointmentArrival,
  getServiceById,
  getPaymentByAppointment,
  createPayment,
  updatePaymentMethod,
  getUnnotifiedNewClients,
  markUserNotified,
  getTelegramLogin,
  confirmTelegramLogin,
  findUserByTelegramId,
  createTelegramUser,
  setUserPhone,
  getBotUsers,
  setUserRole,
  deleteUser,
  markMessageForwarded,
  getEditedForwardedMessages,
  markMessageEditSynced,
  getUnnotifiedAdminMessages,
  getUserAppointments,
  settleAfterWrite,
  getUser,
  getBarber,
  getContactInfo,
  postClientMessageFromBot,
  getAppointmentById,
  getInventory,
  markInventoryLowStockNotified,
  getUnreviewedCompletedAppointments,
  markReviewRequested,
  createReview,
  updateReview,
  getReviewsByBarber,
  setBarberRating,
} from './api.js'

const POLL_MS = 5000
const REMINDER_POLL_MS = 60000
const REMINDER_WINDOW_MIN = 15
const DIGEST_HOUR = 22
const { TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, TELEGRAM_SUPER_ADMIN_USERNAME } = process.env

// Card payment details shown to a client who picks "Karta" after their
// service is auto-completed — hardcoded for now (single-card setup).
const PAYMENT_CARD_NUMBER = '5614 6818 0907 0117'
const PAYMENT_CARD_HOLDER = 'R.D.A'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Wraps a bot.on(...) handler so a thrown/rejected error inside it is logged
// instead of becoming an unhandled rejection that kills the whole process.
function safeHandler(fn) {
  return async (...args) => {
    try {
      await fn(...args)
    } catch (err) {
      console.error('[bot] handler error:', err?.message || err)
    }
  }
}

if (!TELEGRAM_BOT_TOKEN) {
  console.log("[bot] Telegram bot o'chirilgan — .env faylida TELEGRAM_BOT_TOKEN yo'q. .env.example ga qarang.")
  process.exit(0)
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })
const adminChatId = TELEGRAM_ADMIN_CHAT_ID ? String(TELEGRAM_ADMIN_CHAT_ID) : null

// Regular emoji used throughout this file, mapped to the matching Telegram
// Premium (custom) emoji id — captured via the super-admin's own Premium
// account (see the custom_emoji capture utility below). Every outgoing
// message is patched (see withPremiumEmoji/bot.sendMessage below) to swap
// these in automatically, so no individual call site needs to change.
const PREMIUM_EMOJI_IDS = {
  '✅': '5436196151575459790',
  '❌': '5436388334182086530',
  '⭐': '5897692655273383739',
  '✔️': '5206607081334906820',
  '⏰': '5195352914104694560',
  '⬇️': '5406745015365943482',
  '▶️': '4969785943297884856',
  '✏️': '5192670896006897974',
  '🗑️': '5445267414562389170',
  '👇': '5231102735817918643',
  '📢': '5278256077954105203',
  '👑': '5406711411541823609',
  '👤': '6044125665400197078',
  '✂️': '5422781517011111694',
  '✉️': '5253742260054409879',
  'ℹ️': '5440660757194744323',
  '📞': '5436206493856707442',
  '💬': '5443038326535759644',
  '📅': '5242228225827936324',
  '🕓': '5256110612395605858',
  '💵': '5242490854488152537',
  '💇': '5388738068624716772',
  '🆕': '5294524383279198295',
  '⚠️': '5420323339723881652',
  '🗓️': '5274055917766202507',
  '📊': '5231200819986047254',
  '👥': '6001526766714227911',
  '🚫': '5240241223632954241',
  '📍': '5391032818111363540',
  '🕐': '6048701411888206453',
}

function buildPremiumEntities(text) {
  if (typeof text !== 'string') return []
  const entities = []
  for (const [emoji, customEmojiId] of Object.entries(PREMIUM_EMOJI_IDS)) {
    let idx = text.indexOf(emoji)
    while (idx !== -1) {
      entities.push({ type: 'custom_emoji', offset: idx, length: emoji.length, custom_emoji_id: customEmojiId })
      idx = text.indexOf(emoji, idx + emoji.length)
    }
  }
  entities.sort((a, b) => a.offset - b.offset)
  return entities
}

function withPremiumEmoji(text, options) {
  if (options?.parse_mode) return options // entities and parse_mode are mutually exclusive
  const entities = buildPremiumEntities(text)
  if (!entities.length) return options
  return { ...(options || {}), entities }
}

// Patch once here so every bot.sendMessage/editMessageText call in this file
// automatically gets Premium emoji — no per-call-site changes needed.
const _sendMessage = bot.sendMessage.bind(bot)
bot.sendMessage = (chatId, text, options) => _sendMessage(chatId, text, withPremiumEmoji(text, options))

const _editMessageText = bot.editMessageText.bind(bot)
bot.editMessageText = (text, options) => _editMessageText(text, withPremiumEmoji(text, options))

// Reply-routing: which conversation a given Telegram message (sent by the
// bot to the admin) corresponds to, plus the most recent one as a fallback
// for plain (non-reply) admin replies. In-memory only — resets on restart,
// which is fine at this app's scale (single admin, low volume).
const conversationByTelegramMsgId = new Map()

// chatId -> { userId, token }, set right after a Telegram /start while we
// wait for the user to share their phone number. The login token is only
// confirmed (site login unlocked) once the phone is on file.
const awaitingPhoneForChat = new Map()

// telegramId -> reviewId, set after a rating is tapped while we wait for an
// optional follow-up text comment on that review.
const awaitingReviewCommentForChat = new Map()

// chatId set of clients who pressed "Admin bilan chat" — only their plain
// text gets forwarded to the admin, same as admin messages only route
// somewhere once they explicitly "Reply" to a client's message.
const clientChatMode = new Set()

// chatId set / map for the "📢 Xabar yuborish" compose flow.
const awaitingBroadcastForChat = new Set()
const awaitingBroadcastEditForChat = new Map() // chatId -> broadcastId

let lastDigestDate = null

// `${chatId}:${listKind}` -> message_id[] of the currently-shown page's item
// cards (plus its "Keyingi" button message, if any) — cleared and replaced
// in place on the next page instead of piling up new messages forever.
const activeListCards = new Map()

async function clearListCards(chatId, listKind) {
  const key = `${chatId}:${listKind}`
  const ids = activeListCards.get(key)
  if (!ids) return
  activeListCards.delete(key)
  for (const messageId of ids) {
    try {
      await bot.deleteMessage(chatId, messageId)
    } catch {
      // already gone (e.g. user deleted it) — ignore
    }
  }
}

// Builds a [◀️ Oldingi 5 ta, ▶️ Keyingi 5 ta] row for a paginated list —
// either button is included only when that direction actually has more items.
function buildPageNavRow(action, offset, pageSize, total) {
  const buttons = []
  if (offset > 0) {
    buttons.push({ text: '◀️ Oldingi 5 ta', callback_data: `${action}:${Math.max(0, offset - pageSize)}` })
  }
  const nextOffset = offset + pageSize
  if (nextOffset < total) {
    buttons.push({ text: '▶️ Keyingi 5 ta', callback_data: `${action}:${nextOffset}` })
  }
  return buttons
}

async function withRetry(fn, retries = 1, delayMs = 600) {
  try {
    return await fn()
  } catch (err) {
    if (retries <= 0) throw err
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return withRetry(fn, retries - 1, delayMs)
  }
}

async function confirmWithVerify(token, userId) {
  try {
    await withRetry(() => confirmTelegramLogin(token, userId), 2, 800)
    return true
  } catch (err) {
    console.error('[bot] confirm login error:', err?.message || err)
    // The write may have landed even though the response didn't come back —
    // check ground truth before declaring failure.
    const login = await getTelegramLogin(token).catch(() => null)
    return login?.status === 'confirmed'
  }
}

function isFromAdmin(msg) {
  return adminChatId && String(msg.chat.id) === adminChatId
}

function isSuperAdminUsername(username) {
  return !!TELEGRAM_SUPER_ADMIN_USERNAME && username?.toLowerCase() === TELEGRAM_SUPER_ADMIN_USERNAME.toLowerCase()
}

function isSuperAdmin(msgOrQuery) {
  return isSuperAdminUsername(msgOrQuery.from?.username)
}

function formatBotUser(u) {
  const role = u.role === 'admin' ? '👑 Admin' : '👤 Oddiy foydalanuvchi'
  return (
    `${u.ism || ''} ${u.familiya || ''}`.trim() +
    (u.telegramUsername ? ` (@${u.telegramUsername})` : '') +
    `\n\u{1F4DE} ${u.telefon || '—'}\n${role}`
  )
}

function formatClientChatMessage(message) {
  return `\u{1F4AC} ${message.userName || 'Mijoz'}\n${message.text}`
}

function formatAdminChatMessage(message) {
  return `\u{1F464} Admin:\n${message.text}`
}

async function forwardClientMessages() {
  const messages = await getUnnotifiedClientMessages()
  for (const message of messages) {
    if (!adminChatId) break
    const sent = await bot.sendMessage(adminChatId, formatClientChatMessage(message))
    conversationByTelegramMsgId.set(sent.message_id, message.conversationId)
    await markMessageForwarded(message.id, { chatId: adminChatId, messageId: sent.message_id, text: message.text })
  }
}

// Admin replies typed on the site's Support chat page (AdminChat.jsx) only
// ever get saved to json-server — unlike replies typed directly in Telegram
// (which mirror to the client immediately, see postAdminReply below), these
// never reached the client's Telegram chat at all. This pushes them out.
async function forwardAdminMessages() {
  const messages = await getUnnotifiedAdminMessages()
  for (const message of messages) {
    const user = await getUser(message.userId).catch(() => null)
    if (user?.telegramId) {
      try {
        const sent = await bot.sendMessage(user.telegramId, formatAdminChatMessage(message))
        await markMessageForwarded(message.id, { chatId: user.telegramId, messageId: sent.message_id, text: message.text })
        continue
      } catch (err) {
        console.error('[bot] forward admin message error:', message.id, err?.message || err)
      }
    }
    // No linked Telegram account (or the send failed) — mark it notified
    // anyway so it isn't retried forever; tgChatId/tgMessageId stay unset,
    // so it's simply skipped by syncEditedMessages below.
    await markMessageForwarded(message.id, { chatId: null, messageId: null, text: message.text })
  }
}

// A client or admin can edit an already-forwarded message from the site's
// chat UI (ChatWidget.jsx / AdminChat.jsx) — this mirrors that edit into
// whichever Telegram chat it was forwarded to, by editing that same message
// in place, instead of leaving the stale original text sitting there.
async function syncEditedMessages() {
  const edited = await getEditedForwardedMessages()
  for (const message of edited) {
    try {
      const text = message.sender === 'admin' ? formatAdminChatMessage(message) : formatClientChatMessage(message)
      await bot.editMessageText(text, { chat_id: message.tgChatId, message_id: message.tgMessageId })
    } catch (err) {
      console.error('[bot] sync edited message error:', message.id, err?.message || err)
    }
    await markMessageEditSynced(message.id, message.text)
  }
}

function formatAppointment(a) {
  return (
    `\u{1F4C5} Yangi navbat\n` +
    `\u{1F464} ${a.mijozIsmi || 'Mijoz'} (${a.mijozTelefon || '—'})\n` +
    `✂️ ${a.xizmatNomi || '—'} — ${a.barberIsmi || '—'}\n` +
    `\u{1F553} ${a.sana} ${a.vaqt}` +
    (a.narxi ? `\n\u{1F4B5} ${a.narxi.toLocaleString?.('ru-RU') ?? a.narxi} so'm` : '')
  )
}

async function notifyClientOfBooking(appointment) {
  try {
    const user = await getUser(appointment.mijozId)
    if (!user?.telegramId) return
    const barber = await getBarber(appointment.barberId)
    await bot.sendMessage(
      user.telegramId,
      `✅ Navbatingiz qabul qilindi!\n` +
        `✂️ ${appointment.xizmatNomi || '—'}\n` +
        `\u{1F487} Usta: ${appointment.barberIsmi || '—'}${barber?.telefon ? ` (${barber.telefon})` : ''}\n` +
        `\u{1F553} ${appointment.sana} ${appointment.vaqt}` +
        (appointment.narxi ? `\n\u{1F4B5} ${formatMoney(appointment.narxi)}` : '') +
        `\n\nHolat: kutilmoqda — admin tasdiqlagach xabar beramiz.`
    )
  } catch (err) {
    console.error('[bot] notify client error:', err?.message || err)
  }
}

async function forwardAppointments() {
  const appointments = await getUnnotifiedPendingAppointments()
  for (const appointment of appointments) {
    if (adminChatId) {
      await bot.sendMessage(adminChatId, formatAppointment(appointment), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Tasdiqlash', callback_data: `confirm:${appointment.id}` },
              { text: '❌ Bekor qilish', callback_data: `cancel:${appointment.id}` },
            ],
          ],
        },
      })
    }
    await notifyClientOfBooking(appointment)
    await markAppointmentNotified(appointment.id)
  }
}

async function forwardNewClients() {
  const users = await getUnnotifiedNewClients()
  for (const u of users) {
    if (!adminChatId) break
    await bot.sendMessage(
      adminChatId,
      `\u{1F195} Yangi mijoz ro'yxatdan o'tdi\n` +
        `\u{1F464} ${u.ism || ''} ${u.familiya || ''}`.trim() +
        `\n\u{1F4DE} ${u.telefon || '—'}\n✉️ ${u.email || (u.telegramUsername && `@${u.telegramUsername}`) || '—'}`
    )
    await markUserNotified(u.id)
  }
}

async function requestReviews() {
  const appointments = await getUnreviewedCompletedAppointments()
  for (const a of appointments) {
    // Mark first regardless of outcome so a non-Telegram client (or a send
    // failure) doesn't get retried forever on every poll.
    await markReviewRequested(a.id)

    const user = await getUser(a.mijozId).catch(() => null)
    if (!user?.telegramId) continue

    try {
      await bot.sendMessage(
        user.telegramId,
        `⭐ "${a.xizmatNomi || 'Xizmat'}" xizmatidan mamnun bo'ldingizmi?\nUsta: ${a.barberIsmi || '—'}\n\nBaho bering:`,
        {
          reply_markup: {
            inline_keyboard: [[1, 2, 3, 4, 5].map((n) => ({ text: '⭐'.repeat(n), callback_data: `rate:${a.id}:${n}` }))],
          },
        }
      )
    } catch (err) {
      console.error('[bot] review request error:', err?.message || err)
    }
  }
}

async function checkLowStock() {
  if (!adminChatId) return
  try {
    const items = await getInventory()
    for (const item of items) {
      const isLow = (item.miqdor ?? 0) <= (item.minMiqdor ?? 0)
      if (isLow && !item.tgLowStockNotified) {
        await bot.sendMessage(
          adminChatId,
          `\u{26A0}️ Omborda kam qoldi!\n${item.nomi}: ${item.miqdor} ${item.birlik} ` +
            `(minimal: ${item.minMiqdor} ${item.birlik})`
        )
        await markInventoryLowStockNotified(item.id, true)
      } else if (!isLow && item.tgLowStockNotified) {
        await markInventoryLowStockNotified(item.id, false)
      }
    }
  } catch (err) {
    console.error('[bot] low stock check error:', err?.message || err)
  }
}

async function maybeSendDailyDigest() {
  if (!adminChatId) return
  const today = todayStr()
  if (lastDigestDate === today) return
  if (getTashkentNow().hour < DIGEST_HOUR) return
  lastDigestDate = today
  try {
    const stats = await buildStatsText()
    await bot.sendMessage(adminChatId, `\u{1F4C5} Kunlik hisobot\n\n${stats}`)
  } catch (err) {
    console.error('[bot] daily digest error:', err?.message || err)
  }
}

async function poll() {
  try {
    await forwardClientMessages()
    await forwardAdminMessages()
    await syncEditedMessages()
    await forwardAppointments()
    await forwardNewClients()
    await requestReviews()
  } catch (err) {
    console.error('[bot] poll error:', err?.message || err)
  }
}

// Render's server clock runs in UTC, not Uzbekistan time — every "what's
// today" / "what time is it" / "is this appointment's time here yet" check
// in this file needs the shop's actual local time (Asia/Tashkent, a fixed
// UTC+5 with no DST), not the server's. Intl.DateTimeFormat reads that
// regardless of the process's own configured timezone.
const BUSINESS_TIMEZONE = 'Asia/Tashkent'
const TASHKENT_UTC_OFFSET_HOURS = 5

function getTashkentNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

// The real Date instant for HH:MM on *today's* Tashkent calendar date — safe
// to compare directly against `new Date()` (always a real, timezone-
// independent instant). `minute` may safely exceed 59 (e.g. start + a
// service's duration); Date.UTC normalizes the overflow correctly.
function tashkentTimeToday(hour, minute) {
  const { year, month, day } = getTashkentNow()
  return new Date(Date.UTC(year, month - 1, day, hour - TASHKENT_UTC_OFFSET_HOURS, minute))
}

function todayStr() {
  const { year, month, day } = getTashkentNow()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatMoney(n) {
  return `${(n || 0).toLocaleString('ru-RU')} so'm`
}

const BTN_BUGUN = "\u{1F4C5} Bugungi navbatlar"
const BTN_NAVBATLAR = "\u{1F5D3}️ Kelayotgan navbatlar"
const BTN_STATS = "\u{1F4CA} Statistika"
const BTN_USERS = "\u{1F465} Foydalanuvchilar"
const BTN_BROADCAST = "\u{1F4E2} Xabar yuborish"

const MENU_KEYBOARD = {
  reply_markup: {
    keyboard: [
      [{ text: BTN_BUGUN }, { text: BTN_NAVBATLAR }],
      [{ text: BTN_STATS }, { text: BTN_USERS }],
      [{ text: BTN_BROADCAST }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  },
}

const BTN_MY_APPOINTMENTS = "\u{1F5D3}️ Mening navbatlarim"
const BTN_HELP = "ℹ️ Yordam"
const BTN_CHAT = "\u{1F4AC} Admin bilan chat"

const CLIENT_KEYBOARD = {
  reply_markup: {
    keyboard: [[{ text: BTN_MY_APPOINTMENTS }], [{ text: BTN_HELP }, { text: BTN_CHAT }]],
    resize_keyboard: true,
    is_persistent: true,
  },
}

async function buildBugunText() {
  const all = await getAllAppointments()
  const today = todayStr()
  const list = all.filter((a) => a.sana === today).sort((a, b) => (a.vaqt || '').localeCompare(b.vaqt || ''))
  if (!list.length) return "Bugun hech qanday navbat yo'q."
  const lines = list.map(
    (a) => `${a.vaqt} — ${a.mijozIsmi} (${a.mijozTelefon || '—'})\n${a.xizmatNomi} — ${a.barberIsmi} [${a.holat}]`
  )
  return `\u{1F4C5} Bugungi navbatlar (${today}):\n\n${lines.join('\n\n')}`
}

const LIST_PAGE_SIZE = 5

function getUpcomingActionableAppointments(all) {
  const today = todayStr()
  return all
    .filter((a) => a.sana >= today && a.holat !== 'bekor qilingan' && a.holat !== 'yakunlangan')
    .sort((a, b) => `${a.sana}${a.vaqt}`.localeCompare(`${b.sana}${b.vaqt}`))
}

function formatNavbatCard(a) {
  return (
    `${a.sana} ${a.vaqt} — ${a.mijozIsmi || 'Mijoz'} (${a.mijozTelefon || '—'})\n` +
    `✂️ ${a.xizmatNomi || '—'} — ${a.barberIsmi || '—'}\n` +
    `Holat: ${a.holat}`
  )
}

async function sendNavbatlarPage(chatId, offset, { fresh = false } = {}) {
  const all = await getAllAppointments()
  const list = getUpcomingActionableAppointments(all)

  if (!list.length) {
    await bot.sendMessage(chatId, "Kelayotgan navbatlar yo'q.")
    return
  }

  const page = list.slice(offset, offset + LIST_PAGE_SIZE)
  if (!page.length) {
    await bot.sendMessage(chatId, "Boshqa navbat yo'q.")
    return
  }

  await clearListCards(chatId, 'navbatlar')
  if (fresh) {
    await bot.sendMessage(chatId, `\u{1F5D3}️ Kelayotgan navbatlar (${list.length} ta):`)
  }

  const cardIds = []
  for (const a of page) {
    const buttons =
      a.holat === 'kutilmoqda'
        ? [
            { text: '✅ Tasdiqlash', callback_data: `confirm:${a.id}` },
            { text: '❌ Bekor qilish', callback_data: `cancel:${a.id}` },
          ]
        : [
            { text: '✔️ Yakunlash', callback_data: `complete:${a.id}` },
            { text: '❌ Bekor qilish', callback_data: `cancel:${a.id}` },
          ]
    const sent = await bot.sendMessage(chatId, formatNavbatCard(a), { reply_markup: { inline_keyboard: [buttons] } })
    cardIds.push(sent.message_id)
  }

  const navRow = buildPageNavRow('navbatlarpage', offset, LIST_PAGE_SIZE, list.length)
  if (navRow.length) {
    const sentBtn = await bot.sendMessage(chatId, `${offset + 1}-${Math.min(offset + LIST_PAGE_SIZE, list.length)} / ${list.length}`, {
      reply_markup: { inline_keyboard: [navRow] },
    })
    cardIds.push(sentBtn.message_id)
  }

  activeListCards.set(`${chatId}:navbatlar`, cardIds)
}

async function buildStatsText() {
  const all = await getAllAppointments()
  const today = todayStr()

  const byStatus = {}
  let totalRevenue = 0
  all.forEach((a) => {
    byStatus[a.holat] = (byStatus[a.holat] || 0) + 1
    if (a.holat === 'yakunlangan') totalRevenue += a.narxi || 0
  })

  const todays = all.filter((a) => a.sana === today)
  const todaysRevenue = todays
    .filter((a) => a.holat === 'yakunlangan')
    .reduce((sum, a) => sum + (a.narxi || 0), 0)

  const byBarber = {}
  all.forEach((a) => {
    if (a.barberIsmi) byBarber[a.barberIsmi] = (byBarber[a.barberIsmi] || 0) + 1
  })
  const busiest = Object.entries(byBarber).sort((a, b) => b[1] - a[1])[0]

  const botUsers = await getBotUsers().catch(() => [])
  const usernameById = new Map(botUsers.map((u) => [u.id, u.telegramUsername]))

  const recent = [...all].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 10)

  const header = [
    `\u{1F4CA} Statistika`,
    '',
    `Jami navbatlar: ${all.length}`,
    `— Kutilmoqda: ${byStatus['kutilmoqda'] || 0}`,
    `— Tasdiqlangan: ${byStatus['tasdiqlangan'] || 0}`,
    `— Yakunlangan: ${byStatus['yakunlangan'] || 0}`,
    `— Bekor qilingan: ${byStatus['bekor qilingan'] || 0}`,
    '',
    `Umumiy tushum (yakunlangan): ${formatMoney(totalRevenue)}`,
    `Bugungi (${today}) navbatlar: ${todays.length}, tushum: ${formatMoney(todaysRevenue)}`,
    busiest ? `Eng band usta: ${busiest[0]} (${busiest[1]} ta)` : null,
  ]
    .filter(Boolean)
    .join('\n')

  if (!recent.length) {
    return `${header}\n\nHali bronlar yo'q.`
  }

  const recentEntries = recent
    .map((a) => {
      const username = usernameById.get(a.mijozId)
      return (
        `${a.sana} ${a.vaqt} — ${a.mijozIsmi || 'Mijoz'} (${a.mijozTelefon || '—'})${username ? ` @${username}` : ''}\n` +
        `${a.xizmatNomi || '—'} [${a.holat}]`
      )
    })
    .join('\n\n')

  return `${header}\n\n\u{1F553} Oxirgi ${recent.length} ta bron:\n\n${recentEntries}`
}

async function buildStatsHeader() {
  const all = await getAllAppointments()
  const today = todayStr()

  const byStatus = {}
  let totalRevenue = 0
  all.forEach((a) => {
    byStatus[a.holat] = (byStatus[a.holat] || 0) + 1
    if (a.holat === 'yakunlangan') totalRevenue += a.narxi || 0
  })

  const todays = all.filter((a) => a.sana === today)
  const todaysRevenue = todays
    .filter((a) => a.holat === 'yakunlangan')
    .reduce((sum, a) => sum + (a.narxi || 0), 0)

  const byBarber = {}
  all.forEach((a) => {
    if (a.barberIsmi) byBarber[a.barberIsmi] = (byBarber[a.barberIsmi] || 0) + 1
  })
  const busiest = Object.entries(byBarber).sort((a, b) => b[1] - a[1])[0]

  return [
    `\u{1F4CA} Statistika`,
    '',
    `Jami navbatlar: ${all.length}`,
    `— Kutilmoqda: ${byStatus['kutilmoqda'] || 0}`,
    `— Tasdiqlangan: ${byStatus['tasdiqlangan'] || 0}`,
    `— Yakunlangan: ${byStatus['yakunlangan'] || 0}`,
    `— Bekor qilingan: ${byStatus['bekor qilingan'] || 0}`,
    '',
    `Umumiy tushum (yakunlangan): ${formatMoney(totalRevenue)}`,
    `Bugungi (${today}) navbatlar: ${todays.length}, tushum: ${formatMoney(todaysRevenue)}`,
    busiest ? `Eng band usta: ${busiest[0]} (${busiest[1]} ta)` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

// chatId -> message_id of the current "Oxirgi bronlar" message — paginating
// edits this same message in place instead of sending a new one each time.
const statsListMessageId = new Map()

async function sendStatsPage(chatId, offset, { fresh = false } = {}) {
  if (fresh) {
    await bot.sendMessage(chatId, await buildStatsHeader())
    statsListMessageId.delete(chatId)
  }

  const all = await getAllAppointments()
  const recent = [...all].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  if (!recent.length) {
    if (fresh) await bot.sendMessage(chatId, "Hali bronlar yo'q.")
    return
  }

  const page = recent.slice(offset, offset + LIST_PAGE_SIZE)
  if (!page.length) return

  const botUsers = await getBotUsers().catch(() => [])
  const usernameById = new Map(botUsers.map((u) => [u.id, u.telegramUsername]))

  const entries = page
    .map((a) => {
      const username = usernameById.get(a.mijozId)
      return (
        `${a.sana} ${a.vaqt} — ${a.mijozIsmi || 'Mijoz'} (${a.mijozTelefon || '—'})${username ? ` @${username}` : ''}\n` +
        `${a.xizmatNomi || '—'} [${a.holat}]`
      )
    })
    .join('\n\n')

  const text = `\u{1F553} Oxirgi bronlar (${recent.length} ta):\n\n${entries}`
  const navRow = buildPageNavRow('statspage', offset, LIST_PAGE_SIZE, recent.length)
  const replyMarkup = { inline_keyboard: navRow.length ? [navRow] : [] }

  const existingId = statsListMessageId.get(chatId)
  if (existingId) {
    await bot.editMessageText(text, { chat_id: chatId, message_id: existingId, reply_markup: replyMarkup })
  } else {
    const sent = await bot.sendMessage(chatId, text, { reply_markup: replyMarkup })
    statsListMessageId.set(chatId, sent.message_id)
  }
}

async function notifyClientOfReminder(appointment) {
  try {
    const user = await getUser(appointment.mijozId)
    if (!user?.telegramId) return
    const barber = await getBarber(appointment.barberId)
    await bot.sendMessage(
      user.telegramId,
      `⏰ Eslatma: navbatingizga ${REMINDER_WINDOW_MIN} daqiqadan kam vaqt qoldi!\n` +
        `✂️ ${appointment.xizmatNomi || '—'}\n` +
        `\u{1F487} Usta: ${appointment.barberIsmi || '—'}${barber?.telefon ? ` (${barber.telefon})` : ''}\n` +
        `\u{1F553} Bugun, soat ${appointment.vaqt}da kutamiz!`
    )
  } catch (err) {
    console.error('[bot] notify client reminder error:', err?.message || err)
  }
}

async function sendReminders() {
  try {
    const all = await getAllAppointments()
    const today = todayStr()
    const now = new Date()
    const due = all.filter((a) => {
      if (a.tgReminded) return false
      if (a.sana !== today) return false
      if (a.holat !== 'kutilmoqda' && a.holat !== 'tasdiqlangan') return false
      const [h, m] = (a.vaqt || '').split(':').map(Number)
      if (Number.isNaN(h) || Number.isNaN(m)) return false
      const apptTime = tashkentTimeToday(h, m)
      const diffMin = (apptTime - now) / 60000
      return diffMin > 0 && diffMin <= REMINDER_WINDOW_MIN
    })
    for (const a of due) {
      if (adminChatId) {
        await bot.sendMessage(
          adminChatId,
          `⏰ Eslatma: ${a.vaqt}da navbat bor (${REMINDER_WINDOW_MIN} daqiqadan kamroq qoldi)\n` +
            `\u{1F464} ${a.mijozIsmi || 'Mijoz'} (${a.mijozTelefon || '—'})\n` +
            `✂️ ${a.xizmatNomi || '—'} — ${a.barberIsmi || '—'}`
        )
      }
      await notifyClientOfReminder(a)
      await markAppointmentReminded(a.id)
    }
  } catch (err) {
    console.error('[bot] reminder error:', err?.message || err)
  }
}

// At the exact moment an appointment was due to start, ask the admin (who
// runs the front desk in Telegram) whether the client actually showed up —
// easy to forget by the time the day gets busy, and this keeps a record
// (kelganmi) without touching the appointment's confirm/complete/cancel
// status, which stays a separate concern.
async function checkArrivals() {
  if (!adminChatId) return
  try {
    const all = await getAllAppointments()
    const today = todayStr()
    const now = new Date()
    const due = all.filter((a) => {
      if (a.tgArrivalAsked) return false
      if (a.sana !== today) return false
      if (a.holat !== 'kutilmoqda' && a.holat !== 'tasdiqlangan') return false
      const [h, m] = (a.vaqt || '').split(':').map(Number)
      if (Number.isNaN(h) || Number.isNaN(m)) return false
      const apptTime = tashkentTimeToday(h, m)
      return now >= apptTime
    })
    for (const a of due) {
      await bot.sendMessage(
        adminChatId,
        `⏰ Tekshiruv vaqti!\n` +
          `\u{1F464} ${a.mijozIsmi || 'Mijoz'} (${a.mijozTelefon || '—'})\n` +
          `✂️ ${a.xizmatNomi || '—'} — ${a.barberIsmi || '—'}\n` +
          `\u{1F553} ${a.vaqt}\n\n` +
          `Mijoz keldimi?`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Ha, keldi', callback_data: `arrived:${a.id}` },
                { text: "❌ Yo'q, kelmadi", callback_data: `noshow:${a.id}` },
              ],
            ],
          },
        }
      )
      await markAppointmentArrivalAsked(a.id)
    }
  } catch (err) {
    console.error('[bot] arrival check error:', err?.message || err)
  }
}

// Once a confirmed appointment's actual end time (start + the service's own
// davomiyligi) has passed, close it out automatically instead of waiting for
// the admin to remember to tap "Yakunlash" — this is also what keeps
// dashboard/report revenue stats accurate, since those only count
// holat === 'yakunlangan'. Moving to that status is itself what prevents
// re-processing on the next poll (it no longer matches the 'tasdiqlangan'
// filter below), so no separate "already handled" flag is needed here.
async function autoCompleteAppointments() {
  try {
    const all = await getAllAppointments()
    const today = todayStr()
    const now = new Date()
    const candidates = all.filter((a) => a.holat === 'tasdiqlangan' && a.sana === today)

    for (const a of candidates) {
      const [h, m] = (a.vaqt || '').split(':').map(Number)
      if (Number.isNaN(h) || Number.isNaN(m)) continue
      const service = await getServiceById(a.xizmatId).catch(() => null)
      const duration = service?.davomiyligi || 30
      const apptEnd = tashkentTimeToday(h, m + duration)
      if (now < apptEnd) continue

      const appointment = await setAppointmentStatus(a.id, 'yakunlangan')

      // Bill immediately on completion (mirrors AdminAppointments.jsx's own
      // site-side completion flow) rather than waiting on the client to pick
      // a payment method — otherwise an appointment the client never
      // responds to in Telegram would never get a payments record at all,
      // silently understating revenue. Defaults to naqd; the client's own
      // choice below (if they respond) corrects it via the same upsert the
      // 'pay' callback already uses.
      const alreadyBilled = await getPaymentByAppointment(a.id).catch(() => null)
      if (!alreadyBilled) {
        await createPayment({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          appointmentId: a.id,
          mijozIsmi: appointment.mijozIsmi,
          sana: appointment.sana,
          usul: 'naqd',
          summa: appointment.narxi,
          holat: 'to‘landi',
          createdAt: new Date().toISOString(),
        }).catch((err) => console.error('[bot] auto-complete billing error:', err?.message || err))
      }

      if (adminChatId) {
        await bot
          .sendMessage(
            adminChatId,
            `✅ Buyurtma bajarildi!\n` +
              `\u{1F464} ${appointment.mijozIsmi || 'Mijoz'} (${appointment.mijozTelefon || '—'})\n` +
              `✂️ ${appointment.xizmatNomi || '—'} — ${appointment.barberIsmi || '—'}\n` +
              `\u{1F553} ${appointment.sana} ${appointment.vaqt}` +
              (appointment.narxi ? `\n💵 ${formatMoney(appointment.narxi)}` : '')
          )
          .catch((err) => console.error('[bot] auto-complete admin notify error:', err?.message || err))
      }

      const clientUser = await getUser(appointment.mijozId).catch(() => null)
      if (clientUser?.telegramId) {
        await bot
          .sendMessage(
            clientUser.telegramId,
            `✅ Xizmat yakunlandi! Oq yo'l bo'lsin!\n` +
              `Tashrif buyurganingiz uchun rahmat.\n\n` +
              `To'lov usulini tanlang:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '💵 Naqt pul', callback_data: `pay:${appointment.id}:naqd` },
                    { text: '💳 Karta', callback_data: `pay:${appointment.id}:karta` },
                  ],
                ],
              },
            }
          )
          .catch((err) => console.error('[bot] auto-complete client notify error:', err?.message || err))
      }
    }
  } catch (err) {
    console.error('[bot] auto-complete error:', err?.message || err)
  }
}

async function handleTelegramLoginStart(msg, token) {
  try {
    const tgUser = msg.from
    const result = await withRetry(async () => {
      const login = await getTelegramLogin(token)
      if (!login || login.status !== 'pending') return { expired: true }

      let user = await findUserByTelegramId(tgUser.id)
      if (!user) {
        const role = isSuperAdminUsername(tgUser.username) ? 'admin' : 'client'
        try {
          user = await createTelegramUser(tgUser, role)
        } catch (err) {
          // json-server's --watch reload can drop the response even though
          // the write landed — check before assuming the create failed.
          user = await findUserByTelegramId(tgUser.id)
          if (!user) throw err
        }
      } else if (isSuperAdminUsername(tgUser.username) && user.role !== 'admin') {
        // Keep the super-admin's site role in sync even if their account
        // was created before TELEGRAM_SUPER_ADMIN_USERNAME was set.
        user = await setUserRole(user.id, 'admin')
      }
      return { user }
    }, 2, 800)

    if (result.expired || !result.user) {
      await bot.sendMessage(
        msg.chat.id,
        "Bu havola eskirgan yoki noto'g'ri. Saytda \"Telegram orqali kirish\" tugmasini qaytadan bosing."
      )
      return
    }

    const { user } = result

    if (user.telefon) {
      // Returning user, phone already on file — open the account right away.
      const confirmed = await confirmWithVerify(token, user.id)
      if (!confirmed) {
        await bot.sendMessage(msg.chat.id, "Xatolik yuz berdi, saytda qaytadan urinib ko'ring.")
        return
      }
      await bot.sendMessage(
        msg.chat.id,
        `✅ Xush kelibsiz, ${user.ism}!\nZolotoy Barber hisobingizga kirdingiz. Saytga qaytishingiz mumkin.`,
        user.role === 'admin' ? MENU_KEYBOARD : CLIENT_KEYBOARD
      )
      return
    }

    // New (or phone-less) user — the account/site login only opens once the
    // phone is confirmed, see handleContact below.
    awaitingPhoneForChat.set(msg.chat.id, { userId: user.id, token, role: user.role })
    await bot.sendMessage(
      msg.chat.id,
      `Salom, ${user.ism}! Zolotoy Barberga xush kelibsiz.\n\n` +
        `Ro'yxatni yakunlash uchun telefon raqamingizni yuboring:`,
      {
        reply_markup: {
          keyboard: [[{ text: "\u{1F4DE} Raqamni yuborish", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    )
  } catch (err) {
    console.error('[bot] telegram login error:', err?.message || err)
    await bot.sendMessage(msg.chat.id, "Xatolik yuz berdi, saytda qaytadan urinib ko'ring.")
  }
}

async function handleContact(msg) {
  const pending = awaitingPhoneForChat.get(msg.chat.id)
  if (!pending) return

  if (msg.contact.user_id && msg.contact.user_id !== msg.from.id) {
    await bot.sendMessage(msg.chat.id, "Iltimos, o'zingizning raqamingizni yuboring.")
    return
  }

  try {
    await withRetry(() => setUserPhone(pending.userId, msg.contact.phone_number), 2, 800)
    await settleAfterWrite()
    const confirmed = await confirmWithVerify(pending.token, pending.userId)
    if (!confirmed) throw new Error('confirm failed after retries')

    awaitingPhoneForChat.delete(msg.chat.id)
    await bot.sendMessage(
      msg.chat.id,
      '✅ Raqamingiz saqlandi. Hisobingiz tayyor — saytga qaytishingiz mumkin!',
      pending.role === 'admin' ? MENU_KEYBOARD : CLIENT_KEYBOARD
    )
  } catch (err) {
    console.error('[bot] save phone error:', err?.message || err)
    // Keep `pending` in the map so they can just tap the button again.
    await bot.sendMessage(msg.chat.id, "Xatolik yuz berdi. Qaytadan urinib ko'ring:", {
      reply_markup: {
        keyboard: [[{ text: "\u{1F4DE} Raqamni yuborish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    })
  }
}

bot.onText(/^\/start(?:\s+(\S+))?/, safeHandler(async (msg, match) => {
  const token = match?.[1]
  if (token) {
    await handleTelegramLoginStart(msg, token)
    return
  }

  if (!adminChatId) {
    // Bot not set up yet — reveal this chat's id so it can be copied into
    // .env as TELEGRAM_ADMIN_CHAT_ID.
    await bot.sendMessage(
      msg.chat.id,
      `Salom! Bu chat ID: ${msg.chat.id}\n\n` +
        `Buni .env faylidagi TELEGRAM_ADMIN_CHAT_ID ga qo'ying va botni qayta ishga tushiring.`
    )
    return
  }

  if (!isFromAdmin(msg)) {
    const known = await findUserByTelegramId(msg.from.id).catch(() => null)
    if (known) {
      await bot.sendMessage(
        msg.chat.id,
        `Salom, ${known.ism}! Siz allaqachon ro'yxatdan o'tgansiz — quyidagi menyudan foydalaning.`,
        known.role === 'admin' ? MENU_KEYBOARD : CLIENT_KEYBOARD
      )
      return
    }
    await bot.sendMessage(
      msg.chat.id,
      "Salom! Bu Zolotoy Barber boti. Saytga kirish uchun saytdagi \"Telegram orqali kirish\" tugmasini bosing."
    )
    return
  }

  bot.sendMessage(
    msg.chat.id,
    `Salom! Botga xush kelibsiz.\n\n` +
      `Pastdagi menyudan yoki buyruqlardan foydalaning:\n/bugun /navbatlar /stats /foydalanuvchilar /xabar\n\n` +
      `Eslatma: mijozga javob yozish uchun uning xabariga shu yerda albatta "Reply" qilib yozing.`,
    MENU_KEYBOARD
  )
}))

bot.onText(/^\/bugun/, safeHandler(async (msg) => {
  if (!isFromAdmin(msg)) return
  await bot.sendMessage(msg.chat.id, await buildBugunText())
}))

bot.onText(/^\/navbatlar/, safeHandler(async (msg) => {
  if (!isFromAdmin(msg)) return
  await sendNavbatlarPage(msg.chat.id, 0, { fresh: true })
}))

bot.onText(/^\/stats/, safeHandler(async (msg) => {
  if (!isFromAdmin(msg)) return
  await sendStatsPage(msg.chat.id, 0, { fresh: true })
}))

const USERS_PAGE_SIZE = 5

async function sendUsersPage(chatId, offset, { fresh = false } = {}) {
  const users = await getBotUsers()
  if (!users.length) {
    await bot.sendMessage(chatId, "Hozircha bot orqali hech kim qo'shilmagan.")
    return
  }
  const page = users.slice(offset, offset + USERS_PAGE_SIZE)
  if (!page.length) {
    await bot.sendMessage(chatId, "Boshqa foydalanuvchi yo'q.")
    return
  }

  await clearListCards(chatId, 'users')
  if (fresh) {
    await bot.sendMessage(chatId, `\u{1F465} Bot orqali qo'shilgan foydalanuvchilar (${users.length} ta):`)
  }

  const cardIds = []
  for (const u of page) {
    const isAdminUser = u.role === 'admin'
    const sent = await bot.sendMessage(chatId, formatBotUser(u), {
      reply_markup: {
        inline_keyboard: [
          [
            isAdminUser
              ? { text: '⬇️ Admindan olish', callback_data: `demote:${u.id}` }
              : { text: '⭐ Admin qilish', callback_data: `promote:${u.id}` },
            { text: "❌ O'chirish", callback_data: `deleteuser:${u.id}` },
          ],
        ],
      },
    })
    cardIds.push(sent.message_id)
  }

  const navRow = buildPageNavRow('userspage', offset, USERS_PAGE_SIZE, users.length)
  if (navRow.length) {
    const sentBtn = await bot.sendMessage(
      chatId,
      `${offset + 1}-${Math.min(offset + USERS_PAGE_SIZE, users.length)} / ${users.length}`,
      { reply_markup: { inline_keyboard: [navRow] } }
    )
    cardIds.push(sentBtn.message_id)
  }

  activeListCards.set(`${chatId}:users`, cardIds)
}

bot.onText(/^\/foydalanuvchilar/, safeHandler(async (msg) => {
  if (!isSuperAdmin(msg)) return
  await sendUsersPage(msg.chat.id, 0, { fresh: true })
}))

// broadcastId -> { text, targets: [{ chatId, messageId }] } — kept in memory
// so a just-sent broadcast can still be edited or deleted everywhere it went.
const broadcasts = new Map()
let broadcastCounter = 0

async function performBroadcast(replyChatId, text) {
  const users = (await getBotUsers()).filter((u) => u.telegramId)
  if (!users.length) {
    await bot.sendMessage(replyChatId, "Hozircha bot orqali hech kim qo'shilmagan.")
    return
  }

  await bot.sendMessage(replyChatId, `Yuborilmoqda... (${users.length} kishiga)`)
  const targets = []
  for (const u of users) {
    try {
      const sent = await bot.sendMessage(u.telegramId, `\u{1F4E2} ${text}`)
      targets.push({ chatId: u.telegramId, messageId: sent.message_id })
    } catch (err) {
      console.error('[bot] broadcast send error:', u.id, err?.message || err)
    }
    await sleep(150) // gentle pacing so we don't hit Telegram's rate limits
  }

  const broadcastId = `b${++broadcastCounter}`
  broadcasts.set(broadcastId, { text, targets })

  await bot.sendMessage(replyChatId, `✅ Yuborildi: ${targets.length}/${users.length}`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✏️ Tahrirlash', callback_data: `editbroadcast:${broadcastId}` },
          { text: "\u{1F5D1}️ O'chirish", callback_data: `deletebroadcast:${broadcastId}` },
        ],
      ],
    },
  })
}

bot.onText(/^\/xabar(?:\s+([\s\S]+))?/, safeHandler(async (msg, match) => {
  if (!isSuperAdmin(msg)) return
  const text = match?.[1]?.trim()
  if (!text) {
    await bot.sendMessage(
      msg.chat.id,
      "Foydalanish: /xabar Xabar matni\n\nYoki pastdagi \"\u{1F4E2} Xabar yuborish\" tugmasini bosing."
    )
    return
  }
  await performBroadcast(msg.chat.id, text)
}))

async function sendMyAppointmentsPage(chatId, fromTelegramId, offset, { fresh = false } = {}) {
  const user = await findUserByTelegramId(fromTelegramId)
  if (!user) {
    await bot.sendMessage(
      chatId,
      "Sizni topa olmadim. Avval saytda \"Telegram orqali kirish\" tugmasi orqali ro'yxatdan o'ting."
    )
    return
  }
  const appointments = await getUserAppointments(user.id)
  const upcoming = appointments
    .filter((a) => a.holat !== 'bekor qilingan')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')) // newest first
  if (!upcoming.length) {
    await bot.sendMessage(chatId, "Sizda hali navbat yo'q.")
    return
  }

  const page = upcoming.slice(offset, offset + LIST_PAGE_SIZE)
  if (!page.length) {
    await bot.sendMessage(chatId, "Boshqa navbat yo'q.")
    return
  }

  await clearListCards(chatId, 'myappts')
  if (fresh) {
    await bot.sendMessage(chatId, `\u{1F5D3}️ Sizning navbatlaringiz (${upcoming.length} ta):`)
  }

  const cardIds = []
  for (const a of page) {
    const cancellable = a.holat === 'kutilmoqda' || a.holat === 'tasdiqlangan'
    const sent = await bot.sendMessage(
      chatId,
      `${a.sana} ${a.vaqt} — ${a.xizmatNomi} (${a.barberIsmi})\nHolat: ${a.holat}`,
      cancellable
        ? { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel:${a.id}` }]] } }
        : undefined
    )
    cardIds.push(sent.message_id)
  }

  const navRow = buildPageNavRow('myapptspage', offset, LIST_PAGE_SIZE, upcoming.length)
  if (navRow.length) {
    const sentBtn = await bot.sendMessage(
      chatId,
      `${offset + 1}-${Math.min(offset + LIST_PAGE_SIZE, upcoming.length)} / ${upcoming.length}`,
      { reply_markup: { inline_keyboard: [navRow] } }
    )
    cardIds.push(sentBtn.message_id)
  }

  activeListCards.set(`${chatId}:myappts`, cardIds)
}

async function handleHelp(msg) {
  const info = await getContactInfo().catch(() => null)
  const phone = info?.telefon || ''
  const lines = [
    'ℹ️ Yordam',
    '',
    `\u{1F4DE} Telefon: ${phone || '—'}`,
    `\u{1F4CD} Manzil: ${info?.manzil || '—'}`,
    `\u{1F550} Ish vaqti: ${info?.ishVaqti || '—'}`,
  ]
  // Telegram's Bot API rejects `tel:` in both message entities and inline
  // keyboard button URLs ("Wrong port number specified in the URL") — a
  // platform restriction, not something formatting can work around. Plain
  // text is what's left, and Telegram's own clients already auto-detect
  // phone-number-shaped text and make it tap-to-call without any entity.
  await bot.sendMessage(msg.chat.id, lines.join('\n'))
}

async function handleClientChatMessage(msg) {
  const user = await findUserByTelegramId(msg.from.id)
  if (!user) {
    await bot.sendMessage(
      msg.chat.id,
      "Avval saytda \"Telegram orqali kirish\" tugmasi orqali ro'yxatdan o'ting, keyin admin bilan chat qilishingiz mumkin."
    )
    return
  }
  try {
    await postClientMessageFromBot({
      conversationId: user.id,
      userId: user.id,
      userName: `${user.ism || ''} ${user.familiya || ''}`.trim() || user.telegramUsername || 'Mijoz',
      text: msg.text,
    })
    await bot.sendMessage(msg.chat.id, '✓ Yuborildi')
  } catch (err) {
    console.error('[bot] client chat error:', err?.message || err)
    await bot.sendMessage(msg.chat.id, "Xatolik yuz berdi, qaytadan urinib ko'ring.")
  }
}

bot.on('message', safeHandler(async (msg) => {
  if (msg.contact) {
    await handleContact(msg)
    return
  }

  // Utility for the super admin: send any Telegram Premium custom emoji and
  // the bot echoes back its custom_emoji_id, so it can be hardcoded into
  // specific bot messages afterward.
  if (isSuperAdmin(msg) && msg.text && msg.entities?.some((e) => e.type === 'custom_emoji')) {
    const found = msg.entities
      .filter((e) => e.type === 'custom_emoji')
      .map((e) => `${msg.text.slice(e.offset, e.offset + e.length)} → \`${e.custom_emoji_id}\``)
    await bot.sendMessage(msg.chat.id, `Premium emoji ID'lari:\n${found.join('\n')}`, { parse_mode: 'Markdown' })
    return
  }

  if (!msg.text || msg.text.startsWith('/')) return

  if (msg.text === BTN_MY_APPOINTMENTS) {
    clientChatMode.delete(msg.chat.id)
    await sendMyAppointmentsPage(msg.chat.id, msg.from.id, 0, { fresh: true })
    return
  }
  if (msg.text === BTN_HELP) {
    clientChatMode.delete(msg.chat.id)
    await handleHelp(msg)
    return
  }
  if (msg.text === BTN_CHAT) {
    clientChatMode.add(msg.chat.id)
    await bot.sendMessage(msg.chat.id, "Yozing — xabaringiz to'g'ridan-to'g'ri administratorga yuboriladi.")
    return
  }

  const pendingReviewId = awaitingReviewCommentForChat.get(msg.chat.id)
  if (pendingReviewId) {
    awaitingReviewCommentForChat.delete(msg.chat.id)
    try {
      await updateReview(pendingReviewId, { matn: msg.text })
      await bot.sendMessage(msg.chat.id, "✅ Izohingiz uchun rahmat!")
    } catch (err) {
      console.error('[bot] review comment error:', err?.message || err)
    }
    return
  }

  if (!isFromAdmin(msg)) {
    if (clientChatMode.has(msg.chat.id)) {
      await handleClientChatMessage(msg)
    } else {
      await bot.sendMessage(
        msg.chat.id,
        `Administratorga yozish uchun pastdagi "${BTN_CHAT}" tugmasini bosing.`
      )
    }
    return
  }

  if (msg.text === BTN_BUGUN) {
    await bot.sendMessage(msg.chat.id, await buildBugunText())
    return
  }
  if (msg.text === BTN_NAVBATLAR) {
    await sendNavbatlarPage(msg.chat.id, 0, { fresh: true })
    return
  }
  if (msg.text === BTN_STATS) {
    await sendStatsPage(msg.chat.id, 0, { fresh: true })
    return
  }
  if (msg.text === BTN_USERS) {
    if (!isSuperAdmin(msg)) {
      await bot.sendMessage(msg.chat.id, "Ruxsat yo'q.")
      return
    }
    await sendUsersPage(msg.chat.id, 0, { fresh: true })
    return
  }
  if (msg.text === BTN_BROADCAST) {
    if (!isSuperAdmin(msg)) {
      await bot.sendMessage(msg.chat.id, "Ruxsat yo'q.")
      return
    }
    awaitingBroadcastForChat.add(msg.chat.id)
    await bot.sendMessage(msg.chat.id, "Yubormoqchi bo'lgan xabar matnini yozing:")
    return
  }

  if (awaitingBroadcastForChat.has(msg.chat.id)) {
    awaitingBroadcastForChat.delete(msg.chat.id)
    await performBroadcast(msg.chat.id, msg.text)
    return
  }

  const editBroadcastId = awaitingBroadcastEditForChat.get(msg.chat.id)
  if (editBroadcastId) {
    awaitingBroadcastEditForChat.delete(msg.chat.id)
    const broadcast = broadcasts.get(editBroadcastId)
    if (!broadcast) {
      await bot.sendMessage(msg.chat.id, "Bu xabar topilmadi (eskirgan bo'lishi mumkin).")
      return
    }
    let edited = 0
    for (const target of broadcast.targets) {
      try {
        await bot.editMessageText(`\u{1F4E2} ${msg.text}`, { chat_id: target.chatId, message_id: target.messageId })
        edited++
      } catch (err) {
        console.error('[bot] broadcast edit error:', target.chatId, err?.message || err)
      }
      await sleep(150)
    }
    broadcast.text = msg.text
    await bot.sendMessage(msg.chat.id, `✅ Tahrirlandi: ${edited}/${broadcast.targets.length}`)
    return
  }

  const replyToId = msg.reply_to_message?.message_id
  const conversationId = replyToId && conversationByTelegramMsgId.get(replyToId)

  if (!conversationId) {
    await bot.sendMessage(
      msg.chat.id,
      "Kimga yozayotganingizni bilmadim. Mijozning xabariga Telegram'da \"Reply\" qilib javob yozing."
    )
    return
  }

  const conversation = await getConversation(conversationId)
  if (!conversation) {
    await bot.sendMessage(msg.chat.id, 'Bu suhbat topilmadi (o‘chirilgan bo‘lishi mumkin).')
    return
  }

  await postAdminReply({
    conversationId,
    userId: conversation.userId,
    userName: conversation.userName,
    text: msg.text,
  })

  // Mirror the reply straight into the client's own Telegram chat too, not
  // just the site — if they're Telegram-linked.
  const clientUser = await getUser(conversation.userId).catch(() => null)
  if (clientUser?.telegramId) {
    await bot.sendMessage(clientUser.telegramId, `\u{1F464} Admin:\n${msg.text}`).catch((err) => {
      console.error('[bot] mirror reply to client error:', err?.message || err)
    })
  }

  await bot.sendMessage(msg.chat.id, `✓ ${conversation.userName || 'mijoz'}ga yuborildi`, {
    reply_to_message_id: msg.message_id,
  })
}))

bot.on('callback_query', safeHandler(async (query) => {
  const parts = (query.data || '').split(':')
  const [action, id] = parts
  if (!id) return

  if (action === 'confirm' || action === 'cancel' || action === 'complete') {
    try {
      const staffAction = isFromAdmin(query.message)

      // Only staff can confirm/complete. Cancel is also allowed by the
      // client who owns the appointment.
      let requesterUser = null
      if (!staffAction) {
        requesterUser = await findUserByTelegramId(query.from.id)
        const target = await getAppointmentById(id)
        const ownsIt = requesterUser && target && target.mijozId === requesterUser.id
        if (action !== 'cancel' || !ownsIt) {
          await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
          return
        }
      }

      const holat = action === 'confirm' ? 'tasdiqlangan' : action === 'complete' ? 'yakunlangan' : 'bekor qilingan'
      const extra =
        action === 'cancel'
          ? { bekorSababi: staffAction ? 'Telegram orqali bekor qilindi' : 'Mijoz tomonidan bekor qilindi' }
          : {}
      const appointment = await setAppointmentStatus(id, holat, extra)

      const label =
        action === 'confirm' ? '✅ Tasdiqlandi' : action === 'complete' ? '✔️ Yakunlandi' : '❌ Bekor qilindi'
      const originalText = query.message?.text || ''
      await bot.editMessageText(`${originalText}\n\n${label}`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
      })
      await bot.answerCallbackQuery(query.id, { text: label })

      if (staffAction) {
        // Let the client know their appointment status changed too.
        const clientUser = await getUser(appointment.mijozId).catch(() => null)
        if (clientUser?.telegramId) {
          const clientLabel =
            action === 'confirm'
              ? '✅ Navbatingiz tasdiqlandi!'
              : action === 'complete'
                ? '✔️ Xizmat yakunlandi. Tashrifingiz uchun rahmat!'
                : '❌ Navbatingiz bekor qilindi.'
          await bot
            .sendMessage(
              clientUser.telegramId,
              `${clientLabel}\n✂️ ${appointment.xizmatNomi || '—'}\n\u{1F553} ${appointment.sana} ${appointment.vaqt}`
            )
            .catch((err) => console.error('[bot] notify client status error:', err?.message || err))
        }
      } else if (adminChatId) {
        // A client cancelled their own booking — let the admin know.
        await bot
          .sendMessage(
            adminChatId,
            `\u{1F6AB} Mijoz navbatni bekor qildi:\n${appointment.mijozIsmi || 'Mijoz'} — ` +
              `${appointment.xizmatNomi || '—'} (${appointment.sana} ${appointment.vaqt})`
          )
          .catch((err) => console.error('[bot] notify admin of client cancel error:', err?.message || err))
      }
    } catch (err) {
      console.error('[bot] callback_query error:', err?.message || err)
      await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
    }
    return
  }

  if (action === 'arrived' || action === 'noshow') {
    if (!isFromAdmin(query.message)) {
      await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
      return
    }
    try {
      const kelganmi = action === 'arrived'
      await setAppointmentArrival(id, kelganmi)
      if (!kelganmi) {
        // Move it out of 'tasdiqlangan' so autoCompleteAppointments() never
        // picks it up and bills a service that never happened — 'kelmagan'
        // is the same no-show status AdminAppointments.jsx already sets from
        // the site.
        await setAppointmentStatus(id, 'kelmagan')
      }
      const label = kelganmi ? '✅ Keldi deb belgilandi' : "❌ Kelmadi deb belgilandi"
      const originalText = query.message?.text || ''
      await bot.editMessageText(`${originalText}\n\n${label}`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
      })
      await bot.answerCallbackQuery(query.id, { text: label })
    } catch (err) {
      console.error('[bot] arrival response error:', err?.message || err)
      await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
    }
    return
  }

  if (action === 'pay') {
    const method = parts[2] // 'naqd' | 'karta'
    try {
      const appointment = await getAppointmentById(id)
      if (!appointment) {
        await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
        return
      }
      const requesterUser = await findUserByTelegramId(query.from.id)
      const ownsIt = requesterUser && appointment.mijozId === requesterUser.id
      if (!ownsIt) {
        await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
        return
      }

      // Upsert rather than always-insert, so tapping the other button after
      // a mis-tap corrects the record instead of leaving two.
      const existingPayment = await getPaymentByAppointment(id)
      if (existingPayment) {
        await updatePaymentMethod(existingPayment.id, method)
      } else {
        await createPayment({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          appointmentId: id,
          mijozIsmi: appointment.mijozIsmi,
          sana: appointment.sana,
          usul: method,
          summa: appointment.narxi,
          holat: 'to‘landi',
          createdAt: new Date().toISOString(),
        })
      }

      if (method === 'karta') {
        await bot.editMessageText(
          `💳 Karta orqali to'lov\n\n` +
            `<code>${PAYMENT_CARD_NUMBER}</code>\n` +
            `${PAYMENT_CARD_HOLDER}\n\n` +
            `Raqamni nusxalash uchun ustiga bosing, so'ngra ${formatMoney(appointment.narxi)} shu kartaga o'tkazing.`,
          { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'HTML' }
        )
        await bot.answerCallbackQuery(query.id, { text: '💳 Karta tanlandi' })
      } else {
        await bot.editMessageText(
          `💵 Naqt pul tanlandi.\n\n` +
            `Iltimos, ${formatMoney(appointment.narxi)} miqdorini ustaga qo'lma-qo'l topshiring. Rahmat!`,
          { chat_id: query.message.chat.id, message_id: query.message.message_id }
        )
        await bot.answerCallbackQuery(query.id, { text: '💵 Naqt tanlandi' })
      }

      if (adminChatId) {
        const methodLabel = method === 'karta' ? '💳 Karta orqali' : '💵 Naqd pul bilan'
        await bot
          .sendMessage(
            adminChatId,
            `${methodLabel} to'lov tanladi\n` +
              `\u{1F464} ${appointment.mijozIsmi || 'Mijoz'}\n` +
              `✂️ ${appointment.xizmatNomi || '—'} — ${formatMoney(appointment.narxi)}`
          )
          .catch((err) => console.error('[bot] notify admin of payment error:', err?.message || err))
      }
    } catch (err) {
      console.error('[bot] payment selection error:', err?.message || err)
      await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
    }
    return
  }

  if (action === 'rate') {
    const rating = Number(parts[2])
    try {
      const appointment = await getAppointmentById(id)
      if (!appointment || !rating) {
        await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
        return
      }
      const review = await createReview({
        id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        barberId: appointment.barberId,
        mijozIsmi: appointment.mijozIsmi || 'Mijoz',
        matn: '',
        baho: rating,
        sana: todayStr(),
      })
      awaitingReviewCommentForChat.set(query.message.chat.id, review.id)

      // Recompute the barber's displayed rating as the average of all their
      // reviews, so bot-collected ratings actually show up on the site.
      try {
        const barberReviews = await getReviewsByBarber(appointment.barberId)
        if (barberReviews.length) {
          const avg = barberReviews.reduce((sum, r) => sum + (r.baho || 0), 0) / barberReviews.length
          await setBarberRating(appointment.barberId, Math.round(avg * 10) / 10)
        }
      } catch (err) {
        console.error('[bot] update barber rating error:', err?.message || err)
      }

      const originalText = query.message?.text || ''
      await bot.editMessageText(`${originalText}\n\nBahoyingiz: ${'⭐'.repeat(rating)}`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
      })
      await bot.answerCallbackQuery(query.id, { text: 'Rahmat!' })
      await bot.sendMessage(
        query.message.chat.id,
        "Rahmat! Xohlasangiz, izoh ham yozib yuboring (ixtiyoriy) — keyingi xabaringiz sharhga qo'shiladi."
      )
    } catch (err) {
      console.error('[bot] rate error:', err?.message || err)
      await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
    }
    return
  }

  if (action === 'userspage') {
    if (!isSuperAdmin(query)) {
      await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
      return
    }
    await bot.answerCallbackQuery(query.id)
    await sendUsersPage(query.message.chat.id, Number(id) || 0)
    return
  }

  if (action === 'navbatlarpage') {
    if (!isFromAdmin(query.message)) {
      await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
      return
    }
    await bot.answerCallbackQuery(query.id)
    await sendNavbatlarPage(query.message.chat.id, Number(id) || 0)
    return
  }

  if (action === 'myapptspage') {
    await bot.answerCallbackQuery(query.id)
    await sendMyAppointmentsPage(query.message.chat.id, query.from.id, Number(id) || 0)
    return
  }

  if (action === 'statspage') {
    if (!isFromAdmin(query.message)) {
      await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
      return
    }
    await bot.answerCallbackQuery(query.id)
    await sendStatsPage(query.message.chat.id, Number(id) || 0)
    return
  }

  if (action === 'editbroadcast' || action === 'deletebroadcast') {
    if (!isSuperAdmin(query)) {
      await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
      return
    }
    const broadcast = broadcasts.get(id)
    if (!broadcast) {
      await bot.answerCallbackQuery(query.id, { text: "Bu xabar topilmadi (eskirgan bo'lishi mumkin).", show_alert: true })
      return
    }

    if (action === 'editbroadcast') {
      awaitingBroadcastEditForChat.set(query.message.chat.id, id)
      await bot.answerCallbackQuery(query.id)
      await bot.sendMessage(query.message.chat.id, "Yangi matnni yozing — barcha oluvchilarda yangilanadi:")
      return
    }

    try {
      let deleted = 0
      for (const target of broadcast.targets) {
        try {
          await bot.deleteMessage(target.chatId, target.messageId)
          deleted++
        } catch (err) {
          console.error('[bot] broadcast delete error:', target.chatId, err?.message || err)
        }
        await sleep(100)
      }
      broadcasts.delete(id)
      const originalText = query.message?.text || ''
      await bot.editMessageText(`${originalText}\n\n🗑️ O'chirildi (${deleted}/${broadcast.targets.length})`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
      })
      await bot.answerCallbackQuery(query.id, { text: "O'chirildi" })
    } catch (err) {
      console.error('[bot] deletebroadcast error:', err?.message || err)
      await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
    }
    return
  }

  if (action === 'promote' || action === 'demote' || action === 'deleteuser') {
    if (!isSuperAdmin(query)) {
      await bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q", show_alert: true })
      return
    }
    try {
      const originalText = query.message?.text || ''
      let label
      if (action === 'promote') {
        await setUserRole(id, 'admin')
        label = '⭐ Admin qilindi'
      } else if (action === 'demote') {
        await setUserRole(id, 'client')
        label = '⬇️ Admindan olindi'
      } else {
        await deleteUser(id)
        label = "❌ O'chirildi"
      }
      await bot.editMessageText(`${originalText}\n\n${label}`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
      })
      await bot.answerCallbackQuery(query.id, { text: label })
    } catch (err) {
      console.error('[bot] user management error:', err?.message || err)
      await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
    }
  }
}))

bot.on('polling_error', (err) => console.error('[bot] polling error:', err?.message || err))

bot.setMyCommands([
  { command: 'start', description: "Chat ID va yordam" },
  { command: 'bugun', description: 'Bugungi navbatlar' },
  { command: 'navbatlar', description: 'Kelayotgan navbatlar' },
  { command: 'stats', description: 'Bugungi statistika' },
]).catch((err) => console.error('[bot] setMyCommands error:', err?.message || err))

bot
  .setMyShortDescription({
    short_description:
      "Zolotoy Barber — onlayn navbat, eslatmalar va admin bilan to'g'ridan-to'g'ri chat bitta botda.",
  })
  .catch((err) => console.error('[bot] setMyShortDescription error:', err?.message || err))

bot
  .setMyDescription({
    description:
      '✂️ Zolotoy Barber — sartaroshxonangiz uchun aqlli yordamchi.\n\n' +
      "\u{1F4C5} Mijozlarga: saytdan bir necha soniyada navbat oling, holatini kuzating, kerak bo'lsa bekor qiling.\n" +
      "\u{1F4AC} Administrator bilan to'g'ridan-to'g'ri yozishing mumkin — qo'ng'iroqsiz.\n" +
      "⏰ Avtomatik eslatmalar — navbatingizni hech qachon unutmaysiz.\n" +
      "⭐ Xizmatdan so'ng ustani baholang.\n\n" +
      "\u{1F451} Administratorga: barcha navbatlar, statistika va foydalanuvchilarni bitta joydan boshqaring.\n\n" +
      "Boshlash uchun saytdagi \"Telegram orqali kirish\" tugmasini bosing 👇",
  })
  .catch((err) => console.error('[bot] setMyDescription error:', err?.message || err))

console.log('[bot] Telegram bot ishga tushdi (long polling).')
if (!adminChatId) {
  console.log("[bot] TELEGRAM_ADMIN_CHAT_ID hali sozlanmagan — botga /start yozib chat ID oling.")
}

async function periodicChecks() {
  await sendReminders()
  await checkArrivals()
  await autoCompleteAppointments()
  await checkLowStock()
  await maybeSendDailyDigest()
}

poll()
setInterval(poll, POLL_MS)
periodicChecks()
setInterval(periodicChecks, REMINDER_POLL_MS)
