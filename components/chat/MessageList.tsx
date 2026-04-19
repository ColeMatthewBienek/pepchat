'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { editMessage, deleteMessage } from '@/app/(app)/messages/actions'
import Message from '@/components/chat/Message'
import type { MessageWithProfile } from '@/lib/types'

const ProfileCard = dynamic(() => import('@/components/profile/ProfileCard'), { ssr: false })

interface MessageListProps {
  messages: MessageWithProfile[]
  hasMore: boolean
  loadingMore: boolean
  currentUserId: string
  currentUsername: string
  channelName?: string
  onLoadMore: () => void
  onReact: (messageId: string, emoji: string) => void
  onReply: (msg: MessageWithProfile) => void
  allowReactions?: boolean
  allowReplies?: boolean
  editAction?: (messageId: string, content: string) => Promise<{ error: string } | { ok: true }>
  deleteAction?: (messageId: string) => Promise<{ error: string } | { ok: true }>
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
  editAction,
  deleteAction,
}: MessageListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const [profileCard, setProfileCard] = useState<{ userId: string; anchor: HTMLElement } | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])
  // Track new messages for entrance animation. New messages appended via
  // Realtime have IDs not seen on mount; loadMore prepends old messages
  // (first ID changes) and should not animate.
  const knownIdsRef = useRef(new Set(messages.map(m => m.id)))
  const prevFirstIdRef = useRef(messages[0]?.id)
  const newIdsRef = useRef(new Set<string>())

  useEffect(() => {
    const currentFirstId = messages[0]?.id
    if (currentFirstId === prevFirstIdRef.current) {
      // First message unchanged → messages appended at bottom (realtime)
      for (const m of messages) {
        if (!knownIdsRef.current.has(m.id)) newIdsRef.current.add(m.id)
      }
    }
    // Always update known IDs and first-ID tracker after each change
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

  function startEdit(msg: MessageWithProfile) {
    setEditingId(msg.id)
    setEditContent(msg.content)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  function submitEdit(messageId: string) {
    if (!editContent.trim()) return
    setError('')
    startTransition(async () => {
      try {
        const action = editAction ?? editMessage
        const result = await action(messageId, editContent)
        if (!isMounted.current) return
        if ('error' in result) { setError(result.error) } else { setEditingId(null) }
      } catch (err) {
        if (!isMounted.current) return
        setError(err instanceof Error ? err.message : 'Failed to save edit.')
      }
    })
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
            <div key={msg.id} className={isNewMsg ? 'message-new' : undefined}>
              {showDateSep && (
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

              <Message
                msg={msg}
                isCompact={compact}
                isOwn={isOwn}
                currentUserId={currentUserId}
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
                allowReactions={allowReactions}
                allowReplies={allowReplies}
                isPending={isPending}
                atReactionLimit={atReactionLimit}
              />
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
    </div>
  )
}
