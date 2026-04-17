'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import GroupsSidebar from '@/components/sidebar/GroupsSidebar'
import ChannelsSidebar from '@/components/sidebar/ChannelsSidebar'
import CreateGroupModal from '@/components/modals/CreateGroupModal'
import JoinGroupModal from '@/components/modals/JoinGroupModal'
import GroupSettingsModal from '@/components/modals/GroupSettingsModal'
import CreateChannelModal from '@/components/modals/CreateChannelModal'
import { useGroups } from '@/lib/hooks/useGroups'
import { useChannels } from '@/lib/hooks/useChannels'
import { createClient } from '@/lib/supabase/client'
import { PERMISSIONS, type Role } from '@/lib/permissions'
import type { Profile } from '@/lib/types'

interface AppShellProps {
  profile: Profile
  children: React.ReactNode
}

export default function AppShell({ profile, children }: AppShellProps) {
  const { groups, loading: groupsLoading, refetch } = useGroups()
  const pathname = usePathname()

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<Role | null>(null)

  const [showCreate,     setShowCreate]     = useState(false)
  const [showJoin,       setShowJoin]       = useState(false)
  const [showSettings,   setShowSettings]   = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  // Resolve active group from URL
  useEffect(() => {
    const groupMatch = pathname.match(/^\/groups\/([^/]+)/)
    if (groupMatch) { setActiveGroupId(groupMatch[1]); return }

    const channelMatch = pathname.match(/^\/channels\/([^/]+)$/)
    if (channelMatch) {
      createClient()
        .from('channels').select('group_id').eq('id', channelMatch[1]).single()
        .then(({ data }) => { if (data) setActiveGroupId(data.group_id) })
    }
  }, [pathname])

  // Default to first group on load
  useEffect(() => {
    if (!groupsLoading && groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id)
    }
  }, [groupsLoading, groups, activeGroupId])

  // Fetch current user's role in the active group (filter by user_id to avoid multi-row error)
  useEffect(() => {
    if (!activeGroupId) { setUserRole(null); return }
    createClient()
      .from('group_members')
      .select('role')
      .eq('group_id', activeGroupId)
      .eq('user_id', profile.id)
      .single()
      .then(({ data }) => { setUserRole((data?.role as Role) ?? null) })
  }, [activeGroupId, profile.id])

  // Re-fetch role when group_members changes (e.g., admin promotes you live)
  useEffect(() => {
    if (!activeGroupId) return
    const supabase = createClient()
    const sub = supabase
      .channel(`my-role-${activeGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.new?.group_id === activeGroupId) {
            setUserRole(payload.new.role as Role)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [activeGroupId, profile.id])

  // Swipe gestures — open drawer from left edge, close from right edge
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    let startX = 0, startY = 0
    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 1.5) return
      if (dx > 0 && startX < 40) setMobileSidebarOpen(true)
      else if (dx < 0 && startX > window.innerWidth - 40) setMobileSidebarOpen(false)
    }
    main.addEventListener('touchstart', onTouchStart, { passive: true })
    main.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      main.removeEventListener('touchstart', onTouchStart)
      main.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const { channels } = useChannels(activeGroupId)
  const activeGroup  = groups.find((g) => g.id === activeGroupId) ?? null

  return (
    <>
      <div className="flex h-[100dvh] overflow-hidden">
        {/* Mobile sidebar overlay backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebars: always visible on md+; slide-in overlay on mobile */}
        <div
          className={`
            fixed inset-y-0 left-0 z-30 flex
            transform transition-transform duration-200
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0 md:z-auto md:flex
          `}
        >
          <GroupsSidebar
            groups={groups}
            currentUserId={profile.id}
            onCreateGroup={() => setShowCreate(true)}
            onJoinGroup={() => setShowJoin(true)}
          />

          <ChannelsSidebar
            group={activeGroup}
            channels={channels}
            profile={profile}
            userRole={userRole}
            onCreateChannel={() => setShowNewChannel(true)}
            onGroupSettings={() => setShowSettings(true)}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        </div>

        <main
          ref={mainRef}
          className="flex flex-col flex-1 min-w-0 overflow-y-auto"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          {/* Mobile header bar */}
          <div className="md:hidden flex items-center gap-2 px-2 h-[44px] border-b border-black/20 flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
            <button
              onClick={() => setMobileSidebarOpen(o => !o)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
              aria-label={mobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {mobileSidebarOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            {activeGroup && (
              <span className="text-sm font-semibold truncate">{activeGroup.name}</span>
            )}
          </div>
          {children}
        </main>
      </div>

      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={refetch} />
      <JoinGroupModal   open={showJoin}   onClose={() => setShowJoin(false)}   onSuccess={refetch} />

      {activeGroup && (
        <GroupSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          group={activeGroup}
          isOwner={PERMISSIONS.canManageGroup(userRole ?? 'noob')}
        />
      )}

      {activeGroupId && (
        <CreateChannelModal
          open={showNewChannel}
          onClose={() => setShowNewChannel(false)}
          groupId={activeGroupId}
        />
      )}
    </>
  )
}
