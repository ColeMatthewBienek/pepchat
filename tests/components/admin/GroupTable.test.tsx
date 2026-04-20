import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GroupTable from '@/components/admin/GroupTable'
import type { AdminGroup } from '@/lib/types'

vi.mock('@/app/admin/actions', () => ({
  deleteGroup: vi.fn().mockResolvedValue({ ok: true }),
  transferOwnership: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const GROUPS: AdminGroup[] = [
  {
    id: 'g1',
    name: 'PepChat HQ',
    icon_url: null,
    owner_id: 'u1',
    owner_username: 'panicmonkey',
    member_count: 12,
    channel_count: 5,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'g2',
    name: 'Dev Corner',
    icon_url: null,
    owner_id: 'u2',
    owner_username: 'cool42',
    member_count: 3,
    channel_count: 2,
    created_at: '2024-02-20T00:00:00Z',
  },
]

const defaultProps = {
  groups: GROUPS,
  onDelete: vi.fn().mockResolvedValue(undefined),
  onTransferOwnership: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => vi.clearAllMocks())

describe('GroupTable — rendering', () => {
  it('renders a row for each group', () => {
    render(<GroupTable {...defaultProps} />)
    expect(document.querySelectorAll('.group-row')).toHaveLength(GROUPS.length)
  })

  it('shows group name', () => {
    render(<GroupTable {...defaultProps} />)
    expect(screen.getByText('PepChat HQ')).toBeTruthy()
    expect(screen.getByText('Dev Corner')).toBeTruthy()
  })

  it('shows owner username', () => {
    render(<GroupTable {...defaultProps} />)
    expect(screen.getByText('@panicmonkey')).toBeTruthy()
    expect(screen.getByText('@cool42')).toBeTruthy()
  })

  it('shows member count', () => {
    render(<GroupTable {...defaultProps} />)
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('shows channel count', () => {
    render(<GroupTable {...defaultProps} />)
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('shows empty state when no groups', () => {
    render(<GroupTable {...defaultProps} groups={[]} />)
    expect(screen.getByText(/no groups/i)).toBeTruthy()
  })
})

describe('GroupTable — delete flow', () => {
  it('shows a confirmation before deleting', () => {
    render(<GroupTable {...defaultProps} />)
    const deleteBtn = screen.getAllByTitle(/delete group/i)[0]
    fireEvent.click(deleteBtn)
    expect(screen.getByText(/are you sure/i)).toBeTruthy()
    expect(defaultProps.onDelete).not.toHaveBeenCalled()
  })

  it('calls onDelete when confirmed', async () => {
    render(<GroupTable {...defaultProps} />)
    const deleteBtn = screen.getAllByTitle(/delete group/i)[0]
    fireEvent.click(deleteBtn)
    fireEvent.click(screen.getByTestId('confirm-delete-group'))
    expect(defaultProps.onDelete).toHaveBeenCalledWith('g1')
  })

  it('cancels deletion without calling onDelete', () => {
    render(<GroupTable {...defaultProps} />)
    const deleteBtn = screen.getAllByTitle(/delete group/i)[0]
    fireEvent.click(deleteBtn)
    fireEvent.click(screen.getByTestId('cancel-delete-group'))
    expect(defaultProps.onDelete).not.toHaveBeenCalled()
  })
})
