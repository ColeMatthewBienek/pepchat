import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckEmailView } from '@/components/auth/CheckEmailView'

const mockResend = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { resend: mockResend },
  }),
}))

describe('CheckEmailView', () => {
  const email = 'test@example.com'
  let onBack: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onBack = vi.fn()
    mockResend.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('displays the email address', () => {
    render(<CheckEmailView email={email} onBack={onBack} />)
    expect(screen.getByText(email)).toBeInTheDocument()
  })

  it('has a heading with check your email text', () => {
    render(<CheckEmailView email={email} onBack={onBack} />)
    expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
  })

  it('resend button is enabled initially', () => {
    render(<CheckEmailView email={email} onBack={onBack} />)
    expect(screen.getByRole('button', { name: /resend confirmation/i })).not.toBeDisabled()
  })

  it('calls supabase.auth.resend with signup type and email', async () => {
    const user = userEvent.setup()
    render(<CheckEmailView email={email} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: /resend confirmation/i }))
    expect(mockResend).toHaveBeenCalledWith({ type: 'signup', email })
  })

  it('disables resend button and shows countdown after send', async () => {
    const user = userEvent.setup()
    render(<CheckEmailView email={email} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: /resend confirmation/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend in \d+s/i })).toBeDisabled()
    })
  })

  it('shows error message when resend fails', async () => {
    mockResend.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    const user = userEvent.setup()
    render(<CheckEmailView email={email} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: /resend confirmation/i }))
    expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument()
  })

  it('does not start countdown when resend fails', async () => {
    mockResend.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    const user = userEvent.setup()
    render(<CheckEmailView email={email} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: /resend confirmation/i }))
    await screen.findByText(/rate limit exceeded/i)
    expect(screen.getByRole('button', { name: /resend confirmation/i })).not.toBeDisabled()
  })

  it('shows countdown decreasing over time', async () => {
    vi.useFakeTimers()
    render(<CheckEmailView email={email} onBack={onBack} />)

    await act(async () => {
      screen.getByRole('button', { name: /resend confirmation/i }).click()
      await Promise.resolve()
    })

    // Capture starting count (act may have flushed one tick already)
    const initial = screen.getByRole('button', { name: /resend in \d+s/i })
    const startCount = Number(initial.textContent!.match(/\d+/)![0])
    expect(startCount).toBeGreaterThan(0)

    act(() => { vi.advanceTimersByTime(10000) })
    const after = screen.getByRole('button', { name: /resend in \d+s/i })
    const afterCount = Number(after.textContent!.match(/\d+/)![0])
    expect(afterCount).toBe(startCount - 10)
  })

  it('re-enables button after 60 second cooldown', async () => {
    vi.useFakeTimers()
    render(<CheckEmailView email={email} onBack={onBack} />)

    await act(async () => {
      screen.getByRole('button', { name: /resend confirmation/i }).click()
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: /resend in \d+s/i })).toBeInTheDocument()

    // Advance past the full cooldown window regardless of starting value
    act(() => { vi.advanceTimersByTime(65000) })

    expect(screen.getByRole('button', { name: /resend confirmation/i })).not.toBeDisabled()
  })

  it('calls onBack when go back button is clicked', async () => {
    const user = userEvent.setup()
    render(<CheckEmailView email={email} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
