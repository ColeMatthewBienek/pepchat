'use client'

import { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import type { OnlineUser } from '@/lib/hooks/usePresence'

interface PresencePanelProps {
  onlineUsers: OnlineUser[]
}

/** Collapsible right-side panel showing who is currently online in the channel. */
export default function PresencePanel({ onlineUsers }: PresencePanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="hidden lg:flex flex-col items-center pt-3 w-8 flex-shrink-0 border-l border-black/20 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        title={`Show online members (${onlineUsers.length})`}
        style={{ background: 'var(--bg-secondary)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {onlineUsers.length > 0 && (
          <span className="mt-1 text-[10px] font-bold text-[var(--success)]">{onlineUsers.length}</span>
        )}
      </button>
    )
  }

  return (
    <div
      className="hidden lg:flex flex-col w-56 flex-shrink-0 border-l border-black/20"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-black/20 flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Online — {onlineUsers.length}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse panel"
          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {onlineUsers.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
          >
            <Avatar src={user.avatar_url} username={user.username} size={28} online />
            <span className="text-sm truncate">{user.username}</span>
          </div>
        ))}
        {onlineUsers.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] px-2 py-1">No one else here yet.</p>
        )}
      </div>
    </div>
  )
}
