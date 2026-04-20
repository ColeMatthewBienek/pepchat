'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTransition } from 'react'
import dynamic from 'next/dynamic'
import Avatar from '@/components/ui/Avatar'
import MembersPanel from '@/components/sidebar/MembersPanel'
import { logout } from '@/app/(auth)/actions'
import { deleteChannel, moveChannel } from '@/app/(app)/channels/actions'
import { PERMISSIONS, type Role } from '@/lib/permissions'
import type { Channel, Group, Profile } from '@/lib/types'

const DMSection = dynamic(() => import('@/components/dm/DMSection'), { ssr: false })

interface ChannelsSidebarProps {
  group: Group | null
  channels: Channel[]
  profile: Profile
  userRole: Role | null
  unreadChannelIds?: Set<string>
  onCreateChannel?: () => void
  onGroupSettings?: () => void
  onMobileClose?: () => void
}

export default function ChannelsSidebar({
  group,
  channels,
  profile,
  userRole,
  unreadChannelIds = new Set(),
  onCreateChannel,
  onGroupSettings,
  onMobileClose,
}: ChannelsSidebarProps) {
  const params = useParams()
  const activeChannelId = params?.channelId as string | undefined
  const [isPending, startTransition] = useTransition()

  const canManage    = userRole ? PERMISSIONS.canManageChannels(userRole) : false
  const canManageGrp = userRole ? PERMISSIONS.canManageGroup(userRole) : false

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

  const displayName = profile.display_name ?? profile.username

  return (
    <div
      style={{
        width: 236,
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-soft)',
      }}
    >
      {/* Group header */}
      {group && (
        <div style={{
          height: 56,
          flexShrink: 0,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-soft)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              data-testid="group-header-name"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {group.name}
            </div>
            {group.description && (
              <div
                data-testid="group-header-desc"
                style={{
                  fontSize: 11,
                  color: 'var(--text-faint)',
                  marginTop: 1,
                  fontStyle: 'italic',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.description}
              </div>
            )}
          </div>
          {canManageGrp && (
            <button
              data-testid="group-settings-btn"
              onClick={onGroupSettings}
              title="Group settings"
              className="icon-btn"
              style={{ marginLeft: 8, flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Scrollable body: channel list + DM section */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 6px' }}>
        {group ? (
          <>
            {/* Section label */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 10px 6px',
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                Channels
              </span>
              {canManage && (
                <button
                  data-testid="create-channel-btn"
                  onClick={onCreateChannel}
                  className="icon-btn"
                  title="Create channel"
                  style={{ padding: 2 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </div>

            {userRole === 'noob' && visibleChannels.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 10px 8px', lineHeight: 1.5 }}>
                You don&apos;t have access to any channels yet. Ask an admin to promote your role.
              </p>
            )}

            {/* Channel rows */}
            {visibleChannels.map((channel, idx) => {
              const isActive  = channel.id === activeChannelId
              const isUnread  = !isActive && unreadChannelIds.has(channel.id)
              const allIdx    = channels.findIndex((c) => c.id === channel.id)

              return (
                <div
                  key={channel.id}
                  className="group/ch"
                  style={{ display: 'flex', alignItems: 'center', margin: '1px 0' }}
                >
                  <Link
                    href={`/channels/${channel.id}`}
                    onClick={onMobileClose}
                    className={`channel-row${isUnread ? ' font-medium' : ''}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '6px 10px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: isActive ? 'var(--channel-active-bg)' : 'transparent',
                      textDecoration: 'none',
                      color: isActive || isUnread ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'background 120ms ease',
                      touchAction: 'manipulation',
                    }}
                  >
                    {/* Dot indicator */}
                    {isUnread ? (
                      <span
                        data-testid={`unread-dot-${channel.id}`}
                        style={{
                          width: 6, height: 6,
                          borderRadius: '50%',
                          background: 'var(--text-primary)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span style={{ width: 6, height: 6, flexShrink: 0 }} />
                    )}

                    {/* Channel name */}
                    <span style={{
                      fontSize: 14,
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ opacity: 0.5 }}>#</span>{channel.name}
                    </span>
                  </Link>

                  {/* Admin move/delete controls */}
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

            {/* Members panel (admin / moderator only) */}
            {(userRole === 'admin' || userRole === 'moderator') && (
              <MembersPanel
                groupId={group.id}
                currentUserId={profile.id}
                currentUserRole={userRole}
              />
            )}
          </>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 10px' }}>
            Select a group to see its channels.
          </p>
        )}

        {/* DM section — always visible below channel list */}
        <DMSection currentUserId={profile.id} />
      </div>

      {/* User footer */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderTop: '1px solid var(--border-soft)',
          background: 'var(--bg-deepest)',
        }}
      >
        <Link
          href="/settings/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <Avatar user={profile} size={34} showStatus status="online" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              data-testid="user-footer-name"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>
            <div
              data-testid="user-footer-status"
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6aa08a', flexShrink: 0 }} />
              online
            </div>
          </div>
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {userRole === 'admin' && (
            <a
              href="/admin"
              style={{
                fontSize: 11,
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Admin
            </a>
          )}
          <form action={logout}>
            <button
              type="submit"
              title="Log out"
              className="icon-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
