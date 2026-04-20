import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ReportsTable from '@/components/admin/ReportsTable'
import type { AdminReport } from '@/lib/types'

vi.mock('@/app/admin/actions', () => ({
  markReportReviewed: vi.fn().mockResolvedValue({ ok: true }),
  dismissReport: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/app/(app)/messages/actions', () => ({
  deleteMessage: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const REPORTS: AdminReport[] = [
  {
    id: 'r1',
    message_id: 'msg-1',
    message_content: 'offensive content here',
    reported_by: 'u2',
    reporter_username: 'cool42',
    reason: 'harassment',
    status: 'pending',
    created_at: '2024-04-19T10:00:00Z',
  },
  {
    id: 'r2',
    message_id: 'msg-2',
    message_content: 'another bad message',
    reported_by: 'u3',
    reporter_username: 'newbie',
    reason: 'spam',
    status: 'reviewed',
    created_at: '2024-04-18T09:00:00Z',
  },
]

const defaultProps = {
  reports: REPORTS,
  onMarkReviewed: vi.fn().mockResolvedValue(undefined),
  onDismiss: vi.fn().mockResolvedValue(undefined),
  onDeleteMessage: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => vi.clearAllMocks())

describe('ReportsTable — empty state', () => {
  it('shows empty state when no reports', () => {
    render(<ReportsTable {...defaultProps} reports={[]} />)
    expect(screen.getByText(/no reports yet/i)).toBeTruthy()
    expect(screen.getByText(/when users report messages/i)).toBeTruthy()
  })
})

describe('ReportsTable — rendering', () => {
  it('renders a row for each report', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(document.querySelectorAll('.report-row')).toHaveLength(REPORTS.length)
  })

  it('shows message content preview', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(screen.getByText('offensive content here')).toBeTruthy()
  })

  it('shows reporter username', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(screen.getByText('@cool42')).toBeTruthy()
  })

  it('shows status for each report', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(screen.getByText('pending')).toBeTruthy()
    expect(screen.getByText('reviewed')).toBeTruthy()
  })
})

describe('ReportsTable — actions', () => {
  it('calls onMarkReviewed when Mark Reviewed clicked', () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/mark reviewed/i)[0])
    expect(defaultProps.onMarkReviewed).toHaveBeenCalledWith('r1')
  })

  it('calls onDismiss when Dismiss clicked', () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/dismiss/i)[0])
    expect(defaultProps.onDismiss).toHaveBeenCalledWith('r1')
  })

  it('calls onDeleteMessage when Delete Message clicked', () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/delete message/i)[0])
    expect(defaultProps.onDeleteMessage).toHaveBeenCalledWith('msg-1')
  })
})
