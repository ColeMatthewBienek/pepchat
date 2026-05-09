import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupSettingsModal from '@/components/modals/GroupSettingsModal'
import { GROUP } from '@/tests/fixtures'

vi.mock('@/app/(app)/groups/actions', () => ({
  leaveGroup: vi.fn(),
  deleteGroup: vi.fn(),
  updateGroupDetails: vi.fn(),
  regenerateGroupInvite: vi.fn(),
  listGroupInvites: vi.fn(),
  revokeGroupInvite: vi.fn(),
}))

import { leaveGroup, deleteGroup, updateGroupDetails, regenerateGroupInvite, listGroupInvites, revokeGroupInvite } from '@/app/(app)/groups/actions'

const mockLeave = leaveGroup as ReturnType<typeof vi.fn>
const mockDelete = deleteGroup as ReturnType<typeof vi.fn>
const mockUpdateDetails = updateGroupDetails as ReturnType<typeof vi.fn>
const mockRegenerateInvite = regenerateGroupInvite as ReturnType<typeof vi.fn>
const mockListInvites = listGroupInvites as ReturnType<typeof vi.fn>
const mockRevokeInvite = revokeGroupInvite as ReturnType<typeof vi.fn>

describe('GroupSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLeave.mockResolvedValue({ ok: true })
    mockDelete.mockResolvedValue({ ok: true })
    mockUpdateDetails.mockResolvedValue({ ok: true })
    mockRegenerateInvite.mockResolvedValue({ ok: true, invite_code: 'NEWCODE12345', invite: {} })
    mockListInvites.mockResolvedValue({
      ok: true,
      invites: [
        {
          id: 'invite-1',
          code: 'NEWCODE12345',
          created_at: '2026-05-09T12:00:00.000Z',
          expires_at: null,
          max_uses: 2,
          uses_count: 1,
          revoked_at: null,
          profiles: { username: 'admin' },
        },
      ],
      uses: [
        {
          id: 'use-1',
          used_at: '2026-05-09T12:05:00.000Z',
          group_invites: { code: 'NEWCODE12345' },
          profiles: { username: 'newbie' },
        },
      ],
    })
    mockRevokeInvite.mockResolvedValue({ ok: true })
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

  it('shows editable group details for owners', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    expect(screen.getByLabelText(/group name/i)).toHaveValue(GROUP.name)
    expect(screen.getByLabelText(/description/i)).toHaveValue(GROUP.description)
    expect(screen.getByRole('button', { name: /save details/i })).toBeInTheDocument()
  })

  it('submits updated group details', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'New Crew' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A sharper description' } })
    fireEvent.click(screen.getByRole('button', { name: /save details/i }))

    await waitFor(() => expect(mockUpdateDetails).toHaveBeenCalledWith(GROUP.id, expect.any(FormData)))
    const formData = mockUpdateDetails.mock.calls[0][1] as FormData
    expect(formData.get('name')).toBe('New Crew')
    expect(formData.get('description')).toBe('A sharper description')
  })

  it('shows invite code after navigating to Invite Link tab', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    fireEvent.click(screen.getByTestId('nav-invite'))
    expect(screen.getByText(/TESTCODE/)).toBeInTheDocument()
  })

  it('copies invite link when Copy button is clicked', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    fireEvent.click(screen.getByTestId('nav-invite'))
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
    expect(await screen.findByText(/copied/i)).toBeInTheDocument()
  })

  it('regenerates invite links for owners', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-invite'))
    fireEvent.change(screen.getByLabelText(/max uses/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /create new invite link/i }))

    await waitFor(() => expect(mockRegenerateInvite).toHaveBeenCalledWith(GROUP.id, expect.any(FormData)))
    expect((mockRegenerateInvite.mock.calls[0][1] as FormData).get('max_uses')).toBe('2')
    expect(screen.getByDisplayValue(/NEWCODE12345/)).toBeInTheDocument()
    expect(screen.getByText(/invite link regenerated/i)).toBeInTheDocument()
  })

  it('shows invite metadata and recent usage for owners', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-invite'))

    expect(await screen.findByText(/created by @admin/i)).toBeInTheDocument()
    expect(screen.getByText(/1\/2 uses/i)).toBeInTheDocument()
    expect(screen.getByText(/@newbie used NEWCODE12345/i)).toBeInTheDocument()
  })

  it('revokes managed invites', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    fireEvent.click(screen.getByTestId('nav-invite'))
    fireEvent.click(await screen.findByRole('button', { name: /revoke/i }))

    await waitFor(() => expect(mockRevokeInvite).toHaveBeenCalledWith('invite-1', GROUP.id))
    expect(screen.getByText(/invite revoked/i)).toBeInTheDocument()
  })

  it('hides invite regeneration for non-owners', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    fireEvent.click(screen.getByTestId('nav-invite'))
    expect(screen.queryByRole('button', { name: /create new invite link/i })).not.toBeInTheDocument()
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
