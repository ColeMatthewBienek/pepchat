'use client'

import { useRef, useState, useTransition } from 'react'
import { sendMessage } from '@/app/(app)/messages/actions'
import type { MessageWithProfile, Profile } from '@/lib/types'

interface MessageInputProps {
  channelId: string
  channelName: string
  profile: Profile
  replyingTo?: MessageWithProfile | null
  onCancelReply?: () => void
  onTyping?: () => void
  onSent?: (message: MessageWithProfile) => void
}

export default function MessageInput({
  channelId,
  channelName,
  profile,
  replyingTo,
  onCancelReply,
  onTyping,
  onSent,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    setError('')
    autoResize()
    onTyping?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
    if (e.key === 'Escape' && replyingTo) {
      onCancelReply?.()
    }
  }

  function submit() {
    const trimmed = content.trim()
    if (!trimmed || isPending) return
    setError('')
    startTransition(async () => {
      const result = await sendMessage(channelId, trimmed, replyingTo?.id)
      if ('error' in result) {
        setError(result.error)
      } else {
        setContent('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        textareaRef.current?.focus()
        onCancelReply?.()
        onSent?.(result.message)
      }
    })
  }

  return (
    <div
      className="flex-shrink-0 px-4 pb-4 pt-2"
      style={{ background: 'var(--bg-tertiary)' }}
    >
      {/* Reply preview bar */}
      {replyingTo && (
        <div
          className="flex items-center gap-2 px-3 py-2 mb-1 rounded-t-lg border-l-2 border-[var(--accent)]"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <svg className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span className="text-xs text-[var(--text-muted)]">
            Replying to{' '}
            <span className="font-semibold text-[var(--accent)]">
              @{replyingTo.profiles?.username}
            </span>
          </span>
          <span className="flex-1 text-xs text-[var(--text-muted)] truncate opacity-70">
            {replyingTo.content.length > 80 ? replyingTo.content.slice(0, 80) + '…' : replyingTo.content}
          </span>
          <button
            onClick={onCancelReply}
            title="Cancel reply (Esc)"
            className="flex-shrink-0 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--danger)] mb-1.5 px-1">{error}</p>
      )}

      <div
        className={`flex items-end gap-2 px-3 py-2.5 ${replyingTo ? 'rounded-b-lg' : 'rounded-lg'}`}
        style={{ background: 'var(--bg-secondary)' }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? `Reply to @${replyingTo.profiles?.username}…` : `Message #${channelName}`}
          disabled={isPending}
          rows={1}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: 200 }}
        />
        <button
          onClick={submit}
          disabled={!content.trim() || isPending}
          title="Send message"
          className="flex-shrink-0 p-1.5 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
        Enter to send · Shift+Enter for new line{replyingTo ? ' · Esc to cancel reply' : ''}
      </p>
    </div>
  )
}
