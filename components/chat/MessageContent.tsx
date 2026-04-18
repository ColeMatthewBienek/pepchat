'use client'

import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/markdown'

interface MessageContentProps {
  content: string
  isEditing?: boolean
}

export function MessageContent({ content, isEditing }: MessageContentProps) {
  const html = useMemo(() => renderMarkdown(content), [content])

  if (isEditing) return null

  return (
    <div
      className="message-content text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
