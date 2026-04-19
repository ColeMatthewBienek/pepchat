import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditProfilePage from '@/components/profile/EditProfilePage'
import { PROFILE_A } from '@/tests/fixtures'

const mockBack = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}))
vi.mock('@/app/(app)/profile/actions', () => ({
  updateProfile: vi.fn(),
  removeAvatar: vi.fn(),
}))
vi.mock('next/dynamic', () => ({
  default: (_fn: unknown) => () => null,
}))

import { updateProfile } from '@/app/(app)/profile/actions'
const mockUpdate = updateProfile as ReturnType<typeof vi.fn>

describe('EditProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({ profile: PROFILE_A })
  })

  it('renders the edit profile form', () => {
    render(<EditProfilePage profile={PROFILE_A} userRole="user" />)
    expect(screen.getByText(/edit profile/i)).toBeInTheDocument()
  })

  it('disables Save Changes button when form is unchanged', () => {
    render(<EditProfilePage profile={PROFILE_A} userRole="user" />)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('enables Save Changes button when a field is changed', () => {
    render(<EditProfilePage profile={PROFILE_A} userRole="user" />)
    const input = screen.getByPlaceholderText(PROFILE_A.username)
    fireEvent.change(input, { target: { value: 'New Name' } })
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
  })

  it('calls router.back() when Cancel is clicked', () => {
    render(<EditProfilePage profile={PROFILE_A} userRole="user" />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockBack).toHaveBeenCalledOnce()
  })

  it('calls updateProfile on Save', async () => {
    render(<EditProfilePage profile={PROFILE_A} userRole="user" />)
    const input = screen.getByPlaceholderText(PROFILE_A.username)
    fireEvent.change(input, { target: { value: 'New Display' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
  })

  it('shows validation error for bio over 190 chars', async () => {
    render(<EditProfilePage profile={PROFILE_A} userRole="user" />)
    const bio = screen.getByPlaceholderText(/tell people/i)
    fireEvent.change(bio, { target: { value: 'x'.repeat(191) } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.getByText(/max 190/i)).toBeInTheDocument())
  })

  it('shows validation error for invalid website URL', async () => {
    render(<EditProfilePage profile={PROFILE_A} userRole="user" />)
    const website = screen.getByPlaceholderText(/https:\/\/yoursite/i)
    fireEvent.change(website, { target: { value: 'not-a-url' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.getByText(/valid url/i)).toBeInTheDocument())
  })
})
