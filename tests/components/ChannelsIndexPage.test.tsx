import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChannelsIndexPage from '@/app/(app)/channels/page'

const mockOpen = vi.fn()

vi.mock('@/lib/context/MobileSidebarContext', () => ({
  useMobileSidebar: () => ({ open: mockOpen }),
}))

describe('ChannelsIndexPage', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  it('labels the mobile channel navigation controls', () => {
    render(<ChannelsIndexPage />)

    expect(screen.getAllByRole('button', { name: 'Open channel navigation' })).toHaveLength(2)
  })

  it('opens mobile channel navigation from the icon button', async () => {
    const user = userEvent.setup()
    render(<ChannelsIndexPage />)

    await user.click(screen.getAllByRole('button', { name: 'Open channel navigation' })[0])

    expect(mockOpen).toHaveBeenCalledTimes(1)
  })

  it('opens mobile channel navigation from the call-to-action button', async () => {
    const user = userEvent.setup()
    render(<ChannelsIndexPage />)

    await user.click(screen.getAllByRole('button', { name: 'Open channel navigation' })[1])

    expect(mockOpen).toHaveBeenCalledTimes(1)
  })
})
