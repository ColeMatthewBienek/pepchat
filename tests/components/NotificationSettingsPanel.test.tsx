import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationSettingsPanel from '@/components/settings/NotificationSettingsPanel'
import type { NotificationStatus } from '@/lib/notifications'

const mockGetNotificationStatus = vi.fn<() => NotificationStatus>()
const mockRequestNotificationPermission = vi.fn<() => Promise<NotificationPermission | 'unsupported'>>()

vi.mock('@/lib/notifications', () => ({
  getNotificationStatus: () => mockGetNotificationStatus(),
  requestNotificationPermission: () => mockRequestNotificationPermission(),
}))

const AVAILABLE_STATUS: NotificationStatus = {
  supported: true,
  pushSupported: true,
  permission: 'default',
  requiresInstall: false,
  canRequest: true,
}

describe('NotificationSettingsPanel', () => {
  beforeEach(() => {
    mockGetNotificationStatus.mockReset()
    mockRequestNotificationPermission.mockReset()
    mockGetNotificationStatus.mockReturnValue(AVAILABLE_STATUS)
    mockRequestNotificationPermission.mockResolvedValue('granted')
  })

  it('shows available notification status and enables the request action', async () => {
    render(<NotificationSettingsPanel />)

    expect(await screen.findByTestId('notification-status')).toHaveTextContent('Notifications are available on this device.')
    expect(screen.getByRole('button', { name: 'Enable notifications' })).toBeEnabled()
  })

  it('shows unsupported browser status and disables the request action', async () => {
    mockGetNotificationStatus.mockReturnValue({
      supported: false,
      pushSupported: false,
      permission: 'unsupported',
      requiresInstall: false,
      canRequest: false,
    })

    render(<NotificationSettingsPanel />)

    expect(await screen.findByTestId('notification-status')).toHaveTextContent('Notifications are not supported in this browser.')
    expect(screen.getByRole('button', { name: 'Enable notifications' })).toBeDisabled()
  })

  it('shows install requirement status and disables the request action', async () => {
    mockGetNotificationStatus.mockReturnValue({
      supported: true,
      pushSupported: true,
      permission: 'default',
      requiresInstall: true,
      canRequest: false,
    })

    render(<NotificationSettingsPanel />)

    expect(await screen.findByTestId('notification-status')).toHaveTextContent('Install PepChat to your home screen before enabling notifications.')
    expect(screen.getByRole('button', { name: 'Enable notifications' })).toBeDisabled()
  })

  it('refreshes status after requesting permission', async () => {
    const user = userEvent.setup()
    mockGetNotificationStatus
      .mockReturnValueOnce(AVAILABLE_STATUS)
      .mockReturnValueOnce({
        supported: true,
        pushSupported: true,
        permission: 'granted',
        requiresInstall: false,
        canRequest: false,
      })

    render(<NotificationSettingsPanel />)
    await user.click(await screen.findByRole('button', { name: 'Enable notifications' }))

    await waitFor(() => expect(mockRequestNotificationPermission).toHaveBeenCalled())
    expect(screen.getByTestId('notification-status')).toHaveTextContent('Notifications are enabled on this device.')
    expect(screen.getByTestId('notification-delivery-note')).toHaveTextContent('Message delivery settings are coming next.')
  })

  it('surfaces request failures', async () => {
    const user = userEvent.setup()
    mockRequestNotificationPermission.mockRejectedValue(new Error('blocked'))

    render(<NotificationSettingsPanel />)
    await user.click(await screen.findByRole('button', { name: 'Enable notifications' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update notification permission.')
  })
})
