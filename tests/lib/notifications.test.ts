import { describe, it, expect, beforeEach, vi } from 'vitest'

function setUserAgent(value: string) {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value,
  })
}

function setInstalled(installed: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: installed }),
  })
  Object.defineProperty(window.navigator, 'standalone', {
    writable: true,
    configurable: true,
    value: false,
  })
}

function setNotification(permission: NotificationPermission = 'default') {
  Object.defineProperty(window, 'Notification', {
    writable: true,
    configurable: true,
    value: {
      permission,
      requestPermission: vi.fn().mockResolvedValue(permission),
    },
  })
}

function setPushSupport(supported: boolean) {
  if (supported) {
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {},
    })
    Object.defineProperty(window, 'PushManager', {
      writable: true,
      configurable: true,
      value: vi.fn(),
    })
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker')
    Reflect.deleteProperty(window, 'PushManager')
  }
}

describe('notifications helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    Reflect.deleteProperty(window, 'Notification')
    Reflect.deleteProperty(window, 'PushManager')
    Reflect.deleteProperty(navigator, 'serviceWorker')
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120')
    setInstalled(false)
  })

  it('reports unsupported when Notification is unavailable', async () => {
    const { getNotificationStatus } = await import('@/lib/notifications')

    expect(getNotificationStatus()).toEqual({
      supported: false,
      pushSupported: false,
      permission: 'unsupported',
      requiresInstall: false,
      canRequest: false,
    })
  })

  it('reports requestable status when notifications and push are supported', async () => {
    setNotification('default')
    setPushSupport(true)
    const { getNotificationStatus } = await import('@/lib/notifications')

    expect(getNotificationStatus()).toEqual({
      supported: true,
      pushSupported: true,
      permission: 'default',
      requiresInstall: false,
      canRequest: true,
    })
  })

  it('requires install for iOS browsers before requesting permission', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    setNotification('default')
    setPushSupport(true)
    const { getNotificationStatus } = await import('@/lib/notifications')

    expect(getNotificationStatus()).toMatchObject({
      requiresInstall: true,
      canRequest: false,
    })
  })

  it('does not allow requesting when permission is denied', async () => {
    setNotification('denied')
    setPushSupport(true)
    const { getNotificationStatus } = await import('@/lib/notifications')

    expect(getNotificationStatus()).toMatchObject({
      permission: 'denied',
      canRequest: false,
    })
  })

  it('requests notification permission through the browser API', async () => {
    setNotification('granted')
    const { requestNotificationPermission } = await import('@/lib/notifications')

    await expect(requestNotificationPermission()).resolves.toBe('granted')
    expect(window.Notification.requestPermission).toHaveBeenCalled()
  })
})
