import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { FaPaperPlane, FaComments, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaArrowLeft } from 'react-icons/fa'
import Loader from '../../components/Loader'
import Modal from '../../components/admin/Modal'
import { showToast } from '../../features/ui/uiSlice'
import {
  fetchConversations, fetchMessages, sendMessage, updateMessage, removeMessage,
  markConversationRead, setActiveConversation, removeConversation,
} from '../../features/chat/chatSlice'

const POLL_MS = 3000
const TIME_LOCALE = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }

// A handful of accent colors from the app's existing Tailwind palette
// (nothing outside what's already used elsewhere) so conversations read
// apart from each other at a glance, Telegram-style, instead of every row
// showing the same flat gray person icon.
const AVATAR_PALETTE = [
  'bg-gold-500/20 text-gold-300',
  'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-violet-500/20 text-violet-300',
  'bg-rose-500/20 text-rose-300',
  'bg-amber-500/20 text-amber-300',
  'bg-cyan-500/20 text-cyan-300',
  'bg-fuchsia-500/20 text-fuchsia-300',
]

function formatTime(iso, lang) {
  return new Date(iso).toLocaleTimeString(TIME_LOCALE[lang] || 'uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Intl's long/short month names aren't reliably available for every locale
// on every browser's bundled ICU data (uz-UZ in particular can fall back to
// a garbled "M09 10"-style string) — building the date from the app's own
// common.monthsShort i18n array instead renders identically everywhere.
function formatShortDate(iso, t) {
  const date = new Date(iso)
  const monthsShort = t('common.monthsShort', { returnObjects: true })
  return `${date.getDate()} ${monthsShort[date.getMonth()]}`
}

function formatDayLabel(iso, t) {
  const date = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, now)) return t('common.today')
  if (isSameDay(date, yesterday)) return t('common.yesterday')
  return formatShortDate(iso, t)
}

// Relative-ish list timestamp (Telegram shows just a time for today, a
// short date otherwise) — this has to fit in a narrow list row.
function formatListTime(iso, lang, t) {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  if (isSameDay(date, now)) return formatTime(iso, lang)
  return formatShortDate(iso, t)
}

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash)
}

function Avatar({ id, name, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-11 w-11 text-base' : 'h-11 w-11 text-sm md:h-10 md:w-10'
  const colorClass = AVATAR_PALETTE[hashString(id || name || '') % AVATAR_PALETTE.length]
  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full font-semibold ${colorClass}`}>
      {getInitials(name)}
    </span>
  )
}

function ConversationRow({ conversation, active, onClick, lang, t }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-ink-800/60 px-4 py-3.5 text-left transition-colors ${
        active ? 'bg-gold-500/10' : 'hover:bg-ink-800/40 active:bg-ink-800/60'
      }`}
    >
      <Avatar id={conversation.id} name={conversation.userName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-white">{conversation.userName}</p>
          <span className="shrink-0 text-[11px] text-ink-500">{formatListTime(conversation.updatedAt, lang, t)}</span>
        </div>
        <p className="truncate text-xs text-ink-500">{conversation.lastMessage}</p>
      </div>
      {conversation.unreadForAdmin > 0 && (
        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-ink-950">
          {conversation.unreadForAdmin > 9 ? '9+' : conversation.unreadForAdmin}
        </span>
      )}
    </button>
  )
}

