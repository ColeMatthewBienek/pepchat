'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Avatar from '@/components/ui/Avatar'
import { logout } from '@/app/(auth)/actions'
import { PERMISSIONS, type Role } from '@/lib/permissions'
import type { Channel, Group, Profile } from '@/lib/types'

const DMSection = dynamic(() => import('@/components/dm/DMSection'), { ssr: false })

interface MobileDrawerProps {
  groups: Group[]
  activeGroupId: string | null
  activeGroup: Group | null
  channels: Channel[]
  profile: Profile
  userRole: Role | null
  onClose: () => void
  onCreateGroup: () => void
  onJoinGroup: () => void
  onCreateChannel: () => void
  onGroupSettings: () => void
}

export default function MobileDrawer({
  groups,
  activeGroupId,
  activeGroup,
  channels,
  profile,
  userRole,
  onClose,
  onCreateGroup,
  onJoinGroup,
  onCreateChannel,
  onGroupSettings,
}: MobileDrawerProps) {
  const params = useParams()
  const activeChannelId = params?.channelId as string | undefined

  const canManage = userRole ? PERMISSIONS.canManageChannels(userRole) : false
  const isAdmin = userRole === 'admin'

  const visibleChannels = userRole === 'noob'
    ? channels.filter(c => c.name === 'welcome')
    : channels

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* Group icons — horizontal strip */}
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {groups.map(group => {
            const isActiveGrp = group.id === activeGroupId
            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                onClick={onClose}
                title={group.name}
                className={`flex items-center justify-center w-12 h-12 overflow-hidden transition-all duration-200
                  ${isActiveGrp ? 'rounded-[16px] ring-2 ring-[var(--accent)]' : 'rounded-[24px] hover:rounded-[16px]'}`}
              >
                <Avatar src={group.icon_url} username={group.name} size={48} className="!rounded-none w-full h-full" />
              </Link>
            )
          })}
          <button
            onClick={() => { onCreateGroup(); onClose() }}
            title="Create a Group"
            className="flex items-center justify-center w-12 h-12 rounded-[24px] bg-[var(--bg-primary)] hover:bg-[var(--success)] text-[var(--success)] hover:text-white transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => { onJoinGroup(); onClose() }}
            title="Join a Group"
            className="flex items-center justify-center w-12 h-12 rounded-[24px] bg-[var(--bg-primary)] hover:bg-[var(--accent)] text-[var(--text-muted)] hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-white/10 mx-3" />

        {/* Active group — channels */}
        {activeGroup ? (
          <div className="px-2">
            {/* Group header */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {isAdmin && (
                  <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 19l2-8 5 4 3-7 3 7 5-4 2 8H2z" />
                  </svg>
                )}
                <span className="font-semibold text-sm truncate">{activeGroup.name}</span>
              </div>
              <button
                onClick={() => { onGroupSettings(); onClose() }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
                title="Group settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Text Channels
              </span>
              {canManage && (
                <button
                  onClick={() => { onCreateChannel(); onClose() }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Create Channel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {userRole === 'noob' && visibleChannels.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] px-2 py-2 leading-relaxed">
                You don&apos;t have access to any channels yet.
              </p>
            )}

            {visibleChannels.map(channel => {
              const isActive = channel.id === activeChannelId
              return (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.id}`}
                  onClick={onClose}
                  className={`flex items-center gap-1.5 px-2 min-h-[44px] rounded text-sm transition-colors
                    ${isActive
                      ? 'bg-white/10 text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                    }`}
                >
                  <span className="text-base leading-none opacity-60 flex-shrink-0">#</span>
                  <span className="truncate">{channel.name}</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] px-4 py-2">Select a group to see its channels.</p>
        )}

        <div className="h-px bg-white/10 mx-3" />

        {/* DM section */}
        <DMSection currentUserId={profile.id} onNavigate={onClose} />
      </div>

      {/* User footer — pinned to bottom */}
      <div
        className="flex items-center gap-2 px-2 py-2 border-t border-black/20 flex-shrink-0"
        style={{ background: 'var(--bg-primary)' }}
      >
        <Link href="/settings/profile" onClick={onClose} className="flex items-center gap-2 flex-1 min-w-0 rounded hover:bg-white/5 transition-colors px-1 py-0.5 -mx-1">
          <Avatar src={profile.avatar_url} username={profile.display_name ?? profile.username} size={32} online />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile.display_name ?? profile.username}</p>
            {profile.display_name ? (
              <p className="text-xs text-[var(--text-muted)] truncate">@{profile.username}</p>
            ) : userRole ? (
              <p className="text-xs text-[var(--text-muted)] truncate capitalize">{userRole}</p>
            ) : null}
          </div>
        </Link>
        <form action={logout}>
          <button type="submit" title="Log out"
            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-2 rounded hover:bg-white/10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
