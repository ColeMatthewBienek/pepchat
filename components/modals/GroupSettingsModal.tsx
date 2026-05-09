'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import dynamic from 'next/dynamic'
import ModalShell from '@/components/ui/ModalShell'
import GroupIcon from '@/components/ui/GroupIcon'
import { leaveGroup, deleteGroup, uploadGroupIcon, removeGroupIcon, updateGroupDetails } from '@/app/(app)/groups/actions'
import type { Group } from '@/lib/types'

const AvatarCropModal = dynamic(() => import('@/components/profile/AvatarCropModal'), { ssr: false })

type NavItem = 'overview' | 'invite' | 'danger'

interface GroupSettingsModalProps {
  open: boolean
  onClose: () => void
  group: Group
  isOwner: boolean
  onIconChange?: () => void
}

export default function GroupSettingsModal({ open, onClose, group, isOwner, onIconChange }: GroupSettingsModalProps) {
  const [nav, setNav] = useState<NavItem>('overview')
  const [error, setError] = useState('')
  const [detailsNotice, setDetailsNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')

  // Icon upload state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [pendingIcon, setPendingIcon] = useState<{ dataUrl: string; ext: string } | null>(null)
  const [localIconUrl, setLocalIconUrl] = useState<string | null>(group.icon_url)
  const [iconError, setIconError] = useState('')
  const [iconSaving, setIconSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [inviteLink, setInviteLink] = useState(group.invite_code)
  useEffect(() => {
    setInviteLink(`${window.location.origin}/join/${group.invite_code}`)
  }, [group.invite_code])

  useEffect(() => {
    setName(group.name)
    setDescription(group.description ?? '')
  }, [group.name, group.description])

  // Sync localIconUrl if the prop updates (e.g. via Realtime)
  useEffect(() => {
    if (!pendingIcon) setLocalIconUrl(group.icon_url)
  }, [group.icon_url, pendingIcon])

  function handleIconFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIconError('')
    if (file.size > 4 * 1024 * 1024) { setIconError('Photo must be under 4MB.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setIconError('Please use JPEG, PNG, WebP, or GIF.'); return
    }
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleCropApply(dataUrl: string, ext: string) {
    setCropSrc(null)
    setPendingIcon({ dataUrl, ext })
    setLocalIconUrl(dataUrl)
  }

  function handleSaveIcon() {
    if (!pendingIcon) return
    setIconError('')
    setIconSaving(true)
    startTransition(async () => {
      const result = await uploadGroupIcon(group.id, pendingIcon)
      setIconSaving(false)
      if ('error' in result) {
        setIconError(result.error)
      } else {
        setPendingIcon(null)
        setLocalIconUrl(result.icon_url)
        onIconChange?.()
      }
    })
  }

  function handleRemoveIcon() {
    setIconError('')
    startTransition(async () => {
      const result = await removeGroupIcon(group.id)
      if ('error' in result) {
        setIconError(result.error)
      } else {
        setPendingIcon(null)
        setLocalIconUrl(null)
        onIconChange?.()
      }
    })
  }

  function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setDetailsNotice('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateGroupDetails(group.id, formData)
      if ('error' in result) {
        setError(result.error)
      } else {
        setDetailsNotice('Group details saved.')
        onIconChange?.()
      }
    })
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLeave() {
    setError('')
    startTransition(async () => {
      const result = await leaveGroup(group.id)
      if (result?.error) setError(result.error)
    })
  }

  function handleDelete() {
    setError('')
    startTransition(async () => {
      const result = await deleteGroup(group.id)
      if (result?.error) setError(result.error)
    })
  }

  const navItems: { id: NavItem; label: string; testId: string }[] = [
    { id: 'overview', label: 'Overview',   testId: 'nav-overview' },
    { id: 'invite',   label: 'Invite Link', testId: 'nav-invite' },
    { id: 'danger',   label: 'Danger Zone', testId: 'nav-danger' },
  ]

  return (
    <>
      <ModalShell open={open} onClose={onClose} title={group.name} size="lg">
        <div className="flex gap-0 -mx-6 -mt-4 min-h-[280px]">
          {/* Left nav */}
          <nav className="w-44 flex-shrink-0 border-r border-white/10 py-2 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                data-testid={item.testId}
                onClick={() => setNav(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  nav === item.id
                    ? 'bg-white/10 text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right content */}
          <div className="flex-1 px-6 py-4 overflow-y-auto">
            {error && (
              <p className="text-[var(--danger)] text-sm bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            {nav === 'overview' && (
              <div data-testid="overview-pane" className="flex flex-col gap-4">
                <form onSubmit={handleSaveDetails} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="group-name" className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                      Group Name
                    </label>
                    <input
                      id="group-name"
                      name="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      disabled={!isOwner || isPending}
                      maxLength={100}
                      className="w-full rounded-lg border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label htmlFor="group-description" className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                      Description
                    </label>
                    <textarea
                      id="group-description"
                      name="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      disabled={!isOwner || isPending}
                      maxLength={180}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none disabled:opacity-60"
                      placeholder="What is this group for?"
                    />
                    <p className="mt-1 text-[10px] text-[var(--text-faint)]">{description.length}/180</p>
                  </div>
                  {isOwner && (
                    <button
                      type="submit"
                      disabled={isPending}
                      className="self-start px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-60"
                    >
                      {isPending ? 'Saving...' : 'Save details'}
                    </button>
                  )}
                  {detailsNotice && <p className="text-xs text-[var(--success)]">{detailsNotice}</p>}
                </form>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
                    Group Photo
                  </p>
                  <div className="flex items-center gap-4">
                    <GroupIcon
                      group={{ ...group, icon_url: localIconUrl }}
                      size={72}
                    />
                    {isOwner && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-[var(--text-primary)] transition-colors"
                          >
                            Upload photo
                          </button>
                          {localIconUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveIcon}
                              disabled={isPending}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-60"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {pendingIcon && (
                          <button
                            type="button"
                            onClick={handleSaveIcon}
                            disabled={iconSaving}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-60"
                          >
                            {iconSaving ? 'Saving…' : 'Save changes'}
                          </button>
                        )}
                        <p className="text-[10px] text-[var(--text-faint)]">
                          JPEG, PNG, WebP, GIF · Max 4MB
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleIconFileSelect}
                  />
                  {iconError && (
                    <p className="text-xs text-[var(--danger)] mt-2">{iconError}</p>
                  )}
                </div>
              </div>
            )}

            {nav === 'invite' && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Invite Link
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-muted)] select-all"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors whitespace-nowrap"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Share this link so others can join with the code{' '}
                    <code className="font-mono bg-black/20 px-1 rounded">{group.invite_code}</code>
                  </p>
                </div>
              </div>
            )}

            {nav === 'danger' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                  Danger Zone
                </p>

                {!isOwner && (
                  <button
                    onClick={handleLeave}
                    disabled={isPending}
                    className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-60"
                  >
                    Leave Group
                  </button>
                )}

                {isOwner && !confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/10 transition-colors"
                  >
                    Delete Group
                  </button>
                )}

                {isOwner && confirmDelete && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-[var(--text-muted)]">
                      This will permanently delete <strong className="text-[var(--text-primary)]">{group.name}</strong> and all its channels and messages.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={isPending}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg text-[var(--text-muted)] border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-[var(--danger)] hover:bg-[var(--danger)]/80 text-white transition-colors disabled:opacity-60"
                      >
                        {isPending ? 'Deleting…' : 'Yes, Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ModalShell>

      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          shape="square"
          onApply={handleCropApply}
          onClose={() => setCropSrc(null)}
        />
      )}
    </>
  )
}
