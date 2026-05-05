'use client'

import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import type { DMConversation } from '@/lib/types'

interface DMEntryProps {
  conversation: DMConversation
  isActive: boolean
}

export default function DMEntry({ conversation, isActive }: DMEntryProps) {
  const { other_user, unread_count } = conversation
  const displayName = other_user.display_name ?? other_user.username
  const visibleUnreadCount = isActive ? 0 : unread_count
  const hasUnread = visibleUnreadCount > 0

  return (
    <Link
      href={`/dm/${conversation.id}`}
      title={conversation.last_message ? `Last: ${conversation.last_message}` : displayName}
      className={`dm-entry flex items-center gap-2 px-3 py-1.5 mx-1 rounded transition-colors ${
        isActive
          ? 'bg-[var(--accent)]/20 text-[var(--text-primary)]'
          : 'text-[var(--text-muted)]'
      }`}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="relative flex-shrink-0">
        <Avatar user={other_user} size={28} />
        {hasUnread && (
          <span
            data-testid={`dm-unread-dot-${conversation.id}`}
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-[var(--bg-primary)]"
          />
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm truncate ${hasUnread ? 'font-semibold text-[var(--text-primary)]' : ''}`}>
          {displayName}
        </span>
        {conversation.last_message && (
          <span
            data-testid={`dm-preview-${conversation.id}`}
            className={`block text-xs truncate leading-4 ${
              hasUnread ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {conversation.last_message}
          </span>
        )}
      </span>
      {hasUnread && (
        <span
          data-testid={`dm-unread-count-${conversation.id}`}
          aria-label={`${visibleUnreadCount} unread direct ${visibleUnreadCount === 1 ? 'message' : 'messages'}`}
          className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold leading-5 text-center flex-shrink-0"
        >
          {visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
        </span>
      )}
    </Link>
  )
}
