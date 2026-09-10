import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaPaperPlane, FaUserCircle, FaComments, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'
import Loader from '../../components/Loader'
import Modal from '../../components/admin/Modal'
import { showToast } from '../../features/ui/uiSlice'
import {
  fetchConversations, fetchMessages, sendMessage, updateMessage, removeMessage,
  markConversationRead, setActiveConversation, removeConversation,
} from '../../features/chat/chatSlice'

const POLL_MS = 3000
const TIME_LOCALE = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }

function formatTime(iso, lang) {
  return new Date(iso).toLocaleTimeString(TIME_LOCALE[lang] || 'uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminChat() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { conversations, messagesByConversation, activeConversationId } = useSelector((s) => s.chat)
  const [text, setText] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteChatConfirmOpen, setDeleteChatConfirmOpen] = useState(false)
  const listRef = useRef(null)

  const messages = messagesByConversation[activeConversationId] || []
  const activeConversation = conversations.find((c) => c.id === activeConversationId)

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

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const handleSelect = (id) => {
    dispatch(setActiveConversation(id))
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
        userName: conv?.userName || t('profile.roleClient'),
        sender: 'admin',
        text: trimmed,
      })
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">{t('admin.chat.title')}</h1>
        <p className="text-sm text-ink-500 mt-1">{t('admin.chat.subtitle')}</p>
      </div>

      <div className="card grid grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]" style={{ height: '65vh' }}>
        <div className="border-b md:border-b-0 md:border-r border-ink-800 overflow-y-auto">
          {loadingList ? (
            <Loader />
          ) : conversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-500">{t('admin.chat.noConversations')}</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`flex w-full items-center gap-3 border-b border-ink-800/60 px-4 py-3 text-left transition-colors ${
                  activeConversationId === c.id ? 'bg-gold-500/10' : 'hover:bg-ink-800/40'
                }`}
              >
                <FaUserCircle className="text-2xl text-ink-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{c.userName}</p>
                  <p className="text-xs text-ink-500 truncate">{c.lastMessage}</p>
                </div>
                {c.unreadForAdmin > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                    {c.unreadForAdmin}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex min-h-0 flex-col">
          {!activeConversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-ink-600">
              <FaComments className="text-4xl mb-2" />
              <p className="text-sm">{t('admin.chat.selectConversation')}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
                <p className="truncate text-sm font-medium text-white">{activeConversation?.userName}</p>
                <button
                  onClick={() => setDeleteChatConfirmOpen(true)}
                  className="-m-2 shrink-0 rounded-lg p-2 text-ink-400 hover:bg-red-500/10 hover:text-red-400"
                  title={t('admin.chat.deleteChatAction')}
                  aria-label={t('admin.chat.deleteChatAction')}
                >
                  <FaTrash />
                </button>
              </div>
              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const isOwn = m.sender === 'admin'
                  const isEditing = editingId === m.id
                  return (
                    <div key={m.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-snug ${
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
                          {m.edited ? ` ${t('admin.chat.edited')}` : ''}
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
                              aria-label={t('admin.chat.delete')}
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
                  placeholder={t('admin.chat.replyPlaceholder')}
                  className="input-field !py-2 flex-1 text-sm"
                />
                <button type="submit" disabled={!text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink-950 disabled:opacity-40">
                  <FaPaperPlane className="text-sm" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

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
