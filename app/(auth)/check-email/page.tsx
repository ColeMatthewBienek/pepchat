import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="w-full max-w-md bg-[var(--bg-secondary)] rounded-lg p-8 shadow-xl text-center">
      <div className="text-4xl mb-4">📬</div>
      <h1 className="text-2xl font-bold mb-2">Check your email</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6">
        We sent a confirmation link to your email address. Click it to activate
        your account and choose a username.
      </p>
      <p className="text-[var(--text-muted)] text-xs">
        Wrong address?{' '}
        <Link href="/signup" className="text-[var(--accent)] hover:underline">
          Sign up again
        </Link>
      </p>
    </div>
  )
}
