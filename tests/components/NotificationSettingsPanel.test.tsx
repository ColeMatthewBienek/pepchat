import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationSettingsPanel from '@/components/settings/NotificationSettingsPanel'
import type { NotificationStatus } from '@/lib/notifications'
import type { NotificationPreferences } from '@/lib/types'

const mockGetNotificationStatus = vi.fn<() => NotificationStatus>()
const mockRequestNotificationPermission = vi.fn<() => Promise<NotificationPermission | 'unsupported'>>()
const mockGetNotificationPreferences = vi.fn()
const mockUpdateNotificationPreferences = vi.fn()

vi.mock('@/lib/notifications', () => ({
  getNotificationStatus: () => mockGetNotificationStatus(),
  requestNotificationPermission: () => mockRequestNotificationPermission(),
}))

vi.mock('@/app/(app)/notifications/actions', () => ({
  getNotificationPreferences: () => mockGetNotificationPreferences(),
  updateNotificationPreferences: (update: unknown) => mockUpdateNotificationPreferences(update),
}))

const AVAILABLE_STATUS: NotificationStatus = {
  supported: true,
  pushSupported: true,
  permission: 'default',
  requiresInstall: false,
  canRequest: true,
}

const ENABLED_STATUS: NotificationStatus = {
  supported: true,
  pushSupported: true,
  permission: 'granted',
  requiresInstall: false,
  canRequest: false,
}

const PREFERENCES: NotificationPreferences = {
  user_id: 'user-1',
  dm_messages: true,
  mentions: true,
  group_messages: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('NotificationSettingsPanel', () => {
  beforeEach(() => {
    mockGetNotificationStatus.mockReset()
    mockRequestNotificationPermission.mockReset()
    mockGetNotificationPreferences.mockReset()
    mockUpdateNotificationPreferences.mockReset()
    mockGetNotificationStatus.mockReturnValue(AVAILABLE_STATUS)
    mockRequestNotificationPermission.mockResolvedValue('granted')
    mockGetNotificationPreferences.mockResolvedValue({ ok: true, preferences: PREFERENCES })
    mockUpdateNotificationPreferences.mockResolvedValue({ ok: true, preferences: PREFERENCES })
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
      .mockReturnValueOnce(ENABLED_STATUS)

    render(<NotificationSettingsPanel />)
    await user.click(await screen.findByRole('button', { name: 'Enable notifications' }))

    await waitFor(() => expect(mockRequestNotificationPermission).toHaveBeenCalled())
    expect(screen.getByTestId('notification-status')).toHaveTextContent('Notifications are enabled on this device.')
    expect(await screen.findByRole('checkbox', { name: /direct messages/i })).toBeChecked()
  })

  it('surfaces request failures', async () => {
    const user = userEvent.setup()
    mockRequestNotificationPermission.mockRejectedValue(new Error('blocked'))

    render(<NotificationSettingsPanel />)
    await user.click(await screen.findByRole('button', { name: 'Enable notifications' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update notification permission.')
  })

  it('loads notification delivery preferences when permission is granted', async () => {
    mockGetNotificationStatus.mockReturnValue(ENABLED_STATUS)

    render(<NotificationSettingsPanel />)

    expect(await screen.findByRole('checkbox', { name: /direct messages/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /mentions/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /group messages/i })).not.toBeChecked()
  })

  it('updates notification delivery preferences', async () => {
    const user = userEvent.setup()
    mockGetNotificationStatus.mockReturnValue(ENABLED_STATUS)
    mockUpdateNotificationPreferences.mockResolvedValue({
      ok: true,
      preferences: { ...PREFERENCES, group_messages: true },
    })

    render(<NotificationSettingsPanel />)
    await user.click(await screen.findByRole('checkbox', { name: /group messages/i }))

    await waitFor(() => expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({ group_messages: true }))
    expect(screen.getByRole('checkbox', { name: /group messages/i })).toBeChecked()
  })

  it('surfaces preference load failures', async () => {
    mockGetNotificationStatus.mockReturnValue(ENABLED_STATUS)
    mockGetNotificationPreferences.mockResolvedValue({ error: 'Load failed' })

    render(<NotificationSettingsPanel />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Load failed')
  })

  it('surfaces preference update failures', async () => {
    const user = userEvent.setup()
    mockGetNotificationStatus.mockReturnValue(ENABLED_STATUS)
    mockUpdateNotificationPreferences.mockResolvedValue({ error: 'Save failed' })

    render(<NotificationSettingsPanel />)
    await user.click(await screen.findByRole('checkbox', { name: /mentions/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed')
  })
})
