'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { editMessage, deleteMessage } from '@/app/(app)/messages/actions'
import { reportMessage } from '@/app/admin/actions'
import Message from '@/components/chat/Message'
import MessageModal from '@/components/chat/MessageModal'
import MessageContextMenu from '@/components/chat/MessageContextMenu'
import ReportMessageDialog from '@/components/chat/ReportMessageDialog'
import SystemMessage from '@/components/chat/SystemMessage'
import { PERMISSIONS } from '@/lib/permissions'
import { getUnreadFromMessageLastReadAt, markChannelUnreadFromMessage } from '@/lib/channelReadState'
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
  reportAction?: (messageId: string, reason: string) => Promise<{ error: string } | { ok: true }>
  onEditSuccess?: (messageId: string, content: string) => void
  onDeleteSuccess?: (messageId: string) => void
  onOpenPinnedPanel?: () => void
  highlightedMessageId?: string | null
  initialLastReadAt?: string | null
  messageLinkBasePath?: string
  allowMarkUnread?: boolean
  allowReports?: boolean
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
  reportAction,
  onEditSuccess,
  onDeleteSuccess,
  onOpenPinnedPanel,
  highlightedMessageId,
  initialLastReadAt = null,
  messageLinkBasePath = '/channels',
  allowMarkUnread = true,
  allowReports = true,
}: MessageListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')
  const [editPending, setEditPending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const [profileCard, setProfileCard] = useState<{ userId: string; anchor: HTMLElement } | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [pendingNewCount, setPendingNewCount] = useState(0)
  const [modalMsg, setModalMsg] = useState<MessageWithProfile | null>(null)
  const [contextMenu, setContextMenu] = useState<{ msg: MessageWithProfile; x: number; y: number } | null>(null)
  const [reportTarget, setReportTarget] = useState<MessageWithProfile | null>(null)
  const [notice, setNotice] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1)
  const [localLastReadAt, setLocalLastReadAt] = useState(initialLastReadAt)
  const [reportedMessageIds, setReportedMessageIds] = useState(() => new Set<string>())
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isAtBottomRef = useRef(true)
  const didInitialScrollRef = useRef(false)

  const knownIdsRef = useRef(new Set(messages.map(m => m.id)))
  const prevFirstIdRef = useRef(messages[0]?.id)
  const newIdsRef = useRef(new Set<string>())

  useEffect(() => {
    setLocalLastReadAt(initialLastReadAt)
  }, [initialLastReadAt])

  const unreadMessages = useMemo(() => {
    if (!localLastReadAt) return []
    const lastReadMs = new Date(localLastReadAt).getTime()
    if (!Number.isFinite(lastReadMs)) return []
    return messages.filter(msg => (
      !msg.is_system &&
      msg.user_id !== currentUserId &&
      new Date(msg.created_at).getTime() > lastReadMs
    ))
  }, [currentUserId, localLastReadAt, messages])
  const unreadMessageId = unreadMessages[0]?.id ?? null
  const unreadDividerLabel = `${unreadMessages.length} new ${unreadMessages.length === 1 ? 'message' : 'messages'}`
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const searchMatches = useMemo(() => {
    if (!normalizedSearch) return []
    return messages.filter(msg => {
      if (msg.is_system) return false
      const author = `${msg.profiles?.display_name ?? ''} ${msg.profiles?.username ?? ''}`.toLowerCase()
      const attachmentText = (msg.attachments ?? [])
        .map(attachment => `${attachment.type} ${attachment.name}`)
        .join(' ')
        .toLowerCase()
      const replyText = msg.replied_to
        ? `${msg.replied_to.content} ${msg.replied_to.profiles?.username ?? ''}`.toLowerCase()
        : ''
      return (
        msg.content.toLowerCase().includes(normalizedSearch) ||
        author.includes(normalizedSearch) ||
        attachmentText.includes(normalizedSearch) ||
        replyText.includes(normalizedSearch)
      )
    })
  }, [messages, normalizedSearch])

  useEffect(() => {
    const currentFirstId = messages[0]?.id
    if (currentFirstId === prevFirstIdRef.current) {
      let appendedCount = 0
      for (const m of messages) {
        if (!knownIdsRef.current.has(m.id)) {
          newIdsRef.current.add(m.id)
          if (!isAtBottomRef.current && !m.is_system && m.user_id !== currentUserId) appendedCount++
        }
      }
      if (appendedCount > 0) setPendingNewCount(count => count + appendedCount)
    }
    for (const m of messages) knownIdsRef.current.add(m.id)
    prevFirstIdRef.current = currentFirstId
  }, [currentUserId, messages])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distFromBottom < 80
    if (isAtBottomRef.current) setPendingNewCount(0)
    setShowScrollBtn(distFromBottom > 300)
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setPendingNewCount(0)
    setShowScrollBtn(false)
  }

  useEffect(() => {
    if (didInitialScrollRef.current) return
    didInitialScrollRef.current = true
    if (unreadMessageId) {
      jumpToMessage(unreadMessageId)
      return
    }
    bottomRef.current?.scrollIntoView()
  }, [unreadMessageId])

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!highlightedMessageId || !listRef.current) return
    jumpToMessage(highlightedMessageId)
  }, [highlightedMessageId])

  useEffect(() => {
    setActiveSearchIndex(-1)
  }, [normalizedSearch])

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false
      const tagName = target.tagName.toLowerCase()
      return tagName === 'input' || tagName === 'textarea' || target.isContentEditable
    }

    function handleDocumentKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return
      e.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }

    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [])

  function jumpToMessage(messageId: string) {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-message-id="${messageId}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('message-highlighted')
    setTimeout(() => el.classList.remove('message-highlighted'), 1600)
  }

  function jumpToSearchResult(index: number) {
    const match = searchMatches[index]
    if (!match) return
    setActiveSearchIndex(index)
    jumpToMessage(match.id)
  }

  function goToNextSearchResult() {
    if (searchMatches.length === 0) return
    jumpToSearchResult((activeSearchIndex + 1) % searchMatches.length)
  }

  function goToPrevSearchResult() {
    if (searchMatches.length === 0) return
    jumpToSearchResult((activeSearchIndex - 1 + searchMatches.length) % searchMatches.length)
  }

  function clearSearch() {
    setSearchQuery('')
    setActiveSearchIndex(-1)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        goToPrevSearchResult()
      } else {
        goToNextSearchResult()
      }
    }
    if (e.key === 'Escape' && normalizedSearch) {
      e.preventDefault()
      clearSearch()
    }
  }

  function handleJumpToReply(messageId: string) {
    if (!messages.some(m => m.id === messageId)) {
      setError('')
      setNotice('Original message is not loaded. Load earlier messages and try again.')
      return
    }
    setNotice('')
    jumpToMessage(messageId)
  }

  function startEdit(msg: MessageWithProfile) {
    setEditingId(msg.id)
    setEditContent(msg.content)
    setError('')
    setNotice('')
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
    setNotice('')
    startTransition(async () => {
      const action = deleteAction ?? deleteMessage
      const result = await action(messageId)
      if ('error' in result) {
        setError(result.error)
      } else {
        onDeleteSuccess?.(messageId)
      }
    })
  }

  function handleModalDelete(messageId: string) {
    setError('')
    setNotice('')
    startTransition(async () => {
      const action = deleteAction ?? deleteMessage
      const result = await action(messageId)
      if ('error' in result) {
        setError(result.error)
      } else {
        onDeleteSuccess?.(messageId)
      }
    })
  }

  function handlePin(messageId: string) {
    if (!pinAction) return
    setError('')
    setNotice('')
    startTransition(async () => {
      const result = await pinAction(messageId)
      if ('error' in result) setError(result.error)
    })
  }

  function handleReport(messageId: string) {
    if (reportedMessageIds.has(messageId)) return
    const target = messages.find(m => m.id === messageId)
    if (!target || target.user_id === currentUserId) return
    setError('')
    setNotice('')
    setReportTarget(target)
  }

  function handleMarkUnread(msg: MessageWithProfile) {
    setError('')
    setNotice('')
    startTransition(async () => {
      try {
        await markChannelUnreadFromMessage(msg.channel_id, currentUserId, msg.created_at)
        setLocalLastReadAt(getUnreadFromMessageLastReadAt(msg.created_at))
        setNotice('Marked unread from this message.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark message unread.')
      }
    })
  }

  function submitReport(reason: string) {
    if (!reportTarget) return
    setError('')
    setNotice('')
    startTransition(async () => {
      const action = reportAction ?? reportMessage
      const result = await action(reportTarget.id, reason)
      if ('error' in result) {
        setError(result.error)
      } else {
        setReportedMessageIds(prev => new Set(prev).add(reportTarget.id))
        setReportTarget(null)
        setNotice('Report submitted for review.')
      }
    })
  }

  const canDeleteAny = userRole ? PERMISSIONS.canDeleteAnyMessage(userRole) : false
  const canPin = userRole ? PERMISSIONS.canPinMessages(userRole) : false
  const searchCountLabel = normalizedSearch
    ? (
        searchMatches.length > 0 && activeSearchIndex >= 0
          ? `${activeSearchIndex + 1}/${searchMatches.length}`
          : `${searchMatches.length} ${searchMatches.length === 1 ? 'result' : 'results'}`
      )
    : ''

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <div
        data-testid="message-scroll-container"
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
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px 10px',
            background: 'var(--bg-chat)',
          }}
        >
          <input
            ref={searchInputRef}
            data-testid="message-search-input"
            type="search"
            placeholder="Search loaded messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '7px 10px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <span
            data-testid="message-search-count"
            style={{ width: 72, textAlign: 'right', fontSize: 12, color: 'var(--text-faint)' }}
          >
            {searchCountLabel}
          </span>
          {normalizedSearch && (
            <button
              type="button"
              data-testid="message-search-clear"
              aria-label="Clear message search"
              onClick={clearSearch}
              style={searchNavBtn(false)}
            >
              ×
            </button>
          )}
          <button
            type="button"
            data-testid="message-search-prev"
            aria-label="Previous search result"
            disabled={searchMatches.length === 0}
            onClick={goToPrevSearchResult}
            style={searchNavBtn(searchMatches.length === 0)}
          >
            ↑
          </button>
          <button
            type="button"
            data-testid="message-search-next"
            aria-label="Next search result"
            disabled={searchMatches.length === 0}
            onClick={goToNextSearchResult}
            style={searchNavBtn(searchMatches.length === 0)}
          >
            ↓
          </button>
          {unreadMessageId && (
            <button
              type="button"
              data-testid="jump-first-unread"
              onClick={() => jumpToMessage(unreadMessageId)}
              title="Jump to first unread"
              style={{
                height: 28,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--accent)',
                background: 'transparent',
                color: 'var(--accent)',
                cursor: 'pointer',
                padding: '0 9px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Unread
            </button>
          )}
        </div>

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
        {notice && (
          <p className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded px-3 py-1.5 mx-4 mb-2">
            {notice}
          </p>
        )}

        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null
          const compact = isCompact(msg, prev)
          const showDateSep = !prev || !isSameDay(msg.created_at, prev.created_at)
          const isOwn = msg.user_id === currentUserId
          const uniqueEmojiCount = new Set((msg.reactions ?? []).map(r => r.emoji)).size
          const atReactionLimit = uniqueEmojiCount >= 20
          const showUnreadDivider = msg.id === unreadMessageId

          const isNewMsg = newIdsRef.current.has(msg.id)
          return (
            <div key={msg.id} data-message-id={msg.id} className={isNewMsg ? 'message-new' : undefined}>
              {showUnreadDivider && (
                <div data-testid="unread-divider" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 16px 14px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--accent)' }} />
                  <span style={{
                    fontSize: 11,
                    color: 'var(--accent)',
                    background: 'var(--bg-chat)',
                    padding: '0 12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0,
                  }}>
                    {unreadDividerLabel}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--accent)' }} />
                </div>
              )}

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
                  onJumpToMessage={handleJumpToReply}
                  onOpenActions={setModalMsg}
                  onOpenContextMenu={(msg, x, y) => setContextMenu({ msg, x, y })}
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
          data-testid="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            minWidth: 40,
            height: 40,
            borderRadius: 20,
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: pendingNewCount > 0 ? '0 12px' : 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10,
            fontSize: 12,
            fontWeight: 700,
          }}
          title={pendingNewCount > 0 ? `${pendingNewCount} new ${pendingNewCount === 1 ? 'message' : 'messages'}` : 'Scroll to bottom'}
        >
          {pendingNewCount > 0 && (
            <span data-testid="scroll-new-count">
              {pendingNewCount} new
            </span>
          )}
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
        onMarkUnread={allowMarkUnread ? handleMarkUnread : undefined}
        onReport={
          allowReports && modalMsg && modalMsg.user_id !== currentUserId && !reportedMessageIds.has(modalMsg.id)
            ? handleReport
            : undefined
        }
        messageLinkBasePath={messageLinkBasePath}
      />

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.msg}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          isOwn={contextMenu.msg.user_id === currentUserId}
          canDeleteAny={canDeleteAny}
          canPin={canPin}
          allowReactions={allowReactions}
          allowReplies={allowReplies}
          currentUserId={currentUserId}
          onClose={() => setContextMenu(null)}
          onStartEdit={msg => { startEdit(msg); setContextMenu(null) }}
          onDelete={msgId => { handleDelete(msgId); setContextMenu(null) }}
          onPin={handlePin}
          onReply={msg => { onReply(msg); setContextMenu(null) }}
          onEmojiSelect={(msgId, emoji) => { onReact(msgId, emoji); setContextMenu(null) }}
          onMarkUnread={allowMarkUnread ? handleMarkUnread : undefined}
          onReport={
            allowReports && contextMenu.msg.user_id !== currentUserId && !reportedMessageIds.has(contextMenu.msg.id)
              ? handleReport
              : undefined
          }
          messageLinkBasePath={messageLinkBasePath}
        />
      )}

      <ReportMessageDialog
        open={reportTarget !== null}
        message={reportTarget}
        pending={isPending}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
      />
    </div>
  )
}

function searchNavBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-soft)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    fontSize: 13,
  }
}
