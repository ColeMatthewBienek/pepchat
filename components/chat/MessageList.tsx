'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { editMessage, deleteMessage } from '@/app/(app)/messages/actions'
import Message from '@/components/chat/Message'
import MessageModal from '@/components/chat/MessageModal'
import SystemMessage from '@/components/chat/SystemMessage'
import { PERMISSIONS } from '@/lib/permissions'
import type { MessageWithProfile } from '@/lib/types'
import type { Role } from '@/lib/permissions'

const ProfileCard = dynamic(() => import('@/components/profile/ProfileCard'), { ssr: false })

interface MessageListProps {
  messages: MessageWithProfile[]
  hasMore: boolean
  loadingMore: boolean
  currentUserId: string
  currentUsername: string
  channelName?: string
  userRole?: Role | null
  onLoadMore: () => void
  onReact: (messageId: string, emoji: string) => void
  onReply: (msg: MessageWithProfile) => void
  allowReactions?: boolean
  allowReplies?: boolean
  editAction?: (messageId: string, content: string) => Promise<{ error: string } | { ok: true }>
  deleteAction?: (messageId: string) => Promise<{ error: string } | { ok: true }>
  pinAction?: (messageId: string) => Promise<{ error: string } | { ok: true }>
  onEditSuccess?: (messageId: string, content: string) => void
  onOpenPinnedPanel?: () => void
  highlightedMessageId?: string | null
}

