'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { leaveGroup, deleteGroup } from '@/app/(app)/groups/actions'
import type { Group } from '@/lib/types'

interface GroupSettingsModalProps {
  open: boolean
  onClose: () => void
  group: Group
  isOwner: boolean
}

/**
 * Group settings modal — shows invite link, leave, and (for owners) delete.
 */
export default function GroupSettingsModal({
  open,
  onClose,
  group,
  isOwner,
}: GroupSettingsModalProps) {
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${group.invite_code}`
      : group.invite_code

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

  return (
    <Modal open={open} onClose={onClose} title={group.name}>
      <div className="flex flex-col gap-5">
        {/* Invite link */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Invite Link
          </span>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 bg-[var(--bg-primary)] border border-black/20 rounded px-3 py-2 text-xs font-mono text-[var(--text-muted)] select-all"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Share this link so others can join with the code{' '}
            <code className="font-mono bg-black/20 px-1 rounded">{group.invite_code}</code>
          </p>
        </div>

        {error && (
          <p className="text-[var(--danger)] text-sm bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <hr className="border-white/10" />

        {/* Leave */}
        {!isOwner && (
          <button
            onClick={handleLeave}
            disabled={isPending}
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-60"
          >
            Leave Group
          </button>
        )}

        {/* Delete (owner only) */}
        {isOwner && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
          >
            Delete Group
          </button>
        )}

        {isOwner && confirmDelete && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--text-muted)]">
              This will permanently delete <strong>{group.name}</strong> and all its channels and messages.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="flex-1 px-3 py-2 text-sm font-semibold rounded text-[var(--text-muted)] hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-3 py-2 text-sm font-semibold rounded bg-[var(--danger)] hover:bg-[var(--danger)]/80 text-white transition-colors disabled:opacity-60"
              >
                {isPending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
