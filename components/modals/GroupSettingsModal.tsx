'use client'

import { useState, useEffect, useTransition } from 'react'
import ModalShell from '@/components/ui/ModalShell'
import { leaveGroup, deleteGroup } from '@/app/(app)/groups/actions'
import type { Group } from '@/lib/types'

type NavItem = 'invite' | 'danger'

interface GroupSettingsModalProps {
  open: boolean
  onClose: () => void
  group: Group
  isOwner: boolean
}

export default function GroupSettingsModal({ open, onClose, group, isOwner }: GroupSettingsModalProps) {
  const [nav, setNav] = useState<NavItem>('invite')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [inviteLink, setInviteLink] = useState(group.invite_code)
  useEffect(() => {
    setInviteLink(`${window.location.origin}/join/${group.invite_code}`)
  }, [group.invite_code])

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
    { id: 'invite', label: 'Invite Link', testId: 'nav-invite' },
    { id: 'danger', label: 'Danger Zone', testId: 'nav-danger' },
  ]

  return (
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
  )
}
