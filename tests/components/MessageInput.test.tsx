import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MessageInput from '@/components/chat/MessageInput'
import { MESSAGE, PROFILE_A } from '@/tests/fixtures'

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('@/app/(app)/messages/actions', () => ({
  sendMessage: vi.fn(),
}))

vi.mock('@/lib/klipy', () => ({
  registerShare: vi.fn(),
}))

vi.mock('@/lib/hooks/useImageUpload', () => ({
  useImageUpload: () => ({
    pendingImages: [],
    inputError: '',
    addFiles: vi.fn(),
    removeImage: vi.fn(),
    retryUpload: vi.fn(),
    clearAll: vi.fn(),
    hasUploading: false,
    attachments: [],
  }),
}))

const BASE_PROPS = {
  channelId: 'channel-1',
  channelName: 'general',
  profile: PROFILE_A,
}

describe('MessageInput draft persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('loads a saved draft for the current channel', () => {
    window.localStorage.setItem('pepchat:draft:channel-1', 'Saved channel draft')

    render(<MessageInput {...BASE_PROPS} />)

    expect(screen.getByTestId('message-input-textarea')).toHaveValue('Saved channel draft')
  })

  it('saves typed drafts per channel', () => {
    render(<MessageInput {...BASE_PROPS} />)

    fireEvent.change(screen.getByTestId('message-input-textarea'), {
      target: { value: 'Remember this thought' },
    })

    expect(window.localStorage.getItem('pepchat:draft:channel-1')).toBe('Remember this thought')
  })

  it('clears the draft after a successful send', async () => {
    const sendAction = vi.fn().mockResolvedValue({ ok: true, message: MESSAGE })
    render(<MessageInput {...BASE_PROPS} sendAction={sendAction} />)

    fireEvent.change(screen.getByTestId('message-input-textarea'), {
      target: { value: 'Ship this message' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(sendAction).toHaveBeenCalledWith('Ship this message', null, [])
      expect(window.localStorage.getItem('pepchat:draft:channel-1')).toBeNull()
    })
    expect(screen.getByTestId('message-input-textarea')).toHaveValue('')
  })
})
