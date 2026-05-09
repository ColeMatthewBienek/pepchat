import { isIOS, isInstalled } from '@/lib/pwa'
import type { NotificationSubscriptionInput } from '@/lib/types'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

type PushSubscriptionResult =
  | { error: string }
  | { ok: true; subscription: NotificationSubscriptionInput }

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

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  return key || null
}

export function isPushConfigured(): boolean {
  return getVapidPublicKey() !== null
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

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray.buffer as ArrayBuffer
}

export function subscriptionToInput(subscription: PushSubscription): NotificationSubscriptionInput | null {
  const serialized = subscription.toJSON()
  const p256dh = serialized.keys?.p256dh
  const auth = serialized.keys?.auth

  if (!serialized.endpoint || !p256dh || !auth) return null

  return {
    endpoint: serialized.endpoint,
    keys: { p256dh, auth },
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  }
}

export async function ensurePushSubscription(): Promise<PushSubscriptionResult> {
  if (!supportsPushNotifications()) {
    return { error: 'Push notifications are not supported in this browser.' }
  }

  const publicKey = getVapidPublicKey()
  if (!publicKey) {
    return { error: 'Push notifications are not configured for this deployment.' }
  }

  const registration = await navigator.serviceWorker.register('/sw.js')
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(publicKey),
  })
  const input = subscriptionToInput(subscription)

  if (!input) {
    return { error: 'Browser returned an invalid push subscription.' }
  }

  return { ok: true, subscription: input }
}
