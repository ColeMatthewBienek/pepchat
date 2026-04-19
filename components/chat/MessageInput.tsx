'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { sendMessage } from '@/app/(app)/messages/actions'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import type { MessageWithProfile, Profile, GifAttachment, Attachment } from '@/lib/types'
import { registerShare } from '@/lib/klipy'
import type { KlipyGif } from '@/lib/klipy'

const GifPicker = dynamic(() => import('./GifPicker'), { ssr: false })

const KLIPY_ENABLED = !!process.env.NEXT_PUBLIC_KLIPY_API_KEY

interface MessageInputProps {
  channelId: string
  channelName: string
  profile: Profile
  replyingTo?: MessageWithProfile | null
  onCancelReply?: () => void
  onTyping?: () => void
  onSent?: (message: MessageWithProfile) => void
  /** When provided, called instead of the default sendMessage server action. */
  sendAction?: (content: string, replyToId: string | null, attachments: Attachment[]) => Promise<{ error: string } | { ok: true; message: MessageWithProfile }>
}

export default function MessageInput({
  channelId,
  channelName,
  profile,
  replyingTo,
  onCancelReply,
  onTyping,
  onSent,
  sendAction,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gifPickerRef = useRef<HTMLDivElement>(null)
  const dragCounterRef = useRef(0)

  const { pendingImages, inputError, addFiles, removeImage, retryUpload, clearAll, hasUploading, attachments } =
    useImageUpload()

  // Document-level drag listeners so the overlay covers the whole page
  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!Array.from(e.dataTransfer?.types ?? []).includes('Files')) return
      dragCounterRef.current++
      setIsDragging(true)
    }
    function onDragLeave() {
      dragCounterRef.current--
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setIsDragging(false)
      }
    }
    function onDocDrop() {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDocDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDocDrop)
    }
  }, [])

  // Close GIF picker on outside click
  useEffect(() => {
    if (!gifPickerOpen) return
    function onPointerDown(e: MouseEvent) {
      if (gifPickerRef.current && !gifPickerRef.current.contains(e.target as Node)) {
        setGifPickerOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [gifPickerOpen])

  function handleGifSelect(gif: KlipyGif) {
    setGifPickerOpen(false)
    registerShare(gif.id, profile.id) // required by Klipy ToS
    const gifAttachment: GifAttachment = {
      url: gif.file.hd?.gif?.url ?? gif.file.md?.gif?.url,
      type: 'gif',
      name: gif.title ?? gif.slug,
      preview: gif.file.sm?.gif?.url ?? gif.file.md?.gif?.url ?? gif.file.hd?.gif?.url,
      width: gif.file.hd?.gif?.width ?? gif.file.md?.gif?.width ?? 0,
      height: gif.file.hd?.gif?.height ?? gif.file.md?.gif?.height ?? 0,
      source: 'klipy',
    }
    startTransition(async () => {
      const result = sendAction
        ? await sendAction('', replyingTo?.id ?? null, [gifAttachment])
        : await sendMessage(channelId, '', replyingTo?.id, [gifAttachment])
      if ('error' in result) {
        setError(result.error)
      } else {
        textareaRef.current?.focus()
        onCancelReply?.()
        onSent?.(result.message)
      }
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    dragCounterRef.current = 0
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) addFiles(files, profile.id)
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items)
    const imageFiles = items
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((f): f is File => f !== null)
    if (imageFiles.length === 0) return
    e.preventDefault()
    addFiles(imageFiles, profile.id)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    addFiles(e.target.files, profile.id)
    e.target.value = ''
  }

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
    const hasContent = trimmed.length > 0 || attachments.length > 0
    if (!hasContent || isPending || hasUploading) return
    setError('')
    startTransition(async () => {
      const result = sendAction
        ? await sendAction(trimmed, replyingTo?.id ?? null, attachments)
        : await sendMessage(channelId, trimmed, replyingTo?.id, attachments)
      if ('error' in result) {
        setError(result.error)
      } else {
        setContent('')
        clearAll()
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        if (window.innerWidth < 768) {
          textareaRef.current?.blur()
        } else {
          textareaRef.current?.focus()
        }
        onCancelReply?.()
        onSent?.(result.message)
      }
    })
  }

  const canSend = (content.trim().length > 0 || attachments.length > 0) && !isPending && !hasUploading

  return (
    <div
      className="flex-shrink-0"
      style={{ padding: '0 16px 14px' }}
    >
      {/* Full-viewport drag-and-drop overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          style={{ background: 'rgba(0,0,0,0.65)', outline: '3px dashed var(--accent)', outlineOffset: '-12px' }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="text-2xl font-semibold text-white pointer-events-none select-none">
            Drop image here
          </p>
        </div>
      )}

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

      {(error || inputError) && (
        <p className="text-xs text-[var(--danger)] mb-1.5 px-1">{error || inputError}</p>
      )}

      <div
        className={`flex flex-col ${replyingTo ? 'rounded-b-[14px]' : 'rounded-[14px]'}`}
        style={{
          background: 'var(--bg-composer)',
          border: '1px solid var(--border-soft)',
          transition: 'border-color 120ms ease',
        }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-soft)')}
      >
        {/* Textarea row */}
        <div className="flex items-end gap-2 px-3 py-2.5 relative">
          {/* Paperclip / attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            className="flex-shrink-0 p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          {/* GIF picker button */}
          {KLIPY_ENABLED && (
            <div ref={gifPickerRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setGifPickerOpen(o => !o)}
                title="Send a GIF"
                className={`p-1.5 rounded text-xs font-bold leading-none transition-colors ${
                  gifPickerOpen
                    ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10'
                }`}
              >
                GIF
              </button>
              {gifPickerOpen && (
                <GifPicker onSelect={handleGifSelect} onClose={() => setGifPickerOpen(false)} />
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={replyingTo ? `Reply to @${replyingTo.profiles?.username}…` : `Message #${channelName}`}
            disabled={isPending}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: 200 }}
          />
          <button
            onClick={submit}
            disabled={!canSend}
            title="Send message"
            style={{
              padding: '6px 12px',
              background: canSend ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: canSend ? '#fff' : 'var(--text-faint)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 600,
              cursor: canSend ? 'pointer' : 'default',
              transition: 'background 120ms ease, color 120ms ease',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>

        {/* Image preview strip */}
        {pendingImages.length > 0 && (
          <div className="flex gap-2 px-3 pb-3 flex-wrap">
            {pendingImages.map(img => (
              <div key={img.id} className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
                <img
                  src={img.localUrl}
                  alt={img.file.name}
                  className="w-full h-full object-cover rounded-lg border border-white/20"
                />

                {img.state === 'uploading' && (
                  <div className="absolute inset-0 rounded-lg bg-black/55 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}

                {img.state === 'done' && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center pointer-events-none">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {img.state === 'error' && (
                  <div className="absolute inset-0 rounded-lg bg-red-900/65 flex items-center justify-center">
                    <button
                      onClick={() => retryUpload(img.id, profile.id)}
                      title={img.error ?? 'Retry upload'}
                      className="text-white text-base bg-black/40 rounded px-2 py-0.5 hover:bg-black/60"
                    >
                      ↺
                    </button>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--bg-primary)] border border-white/20 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1 px-1">
        <p className="text-[10px] text-[var(--text-muted)]">
          Enter to send · Shift+Enter for new line{replyingTo ? ' · Esc to cancel reply' : ''}
        </p>
        <p className="hidden md:flex text-[10px] text-[var(--text-muted)] gap-2 font-mono">
          <span>**bold**</span>
          <span>*italic*</span>
          <span>`code`</span>
          <span>```block```</span>
          <span>&gt; quote</span>
        </p>
      </div>
    </div>
  )
}
