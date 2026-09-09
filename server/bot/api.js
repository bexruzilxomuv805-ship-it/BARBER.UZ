import client from '../../src/api/client.js'

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

export async function createTelegramUser(tgUser) {
  const newUser = {
    id: `u-tg-${tgUser.id}`,
    ism: tgUser.first_name || 'Telegram',
    familiya: tgUser.last_name || '',
    email: '',
    telefon: '',
    parol: '',
    role: 'client',
    avatar: '',
    telegramId: tgUser.id,
    telegramUsername: tgUser.username || '',
    createdAt: new Date().toISOString(),
  }
  const { data } = await client.post('/users', newUser)
  return data
}
