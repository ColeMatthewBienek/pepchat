import { isIOS, isInstalled } from '@/lib/pwa'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

export interface NotificationStatus {
  supported: boolean
  pushSupported: boolean
  permission: NotificationPermissionState
  requiresInstall: boolean
  canRequest: boolean
}

export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function supportsPushNotifications(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    supportsNotifications() &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!supportsNotifications()) return 'unsupported'
  return window.Notification.permission
}

export function getNotificationStatus(): NotificationStatus {
  const supported = supportsNotifications()
  const permission = getNotificationPermission()
  const requiresInstall = supported && isIOS() && !isInstalled()

  return {
    supported,
    pushSupported: supportsPushNotifications(),
    permission,
    requiresInstall,
    canRequest: supported && permission === 'default' && !requiresInstall,
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!supportsNotifications()) return 'unsupported'
  return window.Notification.requestPermission()
}
