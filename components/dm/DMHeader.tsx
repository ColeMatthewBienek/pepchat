'use client'

import Avatar from '@/components/ui/Avatar'
import type { Profile } from '@/lib/types'

interface DMHeaderProps {
  otherUser: Profile
  onBack: () => void
  isOnline?: boolean
}

export default function DMHeader({ otherUser, onBack, isOnline = false }: DMHeaderProps) {
  const displayName = otherUser.display_name ?? otherUser.username

  return (
    <div
      className="flex items-center gap-2 px-3 h-14 border-b flex-shrink-0"
      style={{ background: 'var(--bg-chat-header)', borderColor: 'var(--border-soft)' }}
    >
      {/* Mobile-only back button */}
      <button
        data-testid="dm-back-btn"
        onClick={onBack}
        className="md:hidden flex-shrink-0"
        aria-label="Back"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px 8px 6px 0',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

      <Avatar user={otherUser} size={28} className="flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">{displayName}</p>
        <p className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] leading-tight">
          <span
            data-testid="dm-presence-dot"
            className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-[var(--online)]' : 'bg-[var(--text-faint)]'}`}
          />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </p>
      </div>
    </div>
  )
}
