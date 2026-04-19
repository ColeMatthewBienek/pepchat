'use client'

import Avatar from '@/components/ui/Avatar'
import type { Profile } from '@/lib/types'

interface DMEmptyStateProps {
  otherUser: Profile
}

export default function DMEmptyState({ otherUser }: DMEmptyStateProps) {
  const displayName = otherUser.display_name ?? otherUser.username

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <Avatar user={otherUser} size={80}
        className="ring-4 ring-[var(--bg-tertiary)] rounded-full" />
      <div>
        <p className="text-lg font-bold">{displayName}</p>
        {otherUser.display_name && (
          <p className="text-sm text-[var(--text-muted)]">@{otherUser.username}</p>
        )}
      </div>
      <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
        This is the beginning of your direct message history with{' '}
        <span className="font-medium text-[var(--text-primary)]">@{otherUser.username}</span>.
      </p>
    </div>
  )
}
