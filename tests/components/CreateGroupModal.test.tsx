import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreateGroupModal from '@/components/modals/CreateGroupModal'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/(app)/groups/actions', () => ({
  createGroup: vi.fn(),
  joinGroup: vi.fn(),
}))

import { createGroup, joinGroup } from '@/app/(app)/groups/actions'

const mockCreateGroup = createGroup as ReturnType<typeof vi.fn>
const mockJoinGroup = joinGroup as ReturnType<typeof vi.fn>

describe('CreateGroupModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateGroup.mockResolvedValue({ redirectTo: '/channels/new-channel' })
    mockJoinGroup.mockResolvedValue({ redirectTo: '/channels/joined-channel' })
  })

  it('renders nothing when closed', () => {
    render(<CreateGroupModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Create Group')).toBeNull()
  })

  it('shows "Create" tab by default', () => {
    render(<CreateGroupModal open={true} onClose={vi.fn()} />)
    expect(screen.getByTestId('tab-create')).toBeInTheDocument()
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument()
  })

  it('switches to Join tab when clicked', () => {
    render(<CreateGroupModal open={true} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('tab-join'))
    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument()
  })

  it('opens on Join tab when initialTab="join"', () => {
    render(<CreateGroupModal open={true} onClose={vi.fn()} initialTab="join" />)
    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument()
  })

  it('submits createGroup with group name', async () => {
    const onClose = vi.fn()
    render(<CreateGroupModal open={true} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'My Group' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockCreateGroup).toHaveBeenCalled())
  })

  it('shows server error from createGroup', async () => {
    mockCreateGroup.mockResolvedValue({ error: 'Name already taken' })
    render(<CreateGroupModal open={true} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Bad' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(screen.getByText('Name already taken')).toBeInTheDocument())
  })

  it('submits joinGroup with invite code', async () => {
    const onClose = vi.fn()
    render(<CreateGroupModal open={true} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('tab-join'))
    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: 'ABC123' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockJoinGroup).toHaveBeenCalled())
  })

  it('shows server error from joinGroup', async () => {
    mockJoinGroup.mockResolvedValue({ error: 'Invalid code' })
    render(<CreateGroupModal open={true} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('tab-join'))
    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: 'BAD' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(screen.getByText('Invalid code')).toBeInTheDocument())
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<CreateGroupModal open={true} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
