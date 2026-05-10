'use client'

import { useEffect, useState } from 'react'

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)
    if (!navigator.onLine) setWasOffline(true)

    function handleOnline() {
      setOnline(true)
      setWasOffline(true)
    }

    function handleOffline() {
      setOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!wasOffline) return null

  return (
    <div
      data-testid="network-status-banner"
      role="status"
      className="flex h-9 flex-shrink-0 items-center justify-between gap-3 border-b px-4 text-xs"
      style={{
        background: online ? 'rgba(106,160,138,0.12)' : 'rgba(216,154,58,0.14)',
        borderColor: online ? 'rgba(106,160,138,0.25)' : 'rgba(216,154,58,0.25)',
        color: online ? 'var(--success)' : '#d89a3a',
      }}
    >
      <span>{online ? 'Back online. New messages will resume automatically.' : 'Offline. Messages may not send until connection returns.'}</span>
      {online && (
        <button
          type="button"
          onClick={() => setWasOffline(false)}
          className="font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
