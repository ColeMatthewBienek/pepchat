'use client'

import { useMobileSidebar } from '@/lib/context/MobileSidebarContext'

interface ChatHeaderProps {
  channelName: string
  channelTopic?: string | null
}

export default function ChatHeader({ channelName, channelTopic }: ChatHeaderProps) {
  const { open } = useMobileSidebar()

  return (
    <div
      data-testid="chat-header"
      style={{
        height: 56,
        flexShrink: 0,
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--border-soft)',
        background: 'var(--bg-chat-header)',
      }}
    >
      <button
        data-testid="mobile-menu-btn"
        onClick={open}
        className="icon-btn md:hidden"
        aria-label="Open sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <span style={{ opacity: 0.5, fontSize: 20, fontWeight: 600, flexShrink: 0 }}>#</span>
        <span
          data-testid="chat-header-name"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {channelName}
        </span>
        {channelTopic && (
          <>
            <div style={{ width: 1, height: 18, background: 'var(--border-soft)', flexShrink: 0 }} />
            <span
              data-testid="chat-header-topic"
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {channelTopic}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