function isCompact(msg: MessageWithProfile, prev: MessageWithProfile | null): boolean {
  if (!prev) return false
  if (msg.user_id !== prev.user_id) return false
  if (msg.replied_to) return false
  return new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function isSameDay(a: string, b: string) {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export default function MessageList({
  messages,
  hasMore,
  loadingMore,
  currentUserId,
  onLoadMore,
  onReact,
  onReply,
  allowReactions = true,
  allowReplies = true,
  userRole,
  editAction,
  deleteAction,
  pinAction,
  onEditSuccess,
  onOpenPinnedPanel,
  highlightedMessageId,
}: MessageListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')
  const [editPending, setEditPending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const [profileCard, setProfileCard] = useState<{ userId: string; anchor: HTMLElement } | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [modalMsg, setModalMsg] = useState<MessageWithProfile | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const knownIdsRef = useRef(new Set(messages.map(m => m.id)))
  const prevFirstIdRef = useRef(messages[0]?.id)
  const newIdsRef = useRef(new Set<string>())

  useEffect(() => {
    const currentFirstId = messages[0]?.id
    if (currentFirstId === prevFirstIdRef.current) {
      for (const m of messages) {
        if (!knownIdsRef.current.has(m.id)) newIdsRef.current.add(m.id)
      }
    }
    for (const m of messages) knownIdsRef.current.add(m.id)
    prevFirstIdRef.current = currentFirstId
  }, [messages])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distFromBottom < 80
    setShowScrollBtn(distFromBottom > 300)
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!highlightedMessageId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-message-id="${highlightedMessageId}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('message-highlighted')
    const timer = setTimeout(() => el.classList.remove('message-highlighted'), 1600)
    return () => clearTimeout(timer)
  }, [highlightedMessageId])

  function startEdit(msg: MessageWithProfile) {
    setEditingId(msg.id)
    setEditContent(msg.content)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function submitEdit(messageId: string) {
    if (!editContent.trim() || editPending) return
    setError('')
    setEditPending(true)
    try {
      const action = editAction ?? editMessage
      const result = await action(messageId, editContent)
      if ('error' in result) {
        setError(result.error)
      } else {
        setEditingId(null)
        onEditSuccess?.(messageId, editContent)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edit.')
    } finally {
      setEditPending(false)
    }
  }

  function handleDelete(messageId: string) {
    if (!confirm('Delete this message?')) return
    setError('')
    startTransition(async () => {
      const action = deleteAction ?? deleteMessage
      const result = await action(messageId)
      if ('error' in result) setError(result.error)
    })
  }

  function handleModalDelete(messageId: string) {
    setError('')
    startTransition(async () => {
      const action = deleteAction ?? deleteMessage
      const result = await action(messageId)
      if ('error' in result) setError(result.error)
    })
  }

  function handlePin(messageId: string) {
    if (!pinAction) return
    setError('')
    startTransition(async () => {
      const result = await pinAction(messageId)
      if ('error' in result) setError(result.error)
    })
  }

  const canDeleteAny = userRole ? PERMISSIONS.canDeleteAnyMessage(userRole) : false
  const canPin = userRole ? PERMISSIONS.canPinMessages(userRole) : false

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as any,
          overscrollBehavior: 'contain',
          padding: '12px 0',
        }}
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50 disabled:cursor-default px-3 py-1 rounded hover:bg-[var(--accent)]/10 transition-colors"
            >
              {loadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded px-3 py-1.5 mx-4 mb-2">
            {error}
          </p>
        )}

        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null
          const compact = isCompact(msg, prev)
          const showDateSep = !prev || !isSameDay(msg.created_at, prev.created_at)
          const isOwn = msg.user_id === currentUserId
          const uniqueEmojiCount = new Set((msg.reactions ?? []).map(r => r.emoji)).size
          const atReactionLimit = uniqueEmojiCount >= 20

          const isNewMsg = newIdsRef.current.has(msg.id)
          return (
            <div key={msg.id} data-message-id={msg.id} className={isNewMsg ? 'message-new' : undefined}>
              {showDateSep && !msg.is_system && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 16px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
                  <span style={{
                    fontSize: 11,
                    color: 'var(--text-faint)',
                    background: 'var(--bg-chat)',
                    padding: '0 12px',
                    fontWeight: 500,
                  }}>
                    {formatDateSeparator(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
                </div>
              )}

              {msg.is_system ? (
                <SystemMessage msg={msg} onOpenPinnedPanel={onOpenPinnedPanel ?? (() => {})} />
              ) : (
                <Message
                  msg={msg}
                  isCompact={compact}
                  isOwn={isOwn}
                  currentUserId={currentUserId}
                  canDeleteAny={canDeleteAny}
                  canPin={canPin}
                  editingId={editingId}
                  editContent={editContent}
                  pickerOpenFor={pickerOpenFor}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onEditContentChange={setEditContent}
                  onSubmitEdit={submitEdit}
                  onDelete={handleDelete}
                  onOpenProfile={(userId, anchor) => setProfileCard({ userId, anchor })}
                  onPickerToggle={id => setPickerOpenFor(pickerOpenFor === id ? null : id)}
                  onPickerClose={() => setPickerOpenFor(null)}
                  onEmojiSelect={(msgId, emoji) => { setPickerOpenFor(null); onReact(msgId, emoji) }}
                  onReact={emoji => onReact(msg.id, emoji)}
                  onReply={onReply}
                  onOpenActions={setModalMsg}
                  onPin={handlePin}
                  allowReactions={allowReactions}
                  allowReplies={allowReplies}
                  isPending={editPending || isPending}
                  atReactionLimit={atReactionLimit}
                />
              )}
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
          title="Scroll to bottom"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      )}

      {profileCard && (
        <ProfileCard
          userId={profileCard.userId}
          currentUserId={currentUserId}
          anchorEl={profileCard.anchor}
          onClose={() => setProfileCard(null)}
        />
      )}

      <MessageModal
        open={modalMsg !== null}
        msg={modalMsg}
        isOwn={modalMsg?.user_id === currentUserId}
        canDeleteAny={canDeleteAny}
        canPin={canPin}
        allowReactions={allowReactions}
        allowReplies={allowReplies}
        onClose={() => setModalMsg(null)}
        onStartEdit={msg => { startEdit(msg); setModalMsg(null) }}
        onDelete={handleModalDelete}
        onPin={handlePin}
        onReply={msg => { onReply(msg); setModalMsg(null) }}
        onEmojiSelect={(msgId, emoji) => { onReact(msgId, emoji); setModalMsg(null) }}
      />
    </div>
  )
}
