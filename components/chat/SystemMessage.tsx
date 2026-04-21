'use client'

import type { MessageWithProfile } from '@/lib/types'

interface SystemMessageProps {
  msg: MessageWithProfile
  onOpenPinnedPanel: () => void
}

export default function SystemMessage({ msg, onOpenPinnedPanel }: SystemMessageProps) {
  if (msg.system_type !== 'pin') return null

  const pinnedBy = msg.system_data?.pinned_by ?? 'Someone'

  return (
    <div
      data-testid="system-message-pin"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px',
        fontSize: 13,
        color: 'var(--text-faint)',
      }}
    >
      <svg
        data-testid="system-pin-icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <line x1="12" y1="17" x2="12" y2="22" />
        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
      </svg>
      <span>
        <strong data-testid="system-pin-actor" style={{ color: 'var(--text-muted)' }}>
          {pinnedBy}
        </strong>
        {' '}pinned a message to this channel.{' '}
        <button
          data-testid="system-pin-see-all"
          onClick={onOpenPinnedPanel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            padding: 0,
            fontSize: 13,
          }}
        >
          See all pinned messages.
        </button>
      </span>
    </div>
  )
}
