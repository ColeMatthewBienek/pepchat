'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/app/(app)/profile/actions'
import type { Profile } from '@/lib/types'

interface ProfileCardProps {
  userId: string
  currentUserId: string
  anchorEl: HTMLElement
  onClose: () => void
}

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'long', year: 'numeric' })
}

function CardBody({
  profile,
  loading,
  onClose,
  onSendMessage,
  openingDM,
}: {
  profile: Profile | null
  loading: boolean
  onClose: () => void
  onSendMessage: () => void
  openingDM: boolean
}) {
  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-3">
        <div className="h-16 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-3 w-2/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-3 w-1/2 rounded" style={{ background: 'var(--bg-tertiary)' }} />
      </div>
    )
  }
  if (!profile) {
    return <div className="p-6 text-sm text-[var(--text-muted)] text-center">Profile not found</div>
  }
  return (
    <>
      {/* Banner */}
      <div className="relative" style={{ background: profile.banner_color, height: 72 }}>
        <div className="absolute left-4" style={{ bottom: -36 }}>
          <Avatar src={profile.avatar_url} username={profile.display_name ?? profile.username} size={72}
            className="ring-4 ring-[var(--bg-secondary)] rounded-full" />
        </div>
      </div>

      {/* Body */}
      <div className="pt-12 px-4 pb-4 space-y-3">
        <div>
          <p className="font-bold text-base leading-tight" style={{ color: profile.username_color }}>
            {profile.display_name ?? profile.username}
          </p>
          {profile.display_name && (
            <p className="text-xs text-[var(--text-muted)]">@{profile.username}</p>
          )}
          {(profile.pronouns || profile.badge) && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {[profile.pronouns, profile.badge].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="h-px bg-white/10" />

        {profile.bio && (
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
            {profile.bio}
          </p>
        )}

        <div className="space-y-1 text-xs text-[var(--text-muted)]">
          {profile.location && <p>📍 {profile.location}</p>}
          {profile.website && (
            <p>
              🔗{' '}
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
                onClick={e => e.stopPropagation()}>
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
          <p>Member since {formatMemberSince(profile.member_since)}</p>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center gap-2">
          <button
            className="flex-1 py-1.5 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50"
            onClick={onSendMessage}
            disabled={openingDM}
          >
            {openingDM ? 'Opening…' : 'Send Message'}
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] border border-white/10 hover:bg-white/5 transition-colors"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  )
}

export default function ProfileCard({ userId, currentUserId, anchorEl, onClose }: ProfileCardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [openingDM, setOpeningDM] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isOwn = userId === currentUserId

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  async function handleSendMessage() {
    setOpeningDM(true)
    try {
      const supabase = createClient()
      const { data: convId, error } = await supabase.rpc('get_or_create_dm', { other_user_id: userId })
      if (error || !convId) { setOpeningDM(false); return }
      onClose()
      router.push(`/dm/${convId}`)
    } catch {
      setOpeningDM(false)
    }
  }

  useEffect(() => {
    if (isOwn) { onClose(); router.push('/settings/profile'); return }
    getProfile(userId).then(p => { setProfile(p); setLoading(false) })
  }, [userId, isOwn, onClose, router])

  // Position card near anchor on desktop only
  useEffect(() => {
    if (isMobile) return
    const card = cardRef.current
    if (!card) return
    const rect = anchorEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = rect.right + 8
    let top = rect.top
    if (left + 300 > vw) left = rect.left - 308
    if (top + 420 > vh) top = vh - 428
    card.style.left = `${Math.max(8, left)}px`
    card.style.top = `${Math.max(8, top)}px`
  }, [anchorEl, loading, isMobile])

  // Close on outside click / Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onPointer(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [onClose])

  if (isOwn) return null

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
        <div
          ref={cardRef}
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-white/10 shadow-2xl overflow-y-auto"
          style={{ background: 'var(--bg-secondary)', maxHeight: '85vh' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <CardBody profile={profile} loading={loading} onClose={onClose} onSendMessage={handleSendMessage} openingDM={openingDM} />
        </div>
      </>
    )
  }

  return (
    <div
      ref={cardRef}
      className="fixed z-50 w-[300px] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <CardBody profile={profile} loading={loading} onClose={onClose} onSendMessage={handleSendMessage} openingDM={openingDM} />
    </div>
  )
}