// Message thread + composer, shared by the desktop side-by-side pane and the
// mobile full-screen overlay — each instance manages its own scroll-to-
// bottom, so it works correctly regardless of which one is actually mounted.
function ChatConversationPanel({
  conversation,
  messages,
  onBack,
  onDeleteChat,
  editingId,
  editText,
  setEditText,
  startEdit,
  cancelEdit,
  saveEdit,
  onDeleteMessage,
  text,
  setText,
  onSend,
  t,
  i18n,
}) {
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const messagesWithDaySeparators = useMemo(
    () =>
      messages.map((m, i) => {
        const day = new Date(m.createdAt).toDateString()
        const prevDay = i > 0 ? new Date(messages[i - 1].createdAt).toDateString() : null
        return { ...m, showDaySeparator: day !== prevDay }
      }),
    [messages]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ink-900">
      <div className="flex items-center gap-3 border-b border-ink-800 bg-ink-950/60 px-3 py-2.5 md:px-4 md:py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-300 hover:bg-ink-800 hover:text-white"
            aria-label={t('common.back')}
          >
            <FaArrowLeft />
          </button>
        )}
        <Avatar id={conversation?.id} name={conversation?.userName} />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{conversation?.userName}</p>
        <button
          onClick={onDeleteChat}
          className="-mr-1 shrink-0 rounded-full p-2.5 text-ink-400 hover:bg-red-500/10 hover:text-red-400"
          title={t('admin.chat.deleteChatAction')}
          aria-label={t('admin.chat.deleteChatAction')}
        >
          <FaTrash className="text-sm" />
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-ink-600">
          <FaComments className="text-3xl" />
          <p className="text-sm">{t('admin.chat.noMessagesYet')}</p>
        </div>
      ) : (
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
          {messagesWithDaySeparators.map((m) => {
            const { showDaySeparator } = m
            const isOwn = m.sender === 'admin'
            const isEditing = editingId === m.id
            return (
              <div key={m.id}>
                {showDaySeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-ink-800/80 px-3 py-1 text-[11px] font-medium text-ink-400">
                      {formatDayLabel(m.createdAt, t)}
                    </span>
                  </div>
                )}
                <div className={`mb-2.5 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
                      isOwn ? 'rounded-br-md bg-gold-500 text-ink-950' : 'rounded-bl-md bg-ink-800 text-ink-100'
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
                          placeholder={t('admin.chat.editPlaceholder')}
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
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="-m-1.5 shrink-0 rounded-md p-1.5 text-ink-950/70 hover:bg-white/15 hover:text-ink-950"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 px-1 text-[10.5px] text-ink-500">
                    <span>
                      {formatTime(m.createdAt, i18n.language)}
                      {m.edited ? ` · ${t('admin.chat.edited')}` : ''}
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
                          onClick={() => onDeleteMessage(m.id)}
                          className="-m-2 rounded-md p-2 hover:bg-ink-800 hover:text-red-400"
                          aria-label={t('admin.chat.delete')}
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <form
        onSubmit={onSend}
        className="flex items-center gap-2 border-t border-ink-800 bg-ink-950/40 p-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('admin.chat.replyPlaceholder')}
          className="input-field !rounded-full flex-1 !py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink-950 shadow-gold transition-opacity disabled:opacity-40 disabled:shadow-none"
        >
          <FaPaperPlane className="text-sm" />
        </button>
      </form>
    </div>
  )
}

export default function AdminChat() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { conversations, messagesByConversation, activeConversationId } = useSelector((s) => s.chat)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteChatConfirmOpen, setDeleteChatConfirmOpen] = useState(false)

  const messages = messagesByConversation[activeConversationId] || []
  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  // Deep-link support (e.g. from Mijozlar's "Telegram profil" fallback for a
  // customer with no public @username): ?userId= picks their conversation
  // even before one exists yet — conversationId is always just the userId
  // (see handleSend below) — and ?userName= fills the header/first message
  // in that case, since there's no conversation record to read it from yet.
  const linkedUserId = searchParams.get('userId')
  const linkedUserName = searchParams.get('userName')

  const displayConversation = activeConversation || (linkedUserId ? { id: linkedUserId, userName: linkedUserName } : null)

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.trim().toLowerCase()
    return conversations.filter((c) => (c.userName || '').toLowerCase().includes(q))
  }, [conversations, search])

  useEffect(() => {
    if (linkedUserId) dispatch(setActiveConversation(linkedUserId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedUserId])

  useEffect(() => {
    dispatch(fetchConversations()).finally(() => setLoadingList(false))
    const timer = setInterval(() => dispatch(fetchConversations()), POLL_MS)
    return () => clearInterval(timer)
  }, [dispatch])

  useEffect(() => {
    if (!activeConversationId) return
    dispatch(fetchMessages(activeConversationId))
    dispatch(markConversationRead({ conversationId: activeConversationId, forRole: 'admin' }))
    const timer = setInterval(() => dispatch(fetchMessages(activeConversationId)), POLL_MS)
    return () => clearInterval(timer)
  }, [activeConversationId, dispatch])

  const handleSelect = (id) => {
    dispatch(setActiveConversation(id))
  }

  const handleBack = () => {
    dispatch(setActiveConversation(null))
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
    dispatch(removeMessage({ id: deleteTarget, conversationId: activeConversationId }))
    setDeleteTarget(null)
  }

  const confirmDeleteChat = async () => {
    if (!activeConversationId) return
    await dispatch(removeConversation(activeConversationId))
    setDeleteChatConfirmOpen(false)
    dispatch(showToast({ type: 'success', text: t('admin.chat.chatDeletedToast') }))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || !activeConversationId) return
    setText('')
    const conv = conversations.find((c) => c.id === activeConversationId)
    await dispatch(
      sendMessage({
        conversationId: activeConversationId,
        userId: activeConversationId,
        userName: conv?.userName || linkedUserName || t('profile.roleClient'),
        sender: 'admin',
        text: trimmed,
      })
    )
  }

  const sharedPanelProps = {
    conversation: displayConversation,
    messages,
    editingId,
    editText,
    setEditText,
    startEdit,
    cancelEdit,
    saveEdit,
    onDeleteMessage: setDeleteTarget,
    text,
    setText,
    onSend: handleSend,
    onDeleteChat: () => setDeleteChatConfirmOpen(true),
    t,
    i18n,
  }

  return (
    <div>
      <div className="mb-6 hidden md:block">
        <h1 className="font-display text-2xl font-bold text-white">{t('admin.chat.title')}</h1>
        <p className="text-sm text-ink-500 mt-1">{t('admin.chat.subtitle')}</p>
      </div>

      <div className="card grid h-[calc(100dvh-8rem)] grid-cols-1 overflow-hidden md:h-[70vh] md:grid-cols-[300px_1fr]">
        <div className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r border-ink-800">
          <div className="relative shrink-0 border-b border-ink-800/60 p-3">
            <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-xs text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.chat.searchPlaceholder')}
              className="input-field !py-2 pl-9 text-sm"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <Loader />
            ) : filteredConversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-500">{t('admin.chat.noConversations')}</p>
            ) : (
              filteredConversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={activeConversationId === c.id}
                  onClick={() => handleSelect(c.id)}
                  lang={i18n.language}
                  t={t}
                />
              ))
            )}
          </div>
        </div>

        <div className="hidden min-h-0 md:flex md:flex-col">
          {!activeConversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-ink-600">
              <FaComments className="text-4xl mb-2" />
              <p className="text-sm">{t('admin.chat.selectConversation')}</p>
            </div>
          ) : (
            <ChatConversationPanel {...sharedPanelProps} />
          )}
        </div>
      </div>

      {/* Mobile: opening a conversation pushes a full-screen view over the
          whole app shell (sidebar included), the way Telegram's own mobile
          client does, instead of squeezing list + thread into one small box. */}
      <AnimatePresence>
        {activeConversationId && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex flex-col bg-ink-900 md:hidden"
          >
            <ChatConversationPanel {...sharedPanelProps} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('admin.chat.deleteConfirmTitle')}>
        <p className="text-sm text-ink-400">{t('admin.chat.deleteConfirmText')}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="btn-outline flex-1 !py-2 text-sm">
            {t('common.cancel')}
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            {t('admin.chat.delete')}
          </button>
        </div>
      </Modal>

      <Modal open={deleteChatConfirmOpen} onClose={() => setDeleteChatConfirmOpen(false)} title={t('admin.chat.deleteChatConfirmTitle')}>
        <p className="text-sm text-ink-400">{t('admin.chat.deleteChatConfirmText')}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setDeleteChatConfirmOpen(false)} className="btn-outline flex-1 !py-2 text-sm">
            {t('common.cancel')}
          </button>
          <button
            onClick={confirmDeleteChat}
            className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            {t('admin.chat.deleteChatAction')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
