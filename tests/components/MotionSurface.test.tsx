import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MotionSurface from '@/components/ui/MotionSurface'

vi.mock('next/navigation', () => ({
  usePathname: () => '/channels/channel-1',
}))

describe('MotionSurface', () => {
  it('renders a keyed forward route surface by default', () => {
    render(<MotionSurface><p>channel content</p></MotionSurface>)

    const surface = screen.getByText('channel content').parentElement
    expect(surface).toHaveClass('route-surface-enter')
    expect(surface).toHaveAttribute('data-motion-key', '/channels/channel-1')
  })

  it('supports explicit motion keys and neutral direction', () => {
    render(<MotionSurface motionKey="settings" direction="none" className="flex"><p>settings</p></MotionSurface>)

    const surface = screen.getByText('settings').parentElement
    expect(surface).toHaveClass('route-surface-enter-none')
    expect(surface).toHaveClass('flex')
    expect(surface).toHaveAttribute('data-motion-key', 'settings')
  })
})
