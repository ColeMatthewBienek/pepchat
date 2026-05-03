import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  {
    id: 'r3',
    message_id: 'msg-3',
    message_content: 'case closed message',
    reported_by: 'u4',
    reporter_username: 'modfan',
    reason: 'not actionable',
    status: 'dismissed',
    created_at: '2024-04-17T08:00:00Z',
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
    expect(screen.getByText('dismissed')).toBeTruthy()
  })
})

describe('ReportsTable — filtering', () => {
  it('shows status filter counts', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(screen.getByText('all (3)')).toBeTruthy()
    expect(screen.getByText('pending (1)')).toBeTruthy()
    expect(screen.getByText('reviewed (1)')).toBeTruthy()
    expect(screen.getByText('dismissed (1)')).toBeTruthy()
  })

  it('filters reports by status', () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getByTestId('report-filter-pending'))
    expect(document.querySelectorAll('.report-row')).toHaveLength(1)
    expect(screen.getByText('offensive content here')).toBeTruthy()
    expect(screen.queryByText('another bad message')).toBeNull()
  })

  it('searches by message content', () => {
    render(<ReportsTable {...defaultProps} />)
    const search = document.querySelector('.report-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'closed' } })
    expect(document.querySelectorAll('.report-row')).toHaveLength(1)
    expect(screen.getByText('case closed message')).toBeTruthy()
  })

  it('searches by reporter username and reason', () => {
    render(<ReportsTable {...defaultProps} />)
    const search = document.querySelector('.report-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'cool42' } })
    expect(screen.getByText('@cool42')).toBeTruthy()
    expect(document.querySelectorAll('.report-row')).toHaveLength(1)

    fireEvent.change(search, { target: { value: 'spam' } })
    expect(screen.getByText('spam')).toBeTruthy()
    expect(document.querySelectorAll('.report-row')).toHaveLength(1)
  })

  it('shows a filtered empty state when no reports match', () => {
    render(<ReportsTable {...defaultProps} />)
    const search = document.querySelector('.report-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'zzznomatch' } })
    expect(document.querySelectorAll('.report-row')).toHaveLength(0)
    expect(screen.getByText(/no reports match/i)).toBeTruthy()
  })
})

describe('ReportsTable — actions', () => {
  it('calls onMarkReviewed when Mark Reviewed clicked', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/mark reviewed/i)[0])
    await waitFor(() => expect(defaultProps.onMarkReviewed).toHaveBeenCalledWith('r1'))
  })

  it('calls onDismiss when Dismiss clicked', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/dismiss/i)[0])
    await waitFor(() => expect(defaultProps.onDismiss).toHaveBeenCalledWith('r1'))
  })

  it('calls onDeleteMessage when Delete Message clicked', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/delete message/i)[0])
    await waitFor(() => expect(defaultProps.onDeleteMessage).toHaveBeenCalledWith('msg-1'))
  })

  it('shows success feedback after marking a report reviewed', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/mark reviewed/i)[0])
    await waitFor(() => expect(screen.getByText('Report marked as reviewed.')).toBeInTheDocument())
  })

  it('shows success feedback after dismissing a report', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/dismiss/i)[0])
    await waitFor(() => expect(screen.getByText('Report dismissed.')).toBeInTheDocument())
  })

  it('shows success feedback after deleting a reported message', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getAllByTitle(/delete message/i)[0])
    await waitFor(() => expect(screen.getByText('Reported message deleted.')).toBeInTheDocument())
  })

  it('shows error feedback when an action fails', async () => {
    render(<ReportsTable {...defaultProps} onDismiss={vi.fn().mockRejectedValue(new Error('Dismiss failed'))} />)
    fireEvent.click(screen.getAllByTitle(/dismiss/i)[0])
    await waitFor(() => expect(screen.getByText('Dismiss failed')).toBeInTheDocument())
  })
})
