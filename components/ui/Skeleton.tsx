import type { CSSProperties } from 'react'

interface SkeletonBlockProps {
  className?: string
  style?: CSSProperties
}

interface ChatSurfaceSkeletonProps {
  variant?: 'channel' | 'dm'
}

export function SkeletonBlock({ className = '', style }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-pulse rounded ${className}`.trim()}
      style={style}
    />
  )
}

export function MessageRowSkeleton({ compact = false, align = 'left' }: { compact?: boolean; align?: 'left' | 'right' }) {
  const isRight = align === 'right'
  return (
    <div className={`flex gap-3 px-4 ${compact ? 'py-1' : 'py-2'} ${isRight ? 'justify-end' : ''}`} aria-hidden="true">
      {!compact && !isRight && <SkeletonBlock className="h-9 w-9 flex-shrink-0 rounded-full" />}
      <div className={`min-w-0 ${isRight ? 'items-end' : 'items-start'} flex w-full max-w-[72%] flex-col gap-2`}>
        {!compact && (
          <div className={`flex w-full items-center gap-2 ${isRight ? 'justify-end' : ''}`}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-2.5 w-12" />
          </div>
        )}
        <SkeletonBlock className={`${compact ? 'h-3' : 'h-4'} ${isRight ? 'w-4/5' : 'w-11/12'}`} />
        {!compact && <SkeletonBlock className={`h-4 ${isRight ? 'w-2/3' : 'w-3/5'}`} />}
      </div>
      {!compact && isRight && <SkeletonBlock className="h-9 w-9 flex-shrink-0 rounded-full" />}
    </div>
  )
}

export function ChatSurfaceSkeleton({ variant = 'channel' }: ChatSurfaceSkeletonProps) {
  const isDm = variant === 'dm'

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[var(--bg-chat)]" aria-busy="true" aria-label={isDm ? 'Loading conversation' : 'Loading channel'}>
      <div className="flex h-12 flex-shrink-0 items-center gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-chat-header)] px-4">
        {isDm ? <SkeletonBlock className="h-8 w-8 rounded-full" /> : <SkeletonBlock className="h-6 w-6 rounded-md" />}
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-2.5 w-48 max-w-[60%]" />
        </div>
        <SkeletonBlock className="h-7 w-7 rounded-md" />
        <SkeletonBlock className="h-7 w-7 rounded-md" />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden py-3">
        <MessageRowSkeleton />
        <MessageRowSkeleton compact />
        <MessageRowSkeleton />
        <MessageRowSkeleton compact align="right" />
        <MessageRowSkeleton align="right" />
        <MessageRowSkeleton />
        <MessageRowSkeleton compact />
        <MessageRowSkeleton />
      </div>

      <div className="flex-shrink-0 border-t border-[var(--border-soft)] bg-[var(--bg-composer)] p-3">
        <div className="flex items-end gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-tertiary)] p-3">
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
