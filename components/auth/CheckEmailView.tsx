'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CheckEmailViewProps {
  email: string
  onBack: () => void
}

export function CheckEmailView({ email, onBack }: CheckEmailViewProps) {
  const [cooldown, setCooldown] = useState(0)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function handleResend() {
    setResendError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      setResendError(error.message)
      return
    }
    setCooldown(60)
  }

  return (
    <div className="w-full max-w-md bg-[var(--bg-secondary)] rounded-lg p-8 shadow-xl text-center">
      <div className="flex justify-center mb-5 text-[var(--accent)]">
        <MailIcon />
      </div>

      <h1 className="text-2xl font-bold mb-3">check your email</h1>

      <p className="text-[var(--text-muted)] text-sm mb-1">
        we sent a confirmation link to
      </p>
      <p className="text-[var(--text-primary)] font-medium text-sm mb-2 break-all">
        {email}
      </p>
      <p className="text-[var(--text-muted)] text-xs mb-8">
        click it to activate your account and jump into the conversation
      </p>

      <button
        onClick={handleResend}
        disabled={cooldown > 0}
        className="w-full mb-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded py-2.5 text-sm transition-colors"
      >
        {cooldown > 0 ? `resend in ${cooldown}s` : 'resend confirmation email'}
      </button>

      {resendError && (
        <p className="text-[var(--danger)] text-xs mb-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded px-3 py-2">
          {resendError}
        </p>
      )}

      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        wrong email? go back
      </button>
    </div>
  )
}

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
