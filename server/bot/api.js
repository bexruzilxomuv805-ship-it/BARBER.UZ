import client from '../../src/api/client.js'

// Left over from the old json-server backend, which reloaded its whole file
// on every write and could intermittently hang up an in-flight request
// ("socket hang up") if the next write landed mid-reload. The Postgres API
// (server/pgserver.js) doesn't have that failure mode, but the retry/verify
// pattern this enabled (withRetry()/re-check ground truth — see
// server/bot/index.js) is cheap insurance against any transient network
// error, so it's kept as-is.
export function settleAfterWrite(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Thin wrapper around the Postgres API for the Telegram bot process. Message/
// conversation shapes here intentionally mirror sendMessage in
// src/features/chat/chatSlice.js so replies sent from Telegram render
// identically to ones sent from the admin chat panel.

export async function getUnnotifiedClientMessages() {
  // Filtering on a boolean-absent field (`!tgNotified`) isn't an equality
  // filter the REST API can express, so fetch client messages and filter in JS.
  const { data } = await client.get('/messages', {
    params: { sender: 'client', _sort: 'createdAt', _order: 'asc' },
  })
  return data.filter((m) => !m.tgNotified)
}

export async function markMessageNotified(id) {
  await client.patch(`/messages/${id}`, { tgNotified: true })
}

// Records which Telegram message a forwarded client message became, plus the
// text it was forwarded with (tgSyncedText) — later polls diff the live
// `text` against tgSyncedText to detect site-side edits that still need to
// be pushed into Telegram via editMessageText.
export async function markMessageForwarded(id, { chatId, messageId, text }) {
  await client.patch(`/messages/${id}`, {
    tgNotified: true,
    tgChatId: chatId,
    tgMessageId: messageId,
    tgSyncedText: text,
  })
}

// Not sender-scoped — covers edits to messages forwarded in either direction
// (client -> admin's Telegram, or admin -> client's Telegram).
export async function getEditedForwardedMessages() {
  const { data } = await client.get('/messages', { params: { _sort: 'createdAt', _order: 'asc' } })
  return data.filter((m) => m.tgMessageId && m.text !== m.tgSyncedText)
}

export async function markMessageEditSynced(id, text) {
  await client.patch(`/messages/${id}`, { tgSyncedText: text })
}

// Admin replies typed on the site (AdminChat.jsx) — as opposed to ones typed
// directly in Telegram (which postAdminReply already marks tgNotified since
// they originated there) — still need to be pushed out to the client's
// Telegram chat.
export async function getUnnotifiedAdminMessages() {
  const { data } = await client.get('/messages', {
    params: { sender: 'admin', _sort: 'createdAt', _order: 'asc' },
  })
  return data.filter((m) => !m.tgNotified)
}

export async function postAdminReply({ conversationId, userId, userName, text }) {
  const message = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    conversationId,
    userId,
    userName,
    sender: 'admin',
    text,
    createdAt: new Date().toISOString(),
    read: true,
    tgNotified: true,
  }
  const { data } = await client.post('/messages', message)

  try {
    await client.get(`/conversations/${conversationId}`)
    await client.patch(`/conversations/${conversationId}`, {
      lastMessage: text,
      updatedAt: message.createdAt,
      unreadForClient: 1,
    })
  } catch {
    await client.post('/conversations', {
      id: conversationId,
      userId,
      userName,
      lastMessage: text,
      updatedAt: message.createdAt,
      unreadForAdmin: 0,
      unreadForClient: 1,
    })
  }

  return data
}

