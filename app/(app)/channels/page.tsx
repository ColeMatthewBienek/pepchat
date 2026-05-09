'use client'

import { useMobileSidebar } from '@/lib/context/MobileSidebarContext'

export default function ChannelsIndexPage() {
  const { open } = useMobileSidebar()

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4 text-center px-8"
      style={{ background: 'var(--bg-chat)', position: 'relative' }}
    >
      {/* Mobile only — hamburger in top-left corner */}
      <button
        className="md:hidden"
        onClick={open}
        aria-label="Open channel navigation"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      <div className="w-16 h-16 rounded-full flex items-center justify-center"
           style={{ background: 'var(--bg-tertiary)' }}>
        <svg
          width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--text-faint)' }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-1">No channel selected</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Pick a channel from the sidebar or create one to start chatting.
        </p>
      </div>

      {/* Mobile only — CTA button */}
      <button
        className="md:hidden"
        onClick={open}
        style={{
          marginTop: 8,
          padding: '10px 20px',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Open channel navigation
      </button>
    </div>
  )
}
