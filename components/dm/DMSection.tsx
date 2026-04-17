'use client'

import { useParams } from 'next/navigation'
import { useDMConversations } from '@/lib/hooks/useDMs'
import DMEntry from './DMEntry'

interface DMSectionProps {
  currentUserId: string
}

export default function DMSection({ currentUserId }: DMSectionProps) {
  const { conversations, totalUnread, loading } = useDMConversations(currentUserId)
  const params = useParams()
  const activeConvId = params?.conversationId as string | undefined

  return (
    <div className="mt-1">
      {/* Divider */}
      <div className="h-px bg-white/10 mx-3 my-2" />

      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Direct Messages
        </span>
        {totalUnread > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--danger)] text-white leading-none">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>

      {/* DM list */}
      {!loading && conversations.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] px-3 py-2 leading-relaxed">
          No direct messages yet.{' '}
          <span className="block">Click a user to start one.</span>
        </p>
      ) : (
        <ul className="space-y-0.5 pb-2">
          {conversations.map(conv => (
            <li key={conv.id}>
              <DMEntry
                conversation={conv}
                isActive={conv.id === activeConvId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