export async function getConversation(conversationId) {
  try {
    const { data } = await client.get(`/conversations/${conversationId}`)
    return data
  } catch (err) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function getUnnotifiedPendingAppointments() {
  const { data } = await client.get('/appointments', {
    params: { holat: 'kutilmoqda', _sort: 'createdAt', _order: 'asc' },
  })
  return data.filter((a) => !a.tgNotified)
}

export async function markAppointmentNotified(id) {
  await client.patch(`/appointments/${id}`, { tgNotified: true })
}

export async function setAppointmentStatus(id, holat, extra = {}) {
  const { data } = await client.patch(`/appointments/${id}`, { holat, ...extra })
  return data
}

export async function getAllAppointments() {
  const { data } = await client.get('/appointments')
  return data
}

export async function markAppointmentReminded(id) {
  await client.patch(`/appointments/${id}`, { tgReminded: true })
}

export async function markAppointmentArrivalAsked(id) {
  await client.patch(`/appointments/${id}`, { tgArrivalAsked: true })
}

export async function setAppointmentArrival(id, kelganmi) {
  const { data } = await client.patch(`/appointments/${id}`, { kelganmi })
  return data
}

export async function getUnnotifiedNewClients() {
  const { data } = await client.get('/users', { params: { role: 'client' } })
  return data.filter((u) => !u.tgNotified && !u.deleted)
}

export async function markUserNotified(id) {
  await client.patch(`/users/${id}`, { tgNotified: true })
}

export async function getTelegramLogin(token) {
  try {
    const { data } = await client.get(`/telegramLogins/${encodeURIComponent(token)}`)
    return data
  } catch (err) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function confirmTelegramLogin(token, userId) {
  await client.patch(`/telegramLogins/${encodeURIComponent(token)}`, { status: 'confirmed', userId })
}

export async function findUserByTelegramId(telegramId) {
  // Most users don't have a telegramId at all, so this can't be a plain
  // equality query param — fetch and filter in JS instead.
  const { data } = await client.get('/users')
  // A deleted account must not resolve to anything usable until an admin
  // restores it (see restoreUser) — treat it the same as "no account".
  return data.find((u) => String(u.telegramId) === String(telegramId) && !u.deleted) || null
}

// Unfiltered counterpart to findUserByTelegramId — used only where the
// caller must tell "no account at all" apart from "there IS an account here,
// it's just deleted" (see handleTelegramLoginStart / handleTelegramLinkExisting
// in server/bot/index.js). Telegram ids are stable, so createTelegramUser
// would otherwise try to INSERT a new row with the same `u-tg-<id>` primary
// key as the deleted one and hit a duplicate-key error instead of telling
// the person their account was deactivated.
export async function findAnyUserByTelegramId(telegramId) {
  const { data } = await client.get('/users')
  return data.find((u) => String(u.telegramId) === String(telegramId)) || null
}

// Lets a site-registered user (created via Register.jsx, or one whose
// TelegramLinkGate step never completed) self-link an unrecognized Telegram
// account by phone number instead of being told to "register on the site"
// as if they have no account at all — see handlePhoneAccountMatch.
export async function findUserByPhone(telefon) {
  const digits = String(telefon || '').replace(/[^\d]/g, '')
  if (!digits) return null
  const { data } = await client.get('/users')
  return data.find((u) => String(u.telefon || '').replace(/[^\d]/g, '') === digits && !u.deleted) || null
}

// Unfiltered counterpart to findUserByPhone — see findAnyUserByTelegramId;
// same reasoning, so handlePhoneAccountMatch can say "your account was
// deactivated" instead of the misleading "no account found, register as new".
export async function findAnyUserByPhone(telefon) {
  const digits = String(telefon || '').replace(/[^\d]/g, '')
  if (!digits) return null
  const { data } = await client.get('/users')
  return data.find((u) => String(u.telefon || '').replace(/[^\d]/g, '') === digits) || null
}

export async function setUserPhone(id, telefon) {
  await client.patch(`/users/${id}`, { telefon })
}

export async function setUserTelegramLink(id, { telegramId, telegramUsername }) {
  const { data } = await client.patch(`/users/${id}`, { telegramId, telegramUsername })
  return data
}

export async function getBotUsers() {
  const { data } = await client.get('/users')
  return data.filter((u) => u.telegramId && !u.deleted)
}

export async function setUserRole(id, role) {
  const { data } = await client.patch(`/users/${id}`, { role })
  return data
}

// Soft delete: flags the row instead of removing it, so restoreUser can bring
// the account (and everything tied to its id — appointments, messages,
// reviews, payments, which a hard DELETE never touched anyway) back 100%.
// deleteNotified:false arms the one-time Telegram DM sent by
// forwardAccountStatusChanges() (server/bot/index.js) on the next poll,
// however the delete was triggered — from this same bot action or from the
// site's admin panel, since both write to the same users row.
export async function deleteUser(id) {
  const { data } = await client.patch(`/users/${id}`, {
    deleted: true,
    deletedAt: new Date().toISOString(),
    deleteNotified: false,
  })
  return data
}

export async function restoreUser(id) {
  const { data } = await client.patch(`/users/${id}`, {
    deleted: false,
    deletedAt: null,
    deleteNotified: null,
    restoreNotified: false,
  })
  return data
}

export async function getDeletedUsers() {
  const { data } = await client.get('/users')
  return data.filter((u) => u.deleted)
}

// Not filtered to u.telegramId — forwardAccountStatusChanges (server/bot/
// index.js) always tells the admin about this regardless of whether the
// affected account has a Telegram link, and only DMs the account holder
// itself when it does.
//
// `!== true` rather than `=== false`: already gated by u.deleted, so this
// only ever matches currently-deleted accounts, and it deliberately catches
// ones deleted before this notice system existed (deleteNotified missing
// entirely) or before AdminCustomers.jsx started setting it — those would
// otherwise sit deleted forever with nobody, including the admin, ever told.
export async function getUsersPendingDeleteNotice() {
  const { data } = await client.get('/users')
  return data.filter((u) => u.deleted && u.deleteNotified !== true)
}

export async function markUserDeleteNotified(id) {
  await client.patch(`/users/${id}`, { deleteNotified: true })
}

// Deliberately strict `=== false` here, unlike the delete-notice query above
// — `!u.deleted` alone matches essentially every normal, never-deleted user
// in the system, so relaxing this to `!== true` would queue every one of
// them for a bogus "your account was restored!" DM the moment this code
// first runs. Only restoreUser()/AdminCustomers' handleRestore ever set
// restoreNotified to false, so this stays scoped to actual restorations.
export async function getUsersPendingRestoreNotice() {
  const { data } = await client.get('/users')
  return data.filter((u) => !u.deleted && u.restoreNotified === false)
}

export async function markUserRestoreNotified(id) {
  await client.patch(`/users/${id}`, { restoreNotified: true })
}

export async function getUserAppointments(userId) {
  const { data } = await client.get('/appointments', { params: { mijozId: userId } })
  return data
}

export async function getUser(id) {
  try {
    const { data } = await client.get(`/users/${id}`)
    return data
  } catch (err) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function getBarber(id) {
  try {
    const { data } = await client.get(`/barbers/${id}`)
    return data
  } catch (err) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function getContactInfo() {
  const { data } = await client.get('/contactInfo')
  return data
}

export async function postClientMessageFromBot({ conversationId, userId, userName, text }) {
  const message = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    conversationId,
    userId,
    userName,
    sender: 'client',
    text,
    createdAt: new Date().toISOString(),
    read: false,
  }
  const { data } = await client.post('/messages', message)

  try {
    await client.get(`/conversations/${conversationId}`)
    await client.patch(`/conversations/${conversationId}`, {
      lastMessage: text,
      updatedAt: message.createdAt,
      unreadForAdmin: 1,
    })
  } catch {
    await client.post('/conversations', {
      id: conversationId,
      userId,
      userName,
      lastMessage: text,
      updatedAt: message.createdAt,
      unreadForAdmin: 1,
      unreadForClient: 0,
    })
  }

  return data
}

export async function getAppointmentById(id) {
  try {
    const { data } = await client.get(`/appointments/${id}`)
    return data
  } catch (err) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function getServiceById(id) {
  try {
    const { data } = await client.get(`/services/${id}`)
    return data
  } catch (err) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function getAllPayments() {
  const { data } = await client.get('/payments')
  return data
}

export async function getPaymentByAppointment(appointmentId) {
  const { data } = await client.get('/payments', { params: { appointmentId } })
  return data[0] || null
}

export async function createPayment(payment) {
  const { data } = await client.post('/payments', payment)
  return data
}

export async function updatePaymentMethod(paymentId, usul) {
  const { data } = await client.patch(`/payments/${paymentId}`, { usul })
  return data
}

export async function getInventory() {
  const { data } = await client.get('/inventory')
  return data
}

export async function markInventoryLowStockNotified(id, notified) {
  await client.patch(`/inventory/${id}`, { tgLowStockNotified: notified })
}

export async function getUnreviewedCompletedAppointments() {
  const { data } = await client.get('/appointments', { params: { holat: 'yakunlangan' } })
  return data.filter((a) => !a.tgReviewRequested)
}

export async function markReviewRequested(id) {
  await client.patch(`/appointments/${id}`, { tgReviewRequested: true })
}

export async function createReview(review) {
  const { data } = await client.post('/reviews', review)
  return data
}

export async function updateReview(id, changes) {
  const { data } = await client.patch(`/reviews/${id}`, changes)
  return data
}

export async function getReviewsByBarber(barberId) {
  const { data } = await client.get('/reviews', { params: { barberId } })
  return data
}

export async function setBarberRating(barberId, reyting) {
  await client.patch(`/barbers/${barberId}`, { reyting })
}

export async function createTelegramUser(tgUser, role = 'client') {
  const newUser = {
    id: `u-tg-${tgUser.id}`,
    ism: tgUser.first_name || 'Telegram',
    familiya: tgUser.last_name || '',
    email: '',
    telefon: '',
    parol: '',
    role,
    avatar: '',
    telegramId: tgUser.id,
    telegramUsername: tgUser.username || '',
    createdAt: new Date().toISOString(),
  }
  const { data } = await client.post('/users', newUser)
  return data
}
