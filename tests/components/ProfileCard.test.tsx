import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ProfileCard from '@/components/profile/ProfileCard'
import { PROFILE_A, PROFILE_B } from '@/tests/fixtures'

const mockPush = vi.fn()
const mockGetProfile = vi.fn()
const mockRpc = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/app/(app)/profile/actions', () => ({
  getProfile: (userId: string) => mockGetProfile(userId),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

function anchorEl() {
  const el = document.createElement('button')
  el.getBoundingClientRect = () => ({
    left: 20,
    right: 60,
    top: 30,
    bottom: 50,
    width: 40,
    height: 20,
    x: 20,
    y: 30,
    toJSON: () => ({}),
  })
  document.body.appendChild(el)
  return el
}

describe('ProfileCard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    mockPush.mockReset()
    mockGetProfile.mockReset()
    mockRpc.mockReset()
    mockGetProfile.mockResolvedValue(PROFILE_B)
    mockRpc.mockResolvedValue({ data: 'conv-1', error: null })
  })

  it('labels the close control', async () => {
    render(
      <ProfileCard
        userId={PROFILE_B.id}
        currentUserId={PROFILE_A.id}
        anchorEl={anchorEl()}
        onClose={vi.fn()}
      />
    )

    await screen.findByText('Bob')

    expect(screen.getByRole('button', { name: 'Close profile card' })).toBeInTheDocument()
  })

  it('closes from the labeled close control', async () => {
    const onClose = vi.fn()
    render(
      <ProfileCard
        userId={PROFILE_B.id}
        currentUserId={PROFILE_A.id}
        anchorEl={anchorEl()}
        onClose={onClose}
      />
    )

    await screen.findByText('Bob')
    fireEvent.click(screen.getByRole('button', { name: 'Close profile card' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('opens a direct message from the profile card action', async () => {
    const onClose = vi.fn()
    render(
      <ProfileCard
        userId={PROFILE_B.id}
        currentUserId={PROFILE_A.id}
        anchorEl={anchorEl()}
        onClose={onClose}
      />
    )

    await screen.findByText('Bob')
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))

    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('get_or_create_dm', { other_user_id: PROFILE_B.id }))
    expect(onClose).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/dm/conv-1')
  })
})
