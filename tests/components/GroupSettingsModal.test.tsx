import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupSettingsModal from '@/components/modals/GroupSettingsModal'
import { GROUP } from '@/tests/fixtures'

vi.mock('@/app/(app)/groups/actions', () => ({
  leaveGroup: vi.fn(),
  deleteGroup: vi.fn(),
}))

import { leaveGroup, deleteGroup } from '@/app/(app)/groups/actions'

const mockLeave = leaveGroup as ReturnType<typeof vi.fn>
const mockDelete = deleteGroup as ReturnType<typeof vi.fn>

describe('GroupSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLeave.mockResolvedValue({ ok: true })
    mockDelete.mockResolvedValue({ ok: true })
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('renders nothing when closed', () => {
    render(<GroupSettingsModal open={false} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    expect(screen.queryByText(GROUP.name)).toBeNull()
  })

  it('renders group name as modal title', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    expect(screen.getByText(GROUP.name)).toBeInTheDocument()
  })

  it('shows Invite Link nav item and invite code by default', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    expect(screen.getByText(/TESTCODE/)).toBeInTheDocument()
  })

  it('copies invite link when Copy button is clicked', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
    expect(await screen.findByText(/copied/i)).toBeInTheDocument()
  })

  it('shows Leave Group option for non-owners', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    fireEvent.click(screen.getByTestId('nav-danger'))
    expect(screen.getByRole('button', { name: /leave group/i })).toBeInTheDocument()
  })

  it('does not show Leave Group for owners', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-danger'))
    expect(screen.queryByRole('button', { name: /leave group/i })).toBeNull()
  })

  it('shows Delete Group for owners', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-danger'))
    expect(screen.getByRole('button', { name: /delete group/i })).toBeInTheDocument()
  })

  it('shows confirmation UI before deleting', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-danger'))
    fireEvent.click(screen.getByRole('button', { name: /delete group/i }))
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('cancels delete and returns to delete button', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-danger'))
    fireEvent.click(screen.getByRole('button', { name: /delete group/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /delete group/i })).toBeInTheDocument()
  })

  it('calls deleteGroup when Yes Delete is confirmed', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-danger'))
    fireEvent.click(screen.getByRole('button', { name: /delete group/i }))
    fireEvent.click(screen.getByRole('button', { name: /yes, delete/i }))
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(GROUP.id))
  })
})
