import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FaHeadset, FaPaperPlane, FaTimes, FaCommentDots, FaPhoneAlt, FaTelegramPlane, FaInstagram,
  FaEdit, FaTrash, FaCheck, FaRobot, FaArrowLeft,
} from 'react-icons/fa'
import useAuth from '../hooks/useAuth'
import useConversationId from '../hooks/useConversationId'
import Modal from './admin/Modal'
import { getBarberImage } from '../assets/images'
import { showToast, setChatOpen, setChatBarberContext } from '../features/ui/uiSlice'
import { fetchBarbers } from '../features/barbers/barbersSlice'
import {
  fetchMyConversations, fetchMessages, sendMessage, updateMessage, removeMessage,
  markConversationRead, removeConversation,
} from '../features/chat/chatSlice'

const POLL_MS = 3000
const CONVERSATION_POLL_MS = 6000
const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME

const FALLBACK_CONTACT = { telefon: '', telegram: '', instagram: '' }
const TIME_LOCALE = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }

function formatTime(iso, lang) {
  return new Date(iso).toLocaleTimeString(TIME_LOCALE[lang] || 'uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

// Telegram-style: today shows a clock time, anything older shows a short date.
function formatListTime(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? formatTime(iso, lang)
    : d.toLocaleDateString(TIME_LOCALE[lang] || 'uz-UZ', { day: '2-digit', month: '2-digit' })
}

export default function ChatWidget() {
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteChatConfirmOpen, setDeleteChatConfirmOpen] = useState(false)
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { info } = useSelector((s) => s.contact)
  const contact = info || FALLBACK_CONTACT
  const open = useSelector((s) => s.ui.isChatOpen)
  const chatBarberContext = useSelector((s) => s.ui.chatBarberContext)
  const barbers = useSelector((s) => s.barbers.items)
  const userId = useConversationId()
  const myConversations = useSelector((s) => s.chat.myConversations)

  // A chat opened from a barber's own profile ("Xabar yozish") always jumps
  // straight to that barber's own persisted thread; otherwise the widget
  // shows the Telegram-style chat list and the person picks one themselves.
  const activeId = chatBarberContext ? `${userId}__${chatBarberContext}` : selectedId
  const showList = open && !activeId

  const activeBarberId = chatBarberContext || (activeId ? myConversations.find((c) => c.id === activeId)?.barberId : null)
  const activeBarber = activeBarberId ? barbers.find((b) => b.id === activeBarberId) : null

  const messages = useSelector((s) => s.chat.messagesByConversation[activeId] || [])
  const totalUnread = useMemo(
    () => myConversations.reduce((sum, c) => sum + (c.unreadForClient || 0), 0),
    [myConversations]
  )

  const listRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    dispatch(fetchBarbers())
  }, [dispatch])

  useEffect(() => {
    if (!open || !activeId) return
    dispatch(fetchMessages(activeId))
    timerRef.current = setInterval(() => {
      dispatch(fetchMessages(activeId))
    }, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [open, activeId, dispatch])

  // Polled even while the widget is closed so the floating bubble's unread
  // badge (and each list row's own badge) stay live the moment admin or a
  // barber replies — from the site or via the bot, either way.
  useEffect(() => {
    dispatch(fetchMyConversations(userId))
    const timer = setInterval(() => dispatch(fetchMyConversations(userId)), CONVERSATION_POLL_MS)
    return () => clearInterval(timer)
  }, [userId, dispatch])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

  // Closing the widget always returns to a fresh chat list next time it opens.
  const closeChat = () => {
    dispatch(setChatOpen(false))
    setSelectedId(null)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending || !activeId) return
    setSending(true)
    setText('')
    await dispatch(
      sendMessage({
        conversationId: activeId,
        userId,
        userName: user ? `${user.ism} ${user.familiya}` : t('chat.guestName'),
        sender: 'client',
        text: trimmed,
        ...(activeBarberId ? { barberId: activeBarberId } : {}),
      })
    )
    dispatch(fetchMyConversations(userId))
    setSending(false)
  }

  const openChat = () => {
    setMenuOpen(false)
    dispatch(setChatOpen(true))
  }

  const openConversation = (conversation) => {
    setSelectedId(conversation.id)
    if (conversation.unreadForClient > 0) {
      dispatch(markConversationRead({ conversationId: conversation.id, forRole: 'client' }))
    }
  }

  const goBackToList = () => {
    if (chatBarberContext) dispatch(setChatBarberContext(null))
    setSelectedId(null)
  }

  const startEdit = (m) => {
    setEditingId(m.id)
    setEditText(m.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = (id) => {
    const trimmed = editText.trim()
    if (!trimmed) return
    dispatch(updateMessage({ id, changes: { text: trimmed, edited: true } }))
    setEditingId(null)
    setEditText('')
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    dispatch(removeMessage({ id: deleteTarget, conversationId: activeId }))
    setDeleteTarget(null)
  }

  const confirmDeleteChat = async () => {
    await dispatch(removeConversation(activeId))
    setDeleteChatConfirmOpen(false)
    goBackToList()
    dispatch(showToast({ type: 'success', text: t('chat.chatDeletedToast') }))
  }

  // The general support thread (no barberId) is always offered even before
  // its first message — synthesized here so it still shows up as a row.
  const adminConversation = myConversations.find((c) => c.id === userId) || {
    id: userId,
    lastMessage: null,
    lastMessageSender: null,
    updatedAt: null,
    unreadForClient: 0,
  }
  const barberConversations = myConversations
    .filter((c) => c.barberId)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  const conversationRows = [adminConversation, ...barberConversations]

  return (
    <>
      <div className="fixed bottom-20 right-5 z-40 lg:bottom-5">
        {!open && (
          <div className="relative">
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="chat-menu"
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-full right-0 mb-3 w-72 max-w-[85vw] overflow-hidden rounded-2xl border border-gold-500/30 bg-ink-900 shadow-2xl"
                >
                  <div className="border-b border-ink-800 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{t('chat.menuTitle')}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={openChat}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink-800"
                    >
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
                        <FaCommentDots />
                        {totalUnread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-ink-900" />}
                      </span>
                      <span className="flex-1 text-sm font-medium text-white">{t('chat.viaSite')}</span>
                      {totalUnread > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                      )}
                    </button>
                    {BOT_USERNAME && (
                      <a
                        href={`https://t.me/${BOT_USERNAME}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ink-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400"><FaRobot /></span>
                        <span>
                          <span className="block text-sm font-medium text-white">{t('chat.telegramBotAction')}</span>
                          <span className="block text-xs text-ink-500">@{BOT_USERNAME}</span>
                        </span>
                      </a>
                    )}
                    {contact.telefon && (
                      <a
                        href={`tel:${contact.telefon.replace(/\s+/g, '')}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ink-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><FaPhoneAlt /></span>
                        <span>
                          <span className="block text-sm font-medium text-white">{t('chat.callAction')}</span>
                          <span className="block text-xs text-ink-500">{contact.telefon}</span>
                        </span>
                      </a>
                    )}
                    {contact.telegram && (
                      <a
                        href={contact.telegram}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ink-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400"><FaTelegramPlane /></span>
                        <span className="text-sm font-medium text-white">Telegram</span>
                      </a>
                    )}
                    {contact.instagram && (
                      <a
                        href={contact.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ink-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-pink-400"><FaInstagram /></span>
                        <span className="text-sm font-medium text-white">Instagram</span>
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setMenuOpen((v) => !v)}
              className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950 text-2xl shadow-gold ${menuOpen ? '' : 'animate-pulseRing'}`}
              aria-label={t('chat.supportLabel')}
            >
              {menuOpen ? <FaTimes /> : <FaHeadset />}
              {totalUnread > 0 && !menuOpen && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-ink-950">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </motion.button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {open && showList && (
            <motion.div
              key="chat-list"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-gold-500/30 bg-ink-900 shadow-2xl"
            >
              <div className="flex items-center justify-between bg-gradient-to-r from-ink-800 to-ink-900 px-4 py-3 border-b border-ink-800">
                <p className="text-sm font-semibold text-white">{t('chat.conversationsTitle')}</p>
                <button onClick={() => closeChat()} className="-m-2 rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white">
                  <FaTimes />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversationRows.map((c) => {
                  const rowBarber = c.barberId ? barbers.find((b) => b.id === c.barberId) : null
                  const name = c.barberId
                    ? (rowBarber ? `${rowBarber.ism} ${rowBarber.familiya}` : t('booking.barberLabel'))
                    : t('chat.supportLabel')
                  const preview = c.lastMessage
                    ? `${c.lastMessageSender === 'client' ? `${t('chat.you')}: ` : ''}${c.lastMessage}`
                    : t('chat.noMessagesYet')
                  const unread = c.unreadForClient || 0
                  return (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c)}
                      className="flex w-full items-center gap-3 border-b border-ink-800/60 px-4 py-3 text-left hover:bg-ink-800/60"
                    >
                      {rowBarber ? (
                        <img
                          src={getBarberImage(rowBarber.rasm)}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
                          <FaHeadset />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white">{name}</span>
                          <span className="shrink-0 text-[11px] text-ink-500">{formatListTime(c.updatedAt, i18n.language)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-ink-400">{preview}</span>
                          {unread > 0 && (
                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-ink-950">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {open && !showList && (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-gold-500/30 bg-ink-900 shadow-2xl"
            >
              <div className="flex items-center gap-2 bg-gradient-to-r from-ink-800 to-ink-900 px-3 py-3 border-b border-ink-800">
                <button
                  onClick={goBackToList}
                  className="-m-2 shrink-0 rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white"
                  aria-label={t('chat.backAction')}
                >
                  <FaArrowLeft />
                </button>
                {activeBarber ? (
                  <img src={getBarberImage(activeBarber.rasm)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
                    <FaHeadset />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {activeBarberId ? (activeBarber ? `${activeBarber.ism} ${activeBarber.familiya}` : t('booking.barberLabel')) : t('chat.supportLabel')}
                  </p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> {t('chat.online')}
                  </p>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={() => setDeleteChatConfirmOpen(true)}
                    className="-m-2 shrink-0 rounded-lg p-2 text-ink-400 hover:bg-red-500/10 hover:text-red-400"
                    aria-label={t('chat.deleteChatAction')}
                    title={t('chat.deleteChatAction')}
                  >
                    <FaTrash />
                  </button>
                )}
                <button onClick={() => closeChat()} className="-m-2 shrink-0 rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white">
                  <FaTimes />
                </button>
              </div>

              <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-ink-500 mt-6">
                    {t('chat.emptyState')}
                  </p>
                )}
                {messages.map((m) => {
                  const isOwn = m.sender === 'client'
                  const isEditing = editingId === m.id
                  return (
                    <div key={m.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                          isOwn ? 'bg-gold-500 text-ink-950 rounded-br-sm' : 'bg-ink-800 text-ink-100 rounded-bl-sm'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(m.id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              placeholder={t('chat.editPlaceholder')}
                              className="min-w-0 flex-1 rounded-lg border border-ink-950/20 bg-white/25 px-2 py-1 text-sm text-ink-950 placeholder:text-ink-950/50 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => saveEdit(m.id)}
                              disabled={!editText.trim()}
                              className="-m-1.5 shrink-0 rounded-md p-1.5 text-ink-950/70 hover:bg-white/15 hover:text-ink-950 disabled:opacity-30"
                            >
                              <FaCheck className="text-xs" />
                            </button>
                            <button type="button" onClick={cancelEdit} className="-m-1.5 shrink-0 rounded-md p-1.5 text-ink-950/70 hover:bg-white/15 hover:text-ink-950">
                              <FaTimes className="text-xs" />
                            </button>
                          </div>
                        ) : (
                          m.text
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-500">
                        <span>
                          {formatTime(m.createdAt, i18n.language)}
                          {m.edited ? ` ${t('chat.edited')}` : ''}
                        </span>
                        {isOwn && !isEditing && (
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(m)}
                              className="-m-2 rounded-md p-2 hover:bg-ink-800 hover:text-gold-400"
                              aria-label={t('common.edit')}
                            >
                              <FaEdit className="text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(m.id)}
                              className="-m-2 rounded-md p-2 hover:bg-ink-800 hover:text-red-400"
                              aria-label={t('chat.delete')}
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-800 p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  className="input-field !py-2 flex-1 text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink-950 disabled:opacity-40 transition-opacity"
                >
                  <FaPaperPlane className="text-sm" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('chat.deleteConfirmTitle')}>
        <p className="text-sm text-ink-400">{t('chat.deleteConfirmText')}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="btn-outline flex-1 !py-2 text-sm">
            {t('common.cancel')}
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            {t('chat.delete')}
          </button>
        </div>
      </Modal>

      <Modal open={deleteChatConfirmOpen} onClose={() => setDeleteChatConfirmOpen(false)} title={t('chat.deleteChatConfirmTitle')}>
        <p className="text-sm text-ink-400">{t('chat.deleteChatConfirmText')}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setDeleteChatConfirmOpen(false)} className="btn-outline flex-1 !py-2 text-sm">
            {t('common.cancel')}
          </button>
          <button
            onClick={confirmDeleteChat}
            className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            {t('chat.deleteChatAction')}
          </button>
        </div>
      </Modal>
    </>
  )
}
