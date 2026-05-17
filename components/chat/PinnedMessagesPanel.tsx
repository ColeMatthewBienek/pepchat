'use client'

import Avatar from '@/components/ui/Avatar'
import type { PinnedMessage } from '@/lib/types'

interface PinnedMessagesPanelProps {
  open: boolean
  pinnedMessages: PinnedMessage[]
  canPin: boolean
  onClose: () => void
  onJump: (messageId: string) => void
  onUnpin: (pinnedId: string) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function PinnedMessagesPanel({
  open,
  pinnedMessages,
  canPin,
  onClose,
  onJump,
  onUnpin,
}: PinnedMessagesPanelProps) {
  if (!open) return null

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden modal-backdrop-enter"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        data-testid="pinned-panel"
        className="fixed inset-y-0 right-0 z-50 w-full lg:static lg:w-80 lg:z-auto flex flex-col flex-shrink-0 border-l border-black/20 drawer-panel-enter"
        style={{ background: 'var(--bg-secondary)', maxWidth: 320 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 h-12 border-b border-black/20 flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
            </svg>
            <span
              data-testid="pinned-panel-title"
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Pinned Messages
            </span>
          </div>
          <button
            data-testid="pinned-panel-close"
            onClick={onClose}
            aria-label="Close pinned messages"
            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pinnedMessages.length === 0 ? (
            <div
              data-testid="pinned-empty"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: '100%',
                minHeight: 160,
                textAlign: 'center',
                color: 'var(--text-faint)',
                padding: '0 24px',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No pinned messages yet.</p>
              <p className="text-xs">Pin important messages to save them here for easy reference.</p>
            </div>
          ) : (
            pinnedMessages.map(pin => {
              const author = pin.message?.profiles?.display_name ?? pin.message?.profiles?.username ?? 'Unknown'
              const preview = pin.message?.content ? `: ${pin.message.content}` : ''

              return (
                <div
                  key={pin.id}
                  data-testid={`pinned-card-${pin.id}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    border: '1px solid var(--border-soft)',
                  }}
                >
                {/* Card header */}
                <div className="flex items-center gap-2 mb-2">
                  <Avatar
                    user={{
                      avatar_url: pin.message?.profiles?.avatar_url ?? null,
                      username: pin.message?.profiles?.username ?? '?',
                      display_name: pin.message?.profiles?.display_name,
                      username_color: pin.message?.profiles?.username_color,
                    }}
                    size={20}
                  />
                  <span
                    data-testid={`pinned-card-author-${pin.id}`}
                    className="text-sm font-semibold"
                    style={{ color: pin.message?.profiles?.username_color ?? 'var(--text-primary)' }}
                  >
                    {author}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-faint)' }}>
                    {pin.message ? formatDate(pin.message.created_at) : ''}
                  </span>
                </div>

                {/* Message content */}
                <p
                  data-testid={`pinned-card-content-${pin.id}`}
                  className="text-sm break-words"
                  style={{ color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 10 }}
                >
                  {pin.message?.content ?? ''}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`pinned-jump-${pin.id}`}
                    onClick={() => onJump(pin.message_id)}
                    aria-label={`Jump to pinned message from ${author}${preview}`}
                    className="text-xs px-2 py-1 rounded border border-[var(--border-soft)] hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Jump
                  </button>
                  {canPin && (
                    <button
                      data-testid={`pinned-unpin-${pin.id}`}
                      onClick={() => onUnpin(pin.id)}
                      aria-label={`Unpin message from ${author}${preview}`}
                      className="text-xs px-2 py-1 rounded border border-[var(--border-soft)] hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      Unpin
                    </button>
                  )}
                </div>
              </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
