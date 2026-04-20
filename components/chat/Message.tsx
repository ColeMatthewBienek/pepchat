'use client'

import dynamic from 'next/dynamic'
import Avatar from '@/components/ui/Avatar'
import ReactionPills from '@/components/chat/ReactionPills'
import MessageAttachments from '@/components/chat/MessageAttachments'
import { MessageContent } from '@/components/chat/MessageContent'
import MessageActionBar from '@/components/chat/MessageActionBar'
import { useLongPress } from '@/lib/hooks/useLongPress'
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
  canDeleteAny?: boolean
  canPin?: boolean
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
  onOpenActions?: (msg: MessageWithProfile) => void
  onPin?: (msgId: string) => void
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
  canDeleteAny = false,
  canPin = false,
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
  onOpenActions,
  onPin,
  allowReactions = true,
  allowReplies = true,
  isPending = false,
  atReactionLimit = false,
}: MessageProps) {
  const isEditing = editingId === msg.id
  const displayName = msg.profiles?.display_name ?? msg.profiles?.username ?? 'Unknown'
  const usernameColor = (msg.profiles as any)?.username_color ?? 'var(--text-primary)'

  const longPress = useLongPress(() => onOpenActions?.(msg))

  return (
    <div
      className="group/msg flex items-start gap-3 rounded px-2 hover:bg-[var(--bg-hover)] transition-colors"
      style={{
        paddingTop: isCompact ? 2 : 16,
        paddingBottom: 2,
        position: 'relative',
      }}
      {...(!isEditing && onOpenActions ? {
        onPointerDown: longPress.onPointerDown,
        onPointerUp: longPress.onPointerUp,
        onPointerMove: longPress.onPointerMove,
        onPointerLeave: longPress.onPointerLeave,
      } : {})}
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
                e.stopPropagation()
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

      {/* Hover action bar (desktop only) */}
      {!isEditing && (
        <MessageActionBar
          msg={msg}
          isOwn={isOwn}
          canDeleteAny={canDeleteAny}
          canPin={canPin}
          allowReactions={allowReactions}
          allowReplies={allowReplies}
          atReactionLimit={atReactionLimit}
          currentUserId={currentUserId}
          pickerOpenFor={pickerOpenFor}
          onPickerToggle={onPickerToggle}
          onPickerClose={onPickerClose}
          onEmojiSelect={onEmojiSelect}
          onReply={onReply}
          onStartEdit={onStartEdit}
          onDelete={onDelete}
          onPin={onPin}
        />
      )}
    </div>
  )
}
