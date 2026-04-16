'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Avatar from '@/components/ui/Avatar'
import { editMessage, deleteMessage } from '@/app/(app)/messages/actions'
import ReactionPills from '@/components/chat/ReactionPills'
import ReactionPicker from '@/components/chat/ReactionPicker'
import type { MessageWithProfile } from '@/lib/types'

interface MessageListProps {
  messages: MessageWithProfile[]
  hasMore: boolean
  loadingMore: boolean
  currentUserId: string
  currentUsername: string
  onLoadMore: () => void
  onReact: (messageId: string, emoji: string) => void
  onReply: (msg: MessageWithProfile) => void
}

/** Same author within 5 minutes of the previous message = compact (no repeated header). */
function isCompact(msg: MessageWithProfile, prev: MessageWithProfile | null): boolean {
  if (!prev) return false
  if (msg.user_id !== prev.user_id) return false
  return new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  currentUsername,
  onLoadMore,
  onReact,
  onReply,
}: MessageListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  // Scroll to bottom on new messages only if already near bottom
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
    setError('')
    startTransition(async () => {
      const result = await editMessage(messageId, editContent)
      if ('error' in result) {
        setError(result.error)
      } else {
        setEditingId(null)
      }
    })
  }

  function handleDelete(messageId: string) {
    if (!confirm('Delete this message?')) return
    setError('')
    startTransition(async () => {
      const result = await deleteMessage(messageId)
      if ('error' in result) setError(result.error)
    })
  }

  function handleEmojiSelect(messageId: string, emoji: string) {
    setPickerOpenFor(null)
    onReact(messageId, emoji)
  }

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
    >
      {/* Pagination trigger */}
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

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
          <span className="text-4xl text-[var(--text-muted)]">#</span>
          <p className="text-[var(--text-muted)] text-sm">No messages yet. Be the first!</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded px-3 py-1.5 mb-2">
          {error}
        </p>
      )}

      {messages.map((msg, idx) => {
        const prev = idx > 0 ? messages[idx - 1] : null
        const compact = isCompact(msg, prev)
        const showDateSep = !prev || !isSameDay(msg.created_at, prev.created_at)
        const isOwn = msg.user_id === currentUserId
        const uniqueEmojiCount = new Set((msg.reactions ?? []).map((r) => r.emoji)).size
        const atReactionLimit = uniqueEmojiCount >= 20

        return (
          <div key={msg.id}>
            {showDateSep && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-[var(--text-muted)] font-medium px-1">
                  {formatDateSeparator(msg.created_at)}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}

            <div className={`group/msg flex items-start gap-3 rounded px-2 py-0.5 hover:bg-white/5 transition-colors ${compact ? 'mt-0.5' : 'mt-3'}`}>
              {/* Avatar or compact timestamp spacer */}
              <div className="flex-shrink-0 w-8 mt-0.5">
                {compact ? (
                  <span className="block text-center text-[10px] text-[var(--text-muted)] opacity-0 group-hover/msg:opacity-100 transition-opacity leading-5">
                    {formatTime(msg.created_at)}
                  </span>
                ) : (
                  <Avatar
                    src={msg.profiles?.avatar_url}
                    username={msg.profiles?.username ?? '?'}
                    size={32}
                  />
                )}
              </div>

              {/* Message content */}
              <div className="flex-1 min-w-0">
                {!compact && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {msg.profiles?.username ?? 'Unknown'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Reply quote */}
                {msg.replied_to && (
                  <div className="flex items-start gap-2 mb-1 pl-2 border-l-2 border-[var(--accent)]/50 opacity-80">
                    <span className="text-xs font-semibold text-[var(--accent)] flex-shrink-0">
                      @{msg.replied_to.profiles?.username}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      {msg.replied_to.content.length > 120
                        ? msg.replied_to.content.slice(0, 120) + '…'
                        : msg.replied_to.content}
                    </span>
                  </div>
                )}

                {editingId === msg.id ? (
                  <div>
                    <textarea
                      className="w-full rounded border border-white/20 bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(msg.id) }
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                      disabled={isPending}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-muted)]">Enter to save · Esc to cancel</span>
                      <button onClick={() => submitEdit(msg.id)} disabled={isPending} className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50">Save</button>
                      <button onClick={cancelEdit} className="text-xs text-[var(--text-muted)] hover:underline">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-primary)] break-words whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.edited_at && (
                      <span className="text-[10px] text-[var(--text-muted)] ml-1.5">(edited)</span>
                    )}
                  </p>
                )}

                {/* Reaction pills */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <ReactionPills
                    reactions={msg.reactions}
                    currentUserId={currentUserId}
                    onToggle={(emoji) => onReact(msg.id, emoji)}
                  />
                )}
              </div>

              {/* Action buttons: emoji + reply (all messages), edit/delete (own only) */}
              {editingId !== msg.id && (
                <div className="hidden group-hover/msg:flex items-center gap-0.5 flex-shrink-0 relative">
                  {/* Emoji reaction */}
                  <button
                    onClick={() => setPickerOpenFor(pickerOpenFor === msg.id ? null : msg.id)}
                    title={atReactionLimit ? 'Max 20 emoji per message' : 'Add reaction'}
                    disabled={atReactionLimit && !((msg.reactions ?? []).some((r) => r.user_id === currentUserId))}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-default"
                  >
                    <span className="text-sm leading-none">😊</span>
                  </button>

                  {/* Reply */}
                  <button
                    onClick={() => onReply(msg)}
                    title="Reply"
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>

                  {isOwn && (
                    <>
                      <button
                        onClick={() => startEdit(msg)}
                        title="Edit"
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        title="Delete"
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Emoji picker popover */}
                  {pickerOpenFor === msg.id && (
                    <ReactionPicker
                      onSelect={(emoji) => handleEmojiSelect(msg.id, emoji)}
                      onClose={() => setPickerOpenFor(null)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      <div ref={bottomRef} />
    </div>
  )
}
