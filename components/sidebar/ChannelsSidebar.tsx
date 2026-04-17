'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTransition } from 'react'
import Avatar from '@/components/ui/Avatar'
import MembersPanel from '@/components/sidebar/MembersPanel'
import { logout } from '@/app/(auth)/actions'
import { deleteChannel, moveChannel } from '@/app/(app)/channels/actions'
import { PERMISSIONS, type Role } from '@/lib/permissions'
import type { Channel, Group, Profile } from '@/lib/types'

interface ChannelsSidebarProps {
  group: Group | null
  channels: Channel[]
  profile: Profile
  userRole: Role | null
  onCreateChannel?: () => void
  onGroupSettings?: () => void
  onMobileClose?: () => void
}

export default function ChannelsSidebar({
  group,
  channels,
  profile,
  userRole,
  onCreateChannel,
  onGroupSettings,
  onMobileClose,
}: ChannelsSidebarProps) {
  const params = useParams()
  const activeChannelId = params?.channelId as string | undefined
  const [isPending, startTransition] = useTransition()

  const canManage   = userRole ? PERMISSIONS.canManageChannels(userRole) : false
  const canManageGrp = userRole ? PERMISSIONS.canManageGroup(userRole) : false
  const isAdmin     = userRole === 'admin'

  // Noobs only see 'welcome'; everyone else sees all channels
  const visibleChannels = userRole === 'noob'
    ? channels.filter((c) => c.name === 'welcome')
    : channels

  function handleDelete(channelId: string) {
    if (!group) return
    if (!confirm('Delete this channel? All messages will be lost.')) return
    startTransition(async () => { await deleteChannel(channelId, group.id) })
  }

  function handleMove(channelId: string, direction: 'up' | 'down') {
    startTransition(async () => { await moveChannel(channelId, direction) })
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ width: 240, minWidth: 240, background: 'var(--bg-secondary)' }}
    >
      {/* Group header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-black/20 shadow-sm flex-shrink-0">
        {group ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Crown icon for admin */}
              {isAdmin && (
                <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 19l2-8 5 4 3-7 3 7 5-4 2 8H2z" />
                </svg>
              )}
              <span className="font-semibold text-sm truncate">{group.name}</span>
            </div>
            {/* Settings gear — visible to all members for invite link; extra actions for admins */}
            <button
              onClick={onGroupSettings}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded hover:bg-white/10 flex-shrink-0"
              title="Group Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </>
        ) : (
          <span className="font-semibold text-sm text-[var(--text-muted)]">No group selected</span>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-2">
        {group ? (
          <>
            {/* Channel list */}
            <div className="px-2">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Text Channels
                </span>
                {canManage && (
                  <button
                    onClick={onCreateChannel}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Create Channel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Noob empty state */}
              {userRole === 'noob' && visibleChannels.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] px-2 py-2 leading-relaxed">
                  You don&apos;t have access to any channels yet. Ask an admin to promote your role.
                </p>
              )}

              {visibleChannels.map((channel, idx) => {
                const isActive    = channel.id === activeChannelId
                // For reorder, use the index within visible channels
                const allIdx = channels.findIndex((c) => c.id === channel.id)

                return (
                  <div key={channel.id} className="group/ch flex items-center gap-1">
                    <Link
                      href={`/channels/${channel.id}`}
                      onClick={onMobileClose}
                      className={`flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 min-h-[44px] md:min-h-0 rounded text-sm transition-colors
                        ${isActive
                          ? 'bg-white/10 text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                        }`}
                    >
                      <span className="text-base leading-none opacity-60 flex-shrink-0">#</span>
                      <span className="truncate">{channel.name}</span>
                    </Link>

                    {canManage && (
                      <div className="hidden group-hover/ch:flex items-center gap-0.5 pr-1 flex-shrink-0">
                        <button
                          disabled={allIdx === 0 || isPending}
                          onClick={() => handleMove(channel.id, 'up')}
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-default transition-colors"
                          title="Move up"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          disabled={allIdx === channels.length - 1 || isPending}
                          onClick={() => handleMove(channel.id, 'down')}
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-default transition-colors"
                          title="Move down"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(channel.id)}
                          disabled={isPending}
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                          title="Delete channel"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Members panel — visible to admin and moderator */}
            {(userRole === 'admin' || userRole === 'moderator') && (
              <MembersPanel
                groupId={group.id}
                currentUserId={profile.id}
                currentUserRole={userRole}
              />
            )}
          </>
        ) : (
          <p className="text-xs text-[var(--text-muted)] px-4 py-2">
            Select a group to see its channels.
          </p>
        )}
      </div>

      {/* User footer */}
      <div
        className="flex items-center gap-2 px-2 py-2 border-t border-black/20 flex-shrink-0"
        style={{ background: 'var(--bg-primary)' }}
      >
        <Link href="/settings/profile" className="flex items-center gap-2 flex-1 min-w-0 rounded hover:bg-white/5 transition-colors px-1 py-0.5 -mx-1">
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
          <button
            type="submit"
            title="Log out"
            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1 rounded hover:bg-white/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
