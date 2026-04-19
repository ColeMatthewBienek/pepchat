'use client'

import Avatar from '@/components/ui/Avatar'
import type { Profile } from '@/lib/types'

interface DMHeaderProps {
  otherUser: Profile
}

export default function DMHeader({ otherUser }: DMHeaderProps) {
  const displayName = otherUser.display_name ?? otherUser.username

  return (
    <div
      className="flex items-center gap-3 px-4 h-12 border-b border-black/20 flex-shrink-0"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <Avatar user={otherUser} size={28} />
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">{displayName}</p>
        <p className="text-[10px] text-[var(--text-muted)] leading-tight">Direct Message</p>
      </div>
    </div>
  )
}
