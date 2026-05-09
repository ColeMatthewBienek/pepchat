'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getNotificationStatus,
  requestNotificationPermission,
  type NotificationStatus,
} from '@/lib/notifications'

function statusCopy(status: NotificationStatus | null) {
  if (!status) return 'Checking this device...'
  if (!status.supported) return 'Notifications are not supported in this browser.'
  if (status.requiresInstall) return 'Install PepChat to your home screen before enabling notifications.'
  if (status.permission === 'granted') return 'Notifications are enabled on this device.'
  if (status.permission === 'denied') return 'Notifications are blocked in browser settings.'
  if (!status.pushSupported) return 'This browser can ask for alerts, but push delivery is not available.'
  return 'Notifications are available on this device.'
}

export default function NotificationSettingsPanel() {
  const [status, setStatus] = useState<NotificationStatus | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setStatus(getNotificationStatus())
  }, [])

  function handleEnable() {
    setError('')
    startTransition(async () => {
      try {
        await requestNotificationPermission()
        setStatus(getNotificationStatus())
      } catch {
        setError('Could not update notification permission.')
      }
    })
  }

  return (
    <section
      aria-labelledby="notification-settings-heading"
      className="rounded-xl border border-white/10 p-4 space-y-3"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div>
        <h2 id="notification-settings-heading" className="text-sm font-semibold text-[var(--text-primary)]">
          Notifications
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]" data-testid="notification-status">
          {statusCopy(status)}
        </p>
      </div>

      {status?.permission === 'granted' && (
        <p className="text-xs text-[var(--text-muted)]" data-testid="notification-delivery-note">
          Message delivery settings are coming next.
        </p>
      )}

      {error && (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleEnable}
        disabled={!status?.canRequest || isPending}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:opacity-40 disabled:cursor-default transition-colors"
      >
        {isPending ? 'Enabling...' : 'Enable notifications'}
      </button>
    </section>
  )
}
