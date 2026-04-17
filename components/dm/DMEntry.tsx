'use client'

import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import type { DMConversation } from '@/lib/types'

interface DMEntryProps {
  conversation: DMConversation
  isActive: boolean
  onNavigate?: () => void
}

export default function DMEntry({ conversation, isActive, onNavigate }: DMEntryProps) {
  const { other_user, unread_count } = conversation
  const displayName = other_user.display_name ?? other_user.username

  return (
    <Link
      href={`/dm/${conversation.id}`}
      onClick={onNavigate}
      title={conversation.last_message ? `Last: ${conversation.last_message}` : displayName}
      className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded transition-colors ${
        isActive
          ? 'bg-[var(--accent)]/20 text-[var(--text-primary)]'
          : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]'
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar src={other_user.avatar_url} username={displayName} size={28} />
        {unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-[var(--bg-primary)]" />
        )}
      </div>
      <span className={`text-sm truncate flex-1 ${unread_count > 0 ? 'font-semibold text-[var(--text-primary)]' : ''}`}>
        {displayName}
      </span>
    </Link>
  )
}
