'use client'

import { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import type { OnlineUser, PresenceStatus } from '@/lib/hooks/usePresence'

interface PresencePanelProps {
  onlineUsers: OnlineUser[]
  currentStatus?: PresenceStatus
  onStatusChange?: (status: PresenceStatus) => void
}

const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  dnd: 'Do not disturb',
}

/** Collapsible right-side panel showing who is currently online in the channel. */
export default function PresencePanel({ onlineUsers, currentStatus = 'online', onStatusChange }: PresencePanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        data-testid="presence-expand"
        onClick={() => setCollapsed(false)}
        aria-label={`Show online members (${onlineUsers.length})`}
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
          data-testid="presence-collapse"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse online members panel"
          title="Collapse panel"
          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {onStatusChange && (
        <div className="border-b border-black/20 px-3 py-3">
          <label
            htmlFor="presence-status"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Your Status
          </label>
          <select
            id="presence-status"
            data-testid="presence-status-select"
            value={currentStatus}
            onChange={(e) => onStatusChange(e.target.value as PresenceStatus)}
            className="w-full rounded border border-black/20 bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {(Object.keys(STATUS_LABELS) as PresenceStatus[]).map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Member list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {onlineUsers.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
          >
            <Avatar user={{ avatar_url: user.avatar_url, username: user.username }} size={28} showStatus status={user.status === 'dnd' ? 'dnd' : user.status === 'away' ? 'away' : 'online'} />
            <div className="min-w-0">
              <span className="block text-sm truncate">{user.username}</span>
              <span className="block text-[10px] text-[var(--text-muted)]">{STATUS_LABELS[user.status ?? 'online']}</span>
            </div>
          </div>
        ))}
        {onlineUsers.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] px-2 py-1">No one else here yet.</p>
        )}
      </div>
    </div>
  )
}
