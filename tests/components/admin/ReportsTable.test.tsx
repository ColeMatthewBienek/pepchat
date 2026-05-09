import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReportsTable from '@/components/admin/ReportsTable'
import type { AdminReport } from '@/lib/types'

vi.mock('@/app/admin/actions', () => ({
  markReportReviewed: vi.fn().mockResolvedValue({ ok: true }),
  dismissReport: vi.fn().mockResolvedValue({ ok: true }),
  deleteReportedMessage: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const REPORTS: AdminReport[] = [
  {
    id: 'r1',
    message_id: 'msg-1',
    message_content: 'offensive content here',
    message_author_id: 'u5',
    message_author_username: 'loud_user',
    channel_id: 'ch-1',
    channel_name: 'general',
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
    message_author_id: 'u6',
    message_author_username: 'spammer',
    channel_id: 'ch-2',
    channel_name: 'random',
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
    message_author_id: null,
    message_author_username: null,
    channel_id: null,
    channel_name: null,
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

  it('shows reported message author and channel context', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(screen.getByText('@loud_user')).toBeInTheDocument()
    expect(screen.getByText('#general')).toBeInTheDocument()
    expect(screen.getByText('Unknown author')).toBeInTheDocument()
    expect(screen.getByText('Unknown channel')).toBeInTheDocument()
  })

  it('shows status for each report', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(screen.getByText('Needs review')).toBeTruthy()
    expect(screen.getByText('Reviewed')).toBeTruthy()
    expect(screen.getByText('Dismissed')).toBeTruthy()
  })

  it('shows report queue lifecycle summary', () => {
    render(<ReportsTable {...defaultProps} />)
    expect(screen.getByTestId('report-queue-summary')).toHaveTextContent('1 active report')
    expect(screen.getByTestId('report-queue-summary')).toHaveTextContent('2 closed')
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

  it('marks the active status filter as pressed', () => {
    render(<ReportsTable {...defaultProps} />)

    expect(screen.getByTestId('report-filter-all')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('report-filter-pending')).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByTestId('report-filter-pending'))

    expect(screen.getByTestId('report-filter-all')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('report-filter-pending')).toHaveAttribute('aria-pressed', 'true')
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

  it('searches by reported message author and channel', () => {
    render(<ReportsTable {...defaultProps} />)
    const search = document.querySelector('.report-search') as HTMLInputElement

    fireEvent.change(search, { target: { value: 'loud_user' } })
    expect(document.querySelectorAll('.report-row')).toHaveLength(1)
    expect(screen.getByText('@loud_user')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'random' } })
    expect(document.querySelectorAll('.report-row')).toHaveLength(1)
    expect(screen.getByText('#random')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Mark report r1 from cool42 reviewed' }))
    await waitFor(() => expect(defaultProps.onMarkReviewed).toHaveBeenCalledWith('r1'))
  })

  it('calls onDismiss when Dismiss clicked', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss report r1 from cool42' }))
    await waitFor(() => expect(defaultProps.onDismiss).toHaveBeenCalledWith('r1'))
  })

  it('calls onDeleteMessage when Delete Message clicked', async () => {
    render(<ReportsTable {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete message for report r1 from cool42' }))
    await waitFor(() => expect(defaultProps.onDeleteMessage).toHaveBeenCalledWith('msg-1'))
  })

  it('shows actions only for pending reports', () => {
    render(<ReportsTable {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Mark report r1 from cool42 reviewed' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark report r2 from newbie reviewed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dismiss report r3 from modfan' })).not.toBeInTheDocument()
    expect(screen.getByTestId('report-actions-closed-r2')).toHaveTextContent('Closed')
    expect(screen.getByTestId('report-actions-closed-r3')).toHaveTextContent('Closed')
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
    await waitFor(() => expect(screen.getByText('Reported message deleted and report marked reviewed.')).toBeInTheDocument())
  })

  it('uses admin deleteReportedMessage when no test handler is provided', async () => {
    const { deleteReportedMessage } = await import('@/app/admin/actions')

    render(<ReportsTable reports={REPORTS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete message for report r1 from cool42' }))

    await waitFor(() => expect(deleteReportedMessage).toHaveBeenCalledWith('r1'))
  })

  it('shows error feedback when an action fails', async () => {
    render(<ReportsTable {...defaultProps} onDismiss={vi.fn().mockRejectedValue(new Error('Dismiss failed'))} />)
    fireEvent.click(screen.getAllByTitle(/dismiss/i)[0])
    await waitFor(() => expect(screen.getByText('Dismiss failed')).toBeInTheDocument())
  })
})
