'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Avatar from '@/components/ui/Avatar'
import type { Group } from '@/lib/types'

const DMSection = dynamic(() => import('@/components/dm/DMSection'), { ssr: false })

interface GroupsSidebarProps {
  groups: Group[]
  currentUserId: string
  unreadGroupIds?: Set<string>
  onCreateGroup: () => void
  onJoinGroup: () => void
}

export default function GroupsSidebar({
  groups,
  currentUserId,
  unreadGroupIds = new Set(),
  onCreateGroup,
  onJoinGroup,
}: GroupsSidebarProps) {
  const params = useParams()
  const activeGroupId = params?.groupId as string | undefined

  return (
    <nav
      className="flex flex-col py-3 overflow-y-auto"
      style={{ width: 220, minWidth: 220, background: 'var(--bg-primary)' }}
    >
      {/* Groups section — icons centered in the wider column */}
      <div className="flex flex-col items-center gap-2">
        {/* Group icons */}
        {groups.map((group) => {
          const isActive = group.id === activeGroupId
          return (
            <div key={group.id} className="relative flex items-center">
              {isActive && (
                <span className="absolute -left-3 w-1 h-8 rounded-r-full bg-white" />
              )}
              <Link
                href={`/groups/${group.id}`}
                title={group.name}
                className={`flex items-center justify-center w-12 h-12 transition-all duration-200 overflow-hidden
                  ${isActive ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]'}`}
              >
                <Avatar src={group.icon_url} username={group.name} size={48} className="!rounded-none w-full h-full" />
              </Link>
              {unreadGroupIds.has(group.id) && (
                <span
                  data-testid={`unread-badge-${group.id}`}
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2 border-[var(--bg-primary)]"
                />
              )}
            </div>
          )
        })}

        {/* Add group */}
        <button
          onClick={onCreateGroup}
          title="Create a Group"
          className="flex items-center justify-center w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-[var(--bg-secondary)] hover:bg-[var(--success)] text-[var(--success)] hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Join group */}
        <button
          onClick={onJoinGroup}
          title="Join a Group"
          className="flex items-center justify-center w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-[var(--bg-secondary)] hover:bg-[var(--accent)] text-[var(--text-muted)] hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </div>

      {/* DM section */}
      <DMSection currentUserId={currentUserId} />
    </nav>
  )
}
