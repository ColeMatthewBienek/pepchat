import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationTray from '@/components/notifications/NotificationTray'

const mockGetNotificationEvents = vi.fn()
const mockMarkNotificationEventRead = vi.fn()
const mockMarkAllNotificationEventsRead = vi.fn()

vi.mock('@/app/(app)/notifications/actions', () => ({
  getNotificationEvents: () => mockGetNotificationEvents(),
  markNotificationEventRead: (eventId: string) => mockMarkNotificationEventRead(eventId),
  markAllNotificationEventsRead: () => mockMarkAllNotificationEventsRead(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: any) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </a>
  ),
}))

const EVENTS = [
  {
    id: 'event-1',
    user_id: 'user-1',
    actor_id: 'user-2',
    type: 'dm_message',
    source_table: 'direct_messages',
    source_id: 'dm-1',
    conversation_id: 'conv-1',
    channel_id: null,
    title: 'Alice',
    body: 'Hello from DM',
    url: '/channels?dm=conv-1',
    read_at: null,
    pushed_at: null,
    push_error: null,
    created_at: new Date().toISOString(),
  },
]

describe('NotificationTray', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNotificationEvents.mockResolvedValue({
      ok: true,
      events: EVENTS,
      unreadCount: 1,
    })
    mockMarkNotificationEventRead.mockResolvedValue({ ok: true })
    mockMarkAllNotificationEventsRead.mockResolvedValue({ ok: true })
  })

  it('shows unread count and event details when opened', async () => {
    const user = userEvent.setup()

    render(<NotificationTray />)

    expect(await screen.findByTestId('notification-tray-count')).toHaveTextContent('1')
    await user.click(screen.getByTestId('notification-tray-toggle'))

    expect(screen.getByTestId('notification-tray-menu')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Hello from DM')).toBeInTheDocument()
  })

  it('marks an unread event read when clicked', async () => {
    const user = userEvent.setup()

    render(<NotificationTray />)
    await user.click(await screen.findByTestId('notification-tray-toggle'))
    await user.click(screen.getByTestId('notification-event-event-1'))

    await waitFor(() => expect(mockMarkNotificationEventRead).toHaveBeenCalledWith('event-1'))
  })

  it('marks all notifications read', async () => {
    const user = userEvent.setup()

    render(<NotificationTray />)
    await user.click(await screen.findByTestId('notification-tray-toggle'))
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))

    await waitFor(() => expect(mockMarkAllNotificationEventsRead).toHaveBeenCalled())
    expect(screen.queryByTestId('notification-tray-count')).not.toBeInTheDocument()
  })

  it('shows load errors', async () => {
    mockGetNotificationEvents.mockResolvedValue({ error: 'Load failed' })

    render(<NotificationTray />)
    await userEvent.click(await screen.findByTestId('notification-tray-toggle'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Load failed')
  })
})
