'use client'

import dynamic from 'next/dynamic'
import Avatar from '@/components/ui/Avatar'
import ReactionPills from '@/components/chat/ReactionPills'
import ReactionPicker from '@/components/chat/ReactionPicker'
import MessageAttachments from '@/components/chat/MessageAttachments'
import { MessageContent } from '@/components/chat/MessageContent'
import type { MessageWithProfile } from '@/lib/types'

const ProfileCard = dynamic(() => import('@/components/profile/ProfileCard'), { ssr: false })

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export interface MessageProps {
  msg: MessageWithProfile
  isCompact: boolean
  isOwn: boolean
  currentUserId: string
  editingId: string | null
  editContent: string
  pickerOpenFor: string | null
  onStartEdit: (msg: MessageWithProfile) => void
  onCancelEdit: () => void
  onEditContentChange: (val: string) => void
  onSubmitEdit: (msgId: string) => void
  onDelete: (msgId: string) => void
  onOpenProfile: (userId: string, anchor: HTMLElement) => void
  onPickerToggle: (msgId: string) => void
  onPickerClose: () => void
  onEmojiSelect: (msgId: string, emoji: string) => void
  onReact: (emoji: string) => void
  onReply: (msg: MessageWithProfile) => void
  allowReactions?: boolean
  allowReplies?: boolean
  isPending?: boolean
  atReactionLimit?: boolean
}

export default function Message({
  msg,
  isCompact,
  isOwn,
  currentUserId,
  editingId,
  editContent,
  pickerOpenFor,
  onStartEdit,
  onCancelEdit,
  onEditContentChange,
  onSubmitEdit,
  onDelete,
  onOpenProfile,
  onPickerToggle,
  onPickerClose,
  onEmojiSelect,
  onReact,
  onReply,
  allowReactions = true,
  allowReplies = true,
  isPending = false,
  atReactionLimit = false,
}: MessageProps) {
  const isEditing = editingId === msg.id
  const displayName = msg.profiles?.display_name ?? msg.profiles?.username ?? 'Unknown'
  const usernameColor = (msg.profiles as any)?.username_color ?? 'var(--text-primary)'

  return (
    <div
      className="group/msg flex items-start gap-3 rounded px-2 hover:bg-[var(--bg-hover)] transition-colors"
      style={{
        paddingTop: isCompact ? 2 : 16,
        paddingBottom: 2,
        position: 'relative',
      }}
    >
      {/* Avatar column — 36px */}
      <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {isCompact ? (
          <span
            className="opacity-0 group-hover/msg:opacity-100 transition-opacity"
            style={{
              fontSize: 10,
              color: 'var(--text-faint)',
              lineHeight: '20px',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTime(msg.created_at)}
          </span>
        ) : (
          <button
            className="rounded-full focus:outline-none"
            onClick={e => onOpenProfile(msg.user_id, e.currentTarget)}
          >
            <Avatar
              user={{
                avatar_url: msg.profiles?.avatar_url,
                username: msg.profiles?.username ?? '?',
                display_name: msg.profiles?.display_name,
                username_color: (msg.profiles as any)?.username_color,
              }}
              size={36}
            />
          </button>
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {/* Message header (ungrouped only) */}
        {!isCompact && (
          <div
            data-testid="message-header"
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}
          >
            <button
              data-testid="message-author-name"
              className="font-semibold hover:underline focus:outline-none"
              style={{ fontSize: 15, color: usernameColor, cursor: 'pointer' }}
              title={msg.profiles?.display_name ? `@${msg.profiles.username}` : undefined}
              onClick={e => onOpenProfile(msg.user_id, e.currentTarget)}
            >
              {displayName}
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'inherit' }}>
              {formatTime(msg.created_at)}
            </span>
          </div>
        )}

        {/* Reply quote */}
        {msg.replied_to && (
          <div
            data-testid="message-reply-quote"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              paddingLeft: 8,
              borderLeft: '2px solid var(--border-strong)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
              @{msg.replied_to.profiles?.username}
            </span>
            <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {msg.replied_to.content.length > 80
                ? msg.replied_to.content.slice(0, 80) + '…'
                : msg.replied_to.content}
            </span>
          </div>
        )}

        {/* Edit mode */}
        {isEditing ? (
          <div>
            <textarea
              data-testid="message-edit-textarea"
              className="w-full rounded border text-sm text-[var(--text-primary)] px-3 py-2 resize-none focus:outline-none focus:border-[var(--accent)]"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-strong)',
                borderRadius: 'var(--radius-md)',
              }}
              rows={3}
              value={editContent}
              onChange={e => onEditContentChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitEdit(msg.id) }
                if (e.key === 'Escape') onCancelEdit()
              }}
              autoFocus
              disabled={isPending}
            />
            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
              escape to cancel · enter to save
            </p>
          </div>
        ) : (
          <>
            {msg.content && (
              <div className="break-words" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                <MessageContent content={msg.content} />
                {msg.edited_at && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>(edited)</span>
                )}
              </div>
            )}
            {msg.attachments && msg.attachments.length > 0 && (
              <MessageAttachments attachments={msg.attachments} />
            )}
          </>
        )}

        {/* Reaction pills */}
        {msg.reactions && msg.reactions.length > 0 && !isEditing && (
          <ReactionPills
            reactions={msg.reactions}
            currentUserId={currentUserId}
            onToggle={onReact}
          />
        )}
      </div>

      {/* Hover action toolbar */}
      {!isEditing && (
        <div
          className="hidden group-hover/msg:flex items-center gap-0.5 flex-shrink-0"
          style={{
            position: 'absolute',
            top: -10,
            right: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            padding: '2px 4px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          {allowReactions && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => onPickerToggle(msg.id)}
                title={atReactionLimit ? 'Max 20 emoji per message' : 'Add reaction'}
                disabled={atReactionLimit && !(msg.reactions ?? []).some(r => r.user_id === currentUserId)}
                className="icon-btn disabled:opacity-30 disabled:cursor-default"
                style={{ padding: 6 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                </svg>
              </button>
              {pickerOpenFor === msg.id && (
                <ReactionPicker
                  onSelect={emoji => onEmojiSelect(msg.id, emoji)}
                  onClose={onPickerClose}
                />
              )}
            </div>
          )}

          {allowReplies && (
            <button
              onClick={() => onReply(msg)}
              title="Reply"
              className="icon-btn"
              style={{ padding: 6 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 0 10h-2" />
              </svg>
            </button>
          )}

          {isOwn && (
            <>
              <button
                onClick={() => onStartEdit(msg)}
                title="Edit"
                className="icon-btn"
                style={{ padding: 6 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(msg.id)}
                title="Delete"
                className="icon-btn hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                style={{ padding: 6 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
