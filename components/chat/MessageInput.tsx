'use client'

import { useRef, useState, useTransition } from 'react'
import { sendMessage } from '@/app/(app)/messages/actions'
import type { MessageWithProfile, Profile } from '@/lib/types'

interface MessageInputProps {
  channelId: string
  channelName: string
  profile: Profile
  onTyping?: () => void
  onSent?: (message: MessageWithProfile) => void
}

export default function MessageInput({
  channelId,
  channelName,
  profile,
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
  }

  function submit() {
    const trimmed = content.trim()
    if (!trimmed || isPending) return
    setError('')
    startTransition(async () => {
      const result = await sendMessage(channelId, trimmed)
      if ('error' in result) {
        setError(result.error)
      } else {
        setContent('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        textareaRef.current?.focus()
        // Add to message list immediately — no waiting for realtime round-trip
        onSent?.(result.message)
      }
    })
  }

  return (
    <div
      className="flex-shrink-0 px-4 pb-4 pt-2"
      style={{ background: 'var(--bg-tertiary)' }}
    >
      {error && (
        <p className="text-xs text-[var(--danger)] mb-1.5 px-1">{error}</p>
      )}
      <div
        className="flex items-end gap-2 rounded-lg px-3 py-2.5"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
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
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}
