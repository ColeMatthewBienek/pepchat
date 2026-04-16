'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import type { Group } from '@/lib/types'

interface GroupsSidebarProps {
  groups: Group[]
  onCreateGroup: () => void
  onJoinGroup: () => void
}

/**
 * Left-most narrow sidebar (80px) showing group icons.
 * Each icon navigates to that group's first channel.
 */
export default function GroupsSidebar({
  groups,
  onCreateGroup,
  onJoinGroup,
}: GroupsSidebarProps) {
  const params = useParams()
  const activeGroupId = params?.groupId as string | undefined

  return (
    <nav
      className="flex flex-col items-center gap-2 py-3 overflow-y-auto"
      style={{ width: 72, minWidth: 72, background: 'var(--bg-primary)' }}
    >
      {/* Home / DMs */}
      <Link
        href="/channels"
        className="group relative flex items-center justify-center w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-[var(--bg-secondary)] hover:bg-[var(--accent)]"
        title="Direct Messages"
      >
        <svg
          className="w-6 h-6 text-[var(--text-primary)]"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </Link>

      {/* Divider */}
      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Group icons */}
      {groups.map((group) => {
        const isActive = group.id === activeGroupId
        return (
          <div key={group.id} className="relative flex items-center">
            {/* Active indicator pill */}
            {isActive && (
              <span className="absolute -left-3 w-1 h-8 rounded-r-full bg-white" />
            )}
            <Link
              href={`/groups/${group.id}`}
              title={group.name}
              className={`flex items-center justify-center w-12 h-12 transition-all duration-200 overflow-hidden
                ${isActive
                  ? 'rounded-[16px]'
                  : 'rounded-[24px] hover:rounded-[16px]'
                }`}
            >
              <Avatar
                src={group.icon_url}
                username={group.name}
                size={48}
                className="!rounded-none w-full h-full"
              />
            </Link>
          </div>
        )
      })}

      {/* Add group button */}
      <button
        onClick={onCreateGroup}
        title="Create a Group"
        className="flex items-center justify-center w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-[var(--bg-secondary)] hover:bg-[var(--success)] text-[var(--success)] hover:text-white"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Join group button */}
      <button
        onClick={onJoinGroup}
        title="Join a Group"
        className="flex items-center justify-center w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-[var(--bg-secondary)] hover:bg-[var(--accent)] text-[var(--text-muted)] hover:text-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </nav>
  )
}
