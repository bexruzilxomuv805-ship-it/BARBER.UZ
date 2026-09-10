import client from '../../src/api/client.js'

// json-server's --watch reloads the whole file on every write, which can
// intermittently hang up an in-flight request ("socket hang up") if the next
// write lands mid-reload. Callers that fire two writes back-to-back should
// use settleAfterWrite() between them, and withRetry()/re-check ground truth
// around the outermost call — see server/bot/index.js.
export function settleAfterWrite(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Thin wrapper around json-server for the Telegram bot process. Message/
// conversation shapes here intentionally mirror sendMessage in
// src/features/chat/chatSlice.js so replies sent from Telegram render
// identically to ones sent from the admin chat panel.

export async function getUnnotifiedClientMessages() {
  // json-server can't filter on a field that's absent (older records never
  // got tgNotified at all), so fetch client messages and filter in JS.
  const { data } = await client.get('/messages', {
    params: { sender: 'client', _sort: 'createdAt', _order: 'asc' },
  })
  return data.filter((m) => !m.tgNotified)
}

export async function markMessageNotified(id) {
  await client.patch(`/messages/${id}`, { tgNotified: true })
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

export async function getUnnotifiedNewClients() {
  const { data } = await client.get('/users', { params: { role: 'client' } })
  return data.filter((u) => !u.tgNotified)
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
  // json-server returns ALL rows (not an empty list) when a filter targets a
  // field no document has yet, so filter in JS instead — see getUnnotified*
  // above for the same issue.
  const { data } = await client.get('/users')
  return data.find((u) => String(u.telegramId) === String(telegramId)) || null
}

export async function setUserPhone(id, telefon) {
  await client.patch(`/users/${id}`, { telefon })
}

export async function getBotUsers() {
  const { data } = await client.get('/users')
  return data.filter((u) => u.telegramId)
}

export async function setUserRole(id, role) {
  const { data } = await client.patch(`/users/${id}`, { role })
  return data
}

export async function deleteUser(id) {
  await client.delete(`/users/${id}`)
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
