import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import {
  getUnnotifiedClientMessages,
  markMessageNotified,
  postAdminReply,
  getConversation,
  getUnnotifiedPendingAppointments,
  markAppointmentNotified,
  setAppointmentStatus,
  getAllAppointments,
  markAppointmentReminded,
  getUnnotifiedNewClients,
  markUserNotified,
  getTelegramLogin,
  confirmTelegramLogin,
  findUserByTelegramId,
  createTelegramUser,
} from './api.js'

const POLL_MS = 5000
const REMINDER_POLL_MS = 60000
const REMINDER_WINDOW_MIN = 60
const { TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID } = process.env

if (!TELEGRAM_BOT_TOKEN) {
  console.log("[bot] Telegram bot o'chirilgan — .env faylida TELEGRAM_BOT_TOKEN yo'q. .env.example ga qarang.")
  process.exit(0)
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })
const adminChatId = TELEGRAM_ADMIN_CHAT_ID ? String(TELEGRAM_ADMIN_CHAT_ID) : null

// Reply-routing: which conversation a given Telegram message (sent by the
// bot to the admin) corresponds to, plus the most recent one as a fallback
// for plain (non-reply) admin replies. In-memory only — resets on restart,
// which is fine at this app's scale (single admin, low volume).
const conversationByTelegramMsgId = new Map()
let lastConversationId = null

function isFromAdmin(msg) {
  return adminChatId && String(msg.chat.id) === adminChatId
}

async function forwardClientMessages() {
  const messages = await getUnnotifiedClientMessages()
  for (const message of messages) {
    if (!adminChatId) break
    const sent = await bot.sendMessage(
      adminChatId,
      `\u{1F4AC} ${message.userName || 'Mijoz'}\n${message.text}`
    )
    conversationByTelegramMsgId.set(sent.message_id, message.conversationId)
    lastConversationId = message.conversationId
    await markMessageNotified(message.id)
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

async function forwardAppointments() {
  const appointments = await getUnnotifiedPendingAppointments()
  for (const appointment of appointments) {
    if (!adminChatId) break
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
        `\n\u{1F4DE} ${u.telefon || '—'}\n✉️ ${u.email || '—'}`
    )
    await markUserNotified(u.id)
  }
}

async function poll() {
  try {
    await forwardClientMessages()
    await forwardAppointments()
    await forwardNewClients()
  } catch (err) {
    console.error('[bot] poll error:', err?.message || err)
  }
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMoney(n) {
  return `${(n || 0).toLocaleString('ru-RU')} so'm`
}

const BTN_BUGUN = "\u{1F4C5} Bugungi navbatlar"
const BTN_NAVBATLAR = "\u{1F5D3}️ Kelayotgan navbatlar"
const BTN_STATS = "\u{1F4CA} Statistika"

const MENU_KEYBOARD = {
  reply_markup: {
    keyboard: [[{ text: BTN_BUGUN }, { text: BTN_NAVBATLAR }], [{ text: BTN_STATS }]],
    resize_keyboard: true,
    is_persistent: true,
  },
}

async function buildBugunText() {
  const all = await getAllAppointments()
  const today = todayStr()
  const list = all.filter((a) => a.sana === today).sort((a, b) => (a.vaqt || '').localeCompare(b.vaqt || ''))
  if (!list.length) return "Bugun hech qanday navbat yo'q."
  const lines = list.map((a) => `${a.vaqt} — ${a.mijozIsmi} (${a.xizmatNomi}, ${a.barberIsmi}) [${a.holat}]`)
  return `\u{1F4C5} Bugungi navbatlar (${today}):\n\n${lines.join('\n')}`
}

async function buildNavbatlarText() {
  const all = await getAllAppointments()
  const today = todayStr()
  const list = all
    .filter((a) => a.sana >= today && a.holat !== 'bekor qilingan' && a.holat !== 'yakunlangan')
    .sort((a, b) => `${a.sana}${a.vaqt}`.localeCompare(`${b.sana}${b.vaqt}`))
    .slice(0, 15)
  if (!list.length) return "Kelayotgan navbatlar yo'q."
  const lines = list.map((a) => `${a.sana} ${a.vaqt} — ${a.mijozIsmi} (${a.xizmatNomi}, ${a.barberIsmi}) [${a.holat}]`)
  return `\u{1F5D3}️ Kelayotgan navbatlar:\n\n${lines.join('\n')}`
}

async function buildStatsText() {
  const all = await getAllAppointments()
  const today = todayStr()
  const todays = all.filter((a) => a.sana === today)
  const revenue = todays.filter((a) => a.holat === 'yakunlangan').reduce((sum, a) => sum + (a.narxi || 0), 0)
  const byBarber = {}
  todays.forEach((a) => {
    if (a.barberIsmi) byBarber[a.barberIsmi] = (byBarber[a.barberIsmi] || 0) + 1
  })
  const busiest = Object.entries(byBarber).sort((a, b) => b[1] - a[1])[0]
  const lines = [
    `\u{1F4CA} Bugungi statistika (${today})`,
    `Jami navbatlar: ${todays.length}`,
    `Tushum (yakunlangan): ${formatMoney(revenue)}`,
    busiest ? `Eng band usta: ${busiest[0]} (${busiest[1]} ta)` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

async function sendReminders() {
  if (!adminChatId) return
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
      const apptTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
      const diffMin = (apptTime - now) / 60000
      return diffMin > 0 && diffMin <= REMINDER_WINDOW_MIN
    })
    for (const a of due) {
      await bot.sendMessage(
        adminChatId,
        `⏰ Eslatma: ${a.vaqt}da navbat bor\n` +
          `\u{1F464} ${a.mijozIsmi || 'Mijoz'} (${a.mijozTelefon || '—'})\n` +
          `✂️ ${a.xizmatNomi || '—'} — ${a.barberIsmi || '—'}`
      )
      await markAppointmentReminded(a.id)
    }
  } catch (err) {
    console.error('[bot] reminder error:', err?.message || err)
  }
}

async function handleTelegramLoginStart(msg, token) {
  try {
    const login = await getTelegramLogin(token)
    if (!login || login.status !== 'pending') {
      await bot.sendMessage(
        msg.chat.id,
        "Bu havola eskirgan yoki noto'g'ri. Saytda \"Telegram orqali kirish\" tugmasini qaytadan bosing."
      )
      return
    }

    const tgUser = msg.from
    let user = await findUserByTelegramId(tgUser.id)
    if (!user) {
      user = await createTelegramUser(tgUser)
    }
    await confirmTelegramLogin(token, user.id)

    await bot.sendMessage(
      msg.chat.id,
      `✅ Xush kelibsiz, ${user.ism}!\nZolotoy Barber hisobingizga kirdingiz. Saytga qaytishingiz mumkin.`
    )
  } catch (err) {
    console.error('[bot] telegram login error:', err?.message || err)
    await bot.sendMessage(msg.chat.id, "Xatolik yuz berdi, saytda qaytadan urinib ko'ring.")
  }
}

bot.onText(/^\/start(?:\s+(\S+))?/, async (msg, match) => {
  const token = match?.[1]
  if (token) {
    await handleTelegramLoginStart(msg, token)
    return
  }

  bot.sendMessage(
    msg.chat.id,
    `Salom! Bu chat ID: ${msg.chat.id}\n\n` +
      `Buni .env faylidagi TELEGRAM_ADMIN_CHAT_ID ga qo'ying va botni qayta ishga tushiring.\n\n` +
      `Shundan keyin bu yerga saytdagi yangi mijoz xabarlari, yangi navbatlar, ro'yxatdan o'tishlar va ` +
      `eslatmalar kelib turadi. Mijozga javob yozish uchun uning xabariga shu yerda "Reply" qilib yozing ` +
      `(yoki oxirgi mijozga to'g'ridan-to'g'ri yozing).\n\n` +
      `Pastdagi menyudan yoki buyruqlardan foydalaning:\n/bugun /navbatlar /stats`,
    MENU_KEYBOARD
  )
})

bot.onText(/^\/bugun/, async (msg) => {
  if (!isFromAdmin(msg)) return
  await bot.sendMessage(msg.chat.id, await buildBugunText())
})

bot.onText(/^\/navbatlar/, async (msg) => {
  if (!isFromAdmin(msg)) return
  await bot.sendMessage(msg.chat.id, await buildNavbatlarText())
})

bot.onText(/^\/stats/, async (msg) => {
  if (!isFromAdmin(msg)) return
  await bot.sendMessage(msg.chat.id, await buildStatsText())
})

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return
  if (!isFromAdmin(msg)) return

  if (msg.text === BTN_BUGUN) {
    await bot.sendMessage(msg.chat.id, await buildBugunText())
    return
  }
  if (msg.text === BTN_NAVBATLAR) {
    await bot.sendMessage(msg.chat.id, await buildNavbatlarText())
    return
  }
  if (msg.text === BTN_STATS) {
    await bot.sendMessage(msg.chat.id, await buildStatsText())
    return
  }

  const replyToId = msg.reply_to_message?.message_id
  const conversationId = (replyToId && conversationByTelegramMsgId.get(replyToId)) || lastConversationId

  if (!conversationId) {
    await bot.sendMessage(msg.chat.id, "Hozircha hech kim yozmagan — javob beradigan suhbat yo'q.")
    return
  }

  const conversation = await getConversation(conversationId)
  if (!conversation) {
    await bot.sendMessage(msg.chat.id, 'Bu suhbat topilmadi.')
    return
  }

  await postAdminReply({
    conversationId,
    userId: conversation.userId,
    userName: conversation.userName,
    text: msg.text,
  })
  await bot.sendMessage(msg.chat.id, '✓', { reply_to_message_id: msg.message_id })
})

