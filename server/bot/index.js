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
} from './api.js'

const POLL_MS = 5000
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

async function poll() {
  try {
    await forwardClientMessages()
    await forwardAppointments()
  } catch (err) {
    console.error('[bot] poll error:', err?.message || err)
  }
}

bot.onText(/^\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `Salom! Bu chat ID: ${msg.chat.id}\n\n` +
      `Buni .env faylidagi TELEGRAM_ADMIN_CHAT_ID ga qo'ying va botni qayta ishga tushiring.\n\n` +
      `Shundan keyin bu yerga saytdagi yangi mijoz xabarlari va navbatlar kelib turadi. ` +
      `Mijozga javob yozish uchun uning xabariga shu yerda "Reply" qilib yozing (yoki oxirgi mijozga to'g'ridan-to'g'ri yozing).`
  )
})

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return
  if (!isFromAdmin(msg)) return

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

console.log('[bot] Telegram bot ishga tushdi (long polling).')
if (!adminChatId) {
  console.log("[bot] TELEGRAM_ADMIN_CHAT_ID hali sozlanmagan — botga /start yozib chat ID oling.")
}

poll()
setInterval(poll, POLL_MS)
