'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { joinGroup } from '@/app/(app)/groups/actions'

interface JoinGroupModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

/**
 * Modal for joining an existing group via invite code.
 */
export default function JoinGroupModal({ open, onClose, onSuccess }: JoinGroupModalProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await joinGroup(formData)
      if ('error' in result) {
        setError(result.error)
      } else {
        onClose()
        onSuccess?.()
        router.push(result.redirectTo)
      }
    })
  }

  function handleClose() {
    if (isPending) return
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Join a Group">
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Enter an invite code to join an existing group.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="jg-code"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Invite Code
          </label>
          <input
            id="jg-code"
            name="invite_code"
            type="text"
            required
            autoComplete="off"
            spellCheck={false}
            className="bg-[var(--bg-primary)] border border-black/20 rounded px-3 py-2 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="abc12345"
          />
        </div>

        {error && (
          <p className="text-[var(--danger)] text-sm bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Joining…' : 'Join Group'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