bot.on('callback_query', async (query) => {
  const [action, appointmentId] = (query.data || '').split(':')
  if (!appointmentId || (action !== 'confirm' && action !== 'cancel')) return

  try {
    const holat = action === 'confirm' ? 'tasdiqlangan' : 'bekor qilingan'
    const extra = action === 'cancel' ? { bekorSababi: 'Telegram orqali bekor qilindi' } : {}
    await setAppointmentStatus(appointmentId, holat, extra)

    const label = action === 'confirm' ? '✅ Tasdiqlandi' : '❌ Bekor qilindi'
    const originalText = query.message?.text || ''
    await bot.editMessageText(`${originalText}\n\n${label}`, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    })
    await bot.answerCallbackQuery(query.id, { text: label })
  } catch (err) {
    console.error('[bot] callback_query error:', err?.message || err)
    await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi', show_alert: true })
  }
})

bot.on('polling_error', (err) => console.error('[bot] polling error:', err?.message || err))

bot.setMyCommands([
  { command: 'start', description: "Chat ID va yordam" },
  { command: 'bugun', description: 'Bugungi navbatlar' },
  { command: 'navbatlar', description: 'Kelayotgan navbatlar' },
  { command: 'stats', description: 'Bugungi statistika' },
]).catch((err) => console.error('[bot] setMyCommands error:', err?.message || err))

console.log('[bot] Telegram bot ishga tushdi (long polling).')
if (!adminChatId) {
  console.log("[bot] TELEGRAM_ADMIN_CHAT_ID hali sozlanmagan — botga /start yozib chat ID oling.")
}

poll()
setInterval(poll, POLL_MS)
sendReminders()
setInterval(sendReminders, REMINDER_POLL_MS)
