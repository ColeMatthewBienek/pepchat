import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuditLogList from '@/components/admin/AuditLogList'
import type { AuditEntry } from '@/lib/types'

const ENTRIES: AuditEntry[] = [
  {
    id: 'a1',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'role_change',
    target_type: 'user',
    target_id: 'u2',
    metadata: { from_role: 'user', to_role: 'moderator', target_username: 'cool42' },
    created_at: '2026-04-19T10:32:00Z',
  },
  {
    id: 'a2',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'ban',
    target_type: 'user',
    target_id: 'u4',
    metadata: { reason: 'spam', target_username: 'banned_user' },
    created_at: '2026-04-19T09:00:00Z',
  },
  {
    id: 'a3',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'delete_message',
    target_type: 'message',
    target_id: 'msg-1',
    metadata: { channel_id: 'ch-1', message_preview: 'bad content' },
    created_at: '2026-04-18T15:00:00Z',
  },
  {
    id: 'a4',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'report_reviewed',
    target_type: 'report',
    target_id: 'r1',
    metadata: {
      report_id: 'r1',
      reporter_username: 'cool42',
      message_preview: 'reported message text',
    },
    created_at: '2026-04-18T14:00:00Z',
  },
  {
    id: 'a5',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'report_dismissed',
    target_type: 'report',
    target_id: 'r2',
    metadata: {
      report_id: 'r2',
      reporter_username: 'newbie',
      reason: 'not actionable',
    },
    created_at: '2026-04-18T13:00:00Z',
  },
  {
    id: 'a6',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'reset_password',
    target_type: 'user',
    target_id: 'u6',
    metadata: { target_username: 'locked_user' },
    created_at: '2026-04-18T12:00:00Z',
  },
]

const defaultProps = {
  entries: ENTRIES,
}

describe('AuditLogList — rendering', () => {
  it('renders an .audit-entry for each log entry', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(ENTRIES.length)
  })

  it('shows admin username in each entry', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getAllByText(/panicmonkey/i).length).toBeGreaterThan(0)
  })

  it('shows human-readable role change description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/role.*user.*moderator|user.*→.*moderator/i)).toBeTruthy()
  })

  it('shows human-readable ban description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/banned.*banned_user|banned_user.*banned/i)).toBeTruthy()
  })

  it('shows human-readable report reviewed description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/reviewed report r1 from @cool42: "reported message text"/i)).toBeTruthy()
  })

  it('shows human-readable report dismissed description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/dismissed report r2 from @newbie \(not actionable\)/i)).toBeTruthy()
  })

  it('shows human-readable password reset description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/sent a password reset email to locked_user/i)).toBeTruthy()
  })

  it('renders entries in reverse chronological order', () => {
    render(<AuditLogList {...defaultProps} />)
    const entries = document.querySelectorAll('.audit-entry')
    // First entry should be the most recent (a1)
    expect(entries[0].textContent).toContain('cool42')
  })

  it('shows empty state when no entries', () => {
    render(<AuditLogList entries={[]} />)
    expect(screen.getByText(/no audit entries/i)).toBeTruthy()
  })
})

describe('AuditLogList — filtering', () => {
  it('has a filter by action type select', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(document.querySelector('[data-testid="audit-filter-action"]')).toBeTruthy()
  })

  it('filters entries by action type', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'ban' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
  })

  it('filters entries by report review action type', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'report_reviewed' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/reviewed report r1/i)).toBeTruthy()
  })

  it('filters entries by password reset action type', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'reset_password' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/password reset email to locked_user/i)).toBeTruthy()
  })

  it('shows all entries when filter reset to "all"', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'ban' } })
    fireEvent.change(filter, { target: { value: 'all' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(ENTRIES.length)
  })
})

describe('AuditLogList — CSV export', () => {
  it('renders a CSV export button', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/export.*csv|csv.*export/i)).toBeTruthy()
  })

  it('CSV export button has data-testid="export-csv"', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(document.querySelector('[data-testid="export-csv"]')).toBeTruthy()
  })
})
