import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GROUP } from '@/tests/fixtures'

vi.mock('@/app/(app)/groups/actions', () => ({
  leaveGroup: vi.fn(),
  deleteGroup: vi.fn(),
  updateGroupDetails: vi.fn(),
  uploadGroupIcon: vi.fn(),
  removeGroupIcon: vi.fn(),
}))

vi.mock('next/dynamic', () => ({
  default: (_: any, opts?: any) => {
    if (opts?.ssr === false) return () => null
    return () => null
  },
}))

import { uploadGroupIcon, removeGroupIcon } from '@/app/(app)/groups/actions'
import GroupSettingsModal from '@/components/modals/GroupSettingsModal'

const mockUpload = uploadGroupIcon as ReturnType<typeof vi.fn>
const mockRemove = removeGroupIcon as ReturnType<typeof vi.fn>

const GROUP_WITH_ICON = { ...GROUP, icon_url: 'https://example.com/icon.png' }

describe('GroupSettingsModal — Overview tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ ok: true, icon_url: 'https://example.com/icon-new.png' })
    mockRemove.mockResolvedValue({ ok: true })
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('has an Overview nav item', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    expect(screen.getByTestId('nav-overview')).toBeInTheDocument()
  })

  it('shows Overview pane by default', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    expect(screen.getByTestId('overview-pane')).toBeInTheDocument()
  })

  it('shows Upload photo button for owner', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument()
  })

  it('does not show Upload photo button for non-owner', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={false} />)
    expect(screen.queryByRole('button', { name: /upload photo/i })).toBeNull()
  })

  it('shows Remove button when group has icon_url', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP_WITH_ICON} isOwner={true} />)
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('hides Remove button when group has no icon_url', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    expect(screen.queryByRole('button', { name: /^remove$/i })).toBeNull()
  })

  it('file input accepts correct image types', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()
    expect(fileInput.accept).toContain('image/jpeg')
    expect(fileInput.accept).toContain('image/png')
  })

  it('shows error when file exceeds 4MB', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File(['x'.repeat(5 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    Object.defineProperty(bigFile, 'size', { value: 5 * 1024 * 1024 })
    fireEvent.change(fileInput, { target: { files: [bigFile] } })
    expect(screen.getByText(/under 4mb/i)).toBeInTheDocument()
  })

  it('shows error for unsupported file type', () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP} isOwner={true} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [badFile] } })
    expect(screen.getByText(/please use/i)).toBeInTheDocument()
  })

  it('calls removeGroupIcon when Remove is clicked', async () => {
    render(<GroupSettingsModal open={true} onClose={vi.fn()} group={GROUP_WITH_ICON} isOwner={true} />)
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(GROUP.id))
  })
})
