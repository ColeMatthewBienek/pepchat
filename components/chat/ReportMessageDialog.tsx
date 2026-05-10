'use client'

import { useEffect, useState } from 'react'
import ModalShell from '@/components/ui/ModalShell'
import type { MessageWithProfile } from '@/lib/types'

const REASONS = [
  'Spam',
  'Harassment',
  'Hate or abuse',
  'Explicit content',
  'Other',
]

interface ReportMessageDialogProps {
  open: boolean
  message: MessageWithProfile | null
  pending?: boolean
  onClose: () => void
  onSubmit: (category: string, details: string) => void
}

export default function ReportMessageDialog({
  open,
  message,
  pending = false,
  onClose,
  onSubmit,
}: ReportMessageDialogProps) {
  const [category, setCategory] = useState('')
  const [details, setDetails] = useState('')

  useEffect(() => {
    if (open) {
      setCategory('')
      setDetails('')
    }
  }, [open, message?.id])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmedCategory = category.trim()
    const trimmedDetails = details.trim()
    if ((!trimmedCategory && !trimmedDetails) || pending) return
    onSubmit(trimmedCategory || 'Other', trimmedDetails || trimmedCategory)
  }

  const author = message?.profiles?.display_name ?? message?.profiles?.username ?? 'Unknown'

  return (
    <ModalShell open={open} onClose={onClose} title="Report Message">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {message && (
          <div
            data-testid="report-message-preview"
            className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-primary)] px-3 py-2"
          >
            <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">
              @{author}
            </div>
            <p className="text-sm text-[var(--text-primary)] line-clamp-3 m-0">
              {message.content}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Reason
          </label>
          <div className="flex flex-wrap gap-2">
            {REASONS.map(option => (
              <button
                key={option}
                type="button"
                data-testid={`report-reason-${option.toLowerCase().replaceAll(' ', '-')}`}
                aria-pressed={category === option}
                onClick={() => setCategory(option)}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: category === option ? 'var(--accent)' : 'var(--border-soft)',
                  background: category === option ? 'var(--accent-soft)' : 'var(--bg-tertiary)',
                  color: category === option ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="report-details" className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Details
          </label>
          <textarea
            id="report-details"
            data-testid="report-reason-input"
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={4}
            placeholder="Describe what is wrong with this message."
            className="w-full resize-none rounded-md border border-[var(--border-soft)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            data-testid="report-cancel"
            onClick={onClose}
            className="rounded-md border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="report-submit"
            disabled={(!category.trim() && !details.trim()) || pending}
            className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
