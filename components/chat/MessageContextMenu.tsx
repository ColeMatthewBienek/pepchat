'use client'

import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import dynamic from 'next/dynamic'
import type { MessageWithProfile } from '@/lib/types'

const EmojiPickerPopover = dynamic(
  () => import('@/components/chat/EmojiPickerPopover'),
  { ssr: false }
)

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '💯', '➕']

export interface MessageContextMenuProps {
  message: MessageWithProfile
  position: { x: number; y: number }
  isOwn: boolean
  canDeleteAny: boolean
  canPin: boolean
  allowReactions: boolean
  allowReplies: boolean
  currentUserId: string
  onClose: () => void
  onStartEdit: (msg: MessageWithProfile) => void
  onDelete: (msgId: string) => void
  onPin?: (msgId: string) => void
  onReply: (msg: MessageWithProfile) => void
  onEmojiSelect: (msgId: string, emoji: string) => void
  onMarkUnread?: (msg: MessageWithProfile) => void
  onReport?: (msgId: string) => void
}

export default function MessageContextMenu({
  message,
  position,
  isOwn,
  canDeleteAny,
  canPin,
  allowReactions,
  allowReplies,
  onClose,
  onStartEdit,
  onDelete,
  onPin,
  onReply,
  onEmojiSelect,
  onMarkUnread,
  onReport,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showFullPicker, setShowFullPicker] = useState(false)
  const [copyToast, setCopyToast] = useState(false)

  const canDelete = isOwn || canDeleteAny
  const isPinned = !!message.pinned_at

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on outside mousedown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  function handleCopyText() {
    navigator.clipboard?.writeText(message.content).catch(() => {})
    setCopyToast(true)
    setTimeout(() => {
      setCopyToast(false)
      onClose()
    }, 1200)
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/channels/${message.channel_id}#${message.id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    onClose()
  }

  function handleDelete() {
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    onDelete(message.id)
    setConfirmingDelete(false)
    onClose()
  }

  const content = (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: 220,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        padding: 4,
        zIndex: 100,
        animation: 'ctx-fade-in 120ms ease-out',
      }}
    >
      {/* Quick reactions */}
      {allowReactions && (
        <>
          <div style={{ display: 'flex', gap: 2, padding: '4px 2px', justifyContent: 'space-between' }}>
            {QUICK_EMOJIS.map(emoji => (
              emoji === '➕' ? (
                <button
                  key="more"
                  className="quick-reaction"
                  onClick={() => setShowFullPicker(true)}
                  style={quickReactionStyle(false)}
                  title="More reactions"
                >
                  ➕
                </button>
              ) : (
                <button
                  key={emoji}
                  className="quick-reaction"
                  onClick={() => { onEmojiSelect(message.id, emoji); onClose() }}
                  style={quickReactionStyle(
                    (message.reactions ?? []).some(r => r.emoji === emoji)
                  )}
                >
                  {emoji}
                </button>
              )
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />
        </>
      )}

      {/* Full emoji picker */}
      {showFullPicker && (
        <div style={{ position: 'relative', zIndex: 10 }}>
          <EmojiPickerPopover
            onSelect={emoji => { onEmojiSelect(message.id, emoji); setShowFullPicker(false); onClose() }}
            onClose={() => setShowFullPicker(false)}
          />
        </div>
      )}

      {/* Action items */}
      {!confirmingDelete ? (
        <>
          {allowReplies && (
            <MenuItem label="Reply" onClick={() => { onReply(message); onClose() }}>
              <ReplyIcon />
            </MenuItem>
          )}

          <MenuItem label={copyToast ? 'Copied!' : 'Copy Text'} onClick={handleCopyText}>
            <ClipboardIcon />
          </MenuItem>

          <MenuItem label="Copy Message Link" onClick={handleCopyLink}>
            <LinkIcon />
          </MenuItem>

          {isOwn && (
            <MenuItem label="Edit Message" onClick={() => { onStartEdit(message); onClose() }}>
              <EditIcon />
            </MenuItem>
          )}

          {canPin && !isPinned && (
            <MenuItem label="Pin Message" onClick={() => { onPin?.(message.id); onClose() }}>
              <PinIcon />
            </MenuItem>
          )}

          {canPin && isPinned && (
            <MenuItem label="Unpin Message" onClick={() => { onPin?.(message.id); onClose() }}>
              <PinIcon filled />
            </MenuItem>
          )}

          {onMarkUnread && (
            <MenuItem label="Mark Unread" onClick={() => { onMarkUnread(message); onClose() }}>
              <MarkUnreadIcon />
            </MenuItem>
          )}

          {onReport && (
            <MenuItem label="Report Message" onClick={() => { onReport(message.id); onClose() }}>
              <FlagIcon />
            </MenuItem>
          )}

          {canDelete && (
            <>
              <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />
              <MenuItem label="Delete Message" danger onClick={handleDelete}>
                <TrashIcon />
              </MenuItem>
            </>
          )}
        </>
      ) : (
        <div data-testid="ctx-delete-confirm-dialog" style={{ padding: '6px 4px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px', padding: '0 6px' }}>
            Delete this message? This cannot be undone.
          </p>
          <button
            data-testid="ctx-delete-confirm"
            onClick={handleDelete}
            style={{
              width: '100%', padding: '8px', background: 'var(--danger)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 4,
            }}
          >
            Delete
          </button>
          <button
            data-testid="ctx-delete-cancel"
            onClick={() => setConfirmingDelete(false)}
            style={{
              width: '100%', padding: '8px', background: 'transparent',
              color: 'var(--text-primary)', border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Copy toast */}
      {copyToast && (
        <div
          data-testid="copy-toast"
          style={{
            position: 'absolute',
            top: -36,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 12px',
            fontSize: 12,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Copied
        </div>
      )}
    </div>
  )

  return typeof document !== 'undefined'
    ? ReactDOM.createPortal(content, document.body)
    : null
}

function quickReactionStyle(reacted: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    fontSize: 16,
    background: reacted ? 'rgba(230,84,58,0.2)' : 'transparent',
    border: reacted ? '1px solid var(--accent)' : '1px solid transparent',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 80ms ease',
  }
}

function MenuItem({
  label,
  danger = false,
  children,
  onClick,
}: {
  label: string
  danger?: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 10px',
        height: 36,
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontSize: 14,
        color: danger ? '#c94a2a' : 'var(--text-primary)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <span>{label}</span>
      <span style={{ color: danger ? '#c94a2a' : 'var(--text-faint)', display: 'flex' }}>
        {children}
      </span>
    </button>
  )
}

function ReplyIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 0 10h-2" /></svg>
}
function ClipboardIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /></svg>
}
function LinkIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
}
function EditIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
}
function PinIcon({ filled = false }: { filled?: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
}
function MarkUnreadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" /></svg>
}
function TrashIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
}
function FlagIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
}
