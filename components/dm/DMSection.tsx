'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useDMConversations } from '@/lib/hooks/useDMs'
import DMEntry from './DMEntry'

interface DMSectionProps {
  currentUserId: string
}

export default function DMSection({ currentUserId }: DMSectionProps) {
  const { conversations, loading } = useDMConversations(currentUserId)
  const [search, setSearch] = useState('')
  const params = useParams()
  const activeConvId = params?.conversationId as string | undefined
  const normalizedSearch = search.trim().toLowerCase()
  const filteredConversations = useMemo(() => {
    if (!normalizedSearch) return conversations

    return conversations.filter(conv => {
      const displayName = conv.other_user.display_name ?? ''
      const values = [
        displayName,
        conv.other_user.username,
        conv.last_message ?? '',
      ].map(value => value.toLowerCase())

      return values.some(value => value.includes(normalizedSearch))
    })
  }, [conversations, normalizedSearch])
  const visibleTotalUnread = conversations.reduce(
    (sum, conv) => sum + (conv.id === activeConvId ? 0 : conv.unread_count),
    0
  )

  return (
    <div className="mt-1">
      {/* Divider */}
      <div className="h-px bg-white/10 mx-3 my-2" />

      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Direct Messages
        </span>
        {visibleTotalUnread > 0 && (
          <span
            data-testid="dm-total-unread"
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--danger)] text-white leading-none"
          >
            {visibleTotalUnread > 99 ? '99+' : visibleTotalUnread}
          </span>
        )}
      </div>

      {!loading && conversations.length > 0 && (
        <div className="px-3 pb-2">
          <input
            data-testid="dm-search-input"
            className="w-full rounded border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
            type="text"
            placeholder="Search DMs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* DM list */}
      {!loading && conversations.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] px-3 py-2 leading-relaxed">
          No direct messages yet.{' '}
          <span className="block">Click a user to start one.</span>
        </p>
      ) : !loading && filteredConversations.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] px-3 py-2 leading-relaxed">
          No direct messages match your search.
        </p>
      ) : (
        <ul className="space-y-0.5 pb-2">
          {filteredConversations.map(conv => (
            <li key={conv.id}>
              <DMEntry
                conversation={conv.id === activeConvId ? { ...conv, unread_count: 0 } : conv}
                isActive={conv.id === activeConvId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
